import {audioBase} from '../data';

export const ACOUSTIC_CUES=[
 'foot-grass','foot-wood','move-start','peer-hello','mentor-hello','chat-open','chat-choice',
 'correct','try-again','seed-find','page-turn','region-enter','voice-rise','assessment-start',
 'assessment-finish','furniture-place','quest-accept','quest-finish','map-open','festival-cheer',
 'classroom-door','memory-recall'
 ,'region-academy','region-orchard','region-workshop','region-canyon','region-wetlands',
 'region-harbor','region-picturehouse','region-letterbird','region-together',
 'region-clockwork','region-mooncake','region-observatory',
 'hop-takeoff','hop-land','dash-boost','sneak-rustle','dodge-roll',
 'berry-pick','net-swish','net-catch','net-miss','dig-scrape','dig-discover',
 'garden-till','garden-water','garden-bloom','fish-cast','fish-bite',
 'fish-reel','fish-escape','tool-equip','bag-open','craft-done',
 'gift-give','quest-claimed','friend-wave'
] as const;
export type AcousticCue=typeof ACOUSTIC_CUES[number];
type ActiveVoice={source:AudioBufferSourceNode;gain:GainNode;family:string;started:number};
const familyOf=(cue:AcousticCue):string=>{
 if(cue.startsWith('region-'))return 'district-atmosphere';
 if(cue==='foot-grass'||cue==='foot-wood')return 'footstep';
 if(cue==='hop-takeoff'||cue==='hop-land')return 'hop';
 if(cue==='dash-boost'||cue==='sneak-rustle'||cue==='dodge-roll')return 'movement';
 if(cue==='tool-equip')return 'equipment';
 if(cue==='net-swish'||cue==='net-catch'||cue==='net-miss')return 'net';
 if(cue==='fish-cast'||cue==='fish-bite'||cue==='fish-reel'||cue==='fish-escape')return 'fishing';
 if(cue==='correct'||cue==='try-again')return 'answer';
 if(cue==='peer-hello'||cue==='mentor-hello'||cue==='chat-open'||cue==='chat-choice')return 'dialogue';
 if(cue==='assessment-start'||cue==='assessment-finish')return 'assessment';
 return cue;
};
class AcademySound{
 private context:AudioContext|null=null;
 private master:DynamicsCompressorNode|null=null;
 private requestingEnable=false;
 private enableGeneration=0;
 private queuedCue:{cue:AcousticCue;intensity:number;exclusive:boolean;variant:number}|null=null;
 private decoded=new Map<AcousticCue,AudioBuffer>();
 private loads=new Map<AcousticCue,Promise<AudioBuffer|null>>();
 private voices=new Set<ActiveVoice>();
 private lastPlayed=new Map<string,number>();
 private recording=false;
 enabled=false;
 volume=.65;
 async enable(){
  const generation=++this.enableGeneration;
  this.requestingEnable=true;
  if(!this.context){
   this.context=new AudioContext({latencyHint:'interactive'});
   this.master=this.context.createDynamicsCompressor();
   this.master.threshold.value=-13;this.master.knee.value=8;this.master.ratio.value=3;
   this.master.attack.value=.003;this.master.release.value=.16;
   this.master.connect(this.context.destination);
  }
  await this.context.resume();
  // User mute wins over any pending first-gesture resume promise.
  if(generation!==this.enableGeneration||!this.requestingEnable)return false;
  this.enabled=this.context.state==='running';
  if(this.enabled)void this.preload(['foot-grass','peer-hello','chat-open','page-turn','correct','try-again',
   'tool-equip','hop-takeoff','hop-land','berry-pick','net-swish','garden-till','fish-cast','bag-open']);
  if(this.enabled&&this.queuedCue){
   const queued=this.queuedCue;this.queuedCue=null;
   this.play(queued.cue,queued);
  }
  return this.enabled;
 }
 disable(){
  ++this.enableGeneration;
  this.requestingEnable=false;this.queuedCue=null;this.enabled=false;this.releaseAll(.12);
 }
 async preload(cues:AcousticCue[]){await Promise.all(cues.map(cue=>this.load(cue)))}
 setVolume(volume:number){this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.65))}
 setRecording(recording:boolean){this.recording=recording;if(recording)this.releaseAll(.04)}
 private async load(cue:AcousticCue):Promise<AudioBuffer|null>{
  const existing=this.decoded.get(cue);if(existing)return existing;
  const ongoing=this.loads.get(cue);if(ongoing)return ongoing;
  const promise=(async()=>{
   try{
    const url=audioBase+'wildwood/'+cue+'.wav';
    // An offline world never sends doomed network requests for effects not
    // downloaded yet. It uses only sounds that are actually cached.
    const response=(!navigator.onLine)
     ?('caches' in window?await caches.match(url,{ignoreVary:true}):undefined)
     :await fetch(url,{cache:'force-cache'});
    if(!response)return null;
    if(!response.ok||!this.context)return null;
    const bytes=await response.arrayBuffer();
    const buffer=await this.context.decodeAudioData(bytes);
    this.decoded.set(cue,buffer);return buffer;
   }catch{return null}
   finally{this.loads.delete(cue)}
  })();
  this.loads.set(cue,promise);return promise;
 }
 play(cue:AcousticCue,{intensity=1,exclusive=true,variant=0}:{intensity?:number;exclusive?:boolean;variant?:number}={}){
  if(!this.enabled){
   if(this.requestingEnable&&!this.recording&&!document.hidden)
    this.queuedCue={cue,intensity,exclusive,variant};
   return;
  }
  if(this.recording||document.hidden||!this.context||this.volume<=0)return;
  const now=performance.now(),family=familyOf(cue);
  const delay=family==='footstep'?145:family==='answer'?120:family==='dialogue'?140:family==='equipment'?90:45;
  if(now-(this.lastPlayed.get(family)||0)<delay)return;
  this.lastPlayed.set(family,now);
  const ctx=this.context;
  void this.load(cue).then(buffer=>{
   if(!buffer||!this.enabled||this.recording||document.hidden||ctx.state!=='running')return;
   if(exclusive)for(const voice of [...this.voices])if(voice.family===family)this.release(voice,.035);
   if(this.voices.size>=12)this.release([...this.voices][0],.04);
   const source=ctx.createBufferSource(),gain=ctx.createGain();
   source.buffer=buffer;
   source.playbackRate.value=1+Math.max(-1,Math.min(1,variant))*.09;
   // Vision's original scores peak around -26 dBFS. Raise into a gentle
   // audible range with space for multiple voices; don't normalize to 0 dB.
   const amplitude=this.volume*4.65*Math.max(.1,Math.min(1.2,intensity));
   gain.gain.setValueAtTime(0,ctx.currentTime);
   gain.gain.linearRampToValueAtTime(amplitude,ctx.currentTime+.018);
   source.connect(gain);gain.connect(this.master||ctx.destination);
   const voice={source,gain,family,started:performance.now()};
   this.voices.add(voice);
   source.addEventListener('ended',()=>{this.voices.delete(voice);source.disconnect();gain.disconnect()},{once:true});
   source.start();
  });
 }
 private release(voice:ActiveVoice,seconds:number){
  if(!this.context||!this.voices.has(voice))return;
  const time=this.context.currentTime;
  voice.gain.gain.cancelScheduledValues(time);
  voice.gain.gain.setTargetAtTime(0,time,Math.max(.005,seconds/4));
  try{voice.source.stop(time+seconds)}catch{ /* Already released. */ }
  this.voices.delete(voice);
 }
 releaseAll(fade=.08){for(const voice of [...this.voices])this.release(voice,fade)}
 async destroy(){
  this.enabled=false;this.releaseAll(.03);this.loads.clear();this.decoded.clear();
  if(this.context){await this.context.close().catch(()=>{});this.context=null;this.master=null}
 }
}
export const academySound=new AcademySound();
