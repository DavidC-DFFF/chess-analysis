import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Chess } from 'chess.js';

const html=fs.readFileSync(new URL('../ouvertures.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const data=vm.runInNewContext(script.slice(script.indexOf('const raw = '),script.indexOf('const names='))+';({raw,trainingGroups})');

test('les 11 ouvertures et les 12 variantes ont des coups SAN/UCI légaux et expliqués',()=>{
 assert.equal(data.raw.length,11);
 assert.equal(data.trainingGroups.reduce((n,g)=>n+g.lines.length,0),12);
 const lines=[...data.raw.map(([name,,,moves])=>({name,moves:moves.map(([san,uci,note])=>({san,uci,note}))})),...data.trainingGroups.flatMap(g=>g.lines)];
 for(const line of lines){
  const game=new Chess();
  for(const move of line.moves){
   const played=game.move({from:move.uci.slice(0,2),to:move.uci.slice(2,4),promotion:move.uci[4]});
   assert.equal(played.san,move.san,line.name);
   assert.ok(move.note.length>20,line.name+' : explication manquante');
  }
 }
});

test('le plateau autonome reproduit toutes les captures et tous les roques',()=>{
 const helpers=script.slice(script.indexOf('function initialBoard()'),script.indexOf('function squareAt('));
 for(const line of data.trainingGroups.flatMap(g=>g.lines)){
  const ctx=vm.createContext({files:'abcdefgh',opening:line});vm.runInContext(helpers,ctx);
  const game=new Chess();
  for(let n=0;n<=line.moves.length;n++){
   const actual=vm.runInContext(`boardAt(${n})`,ctx);
   const expected=Object.fromEntries(game.board().flat().filter(Boolean).map(p=>[p.square,p.color+p.type]));
   assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected,line.name+' : position '+n);
   if(n<line.moves.length)game.move(line.moves[n].san,{strict:true});
  }
 }
});

function session(lineIndex=0,step=7){
 const group=data.trainingGroups[0];
 const elements=new Map();
 const ctx=vm.createContext({
  TrainingChess:Chess,files:'abcdefgh',trainingGroups:data.trainingGroups,
  openings:[],opening:group.lines[lineIndex],mode:'black',step,
  selected:'',preview:null,hintLevel:0,
  document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id)}},
  render(){},renderSequence(){},cancelReply(){},
 });
 ctx.go=n=>{ctx.step=n};
 vm.runInContext(script.slice(script.indexOf('let training=null'),script.indexOf('function initialBoard()')),ctx);
 vm.runInContext('training=trainingGroups[0]',ctx);
 return {run:code=>vm.runInContext(code,ctx),state:()=>vm.runInContext('({step,opening,feedback,correctAnswers,wrongAnswers,assists})',ctx)};
}

test('une bonne réponse explique la rupture centrale',()=>{
 const s=session();s.run('playTrainingMove("d7","d5")');
 assert.equal(s.state().step,8);
 assert.equal(s.state().correctAnswers,1);
 assert.match(s.state().feedback,/Bonne réponse.*diagonale/);
});

test('le mode mélangé accepte une autre réponse étudiée et suit sa branche',()=>{
 const s=session();s.run('playTrainingMove("f6","e4")');
 assert.equal(s.state().step,8);
 assert.equal(s.state().opening.moves[7].san,'Nxe4');
 assert.equal(s.state().wrongAnswers,0);
 const second=session(0,9);second.run('playTrainingMove("b7","b5")');
 assert.equal(second.state().opening.moves[9].san,'b5');
 assert.equal(second.state().step,10);
});

test('une variante imposée distingue un coup légal hors répertoire',()=>{
 const s=session();s.run('variantFilter=opening.name;playTrainingMove("f6","e4")');
 assert.equal(s.state().step,7);
 assert.equal(s.state().wrongAnswers,1);
 assert.match(s.state().feedback,/est légal.*pas partie/);
});

test('h6 permet la fourchette sur la dame et la tour ; la position reste en place',()=>{
 const s=session();s.run('playTrainingMove("h7","h6")');
 assert.equal(s.state().step,7);
 assert.match(s.state().feedback,/Nxf7.*dame.*tour/);
 assert.equal(s.state().wrongAnswers,1);
});

test('un déplacement illégal explique le refus sans avancer',()=>{
 const s=session();s.run('playTrainingMove("f6","f4")');
 assert.equal(s.state().step,7);
 assert.match(s.state().feedback,/trajet.*déplacement/);
});

test('montrer une réponse compte une aide, pas une réussite autonome',()=>{
 const s=session();s.run('playTrainingMove("d7","d5",true)');
 assert.equal(s.state().step,8);
 assert.equal(s.state().correctAnswers,0);
 assert.equal(s.state().assists,1);
 assert.match(s.state().feedback,/Réponse montrée/);
});

test('le sac de variantes parcourt chaque ligne avant de se renouveler',()=>{
 const s=session();const visited=new Set();
 for(let i=0;i<7;i++){s.run('startExercise()');visited.add(s.state().opening.name);assert.equal(s.state().step,7)}
 assert.equal(visited.size,7);
 const previous=s.state().opening.name;s.run('startExercise()');assert.notEqual(s.state().opening.name,previous);
});
