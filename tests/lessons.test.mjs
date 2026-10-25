import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Chess } from 'chess.js';
import {compileExercise} from '../tools/compile-lesson.mjs';

const html=fs.readFileSync(new URL('../lecons.html',import.meta.url),'utf8');
const lesson=JSON.parse(html.match(/<script type="application\/json" id="lesson-data">([\s\S]*?)<\/script>/)[1]);
const context=vm.createContext({});
vm.runInContext(html.match(/<script id="lesson-engine">([\s\S]*?)<\/script>/)[1]+'\nglobalThis.Lesson = BishopLesson;',context);
const create=()=>new context.Lesson(lesson);

test('embedded lesson preserves imported exercises and teaching comments',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../data/lessons/le-fou.json',import.meta.url),'utf8'));
 assert.deepEqual(lesson,source);
 assert.equal(lesson.exercises.length,3);
});
test('all three exercises accept a route to the star without kings',()=>{
 const s=create();
 for(const [index,route] of [[0,['b1','f5']],[1,['f5','g6','e8']],[2,['e8','c6','d5']]]){
  s.load(index);
  for(let i=1;i<route.length;i++) assert.notEqual(s.move(route[i-1],route[i]).kind,'error');
  assert.equal(s.solved,true);assert.equal(s.targets.size,0);
 }
 assert.equal(s.completed.size,3);
});
test('incorrect moves preserve the position, and legal intermediate moves remain playable',()=>{
 const s=create();
 assert.equal(s.move('b1','b5').kind,'error');assert.equal(s.board.b1,'B');assert.equal(s.mistakes,1);
 assert.equal(s.move('b1','b1').kind,'idle');assert.equal(s.mistakes,1);
 assert.equal(s.move('b1','c2').kind,'move');assert.equal(s.solved,false);
 assert.equal(s.move('c2','f5').kind,'success');assert.equal(s.moves,2);
 assert.equal(s.move('f5','g6').kind,'complete');assert.equal(s.board.f5,'B');
});
test('repeating an exercise restores the board and counters',()=>{
 const s=create();s.move('b1','f5');s.hinted=true;s.load(0);
 assert.equal(s.board.b1,'B');assert.equal(s.solved,false);assert.equal(s.moves,0);assert.equal(s.hinted,false);
 assert.equal(s.targets.has('f5'),true);assert.equal(s.completed.has(0),true);
 assert.throws(()=>s.load(-1));assert.throws(()=>s.load(3));
});

const catalog=JSON.parse(html.match(/<script type="application\/json" id="lesson-catalog">([\s\S]*?)<\/script>/)[1]);
const tempo=catalog.find(l=>l.title==='Tempo');
const tempoContext=vm.createContext({LessonChess:Chess,BishopLesson:context.Lesson});
vm.runInContext(fs.readFileSync(new URL('../src/tempo-lesson.js',import.meta.url),'utf8')+'\nglobalThis.Tempo = TempoLesson;globalThis.Session = LessonSession;',tempoContext);

test('the pawn lesson switches between normal moves, star capture and promotion without losing progress',()=>{
 const pawn=catalog.find(l=>l.sourceLesson.path==='le-pion');
 const s=new tempoContext.Session(pawn);
 assert.equal(s.move('e2','e3').kind,'success');
 s.load(1);assert.equal(s.move('e2','e4').kind,'success');
 s.load(2);assert.equal(s.isStarExercise,true);assert.equal(s.waitingForReply,false);assert.ok(s.targets.has('d7'));
 assert.equal(s.move('e4','e6').kind,'error');assert.equal(s.board.e4,'P');
 assert.equal(s.move('e4','e5').kind,'move');assert.equal(s.move('e5','e6').kind,'move');
 const wrong=s.move('e6','e7');assert.equal(wrong.kind,'error');assert.match(wrong.text,/diagonale/);assert.equal(s.board.e6,'P');
 assert.equal(s.move('e6','d7').kind,'success');assert.equal(s.board.d7,'P');assert.equal(s.targets.size,0);
 s.load(3);assert.equal(s.isStarExercise,false);assert.equal(s.move('d7','d8').kind,'success');assert.equal(s.board.d8,'Q');
 assert.equal(s.completed.size,4);
 s.load(2);assert.equal(s.moves,0);assert.equal(s.mistakes,0);assert.equal(s.board.e4,'P');assert.ok(s.targets.has('d7'));
 s.load(0);assert.equal(s.move('e2','e4').kind,'error');assert.equal(s.move('e2','e3').kind,'success');
});

