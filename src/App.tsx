import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, BookOpenText, CheckCircle2, ChevronDown, CircleCheck, CloudOff, Compass, Download, Heart, Leaf, LibraryBig, Menu, Mic2, Search, Settings2, Sparkles, Star, Sun, Volume2, VolumeX } from 'lucide-react';
import WorldStage from './World';
import { DebateBridge, AudioRecorder, MockScoring, Reflection, SpeakingTimer, StoryCottage, Warmup, WordGarden, TaskIntro } from './Activities';
import { lessons, topics, topicMap, stationMeta, type Station, type Topic } from './data';
import { exportProgress, useProgress, useReducedMotion } from './store';
import { worldAudio, type SoundCue } from './audio';

type Page='village'|'course'|'lesson'|'library'|'topic'|'review'|'mock'|'progress'|'settings';
type Route={page:Page;week:number;station:Station|null;topic:string};
const pages:Page[]=['village','course','lesson','library','topic','review','mock','progress','settings'];
const stationNames:Station[]=['garden','story','speak','debate'];
const topNav:[Page,string,typeof Compass][]=[['village','Village',Compass],['course','Lessons',BookOpenText],['library','Question library',LibraryBig],['review','Recall',Star],['mock','Mock IELTS',Mic2],['progress','My progress',Award]];
const initial:Route={page:'village',week:1,station:null,topic:topics[0]?.id||''};
function readRoute():Route{
  const seg=decodeURIComponent(location.hash.slice(1)).split('/');
  const page=pages.includes(seg[0] as Page)?seg[0] as Page:'village';
  const week=Math.max(1,Math.min(11,Number(seg[1])||1));
  const station=stationNames.includes(seg[2] as Station)?seg[2] as Station:null;
  const topic=page==='topic'?(seg[1]||initial.topic):(seg[3]||initial.topic);
  return {page,week,station,topic};
}
function makeHash(r:Route){return '#'+r.page+(r.page==='lesson'?'/'+r.week+'/'+(r.station||'garden')+'/'+encodeURIComponent(r.topic):r.page==='topic'?'/'+encodeURIComponent(r.topic):'');}
function PageTitle({eyebrow,title,description}:{eyebrow:string;title:string;description:string}){return <div className="page-title"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>}
function Pill({children}:{children:React.ReactNode}){return <span className="pill">{children}</span>}
function RatingDots({count,total=11}:{count:number;total?:number}){return <div className="rating-dots" role="progressbar" aria-label="Course progress" aria-valuenow={count} aria-valuemin={0} aria-valuemax={total}><span style={{width:`${100*count/total}%`}}/></div>}
function TopicCard({topic,open,practiced}:{topic:Topic;open:()=>void;practiced:boolean}){
 return <button onClick={open} className="topic-card"><div className="topic-number">{topic.id}</div><div className="topic-copy"><h3>{topic.title}</h3><p>{topic.cues.length} Part 2 clues · {topic.discussion.length} Part 3 questions</p></div><div className="topic-arrow">{practiced?<CheckCircle2 size={20}/>:<ArrowRight size={19}/>}</div></button>;
}
function Navigation({route,navigate,soundOn,setSoundOn}:{route:Route;navigate:(r:Partial<Route>)=>void;soundOn:boolean;setSoundOn:()=>void}){
 const [open,setOpen]=useState(false);
 return <header className="site-header">
  <a href="#village" className="brand" onClick={e=>{e.preventDefault();navigate({page:'village'});setOpen(false)}} aria-label="SpeakLab Village home"><span className="brand-emblem"><Leaf size={24}/></span><span><strong>SpeakLab<span> Village</span></strong><small>YOUR ENGLISH ADVENTURE</small></span></a>
  <button className="mobile-menu-button" aria-expanded={open} aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(v=>!v)}><Menu size={23}/></button>
  <nav className={open?'top-nav expanded':'top-nav'} aria-label="Main menu">{topNav.map(([page,label,Icon])=><button key={page} aria-current={route.page===page?'page':undefined} className={route.page===page?'nav-button selected':'nav-button'} onClick={()=>{navigate({page});setOpen(false)}}><Icon size={17} strokeWidth={1.9}/>{label}</button>)}</nav>
  <div className="header-actions"><button className="sound-toggle" onClick={setSoundOn} aria-label={soundOn?'Mute original game sounds':'Enable original game sounds'} aria-pressed={soundOn} title={soundOn?'Sound on':'Sound off'}>{soundOn?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><button className="settings-link" aria-label="Settings and data" onClick={()=>navigate({page:'settings'})}><Settings2 size={19}/></button></div>
 </header>;
}
function VillageIntro({nextWeek,completed,navigate}:{nextWeek:number;completed:number;navigate:(r:Partial<Route>)=>void}){
 return <div className="village-intro"><span className="eyebrow"><span className="sparkle-dot"/> A LITTLE WORLD. BIG IDEAS.</span><h1>Every word is <em>an adventure.</em></h1><p>Wander through a cozy English village. Gather new expressions, tell meaningful stories, practise your voice, and discover what you can say.</p><div className="intro-actions"><button className="button dark large" onClick={()=>navigate({page:'lesson',week:nextWeek,station:'garden'})}>Continue Week {nextWeek.toString().padStart(2,'0')} <ArrowRight size={18}/></button><button className="button glass" onClick={()=>navigate({page:'course'})}>Explore the course</button></div><div className="intro-metrics"><div><strong>{completed}<small> / 11</small></strong><span>lessons complete</span></div><div><strong>44</strong><span>speaking stories</span></div><div><strong>132</strong><span>deep questions</span></div></div></div>;
}
const schedule=[
  ['warmup','Photo discovery','Observe & predict'],
  ['garden','Word Garden','Retrieve & build'],
  ['story','Story Cottage','Plan & narrate'],
  ['speak','Speaking Dock','Record & reflect'],
  ['debate','Debate Bridge','Reason & discuss'],
  ['wrap','Reflection','Remember & grow']
] as const;
function LessonMenu({station,select,finished}:{station:string;select:(station:string)=>void;finished:boolean}){
 return <div className="quest-rail" role="tablist" aria-label="Learning activities">{schedule.map(([key,title,subtitle],i)=><button role="tab" aria-selected={station===key} key={key} className={station===key?'quest-link selected':'quest-link'} onClick={()=>select(key)}><span className="quest-index">{String(i+1).padStart(2,'0')}</span><span><strong>{title}</strong><small>{subtitle}</small></span><span className="quest-link-end">{key==='wrap'&&finished?<CheckCircle2 size={18}/>:<ArrowRight size={15}/>}</span></button>)}</div>;
}
function SchoolDay({week,station,selectedTopic,setTopic,progress,note,topicNote,update,rateCard,complete,practise,onCue}:{week:number;station:Station|null;selectedTopic:string;setTopic:(id:string)=>void;progress:ReturnType<typeof useProgress>['progress'];note:ReturnType<typeof useProgress>['note'];topicNote:ReturnType<typeof useProgress>['topicNote'];update:ReturnType<typeof useProgress>['update'];rateCard:ReturnType<typeof useProgress>['rateCard'];complete:ReturnType<typeof useProgress>['complete'];practise:ReturnType<typeof useProgress>['practise'];onCue:(cue:SoundCue)=>void}){
 const [section,setSection]=useState<string>(station||'warmup');
 useEffect(()=>setSection(station||'warmup'),[station,week]);
 const lesson=lessons[week-1]||lessons[0];
 const collection=lesson.topics.map(id=>topicMap.get(id)).filter((t):t is Topic=>Boolean(t));
 const topic=collection.find(t=>t.id===selectedTopic)||collection[0];
 const stationSelect=(key:string)=>{setSection(key);if(stationNames.includes(key as Station))onCue('turn')};
 return <section className="course-screen"><div className="section-bar"><div><span className="eyebrow">CHAPTER {String(week).padStart(2,'0')} / 11</span><h2>{lesson.title}</h2><p>{lesson.objective}</p></div><Pill>75-minute guided lesson</Pill></div>
   <div className="lesson-workspace"><aside className="lesson-side"><div className="side-heading"><span className="eyebrow">TODAY'S JOURNEY</span><p>Six small steps, one clearer voice.</p></div><LessonMenu station={section} select={stationSelect} finished={progress.completed.includes(week)}/><div className="lesson-side-note"><Sun size={22}/><p>English grows through meaningful practice—not memorized answers.</p></div></aside>
   <div className="activity-content" key={week+'-'+section}>
    {section==='warmup'&&<Warmup lesson={lesson} progress={progress} note={note} topicNote={topicNote} rateCard={rateCard} update={update}/>}
    {section==='garden'&&<WordGarden lesson={lesson} progress={progress} note={note} topicNote={topicNote} rateCard={rateCard} update={update} onCue={onCue}/>}
    {section==='story'&&<StoryCottage lesson={lesson} topics={collection} topic={topic} select={setTopic} progress={progress} topicNote={topicNote} onCue={onCue}/>}
    {section==='speak'&&<div className="activity-stack"><TaskIntro eyebrow="THE SPEAKING DOCK" title="Find your confident voice">Take one minute to prepare, then speak for up to two minutes. Record your voice and listen for improvement.</TaskIntro>
      <div className="paper-panel"><label className="field-label">Your speaking topic</label><select className="text-field" value={topic.id} onChange={e=>setTopic(e.target.value)}>{collection.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select><div className="cue-paper compact"><span className="eyebrow">PART 2 · SPEAK FROM EXPERIENCE</span><h3>{topic.title}</h3>{topic.cues.map(c=><p key={c}>✦ &nbsp;{c}</p>)}</div></div>
      <div className="timer-grid"><div className="paper-panel"><h3>Prepare your ideas</h3><SpeakingTimer minutes={1} label="PREPARE"/></div><div className="paper-panel"><h3>Tell your story</h3><SpeakingTimer minutes={2} label="SPEAK"/></div></div><AudioRecorder/>
      <div className="paper-panel"><label className="field-label">A note for your next attempt</label><textarea className="text-field" rows={3} placeholder="What would you express more clearly next time?" value={progress.topicNotes[`${topic.id}.practice`]||''} onChange={e=>topicNote(`${topic.id}.practice`,e.target.value)}/><button className="button dark" onClick={()=>{practise(topic.id);onCue('celebrate')}}>{progress.reviewedTopics.includes(topic.id)?'Practised ✓':'Mark topic practised'} <CheckCircle2 size={18}/></button></div>
    </div>}
    {section==='debate'&&<DebateBridge topic={topic} progress={progress} topicNote={topicNote}/>}
    {section==='wrap'&&<Reflection lesson={lesson} progress={progress} note={note} complete={complete} onCue={onCue}/>}
    <div className="activity-footer"><span>{lesson.homework.slice(0,145)}{lesson.homework.length>145?'…':''}</span><button className="text-action" onClick={()=>{const i=schedule.findIndex(x=>x[0]===section);setSection(schedule[Math.min(i+1,schedule.length-1)][0])}}>Next activity <ArrowRight size={17}/></button></div>
   </div></div>
 </section>;
}
function CourseScreen({completed,open}:{completed:number[];open:(week:number)=>void}){
 return <section className="wide-section"><PageTitle eyebrow="THE LEARNING TRAIL" title="Twelve weeks to a stronger voice." description="Eleven guided chapters and a final speaking assessment. Each week includes visual discovery, vocabulary, storytelling and reflective discussion."/>
 <div className="course-map">{lessons.map((l,i)=><button key={l.week} className="chapter-card" onClick={()=>open(l.week)}><div className="chapter-nature"><span>{['❀','✧','✦','◈','☼','◍','♧','⚑','♨','♜','✹'][i]}</span><small>WEEK {String(l.week).padStart(2,'0')}</small></div><div className="chapter-copy"><h3>{l.title}</h3><p>{l.objective}</p><div><span>{l.topics.length} topic quests</span>{completed.includes(l.week)?<span className="completed"><CircleCheck size={15}/> Completed</span>:<span>Begin <ArrowRight size={16}/></span>}</div></div></button>)}<button className="chapter-card final" onClick={()=>open(12)}><div className="chapter-nature"><span>✦</span><small>WEEK 12</small></div><div className="chapter-copy"><h3>Speaking Festival</h3><p>Your complete practice interview, scorecard and next-step reflection.</p><div><span>Final assessment</span><span>Begin <ArrowRight size={16}/></span></div></div></button></div></section>;
}
function TopicLibrary({reviewed,open}:{reviewed:string[];open:(topic:string)=>void}){
 const [search,setSearch]=useState('');const [week,setWeek]=useState('all');
 const filtered=useMemo(()=>topics.filter(t=>(week==='all'||t.week===Number(week))&&(t.title+' '+t.discussion.join(' ')).toLowerCase().includes(search.toLowerCase())),[week,search]);
 return <section className="wide-section"><PageTitle eyebrow="44 STORIES, ENDLESS POSSIBILITIES" title="The question library." description="Every original Part 2 cue card and 132 related Part 3 discussion questions, in one searchable place."/>
  <div className="filter-bar"><label className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search a topic, theme or question…" aria-label="Search speaking topics"/></label><select value={week} onChange={e=>setWeek(e.target.value)} aria-label="Filter themes"><option value="all">All themes</option>{lessons.map(l=><option value={l.week} key={l.week}>Week {l.week} · {l.title}</option>)}</select><span>{filtered.length} topics</span></div>
  <div className="topic-grid">{filtered.map(t=><TopicCard topic={t} practiced={reviewed.includes(t.id)} key={t.id} open={()=>open(t.id)}/>)}</div>
  {filtered.length===0&&<div className="empty-state">No topics match those words. Try another search or theme.</div>}
 </section>;
}
function TopicPage({topic,progress,topicNote,practise,back}:{topic:Topic;progress:ReturnType<typeof useProgress>['progress'];topicNote:ReturnType<typeof useProgress>['topicNote'];practise:(id:string)=>void;back:()=>void}){
 return <section className="wide-section topic-detail"><button className="text-action back-link" onClick={back}><ArrowLeft size={18}/> Back to library</button><PageTitle eyebrow={'TOPIC '+topic.id+' · PART 2 & PART 3'} title={topic.title} description="Plan your answer in keywords, then speak naturally. Part 3 moves from a personal story to wider ideas."/>
 <div className="lesson-workspace"><div className="paper-panel"><span className="eyebrow">YOUR CUE CARD</span><h3>You should say</h3><ul className="cue-list">{topic.cues.map(x=><li key={x}>{x}</li>)}</ul>
  <div className="cue-note-grid">{topic.cues.map((q,i)=><label key={i} className="cue-note"><strong>{q}</strong><textarea className="text-field" rows={2} placeholder="Keywords to guide your story…" value={progress.topicNotes[`${topic.id}.cue.${i}`]||''} onChange={e=>topicNote(`${topic.id}.cue.${i}`,e.target.value)}/></label>)}</div>
  <button className="button dark" onClick={()=>practise(topic.id)}><CheckCircle2 size={17}/>{progress.reviewedTopics.includes(topic.id)?'Practised':'Mark as practised'}</button>
 </div><div className="activity-stack"><div className="paper-panel"><h3>Your speaking clock</h3><SpeakingTimer minutes={1} label="PREPARE"/><SpeakingTimer minutes={2} label="SPEAK"/></div><div className="paper-panel"><span className="eyebrow">PART 3 QUESTIONS</span><h3>Explore deeper ideas</h3>{topic.discussion.map((q,i)=><label key={q} className="question-note"><strong>0{i+1}. {q}</strong><textarea className="text-field" rows={2} value={progress.topicNotes[`${topic.id}.part3.${i}`]||''} onChange={e=>topicNote(`${topic.id}.part3.${i}`,e.target.value)} placeholder="Claim • reason • example • nuance"/></label>)}</div></div></div>
 </section>;
}
function RecallScreen({progress,rateCard,onCue}:{progress:ReturnType<typeof useProgress>['progress'];rateCard:ReturnType<typeof useProgress>['rateCard'];onCue:(cue:SoundCue)=>void}){
 const cards=lessons.flatMap(l=>l.expressions.map((e,i)=>({...e,key:`${l.week}.${i}`,week:l.week})));
 const due=cards.filter(c=>!progress.cards[c.key]||progress.cards[c.key].due<=new Date().toISOString().slice(0,10));
 const [index,setIndex]=useState(0),[shown,setShown]=useState(false);
 const active=due[Math.min(index,due.length-1)];
 useEffect(()=>setIndex(i=>Math.max(0,Math.min(i,due.length-1))),[due.length]);
 const answer=(yes:boolean)=>{if(!active)return;rateCard(active.key,yes);setShown(false);if(yes)onCue('bloom')};
 return <section className="wide-section"><PageTitle eyebrow="RETURN TO YOUR WORDS" title="The Memory Orchard." description="A short daily retrieval practice. Recall an expression, explain it, then schedule its next review."/><div className="recall-metrics"><Pill>{cards.length} expressions</Pill><Pill>{due.length} ready today</Pill><Pill>{cards.length-due.length} growing</Pill></div>
 {active?<div className="recall-stage"><div className="recall-illustration">✿</div><span className="eyebrow">WEEK {active.week} · CARD {index+1} OF {due.length}</span><h2>{active.phrase}</h2><p>{shown?active.meaning:'What does this mean? Think of a sentence of your own.'}</p><div className="inline-actions">{!shown?<button className="button light" onClick={()=>setShown(true)}>Reveal meaning <ChevronDown size={17}/></button>:<><button className="button light" onClick={()=>answer(false)}>Again tomorrow</button><button className="button dark" onClick={()=>answer(true)}>I remembered <CheckCircle2 size={17}/></button></>}</div><p className="micro">Meaning first, memory second. Review aloud for the best practice.</p></div>:<div className="empty-state"><Sparkles size={38}/> Your orchard is caught up for today. Come back when more cards are due.</div>}</section>;
}
function MockScreen({onScore,scored}:{onScore:ReturnType<typeof useProgress>['score'];scored:number}){
 const [selected,setSelected]=useState(0);
 const t=topics[selected%topics.length];
 return <section className="wide-section"><PageTitle eyebrow="WEEK 12 · THE SPEAKING FESTIVAL" title="Your mock interview." description="Practice the structure of an IELTS Speaking test and record a human-reviewed assessment. These are practice materials, not an official exam."/>
 <div className="mock-grid"><div className="activity-stack"><div className="paper-panel"><span className="eyebrow">PART 1 · WARM-UP PRACTICE</span><h3>About you</h3><p className="muted">Supplementary practice prompts created for SpeakLab, not from the supplied screenshots.</p><ul className="cue-list"><li>What do you enjoy doing in your free time?</li><li>Tell me about a place where you like to study.</li><li>How has your daily routine changed recently?</li></ul></div>
 <div className="paper-panel"><span className="eyebrow">PART 2 · LONG TURN</span><h3>{t.title}</h3><ul className="cue-list">{t.cues.map(c=><li key={c}>{c}</li>)}</ul><SpeakingTimer minutes={1} label="PREPARE"/><SpeakingTimer minutes={2} label="SPEAK"/><button className="button light" onClick={()=>setSelected(i=>(i+7)%topics.length)}><RotateCcwIcon/> Another cue card</button></div>
 <div className="paper-panel"><span className="eyebrow">PART 3 · DISCUSSION</span><h3>Explore the topic</h3><ul className="cue-list">{t.discussion.map(q=><li key={q}>{q}</li>)}</ul></div></div><div className="activity-stack"><AudioRecorder/><MockScoring topic={t.title} onSave={onScore}/><div className="paper-panel"><span className="eyebrow">SAVED ASSESSMENTS</span><h3>{scored} practice scorecards</h3><p className="muted">Review your score history on the My Progress page. Numerical self-scores are practice observations only.</p></div></div></div>
 </section>;
}
function RotateCcwIcon(){return <span aria-hidden="true">↺</span>}
function ProgressScreen({progress,exportData}:{progress:ReturnType<typeof useProgress>['progress'];exportData:()=>void}){
 const average=(score:typeof progress.rubric[number])=>((score.fluency+score.lexical+score.grammar+score.pronunciation)/4).toFixed(1);
 return <section className="wide-section"><PageTitle eyebrow="YOUR STORY SO FAR" title="The growing journal." description="Every practice attempt counts. Notice your growth, revisit what you've learned, and take your progress with you."/>
 <div className="progress-summary"><div><span>CHAPTERS COMPLETED</span><strong>{progress.completed.length}<small> / 11</small></strong><RatingDots count={progress.completed.length}/></div><div><span>TOPICS PRACTISED</span><strong>{progress.reviewedTopics.length}<small> / 44</small></strong><RatingDots count={progress.reviewedTopics.length} total={44}/></div><div><span>SPEAKING SCORECARDS</span><strong>{progress.rubric.length}</strong><span className="stat-description">Saved teacher / self-assessments</span></div></div>
 <div className="two-pane"><div className="paper-panel"><h3>Completed chapters</h3><div className="chapter-checklist">{lessons.map(l=><div key={l.week}><span className={progress.completed.includes(l.week)?'check-tick done':'check-tick'}>{progress.completed.includes(l.week)?<CheckCircle2 size={18}/>:String(l.week).padStart(2,'0')}</span><span>{l.title}</span></div>)}</div></div><div className="paper-panel"><h3>Assessment history</h3>{progress.rubric.length?<div className="score-history">{[...progress.rubric].reverse().map((s,i)=><div key={s.date+'-'+i}><div><strong>{s.topic}</strong><span>{new Date(s.date).toLocaleDateString()}</span></div><span className="score-figure">{average(s)}<small> practice avg.</small></span>{s.notes&&<p>{s.notes}</p>}</div>)}</div>:<p className="muted">Your speaking assessments will appear here after you complete a mock interview.</p>}<button className="button light" onClick={exportData}><Download size={17}/> Export my learning journal</button></div></div></section>;
}
function SettingsScreen({progress,exportData,replace}:{progress:ReturnType<typeof useProgress>['progress'];exportData:()=>void;replace:ReturnType<typeof useProgress>['replace']}){
 const file=useRef<HTMLInputElement>(null); const [status,setStatus]=useState('');
 const restore=async(f:File)=>{try{const json=JSON.parse(await f.text());const next=json?.progress??json;if(!next||typeof next!=='object'||Array.isArray(next))throw new Error('Invalid SpeakLab progress file.');if(!window.confirm('Replace progress stored in this browser with this file? Export your current progress first if you want a backup.'))return;replace(next);setStatus('Your learning journal was restored on this device.')}catch(e){setStatus(e instanceof Error?e.message:'Could not read the selected file.')}};
 return <section className="wide-section"><PageTitle eyebrow="YOUR LEARNING SPACE" title="Settings & your data." description="This version is private to your browser. You can study without creating an account, then export your journal to move it to another device."/>
 <div className="two-pane"><div className="paper-panel"><CloudOff size={27}/><h3>Local-first privacy</h3><p>Notes, completion, and practice scores stay in this browser's storage. Your recordings never go to a server. Clearing site data may delete your progress, so export regularly.</p><p><strong>{progress.completed.length} chapters complete · {progress.reviewedTopics.length} topics practised</strong></p></div><div className="paper-panel"><Download size={27}/><h3>Take your learning with you</h3><p>Export a JSON copy of your progress, or restore it on another browser or device. Saved recordings must be downloaded separately.</p><div className="inline-actions"><button className="button dark" onClick={exportData}>Export progress <Download size={17}/></button><button className="button light" onClick={()=>file.current?.click()}>Import progress <ArrowRight size={17}/></button></div><input hidden ref={file} type="file" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)void restore(f);e.currentTarget.value=''}}/>{status&&<p role="status" className="feedback success">{status}</p>}</div></div>
 <div className="paper-panel"><span className="eyebrow">ABOUT THE COURSE</span><h3>Independent, free IELTS preparation</h3><p>SpeakLab Village is not associated with the IELTS test owners. It preserves 44 speaking topics and their original questions from the supplied teaching resources; no score in this app guarantees a formal exam result.</p><p className="muted">The whole lesson interface works without a database or third-party API. Microphone recording needs a supported secure browser.</p></div></section>;
}
function App(){
 const {progress,note,topicNote,update,rateCard,complete,practise,score,replace,savingError}=useProgress();
 const [route,setRoute]=useState<Route>(readRoute);
 const [selectedTopic,setSelectedTopic]=useState(topics[0]?.id||'');
 const [soundOn,setSoundOn]=useState(false);
 const [toast,setToast]=useState('');
 const [pageVisible,setPageVisible]=useState(!document.hidden);
 const reduced=useReducedMotion();
 useEffect(()=>{const changed=()=>{setPageVisible(!document.hidden);if(document.hidden)worldAudio.cancel()};document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed)},[]);
 useEffect(()=>{if(!location.hash)history.replaceState(null,'','#village');const handler=()=>setRoute(readRoute());addEventListener('hashchange',handler);return()=>removeEventListener('hashchange',handler)},[]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),3400);return()=>clearTimeout(id)},[toast]);
 const navigate=useCallback((partial:Partial<Route>)=>{setRoute(prev=>{const next={...prev,...partial};const link=makeHash(next);if(location.hash!==link)history.pushState(null,'',link);return next;});window.scrollTo({top:0,behavior:'instant'})},[]);
 const next=lessons.find(l=>!progress.completed.includes(l.week))?.week||1;
 const currentLesson=lessons[(route.week||1)-1]||lessons[0];
 const currentTopic=topicMap.get(route.topic)||topics[0];
 const eventSound=(cue:SoundCue)=>{void worldAudio.play(cue)};
 const flipSound=async()=>{if(soundOn){worldAudio.disable();setSoundOn(false);setToast('Original sound muted.')}else{try{const enabled=await worldAudio.enable();if(enabled){setSoundOn(true);void worldAudio.play('arrival')}else{setToast('Sound could not be enabled on this device.')}}catch{setToast('Browser audio is not available.')}}};
 const openStation=(station:Station)=>{if(route.page!=='lesson')navigate({page:'lesson',week:next,station,topic:currentLesson.topics[0]||topics[0].id});else navigate({station});eventSound('turn')};
 const openWeek=(week:number)=>{if(week===12){navigate({page:'mock'});return}navigate({page:'lesson',week,station:'garden',topic:lessons[week-1].topics[0]});eventSound('turn')};
 const showWorld=route.page==='village'||route.page==='lesson';
 return <div className="app-shell">
  <Navigation route={route} navigate={navigate} soundOn={soundOn} setSoundOn={()=>void flipSound()}/>
  <main id="main-content">
  <div className={route.page==='village'?'world-hero home':route.page==='lesson'?'world-hero lesson':'world-hero tucked'}>
   {route.page==='village'&&<VillageIntro nextWeek={next} completed={progress.completed.length} navigate={navigate}/>}
   {route.page==='lesson'&&<div className="world-chapter"><span>CHAPTER {String(route.week).padStart(2,'0')}</span><h1>{currentLesson.title}</h1><p>A new skill to discover, a new story to tell.</p><div className="chapter-nav"><button onClick={()=>openWeek(Math.max(1,route.week-1))} disabled={route.week===1}><ArrowLeft size={17}/> Previous</button><button onClick={()=>openWeek(Math.min(11,route.week+1))} disabled={route.week===11}>Next chapter <ArrowRight size={17}/></button></div></div>}
   <div className="world-visual"><WorldStage station={route.page==='lesson'?route.station:null} onSelect={openStation} reduced={reduced} active={showWorld&&pageVisible} growth={Object.values(progress.quizResults).filter(v=>v===1).length+progress.completed.length*2}/></div>
  </div>
  {route.page==='village'&&<section className="wide-section village-followup"><div className="section-bar"><div><span className="eyebrow">YOUR ADVENTURE MAP</span><h2>Choose where to grow today.</h2><p>Each place is a different way to practise the same important skills.</p></div><button className="text-action" onClick={()=>navigate({page:'course'})}>All lessons <ArrowRight size={16}/></button></div><div className="station-cards">{stationNames.map((id,i)=><button className="station-card" key={id} onClick={()=>openStation(id)}><div className="station-symbol">{stationMeta[id].emoji}</div><small>QUEST 0{i+1}</small><h3>{stationMeta[id].label}</h3><p>{stationMeta[id].description}</p><span>Enter this place <ArrowRight size={15}/></span></button>)}</div><div className="section-bar latest-heading"><div><span className="eyebrow">YOUR NEXT STORIES</span><h2>A trail made just for practice.</h2></div><button className="text-action" onClick={()=>navigate({page:'library'})}>See all 44 <ArrowRight size={16}/></button></div><div className="featured-lessons">{lessons.slice(0,3).map(l=><button key={l.week} onClick={()=>openWeek(l.week)}><span>CHAPTER {String(l.week).padStart(2,'0')}</span><h3>{l.title}</h3><p>{l.objective}</p><div>Open chapter <ArrowRight size={18}/></div></button>)}</div></section>}
  {route.page==='course'&&<CourseScreen completed={progress.completed} open={openWeek}/>}
  {route.page==='lesson'&&<SchoolDay week={route.week} station={route.station} selectedTopic={selectedTopic} setTopic={setSelectedTopic} progress={progress} note={note} topicNote={topicNote} update={update} rateCard={rateCard} complete={complete} practise={practise} onCue={eventSound}/>}
  {route.page==='library'&&<TopicLibrary reviewed={progress.reviewedTopics} open={id=>navigate({page:'topic',topic:id})}/>}
  {route.page==='topic'&&<TopicPage topic={currentTopic} progress={progress} topicNote={topicNote} practise={practise} back={()=>navigate({page:'library'})}/>}
  {route.page==='review'&&<RecallScreen progress={progress} rateCard={rateCard} onCue={eventSound}/>}
  {route.page==='mock'&&<MockScreen onScore={s=>{score(s);eventSound('celebrate');setToast('Your speaking assessment was saved in this browser.')}} scored={progress.rubric.length}/>}
  {route.page==='progress'&&<ProgressScreen progress={progress} exportData={()=>exportProgress(progress)}/>}
  {route.page==='settings'&&<SettingsScreen progress={progress} exportData={()=>exportProgress(progress)} replace={replace}/>}
  </main>
  {savingError&&<div role="alert" className="storage-warning">{savingError}</div>}
  {toast&&<div role="status" className="site-toast">{toast}</div>}
  <footer className="site-footer"><span>✳ SpeakLab Village</span><p>Free, independent IELTS Speaking practice. Not affiliated with IELTS test owners.</p><span>Made for curious minds. <Heart size={14}/></span></footer>
 </div>;
}
export default App;
