import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Chess} from 'chess.js';
import {compileExercise} from '../tools/compile-lesson.mjs';

const source=JSON.parse(fs.readFileSync(new URL('../data/lessons/mes-occasions-manquees-2026-10-30.json',import.meta.url),'utf8'));
const lesson={...source,exercises:source.exercises.map(compileExercise)};
const ctx=vm.createContext({LessonChess:Chess});
vm.runInContext(fs.readFileSync(new URL('../src/tempo-lesson.js',import.meta.url),'utf8')+';globalThis.Session=TempoLesson;',ctx);

test('les cinq exercices retrouvent les positions exactes de la partie sans révéler leur solution',()=>{
 const game=new Chess();game.loadPgn(source.sourceGame.pgn);
 const history=game.history({verbose:true});
 assert.deepEqual(lesson.exercises.map(e=>e.moveNumber),[21,22,27,67,71]);
 assert.deepEqual(lesson.exercises.map(e=>e.line[0].san),['Qe8#','Qe8#','Nxg5','Nf3#','Qf5#']);
 for(const exercise of lesson.exercises){
  assert.equal(exercise.fen,history[2*exercise.moveNumber-3].after);
  assert.equal(exercise.playedMove,history[2*exercise.moveNumber-2].san);
  assert.ok(exercise.line[0].hint.length>20);
  assert.doesNotMatch(exercise.prompt,/De8|Cxg5|Cf3|Df5|Qe8|Nxg5|Nf3|Qf5/);
  const position=new Chess(exercise.fen),move=position.move(exercise.line[0].san);
  if(exercise.goal==='mate')assert.equal(position.isCheckmate(),true);
  else {assert.equal(move.captured,'q');assert.equal(position.move('hxg5').captured,'n');}
 }
});

test('les coups joués dans la partie sont refusés sans déplacer les pièces, puis les solutions réussissent',()=>{
 const session=new ctx.Session(lesson);
 for(let i=0;i<lesson.exercises.length;i++){
  session.load(i);const exercise=lesson.exercises[i],before=session.game.fen();
  const actual=new Chess(before).move(exercise.playedMove);
  const rejected=session.move(actual.from,actual.to);
  assert.equal(rejected.kind,'error');assert.equal(session.game.fen(),before);
  assert.equal(rejected.text,exercise.wrongMoves[0].comment);
  const expected=exercise.line[0],result=session.move(expected.from,expected.to);
  assert.equal(result.kind,'success');assert.equal(result.text,expected.comment);
  assert.equal(session.solved,true);assert.equal(session.waitingForReply,false);
 }
 assert.equal(session.completed.size,5);
 session.load(0);assert.equal(session.solved,false);assert.equal(session.mistakes,0);
});

test('la leçon personnelle est intégrée au catalogue autonome dans Mes parties',()=>{
 const html=fs.readFileSync(new URL('../lecons.html',import.meta.url),'utf8');
 const catalog=JSON.parse(html.match(/<script type="application\/json" id="lesson-catalog">([\s\S]*?)<\/script>/)[1]);
 const embedded=catalog.find(l=>l.sourceLesson.path===source.sourceLesson.path);
 assert.ok(embedded);assert.equal(embedded.exercises.length,5);
 assert.equal(embedded.libraryCurriculum.course.path,'mes-parties');
 assert.deepEqual(embedded.exercises,lesson.exercises);
});
