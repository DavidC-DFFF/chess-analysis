import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../src/lesson-progress.js',import.meta.url),'utf8'),ctx);
const lesson={sourceLesson:{path:'example'},exercises:[{},{}]};
function setup(){
 const values=new Map();const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 return {values,storage,progress:new ctx.LessonProgress(storage)};
}
function solve(progress,index,{mistakes=0,hinted=false}={}){
 const session={lesson,index,mistakes,hinted,solved:true,completed:new Set()};progress.restore(session);session.completed.add(index);progress.save(session);
}

test('a lesson stays unfinished until every exercise is completed, and results persist',()=>{
 const {storage,progress}=setup();
 assert.equal(progress.status(lesson).state,'new');progress.start(lesson);
 assert.equal(progress.status(lesson).state,'progress');
 solve(progress,0);assert.equal(progress.status(lesson).state,'progress');
 solve(progress,1);assert.equal(progress.status(lesson).state,'perfect');
 const restored=new ctx.LessonProgress(storage),session={lesson};restored.restore(session);
 assert.equal(restored.status(lesson).state,'perfect');assert.deepEqual([...session.completed],[0,1]);
});

test('mistakes or hints make completed lessons orange; clean repetitions can improve the best result',()=>{
 for(const attempt of [{mistakes:1},{hinted:true}]){
  const {progress}=setup();solve(progress,0,attempt);solve(progress,1);
  assert.equal(progress.status(lesson).state,'completed');
  solve(progress,0);assert.equal(progress.status(lesson).state,'perfect');
  solve(progress,0,{mistakes:3,hinted:true});assert.equal(progress.status(lesson).state,'perfect');
  progress.save({lesson,completed:new Set(),solved:false});
  assert.equal(progress.status(lesson).state,'perfect');
 }
});

test('legacy completions are retained without inventing a perfect result',()=>{
 const {storage,values}=setup();values.set('chess-analysis.lesson-progress',JSON.stringify({example:[0,1,99,-1]}));
 const progress=new ctx.LessonProgress(storage),session={lesson};progress.restore(session);
 assert.deepEqual([...session.completed],[0,1]);assert.equal(progress.status(lesson).state,'completed');
 assert.match(progress.status(lesson).label,/ancien résultat/);
 solve(progress,0);assert.equal(progress.status(lesson).state,'completed');
 solve(progress,1);assert.equal(progress.status(lesson).state,'perfect');
});

test('reset removes all results for the selected lesson, including legacy results, after reload',()=>{
 for(const mistakes of [0,1]){
  const {storage,progress}=setup();solve(progress,0,{mistakes});solve(progress,1);
  progress.start(lesson);progress.reset(lesson);
  assert.equal(progress.status(lesson).state,'new');assert.equal(progress.status(lesson).label,'');
  const reloaded=new ctx.LessonProgress(storage),session={lesson};reloaded.restore(session);
  assert.equal(reloaded.status(lesson).state,'new');assert.equal(session.completed.size,0);
 }
 const {storage,values}=setup();values.set('chess-analysis.lesson-progress',JSON.stringify({example:[0,1],other:[0]}));
 const progress=new ctx.LessonProgress(storage);progress.reset(lesson);
 assert.equal(progress.status(lesson).state,'new');assert.deepEqual(Array.from(progress.completed.other),[0]);
});

test('opening resumes the latest visited non-green lesson, skipping green and removed entries',()=>{
 const {storage,progress}=setup();
 const second={...lesson,sourceLesson:{path:'second'}},third={...lesson,sourceLesson:{path:'third'}};
 const lessons=[lesson,second,third];
 assert.equal(progress.resume(lessons),lesson);
 progress.visit(second);progress.start(second);
 assert.equal(new ctx.LessonProgress(storage).resume(lessons),second);
 progress.visit(third);progress.visit(lesson);solve(progress,0);solve(progress,1);
 assert.equal(new ctx.LessonProgress(storage).resume(lessons),third);
 progress.visit({sourceLesson:{path:'deleted'}});
 assert.equal(progress.resume(lessons),third);
 progress.reset(lesson);progress.visit(lesson);assert.equal(progress.resume(lessons),lesson);
});

test('after the first green lesson, opening falls forward to the next non-green lesson',()=>{
 const {progress}=setup(),second={...lesson,sourceLesson:{path:'second'}};
 progress.visit(lesson);solve(progress,0);solve(progress,1);
 assert.equal(progress.resume([lesson,second]),second);
 assert.equal(progress.resume([lesson]),lesson);
});

test('unavailable or corrupted browser storage does not prevent practice',()=>{
 for(const storage of [undefined,{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},{getItem(){return 'null';},setItem(){}}]){
  const progress=new ctx.LessonProgress(storage);assert.equal(progress.status(lesson).state,'new');
  solve(progress,0);solve(progress,1);assert.equal(progress.status(lesson).state,'perfect');
 }
});