test('every exercise selects its own engine, even in mixed lessons',()=>{
 for(const lesson of catalog){
  const s=new tempoContext.Session(lesson);
  for(let i=0;i<lesson.exercises.length;i++){
   s.load(i);const star=lesson.exercises[i].challengeType==='captureTheStar';
   assert.equal(s.isStarExercise,star,lesson.title+' '+i);assert.equal(s.waitingForReply,false);
   if(star)assert.ok(s.targets.size>0);else assert.ok(s.line.length>0);
  }
 }
});
test('tempo: all six expected developments are legal and keep their original explanations',()=>{
 const s=new tempoContext.Tempo(tempo);
 assert.deepEqual(tempo.exercises.map(e=>e.line[0].san),['Nc6','Bd3','Bf4','Nf3','Be3','Rc1']);
 for(let i=0;i<6;i++){
  s.load(i);assert.equal(s.userColor,i===0?'b':'w');
  const expected=tempo.exercises[i].line[0];
  assert.ok(tempo.exercises[i].prompt);assert.ok(expected.hint);assert.ok(expected.comment);
  const result=s.move(expected.from,expected.to);
  assert.equal(result.kind,'success');assert.equal(result.text,expected.comment);assert.equal(s.solved,true);
 }
 assert.equal(s.completed.size,6);
});
test('tempo: annotated alternatives explain the error without moving any piece',()=>{
 const s=new tempoContext.Tempo(tempo);
 for(let i=0;i<6;i++)for(const wrong of tempo.exercises[i].wrongMoves){
  s.load(i);const before=s.game.fen();const result=s.move(wrong.from,wrong.to);
  assert.equal(result.kind,'error');assert.equal(result.text,wrong.comment);assert.equal(s.game.fen(),before);assert.equal(s.solved,false);
 }
});
test('tempo: illegal and unlisted legal moves preserve the exercise; reset permits repetition',()=>{
 const s=new tempoContext.Tempo(tempo);const before=s.game.fen();
 assert.equal(s.move('b8','b6').kind,'error');assert.equal(s.game.fen(),before);
 assert.equal(s.move('a7','a6').kind,'error');assert.equal(s.game.fen(),before);assert.equal(s.mistakes,2);
 s.move('b8','c6');assert.equal(s.move('a7','a6').kind,'complete');s.load(0);
 assert.equal(s.solved,false);assert.equal(s.mistakes,0);assert.equal(s.completed.has(0),true);
});
test('retreat: every annotated safe bishop move succeeds and unsafe squares still fail',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../data/lessons/retraite-des-pieces.json',import.meta.url),'utf8'));
 const data={...source,exercises:source.exercises.map(compileExercise)};
 for(const to of ['h5','f5','e6','c8','h3','f3','e2']){
  const s=new tempoContext.Tempo(data),result=s.move('g4',to);
  assert.equal(result.kind,'success',to);assert.equal(s.board[to],'B');assert.equal(s.board.g4,undefined);
  assert.equal(s.moves,1);assert.equal(s.mistakes,0);assert.ok(s.completed.has(0));assert.match(result.text,/sécurité/);
 }
 for(const to of ['d1','d7']){
  const s=new tempoContext.Tempo(data),before=s.game.fen();
  assert.equal(s.move('g4',to).kind,'error');assert.equal(s.game.fen(),before);assert.equal(s.mistakes,1);assert.equal(s.solved,false);
 }
 const s=new tempoContext.Tempo(data);s.load(7);
 assert.equal(s.move('d4','f5').kind,'success');assert.equal(s.mistakes,0);
});

test('accepted branches follow their own continuation, delayed reply and reset',()=>{
 const exercise=compileExercise({fen:new Chess().fen(),pgn:'1. e4 {Principal} (1. d4!! {Autre réponse} d5 {Réponse adverse} 2. c4 {Suite} (2. Nf3 $3 {Autre suite correcte})) (1. f3? {À revoir}) *'});
 const s=new tempoContext.Tempo({exercises:[exercise]});
 assert.equal(s.move('d2','d4',{deferReply:true}).pendingReply,true);assert.equal(s.mistakes,0);
 assert.equal(s.reply().text,'Réponse adverse');
 assert.equal(s.move('g1','f3').kind,'success');assert.equal(s.moves,2);
 s.load(0);assert.equal(s.line,exercise.line);assert.equal(s.move('f2','f3').kind,'error');
 assert.equal(s.move('e2','e4').kind,'success');
});

test('opponent replies can be deferred while the player position remains visible and input is blocked',()=>{
 const data={exercises:[{fen:new Chess().fen(),line:[
  {from:'e2',to:'e4',san:'e4',comment:'Le pion avance.',wrongMoves:[]},
  {from:'e7',to:'e5',san:'e5',comment:'Les noirs répondent.',wrongMoves:[]},
  {from:'g1',to:'f3',san:'Nf3',comment:'Le cavalier sort.',wrongMoves:[]}
 ],wrongMoves:[]}]};
 const s=new tempoContext.Tempo(data);
 const result=s.move('e2','e4',{deferReply:true});
 assert.equal(result.pendingReply,true);assert.equal(s.cursor,1);assert.equal(s.game.get('e7').type,'p');assert.equal(s.game.get('e5'),undefined);
 assert.equal(s.canSelect('g1'),false);assert.equal(s.move('g1','f3').kind,'waiting');assert.equal(s.mistakes,0);
 assert.equal(s.reply().text,'Les noirs répondent.');assert.equal(s.cursor,2);assert.equal(s.waitingForReply,false);assert.equal(s.game.get('e5').type,'p');
 assert.equal(s.move('g1','f3',{deferReply:true}).kind,'success');assert.equal(s.moves,2);
 s.load(0);assert.equal(s.waitingForReply,false);assert.equal(s.reply().kind,'idle');
});

