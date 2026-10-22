// Local Default sound bank. This file is also embedded in the standalone pages.
(() => {
  class DefaultSoundBank {
    constructor({ base = './audio/default/', AudioClass = globalThis.Audio, storage, schedule = (callback, delay) => globalThis.setTimeout(callback, delay), cancel = timer => globalThis.clearTimeout(timer) } = {}) {
      this.base=base;this.AudioClass=AudioClass;this.schedule=schedule;this.cancel=cancel;
      this.storage=storage;this.enabled=true;this.current=null;this.finish=null;this.generation=0;
      if(!this.storage)try{this.storage=globalThis.localStorage;}catch{}
      try{this.enabled=this.storage?.getItem('chess-analysis.sound')!=='off';}catch{}
    }
    stop(){this.generation++;if(this.current){try{this.current.pause();}catch{}this.current=null;}this.finish?.(false);}
    setEnabled(enabled){this.enabled=Boolean(enabled);if(!this.enabled)this.stop();try{this.storage?.setItem('chess-analysis.sound',this.enabled?'on':'off');}catch{}this.updateButton();}
    attach(button){if(!button)return;this.button=button;button.onclick=()=>this.setEnabled(!this.enabled);this.updateButton();}
    updateButton(){if(!this.button)return;this.button.textContent=this.enabled?'Son : activé':'Son : coupé';this.button.setAttribute('aria-pressed',String(this.enabled));this.button.title='Banque de sons Default';}
    moveSound(move={},opponent=false){
      const san=move.san||'',flags=move.flags||'';
      if(/[+#]/.test(san))return 'move-check';
      if(move.promotion||flags.includes('p'))return 'promote';
      if(/^(O|0)-(O|0)/.test(san)||/[kq]/.test(flags))return 'castle';
      if(move.captured||san.includes('x')||/[ce]/.test(flags))return 'capture';
      return opponent?'move-opponent':'move-self';
    }
    play(name){return this.playSequence([name]);}
    playMove(move, {opponent=false,finished=false}={}){return this.playSequence([this.moveSound(move,opponent),...(finished?['game-end']:[])]);}
    async playSequence(names){
      this.stop();const generation=this.generation;
      if(!this.enabled||typeof this.AudioClass!=='function')return;
      for(const name of names){
        if(!this.enabled||generation!==this.generation)return;
        const ok=await new Promise(resolve=>{
          let audio,timer,done=false;
          const finish=success=>{if(done)return;done=true;this.cancel(timer);if(audio){audio.removeEventListener('ended',ended);audio.removeEventListener('error',failed);}if(this.current===audio)this.current=null;if(this.finish===finish)this.finish=null;resolve(success);};
          const ended=()=>finish(true),failed=()=>finish(false);
          try{
            audio=new this.AudioClass(this.base+name+'.mp3');audio.volume=.6;this.current=audio;this.finish=finish;
            audio.addEventListener('ended',ended);audio.addEventListener('error',failed);
            timer=this.schedule(()=>{try{audio.pause();}catch{}finish(false);},8000);
            const playing=audio.play();if(playing?.catch)playing.catch(failed);
          }catch{finish(false);}
        });
        if(!ok)return;
      }
    }
  }
  globalThis.DefaultSoundBank=DefaultSoundBank;
})();
