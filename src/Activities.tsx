import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, CircleHelp, Download, Eye, Mic, Pause, Play, RotateCcw, Sparkles, Square, Volume2 } from 'lucide-react';
import { imageBase, type Lesson, type Topic } from './data';
import type { Progress, Score } from './store';
import { worldAudio } from './audio';

type LProps={lesson:Lesson; progress:Progress; note:(key:string,value:string)=>void; topicNote:(key:string,value:string)=>void; rateCard:(key:string,yes:boolean)=>void; update:(fn:(p:Progress)=>Progress)=>void; onCue?:(name:'bloom'|'turn'|'celebrate')=>void};
const norm=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
const imageNames=['friends','library','teamwork','market','nature','cinema'];
function Label({children}:{children:React.ReactNode}){return <div className="field-label">{children}</div>}
export function TaskIntro({eyebrow,title,children}:{eyebrow:string;title:string;children:React.ReactNode}){
 return <div className="task-intro"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{children}</p></div>;
}
export function Warmup({lesson,progress,note}:LProps){
 const i=(lesson.week-1)%imageNames.length;
 const questions=['What can you observe without guessing?','What might have happened a moment before?','What details support your inference?'];
 const [selected,setSelected]=useState<number|null>(null);
 return <div className="activity-stack">
   <TaskIntro eyebrow="LOOK • THINK • TALK" title="Open the world with a story">Observe for twenty seconds. Predict what may be happening, then connect the scene with your own experience.</TaskIntro>
   <div className="observation-grid"><div className="photo-stage"><img alt="Photographic visual prompt for speaking practice" src={imageBase+imageNames[i]+'.webp'} loading="lazy"/><div className="photo-corner">VISUAL QUEST · {lesson.week.toString().padStart(2,'0')}</div></div>
   <div className="paper-panel"><span className="eyebrow">CHOOSE A QUESTION</span>{questions.map((q,index)=><button className={selected===index?'choice active':'choice'} key={q} onClick={()=>setSelected(index)} aria-pressed={selected===index}><span>{index+1}</span>{q}</button>)}
   <div className="warm-hint">Describe what you see first. Then explain what you think—and why.</div></div></div>
   <div className="paper-panel"><Label>Three ideas for your response</Label><textarea aria-label="Warm up response notes" className="text-field" rows={3} value={progress.notes[`${lesson.week}.warmup`]||''} onChange={e=>note(`${lesson.week}.warmup`,e.target.value)} placeholder="Observation • prediction • personal connection"/></div>
   <div className="prompt-ribbon">{lesson.warmup.map((q,i)=><span key={i}>{q}</span>)}</div>
  </div>;
}
export function WordGarden({lesson,progress,note,rateCard,update,onCue}:LProps){
 const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[input,setInput]=useState(''),[outcome,setOutcome]=useState<'right'|'again'|null>(null);
 const [left,setLeft]=useState<number|null>(null),[matched,setMatched]=useState<number[]>([]);
 const expressions=lesson.expressions; const active=expressions[index]||expressions[0];
 const shuffled=useMemo(()=>expressions.map((_,i)=>(i+2)%expressions.length),[expressions]);
 const next=()=>{setIndex(i=>(i+1)%expressions.length);setRevealed(false);setInput('');setOutcome(null);};
 const test=()=>{const correct=norm(input)===norm(active.phrase);setOutcome(correct?'right':'again');update(p=>({...p,quizResults:{...p.quizResults,[`${lesson.week}.${index}`]:correct?1:0}}));if(correct)onCue?.('bloom');};
 const chooseMeaning=(i:number)=>{if(left===null)return;if(left===i){setMatched(m=>m.includes(i)?m:[...m,i]);onCue?.('bloom')}setLeft(null);};
 return <div className="activity-stack">
  <TaskIntro eyebrow="THE WORD GARDEN" title="Grow your expression garden">Retrieval practice builds stronger memory than rereading. Look, try to recall, reveal, and use each expression in a sentence of your own.</TaskIntro>
  <div className="flash-layout">
    <div className="flip-card">
      <div className="flash-ornament">✿</div><span className="eyebrow">EXPRESSION {index+1} / {expressions.length}</span>
      <h3>{active.phrase}</h3>
      <div className={revealed?'flash-meaning visible':'flash-meaning'}>{revealed?active.meaning:'Think of a meaning before you reveal it.'}</div>
      <div className="inline-actions"><button className="button light" onClick={()=>setRevealed(v=>!v)}><Eye size={16}/>{revealed?'Hide':'Reveal'} meaning</button><button className="button dark" onClick={next}>Next word <ArrowRight size={16}/></button></div>
      <div className="flash-dots">{expressions.map((_,i)=><button key={i} aria-label={`Expression ${i+1}`} className={i===index?'active':''} onClick={()=>{setIndex(i);setRevealed(false);setOutcome(null);setInput('')}}/>)}</div>
    </div>
    <div className="paper-panel practice-side">
     <span className="eyebrow">SAY IT YOUR WAY</span><Label>Your original example</Label>
     <textarea className="text-field" rows={3} value={progress.notes[`${lesson.week}.expression.${index}`]||''} onChange={e=>note(`${lesson.week}.expression.${index}`,e.target.value)} placeholder="Write an example connected to your own experience…"/>
     <div className="inline-actions"><button className="button outline" onClick={()=>rateCard(`${lesson.week}.${index}`,false)}>Review tomorrow</button><button className="button outline" onClick={()=>{rateCard(`${lesson.week}.${index}`,true);onCue?.('bloom')}}>I remember it <Check size={16}/></button></div>
    </div>
  </div>
  <div className="paper-panel">
    <div className="panel-heading"><div><span className="eyebrow">CHALLENGE 01</span><h3>Fill the missing phrase</h3></div><CircleHelp size={22}/></div>
    <p className="muted">Which expression means: <strong>{active.meaning}</strong>?</p>
    <div className="answer-row"><input value={input} onChange={e=>{setInput(e.target.value);setOutcome(null)}} onKeyDown={e=>e.key==='Enter'&&test()} aria-label="Matching expression" placeholder="Type the exact expression"/><button className="button dark" onClick={test}>Check answer</button></div>
    {outcome&&<p role="status" className={outcome==='right'?'feedback success':'feedback'}>{outcome==='right'?'That’s it! Now say a new sentence aloud.':'Not quite. Reveal the definition, study the phrase, and try again.'}</p>}
  </div>
  <div className="paper-panel">
    <div className="panel-heading"><div><span className="eyebrow">CHALLENGE 02</span><h3>Match the expression and meaning</h3></div><span className="mini-progress">{matched.length}/{expressions.length} matched</span></div>
    <div className="match-board">
     <div className="match-column">{expressions.map((e,i)=><button key={i} disabled={matched.includes(i)} className={left===i?'match-item selected':matched.includes(i)?'match-item matched':'match-item'} onClick={()=>setLeft(i)}>{e.phrase}</button>)}</div>
     <div className="match-column">{shuffled.map(i=><button key={i} disabled={matched.includes(i)} className={matched.includes(i)?'match-item matched':'match-item'} onClick={()=>chooseMeaning(i)}>{expressions[i].meaning}</button>)}</div>
    </div>
    {matched.length===expressions.length&&<div className="feedback success"><Sparkles size={17}/> You matched all the expressions. Use two of them in your next speaking answer.</div>}
  </div>
  <div className="paper-panel"><span className="eyebrow">SPEAK WITH PRECISION</span><h3>Grammar & pronunciation</h3><p>{lesson.grammar}</p><p className="muted">{lesson.pronunciation}</p><button className="button light" onClick={()=>{if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(active.phrase);u.lang='en-US';u.rate=.85;speechSynthesis.speak(u)}}}><Volume2 size={17}/> Listen to browser pronunciation</button><p className="micro">Available voices depend on your browser and device.</p></div>
 </div>;
}
export function StoryCottage({lesson,topics,topic,select,progress,topicNote,onCue}:{lesson:Lesson;topics:Topic[];topic:Topic;select:(id:string)=>void;progress:Progress;topicNote:(key:string,value:string)=>void;onCue?:(name:'turn')=>void}){
 const [order,setOrder]=useState([0,1,2,3]);
 const shift=(at:number,to:number)=>{if(to<0||to>=order.length)return;setOrder(o=>{const next=[...o];[next[at],next[to]]=[next[to],next[at]];return next});onCue?.('turn')};
 return <div className="activity-stack">
  <TaskIntro eyebrow="THE STORY COTTAGE" title="Turn four clues into one story">Plan in keywords, then connect the ideas with details, a real example, and a reflection. You don't need to memorize a script.</TaskIntro>
  <div className="paper-panel"><Label>Choose a source cue card</Label><select className="text-field" aria-label="Choose speaking topic" value={topic.id} onChange={e=>select(e.target.value)}>{topics.map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select>
   <div className="cue-paper"><span className="eyebrow">IELTS SPEAKING PART 2</span><h3>{topic.title}</h3>{topic.cues.map((q,i)=><p key={i}><span className="bullet-seed">✦</span>{q}</p>)}</div></div>
  <div className="paper-panel"><span className="eyebrow">CHALLENGE · ARRANGE YOUR STORY</span><h3>Choose an effective narrative order</h3>
   <p className="muted">Move the four building blocks to design your answer. A strong response can start in different ways as long as your listener can follow it.</p>
   <div className="story-order">{order.map((id,at)=>{const blocks=[['Set the scene','Introduce the person, place or event.'],['Give the key detail','Answer the cue-card prompts with specificity.'],['Show a moment','Offer a concrete memory, contrast or example.'],['Reflect on meaning','Explain why it matters to you.']];return <div className="story-block" key={id}><div className="story-index">{at+1}</div><div><strong>{blocks[id][0]}</strong><p>{blocks[id][1]}</p></div><div className="order-actions"><button aria-label={`Move ${blocks[id][0]} up`} disabled={at===0} onClick={()=>shift(at,at-1)}><ArrowUp size={15}/></button><button aria-label={`Move ${blocks[id][0]} down`} disabled={at===3} onClick={()=>shift(at,at+1)}><ArrowDown size={15}/></button></div></div>})}</div>
  </div>
  <div className="paper-panel"><span className="eyebrow">THE ONE-MINUTE NOTEBOARD</span><div className="cue-note-grid">{topic.cues.map((q,i)=><label key={i} className="cue-note"><strong>{q}</strong><textarea rows={2} className="text-field" value={progress.topicNotes[`${topic.id}.cue.${i}`]||''} onChange={e=>topicNote(`${topic.id}.cue.${i}`,e.target.value)} placeholder="2–5 key words…"/></label>)}</div></div>
  <div className="paper-panel model-answer"><span className="eyebrow">LEARN FROM A MODEL</span><h3>Teacher example</h3><details><summary>Reveal a natural model response <BookOpen size={17}/></summary><p>{lesson.model}</p><p className="micro">Use this to observe structure, not to memorize a scripted response.</p></details></div>
 </div>;
}
export function SpeakingTimer({minutes=2,label='LONG TURN'}:{minutes?:number;label?:string}){
 const total=minutes*60;const [remaining,setRemaining]=useState(total),[running,setRunning]=useState(false),[deadline,setDeadline]=useState<number|null>(null);
 useEffect(()=>{setRemaining(total);setRunning(false);setDeadline(null)},[total]);
 useEffect(()=>{if(!running||deadline===null)return;const id=setInterval(()=>{const next=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(next);if(next===0){setRunning(false);setDeadline(null)}},100);return()=>clearInterval(id)},[running,deadline]);
 const toggle=()=>{if(running){setRunning(false);setDeadline(null)}else{setDeadline(Date.now()+remaining*1000);setRunning(true)}};
 const reset=()=>{setRemaining(total);setRunning(false);setDeadline(null)};
 const pct=(total-remaining)/total*100;
 return <div className="timer-row"><div className="timer-ring" style={{background:`conic-gradient(#77a9a3 ${pct}%,#f1ede2 ${pct}%)`}}><div><span className="timer-face">{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</span><small>{label}</small></div></div>
  <div className="timer-controls"><button className="button dark" onClick={toggle}>{running?<Pause size={17}/>:<Play size={17}/>} {running?'Pause':'Start'}</button><button className="button light" onClick={reset}><RotateCcw size={17}/> Reset</button><p className="micro">Time is measured against your device clock; pause whenever you need.</p></div></div>;
}
export function AudioRecorder(){
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const chunks=useRef<Blob[]>([]);
 const url=useRef<string|null>(null);
 const [state,setState]=useState<'idle'|'requesting'|'recording'|'ready'>('idle');
 const [error,setError]=useState('');
 const [playback,setPlayback]=useState<string|null>(null);
 const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;worldAudio.setRecording(false)};
 const start=async()=>{
   setError('');setState('requesting');
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setState('idle');setError('This browser does not support microphone recording. You can use the speaking timer without recording.');return}
   try{
    const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});stream.current=s;worldAudio.setRecording(true);
    const preferred=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    const r=new MediaRecorder(s,preferred?{mimeType:preferred}:undefined);recorder.current=r;chunks.current=[];
    r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
    r.onstop=()=>{if(url.current)URL.revokeObjectURL(url.current);const blob=new Blob(chunks.current,{type:r.mimeType||'audio/webm'});url.current=URL.createObjectURL(blob);setPlayback(url.current);setState('ready');s.getTracks().forEach(t=>t.stop());worldAudio.setRecording(false)};
    r.onerror=()=>{setError('Recording stopped unexpectedly. Please retry.');stop()};
    r.start();setState('recording');
   }catch(e){setError(e instanceof Error?e.message:'Microphone permission was not available.');setState('idle');stream.current?.getTracks().forEach(t=>t.stop());worldAudio.setRecording(false)}
 };
 useEffect(()=>()=>{stop();if(url.current)URL.revokeObjectURL(url.current)},[]);
 return <div className="recorder">
   <span className="eyebrow">YOUR VOICE IS YOUR PRACTICE</span><h3>Speaking recorder</h3>
   <p className="muted">Record privately on this device, listen back, and download the audio. This site never uploads your voice.</p>
   <div className="recorder-actions">{state==='recording'?<button className="button coral" onClick={stop}><Square size={17}/> Stop recording <span className="recording-dot"/></button>:<button className="button dark" disabled={state==='requesting'} onClick={start}><Mic size={17}/>{state==='requesting'?'Requesting microphone…':state==='ready'?'Record again':'Start recording'}</button>}
    {playback&&<a className="button light" href={playback} download={`speaklab-practice.${recorder.current?.mimeType.includes('mp4')?'m4a':'webm'}`}><Download size={17}/> Save audio</a>}</div>
   {playback&&<audio controls src={playback} className="audio-playback"/>}
   {error&&<div role="alert" className="feedback">{error}</div>}
   {state==='recording'&&<p role="status" className="micro recording-note">Recording locally… your audio stays on this device until you download it.</p>}
 </div>;
}
export function DebateBridge({topic,progress,topicNote}:{topic:Topic;progress:Progress;topicNote:(k:string,v:string)=>void}){
 const [active,setActive]=useState(0);
 const question=topic.discussion[active];
 const key=(field:string)=>`${topic.id}.debate.${active}.${field}`;
 const fields:[string,string,string][]=[['claim','Your main point','I believe…'],['reason','Explain why','The main reason is…'],['example','Use real evidence','For example…'],['nuance','Consider another view','On the other hand…']];
 return <div className="activity-stack">
   <TaskIntro eyebrow="THE DEBATE BRIDGE" title="Make your ideas worth listening to">The strongest answers make a clear point, support it, and recognize another perspective. Practice reasoning without memorized fillers.</TaskIntro>
   <div className="question-tabs">{topic.discussion.map((_,i)=><button aria-pressed={active===i} className={i===active?'selected':''} key={i} onClick={()=>setActive(i)}>Question {i+1}</button>)}</div>
   <div className="question-banner"><span>PART 3 · DEEPER THINKING</span><h3>{question}</h3></div>
   <div className="debate-grid">{fields.map(([field,label,hint],i)=><label className="debate-field" key={field}><span className="debate-number">0{i+1}</span><strong>{label}</strong><textarea className="text-field" rows={3} placeholder={hint} value={progress.topicNotes[key(field)]||''} onChange={e=>topicNote(key(field),e.target.value)}/></label>)}</div>
   <div className="feedback success"><Check size={18}/> Challenge: answer aloud in 40–60 seconds without reading these notes.</div>
 </div>;
}
export function Reflection({lesson,progress,note,complete,onCue}:{lesson:Lesson;progress:Progress;note:(k:string,v:string)=>void;complete:(week:number)=>void;onCue?:(name:'celebrate')=>void}){
 const key=`${lesson.week}.reflection`;
 return <div className="activity-stack">
  <TaskIntro eyebrow="THE EVENING JOURNAL" title="Celebrate what you learned">End with retrieval and reflection. Recall expressions, review your speaking, and choose one skill for next time.</TaskIntro>
  <div className="paper-panel"><Label>What three expressions can you recall without looking back?</Label><textarea className="text-field" rows={3} value={progress.notes[key]||''} onChange={e=>note(key,e.target.value)} placeholder="Try from memory first…"/></div>
  <div className="paper-panel"><h3>Homework</h3><p>{lesson.homework}</p><div className="inline-actions"><button className="button dark" onClick={()=>{complete(lesson.week);onCue?.('celebrate')}}><Check size={17}/>{progress.completed.includes(lesson.week)?'Lesson completed':'Complete lesson'}</button></div></div>
 </div>;
}
export function MockScoring({topic,onSave}:{topic:string;onSave:(s:Score)=>void}){
 const categories:[keyof Score,string][]=[['fluency','Fluency & coherence'],['lexical','Lexical resource'],['grammar','Grammar range & accuracy'],['pronunciation','Pronunciation']];
 const [ratings,setRatings]=useState<Record<string,number>>({fluency:5,lexical:5,grammar:5,pronunciation:5});
 const [notes,setNotes]=useState('');
 return <div className="paper-panel"><span className="eyebrow">TEACHER OR LEARNER REFLECTION</span><h3>Four speaking dimensions</h3><p className="muted">A structured practice record, not an official or automated IELTS score. Use real IELTS band descriptors when making an informed evaluation.</p>
  <div className="score-grid">{categories.map(([id,label])=><label key={id}><span>{label}</span><select value={ratings[id]} onChange={e=>setRatings(r=>({...r,[id]:Number(e.target.value)}))}>{Array.from({length:9},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>)}</div>
  <Label>Specific feedback and next practice goal</Label><textarea rows={3} className="text-field" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Strengths, a specific improvement and a next goal…"/>
  <button className="button dark" onClick={()=>onSave({date:new Date().toISOString(),topic,fluency:ratings.fluency,lexical:ratings.lexical,grammar:ratings.grammar,pronunciation:ratings.pronunciation,notes})}>Save practice assessment <Check size={17}/></button>
 </div>;
}
