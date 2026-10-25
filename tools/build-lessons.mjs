import fs from 'node:fs';
import { Chess } from 'chess.js';
import {compileExercise} from './compile-lesson.mjs';
import {orderLessonLibrary} from './lesson-library-order.mjs';
import {embedOpeningCourses} from './build-opening-courses.mjs';
const root = new URL('../', import.meta.url);
const lesson = JSON.parse(fs.readFileSync(new URL('data/lessons/le-fou.json', root), 'utf8'));
const clean = text => text.replace(/\[%[^\]]*\]/g, '').trim();
function compilePgn(exercise) {
  if (exercise.challengeType === 'captureTheStar') return exercise;
  const tokens = exercise.pgn.replace(/^\s*\[[^\n]*\]\s*$/gm, '').match(/\{[^}]*\}|\(|\)|[^\s(){}]+/g) || [];
  const game = new Chess(exercise.fen);
  const line = [], alternatives = [];
  let depth=0, branch=[], prompt='', last=null;
  const isMove = token => !/^(\d+\.(\.\.)?|\d+|\*|1-0|0-1|1\/2-1\/2|\$\d+)$/.test(token);
  for (const token of tokens) {
    if(token==='('){depth++;if(depth===1)branch=[];continue;}
    if(token===')'){if(depth===1)alternatives.push(branch);depth--;continue;}
    if(depth){if(depth===1)branch.push(token);continue;}
    if(token.startsWith('{')){
      const comment=token.slice(1,-1);
      if(last){last.comment=clean(comment);last.hint=comment.match(/\[%hint ([^\]]*)\]/)?.[1]||'';last.wrong=comment.match(/\[%wrong ([^\]]*)\]/)?.[1]||'';}
      else prompt=clean(comment);
    } else if(isMove(token)) {
      const move=game.move(token.replace(/[!?]+$/,''));
      last={from:move.from,to:move.to,promotion:move.promotion,san:move.san,comment:'',hint:'',wrong:''};line.push(last);
    }
  }
  if(!line.length)throw new Error('Aucun coup attendu dans la leçon');
  const wrongMoves=alternatives.map(tokens=>{
    const alternative=new Chess(exercise.fen);let first=null;const comments=[];
    for(const token of tokens){
      if(token.startsWith('{'))comments.push(clean(token.slice(1,-1)));
      else if(isMove(token)){const move=alternative.move(token.replace(/[!?]+$/,''));first??={from:move.from,to:move.to,san:move.san};}
    }
    return {...first,comment:comments.filter(Boolean).join(' ')};
  });
  return {...exercise,prompt,line,wrongMoves};
}
const tempoSource=JSON.parse(fs.readFileSync(new URL('data/lessons/tempo-aux-echecs.json',root),'utf8'));
const compilationReport=[];
const files=fs.readdirSync(new URL('data/lessons/',root)).filter(file=>file.endsWith('.json'));
const personalManifest=JSON.parse(fs.readFileSync(new URL('data/personal-lesson-curriculum.json',root),'utf8'));
const imported=files.map(file=>JSON.parse(fs.readFileSync(new URL('data/lessons/'+file,root),'utf8'))).sort((a,b)=>(a.curriculum?.number??9999)-(b.curriculum?.number??9999));
const catalog=orderLessonLibrary(imported.map(data=>{
 try{return {...data,exercises:data.exercises.map(compileExercise)};}
 catch(error){compilationReport.push({path:data.sourceLesson.path,title:data.title,reason:error.message});return null;}
}).filter(Boolean),personalManifest);
fs.writeFileSync(new URL('data/lesson-playback-report.json',root),JSON.stringify({playable:catalog.length,unavailable:compilationReport},null,2)+'\n');
if(compilationReport.length)console.log('Leçons conservées mais non prises en charge :',JSON.stringify(compilationReport));
// Keep the two established selector indices while the catalog grows.
catalog.sort((a,b)=>{const priority=p=>p==='le-fou'?0:p==='tempo-aux-echecs'?1:2;return priority(a.sourceLesson.path)-priority(b.sourceLesson.path);});
const page = new URL('lecons.html', root);
let html = fs.readFileSync(page, 'utf8');
const theme=fs.readFileSync(new URL('src/chess-theme.css',root),'utf8').replaceAll('../boards/','./boards/');
function applyTheme(pageHtml){
  const marker=/(<style id="chess-appearance">)[\s\S]*?(<\/style>)/;
  if(marker.test(pageHtml))return pageHtml.replace(marker,(_,open,close)=>open+'\n'+theme+'\n'+close);
  return pageHtml.replace('</head>','<style id="chess-appearance">\n'+theme+'\n</style>\n</head>');
}
html=applyTheme(html);
const layout=fs.readFileSync(new URL('src/lessons-layout.css',root),'utf8');
const layoutMarker=/(<style id="lesson-layout">)[\s\S]*?(<\/style>)/;
html=layoutMarker.test(html)?html.replace(layoutMarker,(_,open,close)=>open+'\n'+layout+'\n'+close):html.replace('</head>','<style id="lesson-layout">\n'+layout+'\n</style>\n</head>');
if(!html.includes('.level-tag{'))html=html.replace('</style>','.level-tag{display:inline-block;padding:4px 9px;border-radius:5px;font-size:.83rem;font-weight:750;color:#17211d}.level-tag[data-level="lime"]{background:#c7df6d}.level-tag[data-level="green"]{background:#9ed78a}.level-tag[data-level="orange"]{background:#edb46e}.level-tag[data-level="purple"]{background:#c7a5eb}#level-select{width:100%;margin:6px 0 12px;padding:10px;background:#17211d;color:#e9ece5;border:1px solid #708069;border-radius:8px;font:inherit}#intro-position{align-self:center;color:#b7c3b5}\n</style>');
if(!html.includes('id="lesson-sounds"'))html=html.replace('<script id="lesson-ui">','<script id="lesson-sounds"></script>\n<script id="lesson-ui">');
if(!html.includes('id="lesson-progress"'))html=html.replace('<script id="lesson-ui">','<script id="lesson-progress"></script>\n<script id="lesson-ui">');
if(!html.includes('id="lesson-progress-info"'))html=html.replace('</dialog>','<p class="source" id="lesson-progress-info">Dans la liste : vert = tous les exercices réussis sans erreur ni indice ; orange = leçon terminée avec des erreurs ou de l’aide ; blanc = jamais faite ou encore en cours. Le meilleur résultat de chaque exercice est conservé dans ce navigateur, même en recommençant la leçon. Les anciens résultats sans détail restent orange jusqu’à une nouvelle réussite sans erreur.</p></dialog>');
html=html.replace('même en recommençant la leçon.','sauf si tu réinitialises la leçon : elle redevient blanche et non faite. À l’ouverture, la dernière leçon consultée qui n’est pas verte est sélectionnée.');
html=html.replace('<p class="board-help">','<p class="board-help" id="board-help">');
const marker = /(<script type="application\/json" id="lesson-data">)[\s\S]*?(<\/script>)/;
if (!marker.test(html)) throw new Error('Emplacement des données de leçon absent');
const embed = data => JSON.stringify(data).replaceAll('<','\\u003c');
html=html.replace(marker,(_,open,close)=>open+embed(lesson)+close);
html=html.replace(/(<script type="application\/json" id="lesson-catalog">)[\s\S]*?(<\/script>)/,(_,open,close)=>open+embed(catalog)+close);
const chessSource=fs.readFileSync(new URL('node_modules/chess.js/dist/cjs/chess.js',root),'utf8');
const license=fs.readFileSync(new URL('node_modules/chess.js/LICENSE',root),'utf8');
const rules=`/* ${license.replaceAll('*/','* /')} */\n(()=>{const exports={};\n${chessSource}\nglobalThis.LessonChess=exports.Chess;})();`;
html=html.replace(/(<script id="lesson-rules">)[\s\S]*?(<\/script>)/,(_,open,close)=>open+rules.replaceAll('</script','<\\/script')+close);
for(const [id,path] of [['tempo-engine','src/tempo-lesson.js'],['lesson-sounds','src/sound-bank.js'],['lesson-progress','src/lesson-progress.js'],['lesson-ui','src/lessons-ui.js']]) {
  const source=fs.readFileSync(new URL(path,root),'utf8');
  html=html.replace(new RegExp('(<script id="'+id+'">)[\\s\\S]*?(<\\/script>)'),(_,open,close)=>open+'\n'+source+'\n'+close);
}
if(!html.includes('#lesson-select{'))html=html.replace('</style>','#lesson-select{width:100%;font:inherit;background:#17211d;color:#e9ece5;border:1px solid #708069;border-radius:8px;padding:10px}#lesson-select:focus-visible{outline:3px solid #e4bd71;outline-offset:2px}.progress{flex-wrap:wrap}.progress button{min-width:38px}.sq.last{box-shadow:inset 0 0 0 100px #dfb75c70}\n</style>');
const soundStyle='#sound-toggle{font:inherit;font-size:.82rem;white-space:nowrap;border:1px solid #61765f;background:#29392f;color:#e9ece5;border-radius:7px;padding:8px 10px;cursor:pointer}#sound-toggle:hover{background:#3b5041}#sound-toggle:focus-visible{outline:3px solid #e4bd71;outline-offset:2px}';
if(!html.includes('#sound-toggle{'))html=html.replace('</style>',soundStyle+'\n</style>');
fs.writeFileSync(page,html);
console.log(`Leçons intégrées : ${catalog.length} ; ${catalog.reduce((sum,l)=>sum+l.exercises.length,0)} exercices ; ${compilationReport.length} leçons non prises en charge.`);

const openingsPage=new URL('ouvertures.html',root);
let openingsHtml=fs.readFileSync(openingsPage,'utf8');
openingsHtml=applyTheme(openingsHtml).replaceAll('"pieces/kaneo/"+piece[0]+piece[1].toUpperCase()+".svg"','"pieces/neo/"+piece[0]+piece[1]+".webp"');
if(!openingsHtml.includes('#sound-toggle{'))openingsHtml=openingsHtml.replace('</style>',soundStyle+'\n</style>');
if(!openingsHtml.includes('id="opening-sounds"'))openingsHtml=openingsHtml.replace('</body>','<script id="opening-sounds"></script>\n</body>');
const soundSource=fs.readFileSync(new URL('src/sound-bank.js',root),'utf8');
const mount='\nglobalThis.openingSounds=new DefaultSoundBank();openingSounds.attach(document.getElementById("sound-toggle"));';
openingsHtml=openingsHtml.replace(/(<script id="opening-sounds">)[\s\S]*?(<\/script>)/,(_,open,close)=>open+'\n'+soundSource+mount+'\n'+close);
fs.writeFileSync(openingsPage,embedOpeningCourses(openingsHtml));
