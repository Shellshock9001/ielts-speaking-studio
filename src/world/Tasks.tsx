import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Progress,Score} from '../store';
import {lessons,topicMap,imageBase,photoOfWeek,type Topic} from '../data';
import type {Actor} from './worldData';
import {REGIONS,STUDENTS,TOPIC_ACTOR,lessonOfTopic} from './worldData';
import {BUILD_ITEMS,spentAcorns,type BuildingId} from '../game/buildings';
import type {AcousticCue} from './sound';
import type {WorldChallenge} from './WorldScene';

export type Mode='talk'|'teacher'|'classroom'|'word'|'story'|'debate'|'voice'|'photo'|'recall'|'seed'|'assessment'|'journal'|'map'|'build'|'festival'|'bag'|'missions'|'album';
export type WorldPanel={mode:Mode;actorId?:string;topicId?:string;seed?:{week:number;index:number}};
export type TaskResult={mode:Mode;topicId?:string;score?:number};
export type ChallengePrompt={prompt:string;options:[string,string,string];correct:number;explanation:string;milestone:string};
export type TaskProps={
 panel:WorldPanel;topicId:string;regionWeek:number;progress:Progress;selectedActor:Actor|null;
 availableAcorns:number;challenge:WorldChallenge|null;round:number;feedback:string;misses:number;score:number;lanterns:number;
 open:(mode:Mode,topicId?:string,actorId?:string)=>void;close:()=>void;selectTopic:(id:string)=>void;
 selectWeek:(week:number)=>void;travelTo:(x:number,z:number,actorId?:string)=>void;
 choose:(index:number)=>void;startChallenge:(kind:'word'|'story'|'debate')=>void;
 topicNote:(key:string,value:string)=>void;markPractice:(topicId:string)=>void;
 rateCard:(id:string,remembered:boolean)=>void;award:(topicId:string,mode:string,points:number)=>void;
 build:(week:number,item:BuildingId)=>void;scoreAssessment:(score:Score)=>void;
 exportData:()=>void;importData:(data:unknown)=>void;play:(cue:AcousticCue)=>void;
 soundMuted:()=>void;onVoicePower:(n:number)=>void;
};
export const DIRECTIONS:Record<Mode,{title:string;subtitle:string}>={
 talk:{title:'A friend has a question',subtitle:'Peer-to-peer dialogue'},
 teacher:{title:'Professor Maple’s classroom',subtitle:'Your learning studio'},
 classroom:{title:'Today’s class activity',subtitle:'Explore, observe and speak'},
 word:{title:'Flower Harvest',subtitle:'Move to the matching expression'},
 story:{title:'The Story Trail',subtitle:'Shape a connected two-minute story'},
 debate:{title:'Reasoning Run',subtitle:'Think, explain, give evidence'},
 voice:{title:'Speaking Lanterns',subtitle:'Share a real spoken response'},
 photo:{title:'Picture Discovery',subtitle:'Look closely and describe'},
 recall:{title:'Memory Library',subtitle:'Bring earlier words back'},
 seed:{title:'The Hidden Word Seed',subtitle:'A reward for real retrieval'},
 assessment:{title:'Speaking Festival',subtitle:'Your guided three-part practice interview'},
 journal:{title:'My Storybook',subtitle:'Your saved learning and achievements'},
 map:{title:'The Village Atlas',subtitle:'Every classroom and neighborhood'},
 build:{title:'Caramel’s Workshop',subtitle:'Make this place your own'},
 festival:{title:'A Celebration of English',subtitle:'Share what you can say now'}
 ,bag:{title:'My Explorer Satchel',subtitle:'Materials, crafting and equipment'}
 ,missions:{title:"Today's Adventure Board",subtitle:'Real activities, real rewards'}
 ,album:{title:'The Explorer’s Field Guide',subtitle:'Creatures, curiosities and growing things'}
};
const letter=(i:number)=>String.fromCharCode(65+i);
function GoldenButton({children,onClick,disabled=false}:{children:React.ReactNode;onClick:()=>void;disabled?:boolean}){
 return <button type="button" className="ww-primary" disabled={disabled} onClick={onClick}>{children}</button>;
}
function PaperButton({children,onClick,disabled=false}:{children:React.ReactNode;onClick:()=>void;disabled?:boolean}){
 return <button type="button" className="ww-secondary" disabled={disabled} onClick={onClick}>{children}</button>;
}
function NarratorBubble({actor,text}:{actor:Actor|null;text:string}){
 return <div className="ww-speech">
  <div className="ww-speech-avatar">{actor?.species==='owl'?'✦':actor?.species==='rabbit'?'✿':actor?.species==='cat'?'♡':'◈'}</div>
  <div><strong>{actor?.name||'Village mentor'}</strong><p>{text}</p></div>
 </div>;
}
function TopicChoice({topic,select}:{topic:Topic;select:()=>void}){
 const character=TOPIC_ACTOR.get(topic.id);
 return <button type="button" className="ww-topic-choice" onClick={select}>
  <span className="ww-topic-bloom">{character?.name.slice(0,1)||'✦'}</span>
  <span><strong>{topic.title}</strong><small>{character?.name} · {topic.discussion.length} conversation questions</small></span>
  <span className="ww-icon-arrow">↗</span>
 </button>;
}
export function DialogueTask({topic,actor,progress,topicNote,markPractice,play,open}:{
 topic:Topic;actor:Actor;progress:Progress;topicNote:TaskProps['topicNote'];markPractice:TaskProps['markPractice'];
 play:TaskProps['play'];open:TaskProps['open'];
}){
 const key=topic.id+'.peer';
 const saved=progress.topicNotes[key]||'';
 const [stage,setStage]=useState(saved?2:0),[draft,setDraft]=useState(saved),[position,setPosition]=useState<'agree'|'consider'|'disagree'>('consider');
 const ask=topic.discussion[0]||topic.title;
 const reply=position==='agree'?'That is a thoughtful way to look at it. Can you give a real example?':
 position==='disagree'?'I like hearing another perspective. What makes your opinion convincing?':
 'There may be more than one answer. What example could help us decide?';
 const submit=()=>{
  if(draft.trim().length<15)return;
  topicNote(key,draft.trim());markPractice(topic.id);setStage(2);play('chat-choice');
 };
 return <div className="ww-flow">
  <NarratorBubble actor={actor} text={actor.greeting}/>
  <div className="ww-topic-paper"><span className="ww-kicker">SPEAKING PART 2 · YOUR STORY</span><h3>{topic.title}</h3>
   <div className="ww-cue-list">{topic.cues.map((cue,i)=><p key={i}><b>{String(i+1).padStart(2,'0')}</b>{cue}</p>)}</div>
  </div>
  {stage===0?<><p className="ww-note">Think of an experience from your own life. Share an answer with your classmate; then continue the conversation.</p>
    <GoldenButton onClick={()=>{setStage(1);play('chat-open')}}>Start our conversation</GoldenButton></>:
   <div className="ww-flow">
    <div className="ww-speech ww-speech-alt"><div className="ww-speech-avatar">?</div><div><strong>{actor.name} asks</strong><p>{ask}</p></div></div>
    <div className="ww-choice-row" role="group" aria-label="Choose your conversational position">
     {(['agree','consider','disagree'] as const).map(value=><button key={value} aria-pressed={position===value}
      onClick={()=>{setPosition(value);play('chat-choice')}}>{value==='consider'?'It depends':value==='agree'?'I agree':'I disagree'}</button>)}
    </div>
    <label className="ww-field-label" htmlFor="ww-peer-reply">Your reply · idea, reason, example and a follow-up question</label>
    <textarea className="ww-field" id="ww-peer-reply" rows={5} value={draft} onChange={e=>setDraft(e.target.value)}
      placeholder="I think… because… For example… What do you think?"/>
    {stage===2&&saved&&<div className="ww-speech"><div className="ww-speech-avatar">♡</div><div><strong>{actor.name} replies</strong><p>{reply}</p></div></div>}
    <div className="ww-action-line"><GoldenButton disabled={draft.trim().length<15} onClick={submit}>{stage===2?'Save updated reply':'Share with '+actor.name}</GoldenButton>
     <PaperButton onClick={()=>open('voice',topic.id,actor.id)}>Speak out loud</PaperButton></div>
    {saved&&<p className="ww-success" role="status">Your conversation is saved in your storybook.</p>}
   </div>}
 </div>;
}
export function TeacherTask({topic,actor,progress,open,selectTopic}:{topic:Topic;actor:Actor|null;progress:Progress;open:TaskProps['open'];selectTopic:TaskProps['selectTopic']}){
 const lesson=lessonOfTopic(topic.id);
 return <div className="ww-flow">
  <NarratorBubble actor={actor} text="We learn by using language. Choose an activity, then take your new ideas to a classmate. Each task offers a different way to grow your skills."/>
  <div className="ww-coaching-card"><span className="ww-kicker">TODAY'S THEME · WEEK {lesson.week}</span><h3>{lesson.title}</h3><p>{lesson.objective}</p>
   <p><strong>Language focus:</strong> {lesson.grammar}</p><p><strong>Pronunciation studio:</strong> {lesson.pronunciation}</p>
  </div>
  <h4 className="ww-subheading">Your classmates are exploring</h4>
  <div className="ww-topic-grid">{lesson.topics.map(id=>{const t=topicMap.get(id)!;return <TopicChoice key={id} topic={t} select={()=>selectTopic(t.id)}/>})}</div>
  <div className="ww-mini-quest-grid">
   <button onClick={()=>open('photo',topic.id,actor?.id)}><span>◈</span><strong>Picture Studio</strong><small>Observe and describe</small></button>
   <button onClick={()=>open('word',topic.id,actor?.id)}><span>✿</span><strong>Flower Harvest</strong><small>Find the right phrase</small></button>
   <button onClick={()=>open('story',topic.id,actor?.id)}><span>⌂</span><strong>Story Trail</strong><small>Build a fluent account</small></button>
   <button onClick={()=>open('debate',topic.id,actor?.id)}><span>✦</span><strong>Reasoning Run</strong><small>Strengthen your ideas</small></button>
   <button onClick={()=>open('voice',topic.id,actor?.id)}><span>♫</span><strong>Speaking Lanterns</strong><small>Speak and listen</small></button>
   <button onClick={()=>open('recall',topic.id,actor?.id)}><span>❀</span><strong>Memory Library</strong><small>Remember and review</small></button>
  </div>
  {progress.reviewedTopics.includes(topic.id)&&<p className="ww-success">You've already practised this speaking topic. Revisit it and try a stronger version.</p>}
 </div>;
}
export function PhotographTask({topic,progress,topicNote,play}:{topic:Topic;progress:Progress;topicNote:TaskProps['topicNote'];play:TaskProps['play']}){
 const lesson=lessonOfTopic(topic.id);
 const src=imageBase+photoOfWeek[lesson.week-1]+'.webp';
 const key=topic.id+'.photo';
 const [note,setNote]=useState(progress.topicNotes[key]||'');
 const [reveal,setReveal]=useState(false);
 return <div className="ww-flow">
   <div className="ww-photo-frame"><img src={src} alt="Illustrated observation scene for spoken English practice"/></div>
   <div className="ww-coaching-card"><span className="ww-kicker">OBSERVE · DESCRIBE · INTERPRET</span><h3>What's happening in this scene?</h3>
    <p>Begin with what you can see. Then make one reasonable inference and support it with a detail.</p></div>
   {lesson.warmup.map((q,i)=><div className="ww-observe-line" key={i}><span>{i+1}</span><p>{q}</p></div>)}
   <label className="ww-field-label" htmlFor="ww-photo-note">Your description · include a visual detail and a possible explanation</label>
   <textarea className="ww-field" id="ww-photo-note" rows={5} value={note} onChange={e=>setNote(e.target.value)} placeholder="In the foreground I can see… This might suggest…"/>
   <div className="ww-action-line"><GoldenButton disabled={note.trim().length<12} onClick={()=>{topicNote(key,note.trim());play('page-turn')}}>Save observation</GoldenButton>
    <PaperButton onClick={()=>{setReveal(v=>!v);play('chat-choice')}}>{reveal?'Hide coaching':'Reveal speaking technique'}</PaperButton></div>
   {reveal&&<div className="ww-coaching-card"><strong>Try a three-part description</strong><p>Observation → evidence → interpretation. Compare near and far, mention the atmosphere, then explain why a detail matters.</p></div>}
   {progress.topicNotes[key]&&<p className="ww-success">Observation saved to your storybook.</p>}
 </div>;
}
export function ChallengeTask({mode,topic,round,feedback,misses,score,prompt,choose,completed,open}:{
 mode:'word'|'story'|'debate';topic:Topic;round:number;feedback:string;misses:number;score:number;
 prompt:ChallengePrompt;choose:(i:number)=>void;completed:boolean;open:TaskProps['open'];
}){
 const [showHint,setShowHint]=useState(false);
 useEffect(()=>setShowHint(false),[round,mode]);
 const tasks=mode==='word'?5:4;
 return <div className="ww-flow">
  <div className="ww-activity-banner">
   <span className="ww-kicker">{mode==='word'?'FLOWER GARDEN':mode==='story'?'STORY TRAIL':'ARGUMENT ARENA'}</span>
   <strong>{Math.min(round+1,tasks)} / {tasks}</strong>
   <div className="ww-round-progress">{Array.from({length:tasks},(_,i)=><span className={i<round?'done':''} key={i}/>)}</div>
  </div>
  {completed?<div className="ww-victory"><div className="ww-victory-icon">✦</div><h3>Wonderful work!</h3>
   <p>You've earned {score} adventure points. Try again for a new best, or use these ideas with a classmate.</p>
   <p className="ww-note">Game points reward practising; they are not an IELTS band score.</p>
   <div className="ww-action-line"><GoldenButton onClick={()=>open(mode,topic.id)}>Replay</GoldenButton>
    <PaperButton onClick={()=>open('talk',topic.id)}>Meet a classmate</PaperButton></div>
  </div>:<>
   <div className="ww-coaching-card"><span className="ww-kicker">{topic.title}</span><h3>{prompt.prompt}</h3></div>
   <div className="ww-answer-list">{prompt.options.map((option,index)=><button key={index} onClick={()=>choose(index)} disabled={Boolean(feedback)}>
      <span>{letter(index)}</span><strong>{option}</strong></button>)}</div>
   <p className="ww-note">Walk into the matching marker in the 3D world, or choose A, B or C here. Both paths use the same answer rules.</p>
   <PaperButton onClick={()=>setShowHint(v=>!v)}>{showHint?'Hide strategy':'Need a strategy?'}</PaperButton>
   {showHint&&<p className="ww-tip">{mode==='word'?'Read the meaning first, then match each part to an expression.':
    mode==='story'?'Build your answer from introduction to specific detail, then reflection.':
    'Choose a claim, explain why, support it with an example, and acknowledge nuance.'}</p>}
   {feedback&&<p className={'ww-feedback '+(feedback.startsWith('Try')?'ww-feedback-again':'')} role="status">{feedback}</p>}
   <div className="ww-scoreline"><span>{misses} retries</span><span>Each correct answer lights a trail marker</span></div>
  </>}
 </div>;
}
export function StudyRoom({topic,progress,topicNote,markPractice,open}:{topic:Topic;progress:Progress;topicNote:TaskProps['topicNote'];markPractice:TaskProps['markPractice'];open:TaskProps['open']}){
 const lesson=lessonOfTopic(topic.id);
 const key=topic.id+'.study';
 const [text,setText]=useState(progress.topicNotes[key]||'');
 const [showModel,setShowModel]=useState(false);
 const [showGrammar,setShowGrammar]=useState(false);
 return <div className="ww-flow">
  <div className="ww-coaching-card"><span className="ww-kicker">CLASSROOM SPEAKING MISSION</span><h3>{topic.title}</h3>
   <p>Choose your personal story. Prepare with key ideas, not a memorized paragraph.</p></div>
  <div className="ww-cue-list">{topic.cues.map((q,i)=><p key={q}><b>{i+1}</b>{q}</p>)}</div>
  <label htmlFor="ww-class-note" className="ww-field-label">Four key ideas for your story</label>
  <textarea className="ww-field" id="ww-class-note" rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder="Who/what · where/when · example · why it matters"/>
  <div className="ww-action-line">
    <GoldenButton disabled={text.trim().length<15} onClick={()=>{topicNote(key,text.trim());markPractice(topic.id)}}>Save my story outline</GoldenButton>
    <PaperButton onClick={()=>open('voice',topic.id)}>Rehearse aloud</PaperButton>
  </div>
  <div className="ww-classroom-folds">
   <details open={showGrammar} onToggle={e=>setShowGrammar(e.currentTarget.open)}>
    <summary>Language tools & pronunciation</summary>
    <p><strong>Grammar:</strong> {lesson.grammar}</p><p><strong>Pronunciation:</strong> {lesson.pronunciation}</p>
    <p className="ww-note">Try one structure naturally in your next answer.</p>
   </details>
   <details open={showModel} onToggle={e=>setShowModel(e.currentTarget.open)}>
    <summary>Example narrative for inspiration</summary><p>{lesson.model}</p>
   </details>
  </div>
  {progress.topicNotes[key]&&<p className="ww-success">Your outline is preserved. Return whenever you're ready to rehearse.</p>}
 </div>;
}
export function RecallTask({progress,rateCard,play,close}:{progress:Progress;rateCard:TaskProps['rateCard'];play:TaskProps['play'];close:()=>void}){
 const all=useMemo(()=>lessons.flatMap(lesson=>lesson.expressions.map((entry,i)=>({...entry,key:lesson.week+'.'+i,week:lesson.week}))),[]);
 const today=new Date().toISOString().slice(0,10);
 const due=all.filter(card=>!progress.cards[card.key]||progress.cards[card.key].due<=today);
 const [index,setIndex]=useState(0),[show,setShow]=useState(false);
 const active=due[Math.min(index,due.length-1)];
 const answer=(remembered:boolean)=>{
  if(!active)return;
  rateCard(active.key,remembered);setShow(false);setIndex(i=>Math.min(i,due.length-1));
  play(remembered?'memory-recall':'page-turn');
 };
 return <div className="ww-flow">
  <div className="ww-coaching-card"><span className="ww-kicker">SPACED RETRIEVAL</span><h3>A little memory garden</h3>
    <p>{due.length} expressions ready today. Try recalling a meaning before seeing the answer.</p></div>
  {active?<div className="ww-memory-card">
   <span className="ww-kicker">CHAPTER {active.week} · RECALL CARD {index+1}</span>
   <h3>{active.phrase}</h3><p>{show?active.meaning:'Say the meaning and one natural English sentence before flipping the card.'}</p>
   <div className="ww-action-line">{!show?<GoldenButton onClick={()=>{setShow(true);play('page-turn')}}>Reveal meaning</GoldenButton>:<>
     <PaperButton onClick={()=>answer(false)}>Review tomorrow</PaperButton>
     <GoldenButton onClick={()=>answer(true)}>I remembered</GoldenButton></>}</div>
  </div>:<div className="ww-victory"><span className="ww-victory-icon">✿</span><h3>Your memories are up to date</h3><p>Return when another word is ready to grow.</p><PaperButton onClick={close}>Back to the meadow</PaperButton></div>}
 </div>;
}
export function SeedTask({week,index,close,collect,play}:{
 week:number;index:number;close:()=>void;collect:(week:number,index:number)=>void;play:TaskProps['play'];
}){
 const lesson=lessons[week-1],expression=lesson.expressions[index%lesson.expressions.length];
 const [draft,setDraft]=useState(''),[hint,setHint]=useState(false),[retry,setRetry]=useState(false);
 const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const answer=()=>{
  if(normalize(draft)!==normalize(expression.phrase)){setRetry(true);play('try-again');return;}
  collect(week,index);play('seed-find');close();
 };
 return <div className="ww-flow">
   <div className="ww-seed-orb">✿</div>
   <div className="ww-coaching-card"><span className="ww-kicker">A LITTLE SECRET IN THE GRASS</span>
    <h3>Make this seed bloom with a word.</h3><p>Recall the English expression that matches the meaning below. You can use the phrase in a sentence after collecting it.</p></div>
   <div className="ww-memory-card"><span className="ww-kicker">MEANING</span><h3>{expression.meaning}</h3></div>
   <label htmlFor="ww-seed-answer" className="ww-field-label">The expression I remember is…</label>
   <input id="ww-seed-answer" className="ww-field" value={draft} onChange={e=>{setDraft(e.target.value);setRetry(false)}}
    onKeyDown={e=>e.key==='Enter'&&answer()} placeholder="Write the English expression" autoComplete="off" spellCheck={false}/>
   {retry&&<p role="status" className="ww-feedback ww-feedback-again">That isn't the phrase yet. Read the meaning, then try again.</p>}
   {hint&&<p className="ww-tip">Your phrase begins with “{expression.phrase.split(' ')[0]}”.</p>}
   <div className="ww-action-line"><GoldenButton onClick={answer} disabled={!draft.trim()}>Plant the word seed</GoldenButton>
    <PaperButton onClick={()=>{setHint(v=>!v);play('page-turn')}}>{hint?'Hide hint':'A little hint'}</PaperButton></div>
   <p className="ww-note">Your seed stays collected and earns an acorn for your village workshop.</p>
 </div>;
}
export function MapTask({travelTo,close,play}:{travelTo:TaskProps['travelTo'];close:()=>void;play:TaskProps['play']}){
 return <div className="ww-flow">
  <p className="ww-note">All districts are connected. Choose a place to walk there, or meet its students individually.</p>
  <div className="ww-map-grid">{REGIONS.map(region=><div className="ww-map-location" key={region.week}>
    <div className="ww-map-color" style={{background:region.color}}/>
    <div><strong>{region.title}</strong><small>{region.description}</small></div>
    <button onClick={()=>{travelTo(region.center[0],region.center[1]);close();play('region-enter')}} aria-label={'Walk to '+region.title}>Go</button>
  </div>)}</div>
 </div>;
}
export function BuildTask({progress,regionWeek,availableAcorns,build,play}:{progress:Progress;regionWeek:number;availableAcorns:number;build:TaskProps['build'];play:TaskProps['play']}){
 const owned=progress.decorations[String(regionWeek)]||[];
 return <div className="ww-flow"><div className="ww-coaching-card"><span className="ww-kicker">THE LITTLE VILLAGE WORKSHOP</span>
  <h3>Every lesson adds something lovely.</h3><p>{availableAcorns} acorns available for building. Every decoration stays in your current district.</p></div>
  <div className="ww-build-list">{BUILD_ITEMS.map(item=><div className="ww-build-item" key={item.id}><span>{item.icon}</span>
   <div><strong>{item.name}</strong><small>{item.description}</small></div>
   <button disabled={owned.includes(item.id)||availableAcorns<item.cost} onClick={()=>{build(regionWeek,item.id);play('furniture-place')}}>
     {owned.includes(item.id)?'Placed':item.cost+' ✦'}</button>
  </div>)}</div>
  <p className="ww-note">Acorns are earned through learning, never purchased. Different neighborhoods can have their own furniture.</p>
 </div>;
}
export function JournalTask({progress,exportData,importData,open}:{progress:Progress;exportData:()=>void;importData:TaskProps['importData'];open:TaskProps['open']}){
 const upload=useRef<HTMLInputElement>(null);
 const allRecorded=STUDENTS.filter(actor=>progress.reviewedTopics.includes(actor.topicId!));
 const completed=Object.keys(progress.quests).length;
 const earned=Object.values(progress.quests).reduce((sum,item)=>sum+Math.floor(item.best/20),0)+Object.values(progress.foundSeeds).filter(Boolean).length;
 const used=spentAcorns(progress.decorations);
 const read=async(e:React.ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];if(!file)return;
  try{importData(JSON.parse(await file.text()))}catch{alert('That file is not a valid SpeakLab progress export.')}
  e.target.value='';
 };
 return <div className="ww-flow">
   <div className="ww-storybook-tally">
     <div><strong>{allRecorded.length}<small>/44</small></strong><span>student topics practised</span></div>
     <div><strong>{completed}</strong><span>missions completed</span></div>
     <div><strong>{earned-used}</strong><span>acorns available</span></div>
   </div>
   <div className="ww-coaching-card"><h3>Your learning trail</h3><p>Every personal outline, conversation, photograph observation, and self-assessment is saved locally on this device.</p></div>
   <div className="ww-journal-topics">{STUDENTS.filter(actor=>actor.topicId).map(actor=><button key={actor.id} onClick={()=>open('classroom',actor.topicId,actor.id)}
     className={progress.reviewedTopics.includes(actor.topicId!)?'learned':''}>
     <span>{progress.reviewedTopics.includes(actor.topicId!)?'✿':'◇'}</span><strong>{topicMap.get(actor.topicId!)?.title}</strong><small>{actor.name}</small></button>)}</div>
   <div className="ww-action-line">
     <GoldenButton onClick={exportData}>Export my storybook</GoldenButton>
     <PaperButton onClick={()=>upload.current?.click()}>Import progress</PaperButton>
     <input ref={upload} type="file" accept=".json,application/json" hidden onChange={read} aria-label="Import SpeakLab progress file"/>
   </div>
   <p className="ww-note">Recordings remain on your device only during the current practice session; download them to keep them. Exporting progress does not include audio files.</p>
 </div>;
}
export function SpeakingRecorder({topic,onActive,onFinished,onPower,play}:{topic:Topic;onActive:(active:boolean)=>void;onFinished:(seconds:number)=>void;onPower?:(fraction:number)=>void;play:TaskProps['play']}){
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),context=useRef<AudioContext|null>(null);
 const raf=useRef(0),chunks=useRef<Blob[]>([]),start=useRef(0),activeSeconds=useRef(0);
 const urlRef=useRef<string|null>(null);
 const [state,setState]=useState<'ready'|'requesting'|'recording'|'review'>('ready');
 const [elapsed,setElapsed]=useState(0),[power,setPower]=useState(0),[url,setUrl]=useState<string|null>(null),[error,setError]=useState('');
 const cleanup=useCallback(()=>{
  cancelAnimationFrame(raf.current);
  if(recorder.current?.state==='recording')recorder.current.stop();
  stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
  if(context.current){void context.current.close().catch(()=>{});context.current=null}
  onActive(false);
 },[onActive]);
 useEffect(()=>()=>{cleanup();if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[cleanup]);
 const begin=async()=>{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setError('Microphone recording is not supported here. You can still write your speaking response.');return}
  setError('');setState('requesting');play('assessment-start');
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   stream.current=media;onActive(true);
   const ctx=new AudioContext({latencyHint:'interactive'});context.current=ctx;
   const analyzer=ctx.createAnalyser();analyzer.fftSize=1024;
   ctx.createMediaStreamSource(media).connect(analyzer);
   const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
   const record=new MediaRecorder(media,type?{mimeType:type}:undefined);
   recorder.current=record;chunks.current=[];
   record.ondataavailable=e=>{if(e.data.size>0)chunks.current.push(e.data)};
   record.onstop=()=>{
    const blob=new Blob(chunks.current,{type:record.mimeType||'audio/webm'});
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    urlRef.current=URL.createObjectURL(blob);setUrl(urlRef.current);setState('review');
   };
   start.current=performance.now();activeSeconds.current=0;setState('recording');setElapsed(0);setPower(0);
   record.start();const samples=new Float32Array(analyzer.fftSize);
   let lastTick=0,last=performance.now();
   const frame=(now:number)=>{
    if(!stream.current)return;
    analyzer.getFloatTimeDomainData(samples);
    let sum=0;for(const sample of samples)sum+=sample*sample;
    const rms=Math.sqrt(sum/samples.length);
    activeSeconds.current+=rms>.021?Math.min(.08,(now-last)/1000):0;
    last=now;
    if(now-lastTick>100){
      const next=Math.min(1,activeSeconds.current/35);
      setElapsed((now-start.current)/1000);setPower(next);onPower?.(next);lastTick=now;
    }
    raf.current=requestAnimationFrame(frame);
   };
   raf.current=requestAnimationFrame(frame);
  }catch(e){setError(e instanceof Error?e.message:'Microphone permission was denied.');setState('ready');cleanup()}
 };
 const finish=()=>{
  const secs=(performance.now()-start.current)/1000;
  cleanup();onFinished(secs);
 };
 return <div className="ww-flow">
  <span className="ww-kicker">SPEAKING PART 2 · YOUR TURN</span>
  <div className="ww-voice-ribbon"><div className="ww-meter-lights">{Array.from({length:4},(_,i)=><span key={i} className={i/4<power?'lit':''}>✦</span>)}</div>
   <strong>{Math.floor(elapsed)}s speaking</strong><small>Four lanterns respond to sustained sound, not pronunciation quality.</small></div>
  <div className="ww-action-line">
   {state==='ready'&&<GoldenButton onClick={begin}>Start microphone practice</GoldenButton>}
   {state==='requesting'&&<PaperButton disabled onClick={()=>{}}>Requesting microphone…</PaperButton>}
   {state==='recording'&&<GoldenButton onClick={finish}>Stop & listen</GoldenButton>}
   {state==='review'&&<PaperButton onClick={begin}>Record again</PaperButton>}
  </div>
  {url&&<div className="ww-recording-review"><audio controls src={url}/><a href={url} download={'speaklab-'+topic.id+(recorder.current?.mimeType.includes('mp4')?'.m4a':'.webm')}>Save this recording</a></div>}
  {error&&<p role="alert" className="ww-feedback ww-feedback-again">{error}</p>}
  <p className="ww-note">Your microphone audio never leaves the browser. Download the recording if you want to keep it.</p>
 </div>;
}
export function SpeakingTask({topic,progress,topicNote,markPractice,play,onActive,onPower}:{
 topic:Topic;progress:Progress;topicNote:TaskProps['topicNote'];markPractice:TaskProps['markPractice'];
 play:TaskProps['play'];onActive:(active:boolean)=>void;onPower:(n:number)=>void;
}){
 const key=topic.id+'.voice.notes';
 const [note,setNote]=useState(progress.topicNotes[key]||'');
 return <div className="ww-flow">
  <div className="ww-topic-paper"><span className="ww-kicker">SPEAK FROM EXPERIENCE</span><h3>{topic.title}</h3>
   <div className="ww-cue-list">{topic.cues.map((cue,i)=><p key={i}><b>{i+1}</b>{cue}</p>)}</div></div>
  <SpeakingRecorder topic={topic} onActive={onActive} onPower={onPower} onFinished={secs=>{if(secs>5)markPractice(topic.id);play('voice-rise')}} play={play}/>
  <label className="ww-field-label" htmlFor="ww-speaking-note">Reflection: one thing to improve next time</label>
  <textarea className="ww-field" id="ww-speaking-note" rows={3} value={note} onChange={e=>setNote(e.target.value)}/>
  <PaperButton onClick={()=>topicNote(key,note.trim())}>Save reflection</PaperButton>
 </div>;
}
export function AssessmentTask({topic,progress,scoreAssessment,play,onActive}:{
 topic:Topic;progress:Progress;scoreAssessment:TaskProps['scoreAssessment'];play:TaskProps['play'];onActive:(active:boolean)=>void;
}){
 const questions=[
  ['PART 1 · CONVERSATION',['What do you usually enjoy doing in your free time?','Tell me about a place where you like to learn new things.','What has changed in your daily routine recently?']],
  ['PART 2 · LONG TURN',topic.cues],
  ['PART 3 · DISCUSSION',topic.discussion]
 ] as const;
 const [phase,setPhase]=useState(0),[seconds,setSeconds]=useState(0),[running,setRunning]=useState(false),[note,setNote]=useState('');
 const [scores,setScores]=useState({fluency:6,lexical:6,grammar:6,pronunciation:6});
 const now=useRef(0),start=useRef(0);
 const duration=phase===1?120:phase===0?120:240;
 useEffect(()=>{
  if(!running)return;
  let frame=0;
  const tick=(ms:number)=>{if(ms-now.current>150){setSeconds((ms-start.current)/1000);now.current=ms}frame=requestAnimationFrame(tick)};
  start.current=performance.now()-seconds*1000;frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[running,phase]);
 const advance=()=>{setRunning(false);setSeconds(0);setPhase(p=>Math.min(3,p+1));play(phase===2?'assessment-finish':'page-turn')};
 const save=()=>{
  scoreAssessment({date:new Date().toISOString(),topic:topic.id,notes:note,...scores});
  play('assessment-finish');
 };
 return <div className="ww-flow">
  <div className="ww-coaching-card"><span className="ww-kicker">SPEAKING FESTIVAL · PRACTICE ONLY</span>
   <h3>Your complete interview</h3><p>Three stages with a calm student examiner. Only you or a human teacher can evaluate the IELTS speaking criteria.</p></div>
  <div className="ww-assessment-progress">{['Hello','Story','Discussion','Reflect'].map((text,i)=><span key={i} className={phase===i?'active':i<phase?'done':''}>{text}</span>)}</div>
  {phase<3?<><span className="ww-kicker">{questions[phase][0]}</span><div className="ww-cue-list">{questions[phase][1].map((q,i)=><p key={i}><b>{i+1}</b>{q}</p>)}</div>
    <div className="ww-clock"><strong>{Math.floor(seconds/60).toString().padStart(2,'0')}:{Math.floor(seconds%60).toString().padStart(2,'0')}</strong>
    <span>Suggested stage duration {Math.ceil(duration/60)} minutes</span></div>
    <div className="ww-action-line"><GoldenButton onClick={()=>{setRunning(x=>!x);play('chat-choice')}}>{running?'Pause clock':'Start clock'}</GoldenButton>
     <PaperButton onClick={advance}>Next stage</PaperButton></div>
    <SpeakingRecorder topic={topic} onActive={onActive} onFinished={()=>{}} play={play}/>
    </>:<><h3>Reflect on your performance</h3>
      <p className="ww-note">Select your own approximate band profile or enter your teacher's observation. These values are not calculated from audio.</p>
      <div className="ww-rubric-grid">{(['fluency','lexical','grammar','pronunciation'] as const).map(key=><label key={key}>
       <span>{key==='lexical'?'Vocabulary':key==='fluency'?'Fluency and coherence':key==='grammar'?'Grammar':'Pronunciation'}</span>
       <select value={scores[key]} onChange={e=>setScores(s=>({...s,[key]:Number(e.target.value)}))}>
        {Array.from({length:17},(_,i)=>1+i*.5).map(n=><option key={n} value={n}>{n.toFixed(1)}</option>)}
       </select></label>)}</div>
      <label htmlFor="ww-assess-note" className="ww-field-label">One success and one next step</label>
      <textarea id="ww-assess-note" rows={4} className="ww-field" value={note} onChange={e=>setNote(e.target.value)}/>
      <GoldenButton onClick={save}>Save human/self-assessment</GoldenButton>
      {progress.rubric.some(r=>r.topic===topic.id)&&<p className="ww-success">Your latest assessment has been saved to your storybook.</p>}
      </>}
 </div>;
}
export function FestivalTask({topic,open,play}:{topic:Topic;open:TaskProps['open'];play:TaskProps['play']}){
 return <div className="ww-flow"><div className="ww-festival-crest">✧ ✿ ✧</div><h3>Welcome to the Speaking Festival</h3>
  <p>Meet the examiner, share your best long turn, make an argument, and celebrate your practice with the whole village.</p>
  <div className="ww-action-line"><GoldenButton onClick={()=>{open('assessment',topic.id);play('festival-cheer')}}>Enter the speaking festival</GoldenButton>
    <PaperButton onClick={()=>open('journal',topic.id)}>See my storybook</PaperButton></div></div>;
}
