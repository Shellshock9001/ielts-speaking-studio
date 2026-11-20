import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Compass,Download,Heart,MapPin,Mic,Pause,RotateCcw,Sparkles,Star} from 'lucide-react';
import {chapterLesson,chapterTheme,buildQuestion,CHALLENGE_META,QUEST_ROUNDS,rankLabel,rewardScore,type Challenge,type GameMode} from './rules';
import {BUILD_ITEMS,spentAcorns,type BuildingId} from './buildings';
import type {InputVector,Encounter,WalkRequest} from './AdventureWorld';
import {topicMap} from '../data';
import type {Progress} from '../store';
import {worldAudio,type SoundCue} from '../audio';

const AdventureWorld=lazy(()=>import('./AdventureWorld'));
const modes:Challenge[]=['word','story','debate','voice'];
type Props={week:number;active:boolean;reduced:boolean;progress:Progress;awardQuest:(week:number,kind:string,score:number)=>void;collectSeed:(week:number,index:number)=>void;topicNote:(key:string,value:string)=>void;buildItem:(week:number,item:BuildingId)=>void;onChapter:(week:number)=>void;onLesson:(week:number)=>void;onCue:(name:SoundCue)=>void};
type Completion={kind:Challenge;points:number;misses:number;duration:number};
const wordLabel=['A','B','C'];
function Dpad({inputs,interact,nearby,disabled}:{inputs:React.RefObject<InputVector>;interact:()=>void;nearby:Encounter|null;disabled:boolean}){
 const keys:[string,number,number][]=[['Up',0,-1],['Left',-1,0],['Down',0,1],['Right',1,0]];
 const change=(axis:'x'|'z',value:number)=>{if(!inputs.current)return;inputs.current[axis]=value};
 const pointer=(e:React.PointerEvent<HTMLButtonElement>,x:number,z:number,down:boolean)=>{
   if(disabled)return;
   e.preventDefault();
   if(down){e.currentTarget.setPointerCapture(e.pointerId);change('x',x);change('z',z)}
   else{change('x',0);change('z',0)}
 };
 return <div className="game-controls" aria-label="Game movement controls">
   <div className="game-dpad" aria-label="Walk controls">
    {keys.map(([label,x,z])=><button key={label} className={'dpad-'+label.toLowerCase()} aria-label={'Walk '+label.toLowerCase()} disabled={disabled}
      onPointerDown={e=>pointer(e,x,z,true)} onPointerUp={e=>pointer(e,x,z,false)} onPointerCancel={e=>pointer(e,x,z,false)} onLostPointerCapture={()=>{change('x',0);change('z',0)}}>{label==='Up'?'▲':label==='Down'?'▼':label==='Left'?'◀':'▶'}</button>)}
    <span className="dpad-center">✦</span>
   </div>
   <div className="dpad-actions">
    <button className="interact-action" disabled={!nearby||disabled} onClick={interact}><span>E</span>{nearby?'Talk':'Explore'}</button>
    <button className="dash-action" disabled={disabled} aria-label="Hold to run"
     onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);if(inputs.current)inputs.current.dash=true}}
     onPointerUp={()=>{if(inputs.current)inputs.current.dash=false}}
     onPointerCancel={()=>{if(inputs.current)inputs.current.dash=false}}
     onLostPointerCapture={()=>{if(inputs.current)inputs.current.dash=false}}>Run</button>
   </div>
 </div>;
}
function QuestMarker({kind,completed,best,onTravel}:{kind:Challenge;completed:boolean;best:number;onTravel:(kind:Challenge)=>void}){
 return <button type="button" className={'quest-marker '+(completed?'quest-done':'')} aria-label={'Walk to '+CHALLENGE_META[kind].title} onClick={()=>onTravel(kind)}>
   <span className="quest-marker-icon">{CHALLENGE_META[kind].emoji}</span>
   <div><strong>{CHALLENGE_META[kind].title}</strong><small>{CHALLENGE_META[kind].subtitle}</small></div>
   <span className="quest-marker-score">{completed?<><Star size={13} fill="currentColor"/>{best}</>:'NEW'}</span>
 </button>;
}
function TrophyPanel({completion,takeaway,again,explore,learn}:{completion:Completion;takeaway:string[];again:()=>void;explore:()=>void;learn:()=>void}){
 return <div className="game-victory" role="status">
   <div className="victory-orb"><span>✦</span></div>
   <span className="game-eyebrow">QUEST COMPLETE</span><h2>{rankLabel(completion.points)} earned!</h2>
   <p>Your answer choices helped the village grow. Keep practising to improve your personal best.</p>
   <div className="victory-scores"><div><strong>{completion.points}</strong><span>Adventure points</span></div><div><strong>{completion.duration}s</strong><span>Time</span></div><div><strong>{completion.misses}</strong><span>Tries again</span></div></div>
   {takeaway.length>0&&<div className="game-takeaway"><strong>{completion.kind==='story'?'Your collected story route':'Your argument toolkit'}</strong>
     <ol>{takeaway.map((piece,i)=><li key={i}>{piece}</li>)}</ol>
     <p>{completion.kind==='story'?'Now use these clues to tell your own connected two-minute story.':'Now use these four moves to answer the discussion question with your own ideas.'}</p>
   </div>}
   <div className="game-action-row"><button className="game-primary" onClick={again}><RotateCcw size={16}/> Play again</button><button className="game-secondary" onClick={explore}>Back to village</button><button className="game-secondary" onClick={learn}><BookOpen size={16}/> Study this chapter</button></div>
 </div>;
}
function VoiceQuest({topicTitle,cues,power,onPower,onComplete,finished}:{topicTitle:string;cues:string[];power:number;onPower:(p:number)=>void;onComplete:(score:number)=>void;finished:boolean}){
 const context=useRef<AudioContext|null>(null);
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const animation=useRef(0);
 const last=useRef(0),voiced=useRef(0),started=useRef(0),lastUi=useRef(0);
 const completed=useRef(false),chunks=useRef<Blob[]>([]),url=useRef<string|null>(null);
 const [state,setState]=useState<'ready'|'asking'|'recording'|'review'>('ready');
 const [error,setError]=useState('');
 const [volume,setVolume]=useState(0);
 const [recordingUrl,setRecordingUrl]=useState<string|null>(null);
 const [secs,setSecs]=useState(0);
 const stop=useCallback(()=>{
   cancelAnimationFrame(animation.current);
   if(recorder.current?.state==='recording')recorder.current.stop();
   stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
   if(context.current){void context.current.close();context.current=null;}
   worldAudio.setRecording(false);
 },[]);
 useEffect(()=>()=>{stop();if(url.current)URL.revokeObjectURL(url.current)},[stop]);
 const start=async()=>{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setError('Microphone capture is unavailable in this browser. You can still use the standard speaking lesson.');return;}
   setError('');setState('asking');
   try{
     const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
     worldAudio.setRecording(true);stream.current=media;
     const ctx=new AudioContext();context.current=ctx;
     const analyser=ctx.createAnalyser();analyser.fftSize=1024;
     const source=ctx.createMediaStreamSource(media);source.connect(analyser);
     const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
     const r=new MediaRecorder(media,mime?{mimeType:mime}:undefined);recorder.current=r;chunks.current=[];
     r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
     r.onstop=()=>{
       if(url.current)URL.revokeObjectURL(url.current);
       const blob=new Blob(chunks.current,{type:r.mimeType||'audio/webm'});
       url.current=URL.createObjectURL(blob);setRecordingUrl(url.current);setState('review');
     };
     r.start();setState('recording');completed.current=false;voiced.current=0;onPower(0);
     started.current=performance.now();last.current=started.current;
     const buffer=new Float32Array(analyser.fftSize);
     const scan=(now:number)=>{
       if(!stream.current)return;
       analyser.getFloatTimeDomainData(buffer);
       let sum=0;for(let i=0;i<buffer.length;i++)sum+=buffer[i]*buffer[i];
       const rms=Math.sqrt(sum/buffer.length);
       const delta=Math.min(.1,(now-last.current)/1000);last.current=now;
       // Movement of the lanterns measures audible voice activity, not language quality.
       if(rms>.021)voiced.current+=delta;
       const fraction=Math.min(1,voiced.current/35);
       if(now-lastUi.current>160){
        lastUi.current=now;onPower(fraction);setVolume(Math.min(1,rms*11));setSecs(Math.floor((now-started.current)/1000));
       }
       if(fraction>=1&&!completed.current){completed.current=true;onComplete(rewardScore(4,0,(now-started.current)/1000,4));}
       animation.current=requestAnimationFrame(scan);
     };
     animation.current=requestAnimationFrame(scan);
   }catch(e){
     setError(e instanceof Error?e.message:'Microphone permission was unavailable.');
     setState('ready');stop();
   }
 };
 const level=Array.from({length:12},(_,i)=><span key={i} style={{height:(12+(i%3)*7+volume*35)+'px',opacity:volume>.04?.85:.33}}/>);
 return <div className="voice-quest">
   <div className="voice-meter"><div className="voice-meter-bars">{level}</div><span>{Math.floor(power*4)} / 4 lanterns</span></div>
   <div className="voice-question"><strong>{topicTitle}</strong>{cues.map((cue,i)=><span key={i}>✦ {cue}</span>)}</div>
   <p className="game-hint">Speak about your own experience. The lanterns respond to sustained audible speaking, not pronunciation accuracy or IELTS band quality.</p>
   <div className="game-action-row">
    {state==='ready'&&<button className="game-primary" onClick={start}><Mic size={17}/> Activate microphone quest</button>}
    {state==='asking'&&<button className="game-primary" disabled>Requesting microphone…</button>}
    {state==='recording'&&<button className="game-primary" onClick={stop}><Pause size={17}/> End & listen · {secs}s</button>}
    {state==='review'&&<button className="game-secondary" onClick={start}><RotateCcw size={17}/> Try again</button>}
    {recordingUrl&&<a className="game-secondary" href={recordingUrl} download={'speaklab-voice-quest.'+(recorder.current?.mimeType.includes('mp4')?'m4a':'webm')}><Download size={17}/> Save recording</a>}
   </div>
   {recordingUrl&&<audio controls src={recordingUrl} className="voice-playback"/>}
   {error&&<p role="alert" className="game-error">{error}</p>}
   {finished&&<p className="game-success">All four lanterns are glowing. Your voice brought the glade to life.</p>}
 </div>;
}
export default function AdventureGame({week,active,reduced,progress,awardQuest,collectSeed,topicNote,buildItem,onChapter,onLesson,onCue}:Props){
 const [mode,setMode]=useState<GameMode>('explore');
 const [round,setRound]=useState(0),[correct,setCorrect]=useState(0),[misses,setMisses]=useState(0);
 const [nearby,setNearby]=useState<Encounter|null>(null),[position,setPosition]=useState({x:0,z:0});
 const [seedActive,setSeedActive]=useState<number|null>(null),[seedAnswer,setSeedAnswer]=useState(''),[seedFeedback,setSeedFeedback]=useState('');
 const [conversation,setConversation]=useState<'neighbor1'|'neighbor2'|null>(null),[conversationAnswer,setConversationAnswer]=useState('');
 const [workshopOpen,setWorkshopOpen]=useState(false);
 const [power,setPower]=useState(0),[feedback,setFeedback]=useState('');
 const [completion,setCompletion]=useState<Completion|null>(null);
 const [takeaway,setTakeaway]=useState<string[]>([]);
 const [walkRequest,setWalkRequest]=useState<WalkRequest|null>(null);
 const inputs=useRef<InputVector>({x:0,z:0,dash:false});
 const locked=useRef(false);const startTime=useRef(0);
 const feedbackTimer=useRef<number|null>(null);
 const theme=chapterTheme(week),lesson=chapterLesson(week);
 const currentTopic=topicMap.get(lesson.topics[0])!;
 const seeds=Array.from({length:5},(_,i)=>Boolean(progress.foundSeeds[week+'.'+i]));
 const seedsCount=seeds.filter(Boolean).length;
 const chatKey=conversation?'village.chat.'+week+'.'+conversation:'';
 const wins=Object.entries(progress.quests).filter(([key])=>key.startsWith(week+'.')).length;
 const totalStars=Object.values(progress.quests).reduce((sum,v)=>sum+Math.floor(v.best/20),0)+Object.values(progress.foundSeeds).filter(Boolean).length;
 const availableAcorns=Math.max(0,totalStars-spentAcorns(progress.decorations));
 const chapterDecorations=progress.decorations[String(week)]||[];
 const currentQuestion=useMemo(()=>mode==='word'||mode==='story'||mode==='debate'?buildQuestion(week,mode,round):null,[week,mode,round]);
 useEffect(()=>{
  setMode('explore');setRound(0);setCorrect(0);setMisses(0);setCompletion(null);setNearby(null);setPower(0);setFeedback('');setSeedActive(null);setConversation(null);setTakeaway([]);setWalkRequest(null);setWorkshopOpen(false);
  locked.current=false;
  if(feedbackTimer.current!==null)clearTimeout(feedbackTimer.current);
 },[week]);
 useEffect(()=>()=>{if(feedbackTimer.current!==null)clearTimeout(feedbackTimer.current)},[]);
 const begin=useCallback((kind:Challenge)=>{
  if(!active)return;
  if(feedbackTimer.current!==null)clearTimeout(feedbackTimer.current);
  locked.current=false;startTime.current=performance.now();setMode(kind);setRound(0);setMisses(0);setCorrect(0);setPower(0);setCompletion(null);setFeedback('');setTakeaway([]);setWalkRequest(null);
  onCue('turn');
 },[active,onCue]);
 const end=useCallback((kind:Challenge,points:number,totalMisses:number)=>{
  const result:Completion={kind,points,misses:totalMisses,duration:Math.floor((performance.now()-startTime.current)/1000)};
  locked.current=true;setCompletion(result);awardQuest(week,kind,points);onCue('celebrate');
 },[awardQuest,week,onCue]);
 const collect=useCallback((index:number)=>{
  if(!active||locked.current||!currentQuestion||mode==='explore'||mode==='voice')return;
  locked.current=true;
  const right=index===currentQuestion.correct;
  if(!right){
   const next=misses+1;setMisses(next);setFeedback('That choice does not fit the prompt. Compare all three options and find the one that directly answers the task.');
   onCue('turn');
   feedbackTimer.current=window.setTimeout(()=>{locked.current=false;setFeedback('')},1050);
   return;
  }
  const nextCorrect=correct+1;setCorrect(nextCorrect);
  setFeedback(currentQuestion.explanation);onCue('bloom');
  if(mode==='story'||mode==='debate'){
    const item=mode==='story'?currentQuestion.storyBeat||currentQuestion.explanation:currentQuestion.options[index];
    const updated=[...takeaway,item];
    setTakeaway(updated);
    topicNote('wildwood.'+mode+'.'+week,JSON.stringify(updated));
  }
  if(round+1>=QUEST_ROUNDS[mode]){
   const score=rewardScore(nextCorrect,misses,(performance.now()-startTime.current)/1000,QUEST_ROUNDS[mode]);
   feedbackTimer.current=window.setTimeout(()=>end(mode,score,misses),1050);
  }else feedbackTimer.current=window.setTimeout(()=>{setRound(i=>i+1);locked.current=false;setFeedback('')},920);
 },[active,currentQuestion,mode,correct,round,misses,end,onCue,takeaway,topicNote,week]);
 const back=()=>{if(feedbackTimer.current!==null)clearTimeout(feedbackTimer.current);locked.current=false;setMode('explore');setRound(0);setCompletion(null);setPower(0);setFeedback('');setSeedActive(null);setConversation(null);setWalkRequest(null);onCue('turn')};
 const voiceComplete=useCallback((points:number)=>{if(mode==='voice'&&!completion)end('voice',points,0)},[mode,completion,end]);
 const onNear=useCallback((what:Encounter|null)=>setNearby(what),[]);
 const onSpot=useCallback((x:number,z:number)=>setPosition(p=>Math.abs(p.x-x)+Math.abs(p.z-z)>.13?{x,z}:p),[]);
 const goTo=useCallback((kind:Challenge)=>{
   // Quest cards can sit below the canvas on phones and smaller displays.
   // Bring the playable viewport back onscreen before moving the avatar,
   // otherwise its intentionally paused offscreen render loop cannot walk.
   document.querySelector('.adventure-stage')?.scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
   setWalkRequest(p=>({kind,serial:(p?.serial||0)+1}));
 },[reduced]);
 const interact=useCallback((kind:Encounter)=>{
  if(!active||seedActive!==null||conversation!==null||completion)return;
  if(kind==='neighbor1'||kind==='neighbor2'){setConversation(kind);setConversationAnswer(progress.topicNotes['village.chat.'+week+'.'+kind]||'');onCue('turn')}
  else begin(kind);
 },[active,seedActive,conversation,completion,begin,progress.topicNotes,week,onCue]);
 const discover=useCallback((index:number)=>{if(active&&mode==='explore'&&seedActive===null&&!conversation&&!seeds[index]){setSeedActive(index);setSeedAnswer('');setSeedFeedback('');onCue('turn')}},[active,mode,seedActive,conversation,seeds,onCue]);
 const submitSeed=()=>{
   if(seedActive===null)return;
   const phrase=lesson.expressions[seedActive%lesson.expressions.length].phrase;
   const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
   if(norm(seedAnswer)!==norm(phrase)){setSeedFeedback('Not yet. Say the phrase aloud, study its meaning, and try the spelling again.');return;}
   collectSeed(week,seedActive);setSeedActive(null);setSeedFeedback('');onCue(seedsCount===4?'celebrate':'bloom');
 };
 const submitConversation=()=>{
   if(!conversation||!conversationAnswer.trim())return;
   topicNote(chatKey,conversationAnswer.trim());setConversation(null);onCue('bloom');
 };
 const build=(item:BuildingId,cost:number)=>{
   if(chapterDecorations.includes(item)||availableAcorns<cost)return;
   buildItem(week,item);onCue('celebrate');
 };
 const completed=Boolean(completion);
 const disabled=!active||completed||seedActive!==null||conversation!==null;
 return <section className={'adventure-screen'+(!active?' is-inactive':'')} aria-label="Playable SpeakLab Wildwood">
   <div className="adventure-heading">
    <div className="adventure-heading-copy"><span className="game-eyebrow"><Sparkles size={15}/> THE WILDWOOD ADVENTURE</span><h1>Learn by <em>playing.</em></h1><p>Move, explore, solve challenges and make the English world your own.</p></div>
    <div className="adventure-chapter-select"><span>EXPLORE CHAPTER</span><div><button aria-label="Previous chapter" disabled={week===1} onClick={()=>onChapter(Math.max(1,week-1))}><ArrowLeft size={18}/></button><select aria-label="Choose game chapter" value={week} onChange={e=>onChapter(Number(e.target.value))}>{Array.from({length:11},(_,i)=><option value={i+1} key={i+1}>Week {String(i+1).padStart(2,'0')} · {chapterTheme(i+1).name}</option>)}</select><button aria-label="Next chapter" disabled={week===11} onClick={()=>onChapter(Math.min(11,week+1))}><ArrowRight size={18}/></button></div></div>
   </div>
   <div className="adventure-shell">
    <div className="adventure-stage">
      <div className="adventure-topbar">
       <div className="world-chapter-badge"><span className="world-seed">✦</span><div><strong>{theme.name}</strong><small>{theme.description}</small></div></div>
       <div className="adventure-wallet" title={totalStars+' total acorns earned, '+availableAcorns+' available to build'}><Star size={17} fill="currentColor"/>{availableAcorns}<span>acorns to build</span></div>
      </div>
      <div className="adventure-viewport">
       <Suspense fallback={<div className="adventure-fallback"><div className="adventure-fallback-art"><h3>Opening the Wildwood…</h3><p>Preparing your character and quests.</p></div></div>}>
        <AdventureWorld week={week} mode={mode} round={round} active={!disabled} reduced={reduced} power={power} inputs={inputs} onEnter={interact} onCollect={collect} onSeed={discover} foundSeeds={seeds} avatarLevel={totalStars} placedDecorations={chapterDecorations} requestedDestination={walkRequest} onNearby={onNear} onPosition={onSpot}/>
       </Suspense>
       {mode==='explore'&&<div className="adventure-world-hint">{seedActive!==null?'You discovered a language seed! Solve its phrase to keep it.':conversation?'Your neighbor has something to tell you.':nearby?<><span className="keyboard-key">E</span> {nearby==='neighbor1'||nearby==='neighbor2'?'Talk with the villager':'Talk to the '+CHALLENGE_META[nearby].title+' guide'}</>:<><span className="keyboard-key">WASD</span> Walk · Click a destination to travel · <span className="keyboard-key">Shift</span> Run</>}</div>}
       {mode!=='explore'&&<div className="adventure-quest-hud">
        <button className="adventure-back" onClick={back} aria-label="Leave this quest"><ArrowLeft size={16}/> Village</button>
        <div><span>{CHALLENGE_META[mode].emoji} {CHALLENGE_META[mode].title}</span><strong>{mode==='voice'?Math.floor(power*4):Math.min(round+1,QUEST_ROUNDS[mode])} / {QUEST_ROUNDS[mode]}</strong></div>
       </div>}
       {mode!=='explore'&&<div className="adventure-quest-trail">{Array.from({length:QUEST_ROUNDS[mode]},(_,i)=><span key={i} className={i<correct||(mode==='voice'&&i/4<power)?'lit':''}/>)}</div>}
      </div>
      <div className="adventure-bottom-bar">
        <div className="adventure-coordinates"><MapPin size={16}/><span>{mode==='explore'?'Village pathways':CHALLENGE_META[mode].subtitle}</span><span className="gps-dot"/><small>{position.x.toFixed(1)}, {position.z.toFixed(1)}</small></div>
        <Dpad inputs={inputs} interact={()=>nearby&&interact(nearby)} nearby={mode==='explore'?nearby:null} disabled={disabled}/>
      </div>
    </div>
    <aside className="adventure-side">
      {seedActive!==null?<div className="game-collectible-panel">
       <span className="game-eyebrow">A HIDDEN LANGUAGE SEED</span><div className="seed-discovery-art" aria-hidden="true">✿</div>
       <h2>You've found a word seed!</h2><p>Remember the matching expression and plant it in your village journal.</p>
       <div className="game-question"><small>RETRIEVAL CHALLENGE</small><h3>{lesson.expressions[seedActive%lesson.expressions.length].meaning}</h3></div>
       <label className="field-label" htmlFor="seed-spelling">Which phrase means this?</label>
       <input id="seed-spelling" className="text-field" autoComplete="off" spellCheck={false} value={seedAnswer} onChange={e=>setSeedAnswer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitSeed()} placeholder="Recall the expression…"/>
       {seedFeedback&&<p role="status" className="game-feedback wrong">{seedFeedback}</p>}
       <details><summary>Need a hint?</summary><p className="game-hint">The phrase starts with “{lesson.expressions[seedActive%lesson.expressions.length].phrase.split(' ')[0]}”.</p></details>
       <div className="game-action-row"><button className="game-primary" onClick={submitSeed}>Plant the word seed</button><button className="game-secondary" onClick={()=>setSeedActive(null)}>Explore later</button></div>
      </div>:conversation?<div className="game-conversation">
       <span className="game-eyebrow">VILLAGER CONVERSATION</span><div className="npc-portrait">✦</div>
       <h2>{conversation==='neighbor1'?theme.companion:'Ollie the owl'}</h2>
       <p className="villager-speech">“{conversation==='neighbor1'?theme.greeting:theme.bonus}”</p>
       <label className="field-label" htmlFor="villager-response">Your reply · explain, give an example, and ask a follow-up question.</label>
       <textarea id="villager-response" className="text-field" rows={5} placeholder="Speak or write a natural answer in English…" value={conversationAnswer} onChange={e=>setConversationAnswer(e.target.value)}/>
       <div className="game-action-row"><button className="game-primary" disabled={!conversationAnswer.trim()} onClick={submitConversation}><Heart size={16}/> Share your story</button><button className="game-secondary" onClick={()=>setConversation(null)}>Walk away</button></div>
       {progress.topicNotes[chatKey]&&<p className="game-hint">You've spoken to this neighbor before. Your journal keeps the conversation.</p>}
      </div>:mode==='explore'?<>
       <div className="adventure-npc"><div className="npc-portrait">✦</div><span>YOUR VILLAGE GUIDE</span><h2>{theme.companion}</h2><p>“{theme.greeting}”</p></div>
       <div className="game-quest-list"><div className="game-card-heading"><span>FOUR QUESTS TO EXPLORE · PICK A DESTINATION</span><strong>{wins}/4</strong></div>{modes.map(kind=><QuestMarker key={kind} kind={kind} completed={Boolean(progress.quests[week+'.'+kind])} best={progress.quests[week+'.'+kind]?.best||0} onTravel={goTo}/>)}</div>
       <div className="adventure-foraging"><div><span className="game-eyebrow">FIND THE HIDDEN WORDS</span><strong>{seedsCount}/5 seeds found</strong></div><div className="seed-progress">{seeds.map((found,i)=><span key={i} className={found?'collected':''}>{found?'✿':'◇'}</span>)}</div><p>Explore the island to discover seeds, recall their expressions, and watch your outfit change as you learn.</p></div>
       <div className="adventure-workshop">
         <div className="game-card-heading"><span>YOUR VILLAGE WORKSHOP</span><strong>{chapterDecorations.length}/4 built</strong></div>
         <button className="workshop-toggle" type="button" aria-expanded={workshopOpen} onClick={()=>setWorkshopOpen(v=>!v)}>
           <span className="workshop-symbol" aria-hidden="true">⌂</span><span><strong>{workshopOpen?'Close workshop':'Build your village'}</strong><small>Spend your earned acorns on permanent scenery</small></span><span className="workshop-arrow">{workshopOpen?'−':'+'}</span>
         </button>
         {workshopOpen&&<div className="workshop-catalog">{BUILD_ITEMS.map(item=>{
           const placed=chapterDecorations.includes(item.id),affordable=availableAcorns>=item.cost;
           return <div className="workshop-item" key={item.id}>
             <span className="workshop-item-icon">{item.icon}</span><div><strong>{item.name}</strong><small>{item.description}</small></div>
             <button type="button" aria-label={'Build '+item.name} disabled={placed||!affordable} onClick={()=>build(item.id,item.cost)}>{placed?'Placed':item.cost+' ✦'}</button>
           </div>;
         })}<p>Furniture appears immediately in this chapter and stays after you return. Replaying quests can improve your personal best; collected word seeds also earn acorns.</p></div>}
       </div>
       <div className="adventure-advice"><Compass size={20}/><div><strong>Today's side quest</strong><p>{theme.bonus}</p></div></div>
       <button className="game-secondary game-study" onClick={()=>onLesson(week)}><BookOpen size={17}/> Open guided lesson <ArrowRight size={17}/></button>
      </>:mode==='voice'?<>
       <div className="game-challenge-header"><span className="game-eyebrow">VOICE GAME</span><h2>Bring the lanterns to life.</h2><p>Four real-time lights respond as you speak.</p></div>
       <VoiceQuest topicTitle={currentTopic.title} cues={currentTopic.cues} power={power} onPower={setPower} onComplete={voiceComplete} finished={completed}/>
       {completion&&<div className="voice-reward"><Star size={18} fill="currentColor"/> {rankLabel(completion.points)} · {completion.points} adventure points earned <button onClick={back}>Back to village</button></div>}
      </>:completion?<TrophyPanel completion={completion} takeaway={takeaway} again={()=>begin(completion.kind)} explore={back} learn={()=>onLesson(week)}/>:currentQuestion?<div className="game-question-panel">
       <div className="game-challenge-header"><span className="game-eyebrow">LIVE CHALLENGE · ROUND {round+1}</span><h2>{CHALLENGE_META[mode].title}</h2><p>{CHALLENGE_META[mode].guide}</p></div>
       {mode==='story'&&<p className="game-context">Story to build: <strong>{currentTopic.title}</strong></p>}
       {mode==='debate'&&<p className="game-context">Collect a position, reason, example and nuance for your argument.</p>}
       <div className="game-question"><small>{mode==='word'?'MEANING TO RETRIEVE':mode==='story'?'BUILD THE NEXT STORY BEAT':'PART 3 · THINK CRITICALLY'}</small><h3>{currentQuestion.prompt}</h3></div>
       <div className="game-options">{currentQuestion.options.map((option,i)=><div className="game-option" key={i}><span>{wordLabel[i]}</span><p>{option}</p></div>)}</div>
       <p className="game-hint">Move your character into the matching 3D marker. On an accessible device, you can also select an option below.</p>
       <div className="game-answer-buttons">{wordLabel.map((letter,i)=><button key={i} aria-label={'Select answer '+letter} disabled={locked.current} onClick={()=>collect(i)}>{letter}</button>)}</div>
       {feedback&&<div role="status" className={feedback.startsWith('That path')?'game-feedback wrong':'game-feedback correct'}>{feedback}</div>}
       <button className="game-secondary game-study" onClick={()=>onLesson(week)}><BookOpen size={16}/> Study the full topic</button>
      </div>:null}
    </aside>
   </div>
   <div className="adventure-epilogue"><div><span className="game-eyebrow">A PLACE THAT CHANGES WITH YOU</span><h2>Explore. Learn. Build. Return.</h2><p>Your language quests earn acorns. Use them to decorate your chapter, meet village characters, and grow a world worth returning to.</p></div><div className="game-world-progress"><div><strong>{Object.keys(progress.quests).length}<small>/44</small></strong><span>quests accomplished</span></div><div><strong>{totalStars}</strong><span>acorns earned</span></div><div><strong>{progress.completed.length}<small>/11</small></strong><span>lessons completed</span></div></div></div>
 </section>;
}
