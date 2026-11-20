import { audioBase } from './data';
export type SoundCue='arrival'|'bloom'|'turn'|'celebrate';
class WorldAudio{
  private ctx:AudioContext|null=null;
  private loaded=new Map<SoundCue,AudioBuffer>();
  private loading=new Map<SoundCue,Promise<AudioBuffer|null>>();
  private voices=new Set<AudioBufferSourceNode>();
  private generation=0;
  private recording=false;
  enabled=false;
  async enable(){
    if(!this.ctx)this.ctx=new AudioContext();
    await this.ctx.resume();
    this.enabled=this.ctx.state==='running';
    return this.enabled;
  }
  disable(){this.enabled=false;this.cancel();}
  cancel(){this.generation++;this.voices.forEach(v=>{try{v.stop()}catch{}});this.voices.clear();}
  setRecording(recording:boolean){this.recording=recording;if(recording)this.cancel();}
  async load(cue:SoundCue){
    if(this.loaded.has(cue))return this.loaded.get(cue)!;
    if(this.loading.has(cue))return this.loading.get(cue)!;
    const promise=(async()=>{try{
      const response=await fetch(audioBase+cue+'.wav',{cache:'force-cache'});
      if(!response.ok || !this.ctx)return null;
      const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
      this.loaded.set(cue,buffer);return buffer;
    }catch{return null}})();this.loading.set(cue,promise);return promise;
  }
  async play(cue:SoundCue){
    if(!this.enabled||!this.ctx||this.recording||document.hidden)return;
    const generation=++this.generation;
    const buffer=await this.load(cue);
    if(!this.enabled||!this.ctx||!buffer||this.recording||generation!==this.generation||document.hidden)return;
    this.voices.forEach(v=>{try{v.stop()}catch{}});this.voices.clear();
    const source=this.ctx.createBufferSource();source.buffer=buffer;
    const gain=this.ctx.createGain();gain.gain.value=.33;
    source.connect(gain);gain.connect(this.ctx.destination);
    source.addEventListener('ended',()=>{this.voices.delete(source);source.disconnect();gain.disconnect()},{once:true});
    this.voices.add(source);source.start();
  }
}
export const worldAudio=new WorldAudio();
