import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Chess} from 'chess.js';

const html=fs.readFileSync(new URL('../ouvertures.html',import.meta.url),'utf8');
const courses=JSON.parse(html.match(/<script type="application\/json" id="opening-course-data">([\s\S]*?)<\/script>/)[1]);
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function controller(course,line){
 const elements=new Map();
 const ctx=vm.createContext({TrainingChess:Chess,opening:line,mode:'autonomous',step:0,selected:'',preview:null,hintLevel:0,
  document:{getElementById(id){if(!elements.has(id))elements.set(id,{textContent:JSON.stringify(courses)});return elements.get(id);}},
  render(){},renderSequence(){},cancelReply(){},courseMoves:line=>line.map(node=>({...node,uci:node.from+node.to+(node.promotion||''),note:node.comment})),
 });
 ctx.go=n=>{ctx.step=n;};
 vm.runInContext(script.slice(script.indexOf('let training=null'),script.indexOf('function initialBoard()')),ctx);
 ctx.course=course;vm.runInContext('training=course;variantFilter=opening.name;startExercise(true)',ctx);
 return {ctx,run:code=>vm.runInContext(code,ctx)};
}

test('50 opening courses retain all 500 source exercises and legal positions',()=>{
 assert.equal(courses.length,50);assert.equal(courses.reduce((n,c)=>n+c.lines.length,0),500);
 const source=JSON.parse(fs.readFileSync(new URL('../data/opening-courses.json',import.meta.url),'utf8'));
 for(const course of courses){
  assert.equal(course.lines.length,10);assert.ok(course.family);assert.match(course.sourceUrl,/chess\.com\/lessons\//);
  const original=source.find(c=>c.id===course.id);assert.equal(original.questions.length,course.lines.length);
  for(const line of course.lines){
   assert.ok(line.prompt.length>0);const game=new Chess(line.fen);
   const ctx=vm.createContext({TrainingChess:Chess,files:'abcdefgh',opening:line});
   vm.runInContext(script.slice(script.indexOf('function initialBoard()'),script.indexOf('function squareAt(')),ctx);
   for(let n=0;n<=line.moves.length;n++){
    const actual=vm.runInContext(`boardAt(${n})`,ctx);
    assert.deepEqual(JSON.parse(JSON.stringify(actual)),Object.fromEntries(game.board().flat().filter(Boolean).map(p=>[p.square,p.color+p.type])));
    if(n<line.moves.length){const move=line.moves[n];assert.equal(game.move({from:move.from,to:move.to,promotion:move.promotion}).san,move.san);}
   }
  }
 }
});

test('the opening trainer accepts all 500 main solutions for the correct camp without switching exercises',()=>{
 for(const course of courses)for(const line of course.lines){
  const s=controller(course,line);assert.equal(s.ctx.mode,line.userColor==='w'?'white':'black');
  assert.equal(s.ctx.flipped,line.userColor==='b');assert.equal(s.ctx.step,0);
  assert.equal(s.run('trainingCandidates().length'),1);
  let answered=0;
  while(s.ctx.step<line.moves.length){
   const node=line.moves[s.ctx.step];
   if(s.run('openingTurn()')===line.userColor){
    s.ctx.from=node.from;s.ctx.to=node.to;s.run('playTrainingMove(from,to)');answered++;
   }else s.ctx.step++;
   assert.equal(s.run('wrongAnswers'),0,course.name+' '+line.name);
   assert.equal(s.ctx.opening.name,line.name);
  }
  assert.equal(s.run('correctAnswers'),answered);
  s.run('startExercise(true)');assert.equal(s.ctx.step,0);
 }
});

test('annotated wrong moves keep the opening position and display the source explanation',()=>{
 let checked=0;
 for(const course of courses)for(const line of course.lines){
  const wrong=line.moves[0].wrongMoves?.find(move=>move.comment);if(!wrong)continue;
  const s=controller(course,line);s.ctx.from=wrong.from;s.ctx.to=wrong.to;s.run('playTrainingMove(from,to)');
  assert.equal(s.ctx.step,0);assert.equal(s.run('wrongAnswers'),1);assert.ok(s.run('feedback').includes(wrong.comment));checked++;
 }
 assert.ok(checked>100);
});

test('Chess Analysis has a local favicon and consistent titles on all pages',()=>{
 for(const page of ['index.html','ouvertures.html','lecons.html']){
  const text=fs.readFileSync(new URL('../'+page,import.meta.url),'utf8');
  assert.match(text,/<title>Chess Analysis · /);assert.match(text,/<link rel="icon" href="\.\/favicon.svg"/);
 }
 assert.equal(fs.readFileSync(new URL('../favicon.svg',import.meta.url),'utf8'),fs.readFileSync(new URL('../public/favicon.svg',import.meta.url),'utf8'));
});
