import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Chess } from 'chess.js';

const html=fs.readFileSync(new URL('../ouvertures.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const data=vm.runInNewContext(script.slice(script.indexOf('const raw = '),script.indexOf('const names='))+';({raw,trainingGroups})');

test('aucune réponse ne répète une autre ligne ou ne s’arrête au milieu de sa suite',()=>{
 const lines=data.trainingGroups.flatMap(group=>group.lines);
 for(const a of lines)for(const b of lines){
  if(a===b||a.moves.length>b.moves.length)continue;
  assert.ok(!a.moves.every((move,i)=>move.uci===b.moves[i].uci),`${a.name} est incluse dans ${b.name}`);
 }
});

test('les 11 ouvertures et les 11 variantes ont des coups SAN/UCI légaux et expliqués',()=>{
 assert.equal(data.raw.length,11);
 assert.equal(data.trainingGroups.reduce((n,g)=>n+g.lines.length,0),11);
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

test('la variante Bxd5 continue jusqu’à Qxc6 et retire seulement le petit roque blanc',()=>{
 const line=data.trainingGroups[0].lines.find(line=>line.name==='Capture du fou · 5.Bxd5');
 assert.deepEqual(Array.from(line.moves.slice(-4),move=>move.san),['dxc6','Qxg2','Rf1','Qxc6']);
 const game=new Chess();for(const move of line.moves)game.move(move.san,{strict:true});
 assert.deepEqual(game.getCastlingRights('w'),{k:false,q:true});
 assert.equal(game.get('f1')?.type,'r');assert.equal(game.get('c6')?.type,'q');
 const pieces=game.board().flat().filter(Boolean);
 assert.equal(pieces.filter(p=>p.color==='b'&&p.type==='p').length-pieces.filter(p=>p.color==='w'&&p.type==='p').length,1);
 assert.equal(pieces.filter(p=>p.color==='b'&&['n','b'].includes(p.type)).length,pieces.filter(p=>p.color==='w'&&['n','b'].includes(p.type)).length);
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

test('la contre-attaque b5 conserve toute sa suite après l’échange en c6',()=>{
 const index=data.trainingGroups[0].lines.findIndex(line=>line.name==='Contre-attaque · 5…b5');
 const line=data.trainingGroups[0].lines[index];
 assert.deepEqual(Array.from(line.moves.slice(9),move=>move.san),['b5','Bxb5','Qxd5','Bxc6+','Qxc6','O-O','Bb7','f3','h6','Nh3','O-O-O']);
 const s=session(index,11);s.run('playTrainingMove("d8","d5")');
 assert.equal(s.state().step,12);
 assert.equal(s.state().opening.moves[s.state().step].san,'Bxc6+');
 s.run('step=19;playTrainingMove("e8","c8")');
 assert.equal(s.state().step,line.moves.length);
 assert.equal(s.state().wrongAnswers,0);
});

test('une bonne réponse explique la rupture centrale',()=>{
 const s=session();s.run('playTrainingMove("d7","d5")');
 assert.equal(s.state().step,8);
 assert.equal(s.state().correctAnswers,1);
 assert.match(s.state().feedback,/Bonne réponse.*diagonale/);
});

test('le mode mélangé accepte une autre réponse étudiée et suit sa branche',()=>{
 const s=session();s.run('trainingOrder="random";playTrainingMove("f6","e4")');
 assert.equal(s.state().step,8);
 assert.equal(s.state().opening.moves[7].san,'Nxe4');
 assert.equal(s.state().wrongAnswers,0);
 const second=session(0,9);second.run('trainingOrder="random";playTrainingMove("b7","b5")');
 assert.equal(second.state().opening.moves[9].san,'b5');
 assert.equal(second.state().step,10);
});

test('une variante sélectionnée s’adapte à une autre réponse du répertoire',()=>{
 const s=session();s.run('variantFilter=opening.name;playTrainingMove("f6","e4")');
 assert.equal(s.state().step,8);
 assert.equal(s.state().wrongAnswers,0);
 assert.equal(s.state().opening.moves[7].san,'Nxe4');
 assert.equal(s.run('variantFilter'),s.state().opening.name);
 assert.match(s.state().feedback,/Bonne réponse/);
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

test('la rotation propose chaque variante dans l’ordre avant de recommencer',()=>{
 const s=session();const visited=new Set();
 for(let i=0;i<data.trainingGroups[0].lines.length;i++){s.run('startExercise()');visited.add(s.state().opening.name);assert.equal(s.state().opening.name,data.trainingGroups[0].lines[i].name);assert.equal(s.state().step,7)}
 assert.equal(visited.size,data.trainingGroups[0].lines.length);
 const previous=s.state().opening.name;s.run('startExercise()');assert.notEqual(s.state().opening.name,previous);
 assert.equal(s.state().opening.name,data.trainingGroups[0].lines[0].name);
 assert.equal(s.run('trainingCycle().round'),2);
});

test('la rotation ne répète pas la même variante après un changement de réponse au dernier exercice',()=>{
 const s=session();for(let i=0;i<data.trainingGroups[0].lines.length;i++)s.run('startExercise()');
 s.run('playTrainingMove("d7","d5")');
 const current=s.state().opening.name;
 s.run('startExercise()');
 assert.notEqual(s.state().opening.name,current);
});

test('la rotation accepte une autre branche puis passe à une variante encore non vue',()=>{
 const s=session();s.run('startExercise()');
 s.run('playTrainingMove("f6","e4")');
 assert.equal(s.state().opening.moves[7].san,'Nxe4');
 assert.equal(s.state().step,8);
 assert.equal(s.state().wrongAnswers,0);
 const seen=s.run('[...trainingCycle().seen]');
 s.run('startExercise()');assert.ok(!seen.includes(s.state().opening.name));
});

test('passer de l’aléatoire à la rotation en fin de tour continue dans l’ordre sans répéter la variante',()=>{
 const s=session();s.run('trainingOrder="random";Math.random=()=>0');
 for(let i=0;i<data.trainingGroups[0].lines.length;i++)s.run('startExercise()');
 assert.equal(s.state().opening.name,data.trainingGroups[0].lines[0].name);
 s.run('trainingOrder="rotation"');
 for(let i=1;i<=data.trainingGroups[0].lines.length;i++){
  s.run('startExercise()');
  assert.equal(s.state().opening.name,data.trainingGroups[0].lines[i%data.trainingGroups[0].lines.length].name);
 }
 assert.equal(s.run('trainingCycle().round'),2);
});

test('le parcours aléatoire ne répète aucune variante pendant un tour',()=>{
 const s=session();s.run('trainingOrder="random"');
 for(let round=1;round<=3;round++){
  const visited=new Set();
  for(let i=0;i<data.trainingGroups[0].lines.length;i++){s.run('startExercise()');visited.add(s.state().opening.name)}
  assert.equal(visited.size,data.trainingGroups[0].lines.length);
  assert.equal(s.run('trainingCycle().round'),round);
 }
});

test('changer de parcours conserve les variantes déjà vues ; recommencer ne fait pas avancer',()=>{
 const s=session();s.run('startExercise();startExercise();trainingOrder="random"');
 const seen=s.run('[...trainingCycle().seen]');
 s.run('startExercise()');assert.ok(!seen.includes(s.state().opening.name));
 const current=s.state().opening.name;
 s.run('startExercise(true)');assert.equal(s.state().opening.name,current);
 assert.equal(s.run('trainingCycle().seen.size'),3);
 s.run('trainingOrder="rotation";startExercise()');
 assert.equal(s.run('trainingCycle().seen.size'),4);
});

test('Learn commence au premier coup et revenir en Test conserve la variante et le parcours',()=>{
 const s=session();s.run('startExercise()');
 const current=s.state().opening.name;
 s.run('learningMode="learn";startExercise(true)');
 assert.equal(s.state().step,0);
 assert.equal(s.state().opening.name,current);
 assert.equal(s.run('trainingCycle().seen.size'),1);
 s.run('learningMode="test";startExercise(true)');
 assert.equal(s.state().step,7);
 assert.equal(s.state().opening.name,current);
 assert.equal(s.run('trainingCycle().seen.size'),1);
});

test('Learn ne déclenche pas de réponse automatique et accepte une autre branche étudiée',()=>{
 const s=session();s.run(script.slice(script.indexOf('function autoTurn()'),script.indexOf('function cancelReply()')));
 s.run('learningMode="learn";trainingOrder="random";step=0');
 assert.equal(s.run('autoTurn()'),false);
 s.run('step=7;playTrainingMove("f6","e4")');
 assert.equal(s.state().step,8);
 assert.equal(s.state().opening.moves[7].san,'Nxe4');
 assert.equal(s.state().correctAnswers,0);
 assert.equal(s.state().wrongAnswers,0);
});