test('all imported lessons replay their main solutions, including pedagogical boards without kings',()=>{
 for(const data of catalog){
  const moveExercises=data.exercises.filter(e=>e.challengeType!=='captureTheStar');
  const s=new tempoContext.Session({...data,exercises:moveExercises.length?moveExercises:[data.exercises[0]]});
  for(let i=0;i<moveExercises.length;i++){
   s.load(i);let guard=0;
   while(!s.solved){
    assert.ok(guard++<100,data.title);
    const node=moveExercises[i].line[s.cursor],result=s.move(node.from,node.to);
    assert.notEqual(result.kind,'error',data.title+' : '+result.text);
   }
  }
 }
});
test('catalog has all four ordered levels and source contents are retained',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../data/lesson-curriculum.json',import.meta.url),'utf8'));
 assert.deepEqual(manifest.sections.map(s=>s.color),['lime','green','orange','purple']);
 const report=JSON.parse(fs.readFileSync(new URL('../data/lesson-import-report.json',import.meta.url),'utf8'));
 assert.equal(report.imported.length,135);assert.equal(report.unavailable.length,0);
 assert.ok(catalog.length>=135);
 for(const entry of report.imported)assert.ok(catalog.some(l=>l.sourceLesson.path===entry.path),entry.path);
});
test('all unlocked personal lessons join one numbered progression with the existing library',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../data/personal-lesson-curriculum.json',import.meta.url),'utf8'));
 const unlocked=manifest.sections.flatMap(s=>s.courses.flatMap(c=>c.lessons.map(l=>({path:l.path,course:c.path}))));
 assert.equal(unlocked.length,53);
 for(const entry of unlocked)assert.ok(catalog.some(l=>l.sourceLesson.path===entry.path&&l.sourceLesson.course.path===entry.course),entry.path);
 const ordered=[...catalog].sort((a,b)=>a.libraryCurriculum.number-b.libraryCurriculum.number);
 assert.deepEqual(ordered.map(l=>l.libraryCurriculum.number),ordered.map((_,i)=>i+1));
 assert.equal(new Set(ordered.map(l=>l.sourceLesson.course.path+'/'+l.sourceLesson.path)).size,catalog.length);
 for(let i=1;i<ordered.length;i++)assert.ok(ordered[i].libraryCurriculum.section.order>=ordered[i-1].libraryCurriculum.section.order);
 const exchanges=ordered.findIndex(l=>l.sourceLesson.path==='echanges-intelligents');
 assert.equal(ordered[exchanges+1].sourceLesson.path,'tempo-aux-echecs');
 assert.equal(ordered[exchanges+2].sourceLesson.path,'batteries-aux-echecs');
 assert.ok(!catalog.some(l=>l.sourceLesson.path==='gagner-de-l-espace'&&l.sourceLesson.course.path==='strategie-avancee'));
 const report=JSON.parse(fs.readFileSync(new URL('../data/personal-lesson-import-report.json',import.meta.url),'utf8'));
 assert.equal(report.unavailable.length,0);assert.equal(report.imported.filter(l=>!l.existing).length,40);
});

test('pedagogical star exercises work for every imported piece type',()=>{
 const starContext=vm.createContext({LessonChess:Chess,BishopLesson:context.Lesson});
 vm.runInContext(fs.readFileSync(new URL('../src/tempo-lesson.js',import.meta.url),'utf8')+'\nglobalThis.Star=StarLesson;',starContext);
 for(const data of catalog){
  if(data.exercises[0].challengeType!=='captureTheStar')continue;
  const s=new starContext.Star(data);
  for(let i=0;i<data.exercises.length;i++){
   s.load(i);const exercise=data.exercises[i],target=exercise.targets;
   const queue=[{fen:exercise.fen,route:[]}],seen=new Set();let route;
   while(queue.length&&!route){
    const node=queue.shift();if(seen.has(node.fen))continue;seen.add(node.fen);
    const game=new Chess(node.fen,{skipValidation:true});
    for(const move of game.moves({verbose:true})){
     const nextRoute=[...node.route,move];if(move.to===target){route=nextRoute;break;}
     const next=new Chess(node.fen,{skipValidation:true});next.move(move);
     const fen=next.fen().split(' ');fen[1]=s.userColor;fen[4]='0';fen[5]='1';queue.push({fen:fen.join(' '),route:nextRoute});
    }
   }
   assert.ok(route,data.title+' : étoile inaccessible');
   for(const move of route)assert.notEqual(s.move(move.from,move.to).kind,'error');
   assert.equal(s.solved,true,data.title);
  }
 }
});
