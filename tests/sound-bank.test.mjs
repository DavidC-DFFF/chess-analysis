import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(new URL('../src/sound-bank.js',import.meta.url),'utf8'),context);
const Bank=context.DefaultSoundBank;
const createStorage=(initial='on')=>{let value=initial;return {getItem:()=>value,setItem:(_,next)=>{value=next;}};};
function harness({automatic=true,reject=false,storage=createStorage(),BankClass=Bank}={}){
 const played=[],instances=[];
 class Audio {
  constructor(src){this.src=src;this.events=new Map();instances.push(this);}
  addEventListener(name,fn){this.events.set(name,fn);}
  removeEventListener(name){this.events.delete(name);}
  pause(){this.paused=true;}
  play(){played.push(this.src);if(reject)return Promise.reject(new Error('Blocked'));if(automatic)queueMicrotask(()=>this.events.get('ended')?.());return Promise.resolve();}
 }
 return {bank:new BankClass({AudioClass:Audio,storage}),played,instances};
}
test('Default: all twelve local files contain MP3 data',()=>{
 const directory=new URL('../audio/default/',import.meta.url);
 const files=fs.readdirSync(directory).filter(name=>name.endsWith('.mp3'));
 assert.equal(files.length,12);
 for(const file of files){const bytes=fs.readFileSync(new URL(file,directory));assert.ok(bytes.length>1000,file);assert.ok(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0,file);}
});
test('Default: chooses capture, check, castle, promotion and opponent sounds',()=>{
 const {bank}=harness();
 for(const [move,sound] of [[{san:'Nf3'},'move-self'],[{san:'Bxe4'},'capture'],[{san:'Qxh7+'},'move-check'],[{san:'Qh7#'},'move-check'],[{san:'O-O'},'castle'],[{san:'exd8=Q',promotion:'q'},'promote'],[{flags:'e'},'capture']])assert.equal(bank.moveSound(move),sound);
 assert.equal(bank.moveSound({san:'e5'},true),'move-opponent');
});
test('Default: an exercise plays its move then completion; mute persists',async()=>{
 const storage=createStorage(),{bank,played}=harness({storage});
 await bank.playMove({captured:true},{finished:true});
 assert.deepEqual(played,['./audio/default/capture.mp3','./audio/default/game-end.mp3']);
 bank.setEnabled(false);await bank.play('illegal');assert.equal(played.length,2);assert.equal(new Bank({storage}).enabled,false);
});
test('Default: muting interrupts playback and cancels queued completion',async()=>{
 const {bank,played,instances}=harness({automatic:false});
 const sequence=bank.playMove({san:'Nc6'},{finished:true});
 bank.setEnabled(false);await sequence;
 assert.equal(instances[0].paused,true);assert.equal(played.length,1);
});
test('Default: blocked playback and unavailable storage do not break the page',async()=>{
 const {bank}=harness({reject:true});await bank.play('move-self');
 const storage={getItem(){throw new Error('storage unavailable');},setItem(){throw new Error('storage unavailable');}};
 const {bank:offline}=harness({storage});offline.setEnabled(false);await offline.play('illegal');
});
test('Default: browser timers retain their Window receiver during playback',async()=>{
 const browserContext=vm.createContext({underlyingSchedule:setTimeout,underlyingCancel:clearTimeout});
 vm.runInContext(`
 function setTimeout(...args){if(this!==globalThis)throw new TypeError('Illegal invocation');return underlyingSchedule(...args);}
 function clearTimeout(timer){if(this!==globalThis)throw new TypeError('Illegal invocation');underlyingCancel(timer);}
 `+fs.readFileSync(new URL('../src/sound-bank.js',import.meta.url),'utf8'),browserContext);
 const {bank,played}=harness({BankClass:browserContext.DefaultSoundBank});
 await bank.playMove({san:'Nc6'});
 assert.deepEqual(played,['./audio/default/move-self.mp3']);
});
