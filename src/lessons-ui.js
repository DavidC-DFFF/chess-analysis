const catalog=JSON.parse(document.getElementById('lesson-catalog').textContent);
let lessonData=catalog[0],session=new StarLesson(lessonData);
const el=id=>document.getElementById(id);
const lessonSounds=new DefaultSoundBank();
lessonSounds.attach(el('sound-toggle'));
let introduction=true,selected=null,hintSquare=null,dragFrom=null,introIndex=0;
const LESSON_REPLY_DELAY=700;
let lessonReplyTimer=null,lessonReplyGeneration=0;
function cancelLessonReply(){lessonReplyGeneration++;if(lessonReplyTimer!==null){clearTimeout(lessonReplyTimer);lessonReplyTimer=null;}}
function queueLessonReply(previousText){
 if(!session.waitingForReply)return;
 const scheduledSession=session,generation=lessonReplyGeneration;
 lessonReplyTimer=setTimeout(()=>{
  if(generation!==lessonReplyGeneration||scheduledSession!==session||introduction)return;
  lessonReplyTimer=null;
  const result=scheduledSession.reply();
  if(result.kind==='idle')return;
  clearLessonDrag();
  lessonSounds.playMove(session.game.history({verbose:true}).at(-1),{opponent:true,finished:session.solved});
  result.text=[previousText,result.text].filter(Boolean).join(' ');
  showLessonResult(result);queueLessonReply(result.text);
 },LESSON_REPLY_DELAY);
}
const levelInfo={SECTION_LEVEL_NEW:{name:'Apprendre à jouer',color:'lime'},SECTION_LEVEL_BEGINNER:{name:'Débutant',color:'green'},SECTION_LEVEL_INTERMEDIATE:{name:'Intermédiaire',color:'orange'},SECTION_LEVEL_ADVANCED:{name:'Avancé',color:'purple'}};
const orderedCatalog=catalog.map((lesson,index)=>({lesson,index})).sort((a,b)=>a.lesson.libraryCurriculum.number-b.lesson.libraryCurriculum.number);
const lessonSessions=new Map([[lessonData.sourceLesson.path,session]]);
let savedProgress={};try{savedProgress=JSON.parse(localStorage.getItem('chess-analysis.lesson-progress')||'{}');}catch{}
function restoreProgress(s){s.completed=new Set((savedProgress[s.lesson.sourceLesson.path]||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<s.lesson.exercises.length));}
restoreProgress(session);
function saveProgress(){savedProgress[lessonData.sourceLesson.path]=[...session.completed];try{localStorage.setItem('chess-analysis.lesson-progress',JSON.stringify(savedProgress));}catch{}}
function lessonLevel(data){return data.libraryCurriculum.section.level;}
function introductionScreens(){return lessonData.sourceLesson.content?.flatMap(part=>part.screens||[])||[];}
function introductionPgn(){return introductionScreens()[introIndex]||'';}
function fenBoard(fen){const result={};(fen||new LessonChess().fen()).split(' ')[0].split('/').forEach((row,r)=>{let col=0;for(const c of row){if(/[1-8]/.test(c))col+=Number(c);else result['abcdefgh'[col++]+(8-r)]=c;}});return result;}
function fillLessonSelector(){
 const selector=el('lesson-select');selector.replaceChildren();let group=null,lastKey='';
 for(const {lesson,index}of orderedCatalog){
  const curriculum=lesson.libraryCurriculum;
  const level=levelInfo[lessonLevel(lesson)],key=curriculum.section.level+':'+curriculum.course.path;
  if(key!==lastKey){group=document.createElement('optgroup');group.label=level.name+' · '+curriculum.course.name;selector.append(group);lastKey=key;}
  const option=document.createElement('option');option.value=index;option.textContent=curriculum.number+'. '+lesson.title;group.append(option);
 }
 selector.value=String(catalog.indexOf(lessonData));
}
let dragSourceImage=null;
let lessonPointerDrag=null,suppressLessonClick=false;
function clearLessonDrag(){
 const drag=lessonPointerDrag;lessonPointerDrag=null;
 drag?.ghost?.remove();
 if(dragSourceImage)dragSourceImage.style.visibility='';
 dragSourceImage=null;dragFrom=null;
 if(drag&&el('lesson-board').hasPointerCapture?.(drag.id))el('lesson-board').releasePointerCapture(drag.id);
}
const pedagogical=()=>lessonData.exercises[0].challengeType==='captureTheStar';
const canSelect=square=>session.canSelect(square);
const cleanComment=text=>text.replace(/\[%[^\]]*\]/g,'').trim();
function feedback(text,kind=''){el('lesson-feedback').textContent=text;el('lesson-feedback').dataset.kind=kind;}
function renderBoard(){
 const board=el('lesson-board'),focused=document.activeElement?.dataset.square;board.replaceChildren();
 const introFen=introductionPgn().match(/\[FEN "([^"]+)"\]/)?.[1];
 const pieces=introduction?(introductionPgn()?fenBoard(introFen):session.board):session.board,flipped=session.userColor==='b';
 const names={p:'pion',n:'cavalier',b:'fou',r:'tour',q:'dame',k:'roi'};
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const file='abcdefgh'[flipped?7-col:col],rank=flipped?row+1:8-row,square=file+rank,piece=pieces[square],target=!introduction&&session.targets.has(square);
  const cell=document.createElement('button');cell.type='button';cell.dataset.square=square;
  cell.className='sq '+(('abcdefgh'.indexOf(file)+rank)%2?'dark':'light')+(selected===square?' selected':'')+(hintSquare===square?' hint':'')+(!introduction&&[session.lastMove?.from,session.lastMove?.to].includes(square)?' last':'');
  cell.setAttribute('aria-label',square+(piece?`, ${names[piece.toLowerCase()]} ${piece===piece.toUpperCase()?'blanc':'noir'}`:'')+(target?', étoile à capturer':''));cell.setAttribute('aria-pressed',String(selected===square));
  if(piece){const img=document.createElement('img');img.src=`./pieces/neo/${piece===piece.toUpperCase()?'w':'b'}${piece.toLowerCase()}.webp`;img.alt='';img.className='piece';img.draggable=false;cell.append(img);if(!introduction&&!session.solved&&canSelect(square))cell.style.touchAction='none';}
  if(target){const star=document.createElement('span');star.className='star';star.textContent='★';star.setAttribute('aria-hidden','true');cell.append(star);}
  if(col===0){const label=document.createElement('span');label.className='coord rank';label.textContent=rank;label.setAttribute('aria-hidden','true');cell.append(label);}
  if(row===7){const label=document.createElement('span');label.className='coord file';label.textContent=file;label.setAttribute('aria-hidden','true');cell.append(label);}
  cell.addEventListener('click',()=>{if(!suppressLessonClick)chooseSquare(square);});board.append(cell);
 }
 if(focused)board.querySelector(`[data-square="${focused}"]`)?.focus({preventScroll:true});
}
function render(){
 el('lesson-title').textContent=lessonData.title;
 el('board-subtitle').textContent=lessonData.sourceLesson.description||'Lis la consigne et retrouve les coups attendus.';
 el('lesson-source').href=lessonData.sourceUrl;el('lesson-source').textContent='Chess.com · '+lessonData.title;
 el('intro-arrows').toggleAttribute('hidden',!introduction||lessonData.sourceLesson.path!=='le-fou');
 el('stage-title').textContent=introduction?'Comprendre la leçon':`Exercice ${session.index+1} sur ${lessonData.exercises.length}`;
 const screen=introductionPgn();
 const introText=screen?[...screen.matchAll(/\{([^}]*)\}/g)].map(m=>cleanComment(m[1])).filter(Boolean).join(' '):lessonData.sourceLesson.description;
 const exercise=lessonData.exercises[session.index];
 el('instruction').textContent=introduction?introText:(exercise.prompt||cleanComment(exercise.comments[0]||''));
 el('board-help').textContent=`Joue les ${session.userColor==='b'?'Noirs':'Blancs'}. Clique sur une pièce puis sa destination, ou fais-la glisser.`;
 if(session.waitingForReply&&!introduction)el('board-help').textContent='Réponse adverse…';
 el('lesson-board').setAttribute('aria-busy',String(Boolean(session.waitingForReply&&!introduction)));
 el('intro-navigation').hidden=!introduction||introductionScreens().length<2;
 el('intro-previous').disabled=introIndex===0;el('intro-next').disabled=introIndex>=introductionScreens().length-1;
 el('intro-position').textContent=`${introIndex+1} / ${introductionScreens().length}`;
 el('start-lesson').hidden=!introduction;
 for(const id of ['exercise-progress','restart-exercise','restart-lesson','review-intro'])el(id).hidden=introduction;
 el('lesson-hint').hidden=introduction||session.solved;
 el('lesson-hint').disabled=Boolean(session.waitingForReply);
 el('next-exercise').hidden=introduction||!session.solved||session.index===lessonData.exercises.length-1;
 el('next-lesson').hidden=introduction||session.completed.size!==lessonData.exercises.length||orderedCatalog.at(-1).lesson===lessonData;
 el('restart-lesson').textContent=session.completed.size===lessonData.exercises.length?'Refaire toute la leçon':'Recommencer la leçon';
 el('progress-note').textContent=introduction?'Prends le temps de lire, puis passe à la pratique.':`${session.completed.size} / ${lessonData.exercises.length} exercices réussis · ${session.moves} déplacement(s) · ${session.mistakes} erreur(s)${session.hinted?' · indice utilisé':''}`;
 el('exercise-progress').replaceChildren();
 lessonData.exercises.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(session.completed.has(i)?'✓ ':'')+(i+1);b.className=session.completed.has(i)?'done':'';b.setAttribute('aria-label',`Exercice ${i+1}${session.completed.has(i)?', déjà réussi':''}`);if(i===session.index)b.setAttribute('aria-current','step');b.onclick=()=>startExercise(i);el('exercise-progress').append(b);});
 renderBoard();fitLessonBoard();
}
function fitLessonBoard(){
 const wrap=el('lesson-board').parentElement;
 if(typeof matchMedia!=='function'||!matchMedia('(min-width:780px) and (min-height:650px)').matches){wrap.style.width='';return;}
 const shell=document.querySelector('.shell'),help=el('board-help'),shellStyle=getComputedStyle(shell),helpStyle=getComputedStyle(help);
 const available=shell.getBoundingClientRect().bottom-parseFloat(shellStyle.paddingBottom)-wrap.getBoundingClientRect().top-help.getBoundingClientRect().height-parseFloat(helpStyle.marginTop);
 const size=Math.floor(Math.min(wrap.parentElement.clientWidth,available,700));
 if(size>0)wrap.style.width=size+'px';
}
window.addEventListener('resize',fitLessonBoard);
el('lesson-info-toggle').onclick=()=>{clearLessonDrag();el('lesson-info').showModal();};
el('lesson-info-close').onclick=()=>el('lesson-info').close();
el('lesson-info').addEventListener('click',event=>{const box=event.currentTarget.getBoundingClientRect();if(event.target===event.currentTarget&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))event.currentTarget.close();});
function startExercise(index){cancelLessonReply();clearLessonDrag();lessonSounds.stop();introduction=false;session.load(index);selected=null;hintSquare=null;feedback(pedagogical()?'Capture l’étoile en un ou plusieurs déplacements.':'À toi de trouver le coup qui répond à la consigne.');render();lessonSounds.play('game-start');}
function chooseSquare(square){
 if(introduction){feedback('Clique sur « Commencer les exercices » pour jouer.');return;}
 if(session.solved)return;
 if(session.waitingForReply)return;
 if(canSelect(square)){selected=selected===square?null:square;renderBoard();return;}
 if(!selected){feedback('Sélectionne d’abord une pièce de ton camp.');return;}
 const captured=Boolean(session.board[square])||session.targets.has(square);
 const result=session.move(selected,square,{deferReply:true});if(result.kind!=='error'){selected=null;hintSquare=null;}
 if(result.kind==='error')lessonSounds.play('illegal');
 else if(result.kind==='success'||result.kind==='move')lessonSounds.playMove(pedagogical()?{captured}:session.game.history({verbose:true}).at(-1),{finished:session.solved});
 showLessonResult(result);queueLessonReply(result.text);
}
function showLessonResult(result){
 const completion=session.solved?(lessonData.exercises[session.index].pgn.match(/\[LESSON_CHALLENGE_COMPLETE_TEXT "([^"]+)"\]/)?.[1]||''):'';
 const allDone=session.solved&&session.completed.size===lessonData.exercises.length;
 if(session.solved)saveProgress();
 feedback(result.text+(completion?' '+completion:'')+(allDone?` Les ${lessonData.exercises.length===3?'trois':lessonData.exercises.length} exercices sont réussis ! Tu peux refaire toute la leçon.`:''),result.kind);render();
}
el('lesson-select').onchange=()=>{cancelLessonReply();clearLessonDrag();lessonSounds.stop();lessonData=catalog[Number(el('lesson-select').value)];session=lessonSessions.get(lessonData.sourceLesson.path);if(!session){session=pedagogical()?new StarLesson(lessonData):new TempoLesson(lessonData);restoreProgress(session);lessonSessions.set(lessonData.sourceLesson.path,session);}session.load(0);introduction=true;introIndex=0;selected=null;hintSquare=null;feedback('');render();};
el('intro-previous').onclick=()=>{introIndex=Math.max(0,introIndex-1);render();};
el('intro-next').onclick=()=>{introIndex=Math.min(introductionScreens().length-1,introIndex+1);render();};
el('next-lesson').onclick=()=>{const index=orderedCatalog.findIndex(entry=>entry.lesson===lessonData),next=orderedCatalog[index+1];if(next){el('lesson-select').value=String(next.index);el('lesson-select').onchange();}};
el('start-lesson').onclick=()=>startExercise(0);
el('next-exercise').onclick=()=>startExercise(session.index+1);
el('restart-exercise').onclick=()=>startExercise(session.index);
el('restart-lesson').onclick=()=>{session.completed.clear();saveProgress();startExercise(0);};
el('review-intro').onclick=()=>{cancelLessonReply();clearLessonDrag();lessonSounds.stop();introduction=true;session.load(0);selected=null;hintSquare=null;feedback('');render();};
el('lesson-hint').onclick=()=>{session.hinted=true;if(pedagogical()){hintSquare=Object.keys(session.board).find(canSelect);feedback('Observe les déplacements possibles de ta pièce pour rejoindre l’étoile, en plusieurs coups si nécessaire.');}else{feedback(lessonData.exercises[session.index].line[session.cursor].hint||'Relis la consigne et cherche un coup qui atteint cet objectif.');}render();};
el('lesson-board').addEventListener('dragstart',event=>event.preventDefault());
el('lesson-board').addEventListener('pointerdown',event=>{
 const cell=event.target.closest('[data-square]'),from=cell?.dataset.square;
 if(event.button!==0||introduction||session.solved||!from||!canSelect(from))return;
 clearLessonDrag();dragFrom=from;dragSourceImage=cell.querySelector('img.piece');
 lessonPointerDrag={id:event.pointerId,from,x:event.clientX,y:event.clientY,ghost:null};
});
document.addEventListener('pointermove',event=>{
 const drag=lessonPointerDrag;if(!drag||drag.id!==event.pointerId)return;
 if(!drag.ghost&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5)return;
 event.preventDefault();
 if(!drag.ghost){
  const bounds=dragSourceImage.getBoundingClientRect();
  const ghost=document.createElement('img');ghost.src=dragSourceImage.src;ghost.alt='';ghost.draggable=false;ghost.className='lesson-drag-piece';ghost.setAttribute('aria-hidden','true');
  Object.assign(ghost.style,{position:'fixed',zIndex:'50',pointerEvents:'none',userSelect:'none',background:'transparent',border:'0',boxShadow:'none',padding:'0',margin:'0',width:bounds.width+'px',height:bounds.height+'px',objectFit:'contain'});
  drag.width=bounds.width;drag.height=bounds.height;drag.ghost=ghost;document.body.append(ghost);dragSourceImage.style.visibility='hidden';
  el('lesson-board').setPointerCapture?.(event.pointerId);
 }
 drag.ghost.style.left=event.clientX-drag.width/2+'px';drag.ghost.style.top=event.clientY-drag.height/2+'px';
},{passive:false});
document.addEventListener('pointerup',event=>{
 const drag=lessonPointerDrag;if(!drag||drag.id!==event.pointerId)return;
 const moved=Boolean(drag.ghost),from=drag.from;clearLessonDrag();
 if(!moved)return;
 event.preventDefault();suppressLessonClick=true;setTimeout(()=>{suppressLessonClick=false;},0);
 const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('#lesson-board [data-square]')?.dataset.square;
 if(target&&target!==from){selected=from;chooseSquare(target);}
});
document.addEventListener('pointercancel',event=>{if(lessonPointerDrag?.id===event.pointerId)clearLessonDrag();});
window.addEventListener('blur',clearLessonDrag);
fillLessonSelector();render();
