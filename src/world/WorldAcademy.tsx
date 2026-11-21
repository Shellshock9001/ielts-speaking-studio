import {Suspense,lazy,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,PointerEvent} from 'react';
import {BookOpen,Volume2,VolumeX,Map,Star,Settings2,X} from 'lucide-react';
import {lessons,topics,topicMap} from '../data';
import {useProgress,useReducedMotion,exportProgress} from '../store';
import {rewardScore} from '../game/rules';
import {spentAcorns} from '../game/buildings';
import {REGIONS,ACADEMY_SPAWN,REGION_BY_WEEK,ACTOR_BY_ID,TOPIC_ACTOR,closestRegion} from './worldData';
import {academySound,type AcousticCue} from './sound';
import {ToolBelt,AdventureRibbon,FieldActionHud,BagTask,MissionTask,FieldGuideTask,type Vitals} from './GameUI';
import {
 TOOL_IDS,TOOL_META,FIELD_BY_ID,nearestNode,actionForNode,craftGift,giveGift,
 beginFishing,fishPhase,reelFish,claimMission,track,type ToolId,type FishRound,type FieldResult,type Mission
} from './play';
import {
 type Mode,type WorldPanel,type ChallengePrompt,DIRECTIONS,TeacherTask,DialogueTask,StudyRoom,PhotographTask,
 ChallengeTask,RecallTask,SeedTask,MapTask,BuildTask,JournalTask,SpeakingTask,AssessmentTask,FestivalTask
} from './Tasks';
import type {WalkInput,TravelCommand,WorldChallenge} from './WorldScene';
import './world.css';
import './gameplay.css';

const WorldScene=lazy(()=>import('./WorldScene'));
const activityTypes=['word','story','debate'] as const;
const DISTRICT_SOUNDS:AcousticCue[]=[
 'region-academy','region-orchard','region-workshop','region-canyon','region-wetlands','region-harbor',
 'region-picturehouse','region-letterbird','region-together','region-clockwork',
 'region-mooncake','region-observatory'
];
type ChallengeMode=typeof activityTypes[number];
const isChallenge=(mode:Mode):mode is ChallengeMode=>activityTypes.includes(mode as ChallengeMode);
function mixedChoices(right:string,wrong1:string,wrong2:string,seed:number):{options:[string,string,string];correct:number}{
 const correct=((seed%3)+3)%3;
 const options=[wrong1,wrong2,wrong1] as [string,string,string];
 if(correct===0){options[0]=right;options[1]=wrong1;options[2]=wrong2}
 else if(correct===1){options[0]=wrong1;options[1]=right;options[2]=wrong2}
 else{options[0]=wrong1;options[1]=wrong2;options[2]=right}
 return {options,correct};
}
export function challengePrompt(topicId:string,mode:ChallengeMode,round:number):ChallengePrompt{
 const topic=topicMap.get(topicId)||topics[0],lesson=lessons[topic.week-1];
 if(mode==='word'){
  const expressions=lesson.expressions;
  const index=round%expressions.length,target=expressions[index];
  const others=expressions.filter((_,i)=>i!==index);
  const wrong1=others[(round+topic.week)%others.length],wrong2=others[(round+topic.week+3)%others.length];
  const distinct=wrong1.phrase===wrong2.phrase?others[(round+topic.week+1)%others.length]:wrong2;
  return {prompt:'Find the expression that means: '+target.meaning,...mixedChoices(target.phrase,wrong1.phrase,distinct.phrase,round+topic.week),
    explanation:'“'+target.phrase+'” means '+target.meaning+'. Use it naturally in your own sentence.',
    milestone:'Retrieve a useful phrase'};
 }
 if(mode==='story'){
  const beat=round%4;
  const correct=topic.cues[beat%topic.cues.length];
  const other1=topic.cues[(beat+1)%topic.cues.length],other2=topic.cues[(beat+2)%topic.cues.length];
  const phases=['Introduce the person or scene','Explain relevant background','Describe a specific event or detail','Conclude with your feelings and why it mattered'];
  return {prompt:phases[beat]+': choose the next story clue',...mixedChoices(correct,other1,other2,round+topic.week),
    explanation:'This clue belongs next: '+correct+'. Keep the sequence connected to your real experience.',
    milestone:phases[beat]};
 }
 const structures=[
  ['Give a clear viewpoint','Repeat the question without taking a view','Shift to an unrelated subject','A focused response begins with a relevant opinion.'],
  ['Explain a convincing reason','Use a vague filler without a reason','Mention an unrelated person','Reasons make your viewpoint understandable.'],
  ['Support the idea with a specific example','Repeat the opening sentence','Make a sweeping claim without evidence','A concrete example brings an abstract argument to life.'],
  ['Acknowledge an alternative or limitation','Insist there are no exceptions','Abandon your original opinion','Nuance helps you discuss complex topics confidently.']
 ] as const;
 const [right,a,b,explanation]=structures[round%4];
 return {prompt:topic.discussion[round%topic.discussion.length],...mixedChoices(right,a,b,round+topic.week),
   explanation,milestone:['Position','Reason','Example','Nuance'][round%4]};
}
function VirtualThumbstick({input,disabled}:{input:React.RefObject<WalkInput>;disabled:boolean}){
 const [held,setHeld]=useState(false),[position,setPosition]=useState({x:0,y:0});
 const target=useRef<HTMLDivElement>(null);
 const directions=useRef(new Set<string>());
 const syncDpad=()=>{
  input.current.x=Number(directions.current.has('right'))-Number(directions.current.has('left'));
  input.current.z=Number(directions.current.has('down'))-Number(directions.current.has('up'));
 };
 const reset=()=>{
  input.current.x=0;input.current.z=0;
  directions.current.clear();
  setHeld(false);setPosition({x:0,y:0});
 };
 const move=(e:PointerEvent<HTMLDivElement>)=>{
  if(disabled||!target.current)return;
  const rect=target.current.getBoundingClientRect();
  const radius=Math.max(1,Math.min(rect.width,rect.height)*.34);
  const x=(e.clientX-(rect.left+rect.width/2))/radius;
  const y=(e.clientY-(rect.top+rect.height/2))/radius;
  const mag=Math.max(1,Math.hypot(x,y));
  input.current.x=x/mag;input.current.z=y/mag;
  setPosition({x:input.current.x*.32,y:input.current.z*.32});
 };
 useEffect(()=>()=>{input.current.x=0;input.current.z=0;input.current.run=false},[input]);
 return <div className="ww-touch-controls" aria-label="Game movement controls">
  <div className="ww-dpad" role="group" aria-label="Four directional movement buttons">
   {(['up','left','down','right'] as const).map(direction=><button key={direction} className={'ww-dpad-'+direction}
    aria-label={'Move '+direction} disabled={disabled}
    onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);directions.current.add(direction);syncDpad()}}
    onPointerUp={()=>{directions.current.delete(direction);syncDpad()}}
    onPointerCancel={()=>{directions.current.delete(direction);syncDpad()}}
    onLostPointerCapture={()=>{directions.current.delete(direction);syncDpad()}}>
      <span>{direction==='up'?'↑':direction==='down'?'↓':direction==='left'?'←':'→'}</span>
      <kbd>{({up:'W',down:'S',left:'A',right:'D'} as const)[direction]}</kbd>
   </button>)}
  </div>
  <div className="ww-stick" ref={target} role="group" aria-label="Analog movement stick" data-held={held}
   onPointerDown={e=>{if(disabled)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setHeld(true);move(e)}}
   onPointerMove={e=>{if(held)move(e)}}
   onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}>
   <div className="ww-stick-ring"/><div className="ww-stick-nub" style={{'--stick-x':position.x,'--stick-y':position.y} as CSSProperties}>✦</div>
  </div>
 </div>;
}
function OverlayShell({panel,close,children}:{panel:WorldPanel;close:()=>void;children:React.ReactNode}){
 const titleRef=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{titleRef.current?.focus()},[panel.mode,panel.topicId]);
 return <aside className="ww-sheet" aria-label={DIRECTIONS[panel.mode].title}>
  <div className="ww-sheet-handle" aria-hidden="true"/>
  <div className="ww-sheet-header">
   <div><span className="ww-kicker">{DIRECTIONS[panel.mode].subtitle}</span>
    <h2 tabIndex={-1} ref={titleRef}>{DIRECTIONS[panel.mode].title}</h2></div>
   <button className="ww-close" onClick={close} aria-label="Close activity and return to world"><X size={19}/></button>
  </div>
  <div className="ww-sheet-body" key={panel.mode+'-'+panel.topicId}>{children}</div>
 </aside>;
}
export default function WorldAcademy(){
 const {progress,update,topicNote,practise,score,rateCard,replace,buildItem,savingError}=useProgress();
 const reduced=useReducedMotion();
 const initialPosition=progress.worldPosition||ACADEMY_SPAWN;
 const [worldPos,setWorldPos]=useState<[number,number]>(initialPosition);
 const [regionWeek,setRegionWeek]=useState(closestRegion(...initialPosition).week);
 const [topicId,setTopicId]=useState(topics[0].id);
 const [panel,setPanel]=useState<WorldPanel|null>(null);
 const [nearbyId,setNearbyId]=useState<string|null>(null);
 const [travel,setTravel]=useState<TravelCommand|null>(null);
 const [soundOn,setSoundOn]=useState(false);
 const [soundVolume,setSoundVolume]=useState(()=>{
  const saved=localStorage.getItem('speaklab-world-volume');
  const value=saved===null?NaN:Number(saved);
  return Number.isFinite(value)&&value>=0&&value<=1?value:.7;
 });
 const [soundWanted,setSoundWanted]=useState(()=>localStorage.getItem('speaklab-sound-preference')!=='off');
 const soundWantedRef=useRef(soundWanted);
 const [help,setHelp]=useState(false),[toast,setToast]=useState('');
 const [tool,setTool]=useState<ToolId>(()=>{
  const saved=localStorage.getItem('speaklab-equipped-tool');return TOOL_IDS.includes(saved as ToolId)?saved as ToolId:'hand';
 });
 const [vitals,setVitals]=useState<Vitals>({stamina:100,mode:'idle',facing:0});
 const [now,setNow]=useState(Date.now());
 const [fish,setFish]=useState<FishRound|null>(null);
 const [pulse,setPulse]=useState<{serial:number;kind:string;pos:[number,number]}|null>(null);
 const lastAction=useRef(0),pulseSerial=useRef(0);
 const [lanterns,setLanterns]=useState(0);
 const previousLanterns=useRef(0);
 const [round,setRound]=useState(0),[misses,setMisses]=useState(0),[correct,setCorrect]=useState(0),[feedback,setFeedback]=useState('');
 const [finished,setFinished]=useState(false),[points,setPoints]=useState(0);
 const input=useRef<WalkInput>({x:0,z:0,run:false,sneak:false,jumpSerial:0,dodgeSerial:0,actionSerial:0,
  cameraX:0,cameraY:0,zoom:0});
 const anchor=useRef<[number,number]>(initialPosition);
 const challengeLock=useRef(false),challengeStart=useRef(0),feedbackTimer=useRef<number|null>(null),lastCheckpoint=useRef(initialPosition);
 const toastTimer=useRef<number|null>(null);
 const region=REGION_BY_WEEK.get(regionWeek)||REGIONS[0];
 const chosenTopic=topicMap.get(panel?.topicId||topicId)||topics[0];
 const selectedActor=panel?.actorId?ACTOR_BY_ID.get(panel.actorId)||null:TOPIC_ACTOR.get(chosenTopic.id)||null;
 const earned=Object.values(progress.quests).reduce((sum,x)=>sum+Math.floor(x.best/20),0)+
  Object.values(progress.foundSeeds).filter(Boolean).length+progress.field.bonusAcorns;
 const availableAcorns=Math.max(0,earned-spentAcorns(progress.decorations));
 const fieldTarget=nearestNode(worldPos[0],worldPos[1],tool,2.5);
 const nearActor=nearbyId?ACTOR_BY_ID.get(nearbyId)||null:null;
 const canMove=!panel||Boolean(panel&&isChallenge(panel.mode)&&!finished&&!feedback);
 const challengeMode=panel&&isChallenge(panel.mode)?panel.mode:null;
 const challengeData=useMemo(()=>challengeMode?challengePrompt(chosenTopic.id,challengeMode,round):null,[challengeMode,chosenTopic.id,round]);
 const challenge:WorldChallenge|null=challengeData&&challengeMode&&!finished?{
  id:chosenTopic.id+'.'+challengeMode,round,style:challengeMode,options:challengeData.options,anchor:anchor.current
 }:null;
 const addToast=useCallback((text:string)=>{
  if(toastTimer.current!==null)clearTimeout(toastTimer.current);
  setToast(text);toastTimer.current=window.setTimeout(()=>setToast(''),2800);
 },[]);
 const play=useCallback((cue:AcousticCue)=>academySound.play(cue),[]);
 const close=useCallback(()=>{
  if(feedbackTimer.current!==null)clearTimeout(feedbackTimer.current);
  challengeLock.current=false;setPanel(null);setFeedback('');setLanterns(0);input.current.x=0;input.current.z=0;
  academySound.setRecording(false);
  play('chat-choice');
 },[play]);
 const open=useCallback((mode:Mode,nextTopicId?:string,actorId?:string)=>{
  if(feedbackTimer.current!==null)clearTimeout(feedbackTimer.current);
  challengeLock.current=false;
  if(nextTopicId&&topicMap.has(nextTopicId))setTopicId(nextTopicId);
  const resolvedId=nextTopicId&&topicMap.has(nextTopicId)?nextTopicId:topicId;
  setPanel({mode,topicId:resolvedId,actorId});
  setFeedback('');setLanterns(0);setRound(0);setMisses(0);setCorrect(0);setFinished(false);setPoints(0);
  if(isChallenge(mode))anchor.current=[...worldPos];
  challengeStart.current=performance.now();
  input.current.x=0;input.current.z=0;
  play(mode==='assessment'?'assessment-start':mode==='map'?'map-open':mode==='recall'?'memory-recall':mode==='word'||mode==='story'||mode==='debate'?'quest-accept':'page-turn');
 },[topicId,worldPos,play]);
 const onActor=useCallback((id:string)=>{
  if(panel)return;
  const actor=ACTOR_BY_ID.get(id);if(!actor)return;
  if(actor.topicId){
    setTopicId(actor.topicId);open('talk',actor.topicId,id);
    academySound.play('peer-hello',{variant:(actor.id.split('').reduce((sum,char)=>sum+char.charCodeAt(0),0)%11-5)/5});
    return;
  }
  const lookup:Record<string,Mode>={teacher:'teacher',librarian:'recall',examiner:'assessment',gardener:'word',
    builder:'build',navigator:'map',host:'festival'};
  open(lookup[actor.role]||'teacher',topicId,id);
  play(actor.role==='teacher'?'mentor-hello':actor.role==='examiner'?'assessment-start':'chat-open');
 },[panel,open,topicId,play]);
 const onSeed=useCallback((week:number,index:number)=>{
  if(panel||progress.foundSeeds[week+'.'+index])return;
  const lesson=lessons[week-1];
  if(!lesson)return;
  const chosen=lesson.topics[index%lesson.topics.length];
  setTopicId(chosen);
  input.current.x=0;input.current.z=0;
  setPanel({mode:'seed',topicId:chosen,seed:{week,index}});
  play('chat-open');
 },[panel,progress.foundSeeds,play]);
 const collectSeed=useCallback((week:number,index:number)=>{
  update(p=>({...p,foundSeeds:{...p.foundSeeds,[week+'.'+index]:true}}));
 },[update]);
 const choose=useCallback((index:number)=>{
  if(!panel||!isChallenge(panel.mode)||challengeLock.current||finished||!challengeData)return;
  challengeLock.current=true;
  if(index!==challengeData.correct){
   setMisses(n=>n+1);setFeedback('Try another path. Read the clue again and compare all three options.');
   play('try-again');
   feedbackTimer.current=window.setTimeout(()=>{challengeLock.current=false;setFeedback('')},1050);
   return;
  }
  play('correct');setCorrect(n=>n+1);setFeedback(challengeData.explanation);
  const max=panel.mode==='word'?5:4;
  if(round+1>=max){
   const result=rewardScore(correct+1,misses,(performance.now()-challengeStart.current)/1000,max);
   feedbackTimer.current=window.setTimeout(()=>{
    setFinished(true);setPoints(result);challengeLock.current=false;setFeedback('');
    update(p=>{
     const key=chosenTopic.id+'.'+panel.mode,old=p.quests[key];
     return {...p,quests:{...p.quests,[key]:{best:Math.max(old?.best||0,result),wins:(old?.wins||0)+1,last:new Date().toISOString()}}};
    });
    if(panel.mode==='story'||panel.mode==='debate')practise(chosenTopic.id);
    play('quest-finish');
   },1000);
  }else feedbackTimer.current=window.setTimeout(()=>{
   setRound(r=>r+1);challengeLock.current=false;setFeedback('');
  },900);
 },[panel,finished,challengeData,round,correct,misses,chosenTopic.id,update,practise,play]);
 const travelTo=useCallback((x:number,z:number,actorId?:string)=>{
  setTravel(last=>({serial:(last?.serial||0)+1,x,z,actorId}));
  input.current.x=0;input.current.z=0;play('region-enter');
 },[play]);
 const onRegion=useCallback((week:number)=>{
  setRegionWeek(week);
  const zone=REGION_BY_WEEK.get(week);
  if(zone){addToast('Welcome to '+zone.title);play('region-enter');academySound.play(DISTRICT_SOUNDS[week]||'region-academy',{intensity:.74})}
 },[addToast,play]);
 const checkpoint=useCallback((x:number,z:number)=>{
  if(Math.hypot(x-lastCheckpoint.current[0],z-lastCheckpoint.current[1])<.85)return;
  lastCheckpoint.current=[x,z];
  update(p=>({...p,worldPosition:[x,z]}));
 },[update]);
 const onMove=useCallback((x:number,z:number)=>{
  setWorldPos(before=>Math.abs(before[0]-x)+Math.abs(before[1]-z)>.25?[x,z]:before);
 },[]);
 const onPower=useCallback((n:number)=>{
  const lights=Math.min(4,Math.floor(n*4+.0001));
  if(lights>previousLanterns.current)play('voice-rise');
  previousLanterns.current=lights;
  setLanterns(lights);
 },[play]);
 const onRecording=useCallback((rec:boolean)=>academySound.setRecording(rec),[]);
 const equip=useCallback((id:ToolId)=>{
  if(!TOOL_IDS.includes(id))return;
  setTool(id);localStorage.setItem('speaklab-equipped-tool',id);
  academySound.play('tool-equip',{variant:TOOL_IDS.indexOf(id)/4-.5});
 },[]);
 const resultFeedback=useCallback((effect:FieldResult,pos:[number,number])=>{
  addToast(effect.message);
  play(effect.cue as AcousticCue);
  if(effect.changed&&effect.effect)setPulse({serial:++pulseSerial.current,kind:effect.effect,pos});
 },[addToast,play]);
 const onFieldUse=useCallback((nodeId?:string)=>{
  if(panel&&!isChallenge(panel.mode))return;
  const node=nodeId?FIELD_BY_ID.get(nodeId):nearestNode(worldPos[0],worldPos[1],tool,2.5);
  if(!node){addToast(TOOL_META[tool].name+': move closer to a matching object.');return}
  const inFlatWorld=Boolean(document.querySelector('.ww-2d-world'));
  if(!inFlatWorld&&Math.hypot(worldPos[0]-node.pos[0],worldPos[1]-node.pos[1])>2.8){
   addToast('Move closer to '+node.name+' first.');return;
  }
  if(performance.now()-lastAction.current<230)return;
  lastAction.current=performance.now();
  input.current.actionSerial++;
  const stamp=Date.now();
  if(node.kind==='pond'){
   if(tool!=='rod'){addToast('Equip your fishing rod (5) to cast into this pool.');play('try-again');return}
   if(fish&&fish.week===node.week){
    if(fishPhase(fish,stamp)==='waiting'){addToast('Wait for the bobber to dip; then press F!');return}
    if(fishPhase(fish,stamp)==='escaped'){
     setFish(null);addToast('The fish got away. Cast again!');play('fish-escape');return;
    }
    const result=reelFish(progress.field,fish,stamp);
    if(result.changed)update(p=>({...p,field:reelFish(p.field,fish,stamp).next}));
    resultFeedback(result,node.pos);setFish(null);
    return;
   }
   const cast=beginFishing(node.week,stamp);setFish(cast);
   play('fish-cast');addToast('Line cast! Watch the bobber and listen for a bite. Press F to reel.');return;
  }
  if(node.kind==='bug')play('net-swish');
  if(node.kind==='relic')play('dig-scrape');
  const result=actionForNode(progress.field,node,tool,stamp,Math.sin(stamp/440+node.week));
  if(result.changed)update(p=>({...p,field:actionForNode(p.field,node,tool,stamp,Math.sin(stamp/440+node.week)).next}));
  resultFeedback(result,node.pos);
 },[panel,worldPos,tool,addToast,fish,progress.field,update,resultFeedback,play]);
 const useTool=useCallback(()=>onFieldUse(),[onFieldUse]);
 const craft=useCallback(()=>{
  const result=craftGift(progress.field);
  if(result.changed)update(p=>({...p,field:craftGift(p.field).next}));
  resultFeedback(result,worldPos);
 },[progress.field,update,resultFeedback,worldPos]);
 const giveToActor=useCallback((actorId:string)=>{
  if(panel)return;
  const actor=ACTOR_BY_ID.get(actorId);
  if(!actor||actor.role!=='student'){addToast('Bouquets are for your classmates.');return}
  if(!document.querySelector('.ww-2d-world')&&
   Math.hypot(worldPos[0]-actor.position[0],worldPos[1]-actor.position[1])>2.65){
   addToast('Walk closer to '+actor.name+' to give a gift.');return;
  }
  const stamp=Date.now(),result=giveGift(progress.field,actor,stamp);
  if(result.changed)update(p=>({...p,field:giveGift(p.field,actor,stamp).next}));
  resultFeedback(result,actor.position);
 },[panel,worldPos,progress.field,update,resultFeedback,addToast]);
 const give=useCallback(()=>{
  if(!nearActor){addToast('Get close to a classmate, then press G to give them a bouquet.');return}
  giveToActor(nearActor.id);
 },[nearActor,giveToActor,addToast]);
 const claim=useCallback((mission:Mission)=>{
  const stamp=Date.now(),result=claimMission(progress.field,mission,stamp);
  if(result.changed)update(p=>({...p,field:claimMission(p.field,mission,stamp).next}));
  resultFeedback(result,worldPos);
 },[progress.field,update,resultFeedback,worldPos]);
 const markPractice=useCallback((id:string)=>{
  practise(id);
  update(p=>({...p,field:track(p.field,'conversation',Date.now())}));
 },[practise,update]);
 const jump=useCallback(()=>{if(!panel)input.current.jumpSerial++},[panel]);
 const dodge=useCallback(()=>{if(!panel)input.current.dodgeSerial++},[panel]);
 const onGamepadAction=useCallback((action:'talk'|'use'|'bag'|'missions'|'cycle-forward'|'cycle-back')=>{
  switch(action){
   case 'talk':if(!panel&&nearbyId)onActor(nearbyId);break;
   case 'use':useTool();break;
   case 'bag':open('bag');break;
   case 'missions':open('missions');break;
   case 'cycle-forward':equip(TOOL_IDS[(TOOL_IDS.indexOf(tool)+1)%TOOL_IDS.length]);break;
   case 'cycle-back':equip(TOOL_IDS[(TOOL_IDS.indexOf(tool)+TOOL_IDS.length-1)%TOOL_IDS.length]);break;
  }
 },[panel,nearbyId,onActor,useTool,open,equip,tool]);
 useEffect(()=>{
  const id=setInterval(()=>setNow(Date.now()),850);
  return()=>clearInterval(id);
 },[]);
 useEffect(()=>{
  if(!fish)return;
  const target=fish;
  const bite=setTimeout(()=>{
   setFish(current=>current?.castAt===target.castAt?{...current,phase:'bite'}:current);
   play('fish-bite');addToast('A bite! Press F now to reel your catch!');
  },Math.max(0,fish.biteAt-Date.now()));
  const escape=setTimeout(()=>{
   setFish(current=>current?.castAt===target.castAt?null:current);
   play('fish-escape');addToast('The fish slipped away. Cast again to try another.');
  },Math.max(0,fish.expiresAt-Date.now()));
  return()=>{clearTimeout(bite);clearTimeout(escape)};
 },[fish?.castAt,fish?.week,addToast,play]);
 useEffect(()=>{
  if(!soundWanted)return;
  const unlock=()=>{
   if(!soundWantedRef.current)return;
   if(academySound.enabled)return;
   void academySound.enable().then(ready=>setSoundOn(ready)).catch(()=>setSoundOn(false));
  };
  window.addEventListener('keydown',unlock,{capture:true});
  window.addEventListener('pointerdown',unlock,{capture:true});
  return()=>{
   window.removeEventListener('keydown',unlock,{capture:true});
   window.removeEventListener('pointerdown',unlock,{capture:true});
  };
 },[soundWanted]);
 const toggleSound=useCallback(()=>{
  if(soundOn){
   soundWantedRef.current=false;
   academySound.disable();setSoundOn(false);setSoundWanted(false);
   localStorage.setItem('speaklab-sound-preference','off');return;
  }
  soundWantedRef.current=true;
  localStorage.setItem('speaklab-sound-preference','on');setSoundWanted(true);
  void academySound.enable().then(enabled=>{setSoundOn(enabled);if(enabled)academySound.play('peer-hello')}).catch(()=>addToast('Audio could not be started on this device.'));
 },[soundOn,addToast]);
 useEffect(()=>{
  academySound.setVolume(soundVolume);
  localStorage.setItem('speaklab-world-volume',String(soundVolume));
 },[soundVolume]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   const node=e.target as HTMLElement;
   if(node?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
   const k=e.key.toLowerCase();
   if(k==='escape'&&panel){e.preventDefault();close();return}
   if(e.repeat)return;
   if(!panel&&k==='f'){e.preventDefault();useTool()}
   else if(!panel&&k==='g'){e.preventDefault();give()}
   else if(!panel&&k==='v'){e.preventDefault();input.current.actionSerial++;play('friend-wave')}
   else if(!panel&&(k===' '||k==='spacebar')){e.preventDefault();jump()}
   else if(!panel&&k==='alt'){e.preventDefault();dodge()}
   else if(!panel&&k==='c'){e.preventDefault();input.current.sneak=!input.current.sneak}
   else if(!panel&&k==='z'){e.preventDefault();window.dispatchEvent(new Event('wildwood-camera-recenter'))}
   else if(!panel&&k==='tab'){e.preventDefault();equip(TOOL_IDS[(TOOL_IDS.indexOf(tool)+1)%TOOL_IDS.length])}
   else if(!panel&&['1','2','3','4','5'].includes(k)){e.preventDefault();equip(TOOL_IDS[Number(k)-1])}
   else if(k==='m'){e.preventDefault();open('map')}
   else if(k==='j'){e.preventDefault();open('journal')}
   else if(k==='i'){e.preventDefault();open('bag')}
   else if(k==='b'){e.preventDefault();open('album')}
   else if(k==='q'){e.preventDefault();open('missions')}
   else if(k==='?'||k==='h'){e.preventDefault();setHelp(v=>!v)}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[panel,close,open,useTool,give,jump,dodge,equip,tool,play]);
 useEffect(()=>{
  const onLocation=(e:Event)=>{
   const payload=(e as CustomEvent<{week:number}>).detail;
   const target=REGION_BY_WEEK.get(payload.week);if(!target)return;
   // 2D accessibility mode: selecting a district positions the map focus.
   // 3D world always walks normally.
   if(document.querySelector('.ww-2d-world')){
    setWorldPos(target.center);setRegionWeek(target.week);
    update(p=>({...p,worldPosition:target.center}));
    close();
   }else travelTo(...target.center);
  };
  window.addEventListener('wildwood-location',onLocation);
  return()=>window.removeEventListener('wildwood-location',onLocation);
 },[travelTo,update,close]);
 useEffect(()=>()=>{if(toastTimer.current!==null)clearTimeout(toastTimer.current);
   if(feedbackTimer.current!==null)clearTimeout(feedbackTimer.current);
   academySound.disable();
 },[]);
 const learnTopic=useCallback((id:string)=>{
  const actor=TOPIC_ACTOR.get(id);setTopicId(id);
  if(actor)open('classroom',id,actor.id);
 },[open]);
 const showPanel=Boolean(panel);
 const currentMode=panel?.mode;
 const panelActor=selectedActor&&selectedActor.role==='student'?selectedActor:null;
 return <div className={'ww-app'+(showPanel?' ww-has-panel':'')} data-panel={currentMode||'none'}>
  <main className="ww-layout">
   <section className="ww-stage" aria-label="Continuous playable woodland academy">
    <div className="ww-world">
     <Suspense fallback={<div className="ww-opening" role="status">Preparing the academy garden…</div>}>
      <WorldScene worldPos={worldPos} regionWeek={regionWeek} input={input} active={canMove}
       reduced={reduced} travel={travel} challenge={challenge} lanterns={lanterns} availableActors={[]}
       foundSeeds={progress.foundSeeds} decorations={progress.decorations} onSeed={onSeed}
       tool={tool} field={progress.field} fish={fish} actionPulse={pulse} onFieldUse={onFieldUse} onGiveActor={giveToActor} onEquip={equip}
       onActor={onActor} onNearby={setNearbyId} onMove={onMove} onCheckpoint={checkpoint}
       onRegion={onRegion} onChallengeChoice={choose} onVitals={setVitals} onGamepadAction={onGamepadAction}/>
     </Suspense>
    </div>
    <div className="ww-hud ww-hud-top">
     <div className="ww-world-brand"><span className="ww-brand-icon">✳</span><div><strong>SpeakLab Academy</strong><small>{region.title}</small></div></div>
     <div className="ww-hud-actions">
      <div className="ww-acorns" title={earned+' earned, '+spentAcorns(progress.decorations)+' spent'}><Star size={17} fill="currentColor"/><strong>{availableAcorns}</strong><span>acorns</span></div>
      <button onClick={()=>open('map')} aria-label="Open village map" title="Map (M)"><Map size={19}/></button>
      <button onClick={()=>open('journal')} aria-label="Open learning storybook" title="Journal (J)"><BookOpen size={19}/></button>
      <button onClick={toggleSound} aria-label={soundOn?'Mute sound':'Enable original world sounds'} aria-pressed={soundOn}>{soundOn?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
      <button onClick={()=>setHelp(v=>!v)} aria-label="Controls and settings"><Settings2 size={19}/></button>
     </div>
    </div>
    <div className="ww-region-title"><span className="ww-kicker">THE LIVING LEARNING WORLD</span><h1>{region.title}</h1><p>{region.description}</p></div>
    <AdventureRibbon field={progress.field} now={now} onMissions={()=>open('missions')}/>
    {toast&&<div className="ww-toast" role="status">{toast}</div>}
    {help&&<div className="ww-help" role="dialog" aria-label="World controls and sound settings">
     <div><strong>World controls</strong><button aria-label="Close controls" onClick={()=>setHelp(false)}><X size={17}/></button></div>
     <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows — walk. <kbd>Shift</kbd> — sprint (stamina). <kbd>Ctrl</kbd> — hold to sneak; <kbd>C</kbd> — toggle sneak. <kbd>Space</kbd> — hop. <kbd>Alt</kbd> — dodge roll. <kbd>Z</kbd> — center camera.</p>
     <p><kbd>E</kbd> talk · <kbd>F</kbd> use field tool · <kbd>G</kbd> give a bouquet · <kbd>V</kbd> wave · <kbd>1</kbd>–<kbd>5</kbd> equip · <kbd>Tab</kbd> next tool · <kbd>I</kbd> backpack · <kbd>B</kbd> nature album · <kbd>Q</kbd> daily missions · <kbd>M</kbd> atlas · <kbd>J</kbd> storybook · <kbd>Esc</kbd> close.</p>
     <p>Right-drag to orbit the camera and scroll to zoom; on touch devices drag the world, hold the left thumbstick to move and use the on-screen action cluster. A standard gamepad uses left/right sticks, A jump, B roll, X talk, Y use, shoulders switch tools, Start missions and Back bag.</p>
     <p>Explore, gather ripe berries, catch moving butterflies, dig buried relics, grow flowers, time fishing bites, craft gifts and meet classmates. Your inventory, friendships and daily rewards are real saved game state.</p>
     <label htmlFor="ww-sound-volume">Sound volume · {Math.round(soundVolume*100)}%</label>
     <input id="ww-sound-volume" type="range" min={0} max={1} step={.05} value={soundVolume} onChange={e=>setSoundVolume(Number(e.target.value))}/>
     <p className="ww-note">Audio is optional. The system reduces decorative animation when your device requests less motion.</p>
    </div>}
    <div className="ww-world-controls">
     <VirtualThumbstick input={input} disabled={!canMove}/>
    </div>
    <ToolBelt tool={tool} onEquip={equip} disabled={Boolean(panel)}/>
    <FieldActionHud tool={tool} target={fieldTarget} nearActor={nearActor?.name||null} vitals={vitals}
     fishMessage={fish?fish.phase==='bite'?'BITE! Reel now (F)':'Line cast · wait for a bite':''}
     canAct={!panel} onAction={useTool} onTalk={()=>nearbyId&&onActor(nearbyId)}
     onJump={jump} onDodge={dodge} onBag={()=>open('bag')} onQuests={()=>open('missions')}
     onCrouch={down=>{input.current.sneak=down}} onRun={down=>{input.current.run=down}}/>
    <div className="ww-world-prompt">
     {panel?<span>✦ {DIRECTIONS[panel.mode].title} · {isChallenge(panel.mode)?'Find the matching 3D marker':'Your character is here when you return'}</span>:
      nearbyId?<button onClick={()=>onActor(nearbyId)}><strong>E</strong> Talk to {ACTOR_BY_ID.get(nearbyId)?.name}</button>:
      <span>Explore the paths, meet your classmates and step into the academy.</span>}
    </div>
    <div className="ww-minimap">
     <span>{regionWeek===0?'✿':String(regionWeek).padStart(2,'0')}</span><small>{Math.round(worldPos[0])}, {Math.round(worldPos[1])}</small>
    </div>
   </section>
   {panel&&<OverlayShell panel={panel} close={close}>
    {panel.mode==='talk'&&panelActor&&<DialogueTask key={panelActor.id} topic={chosenTopic} actor={panelActor}
      progress={progress} topicNote={topicNote} markPractice={markPractice} play={play} open={open}/>}
    {panel.mode==='teacher'&&<TeacherTask topic={chosenTopic} actor={selectedActor} progress={progress} open={open}
      selectTopic={learnTopic}/>}
    {panel.mode==='classroom'&&<StudyRoom topic={chosenTopic} progress={progress} topicNote={topicNote}
      markPractice={practise} open={open}/>}
    {panel.mode==='photo'&&<PhotographTask topic={chosenTopic} progress={progress} topicNote={topicNote} play={play}/>}
    {challengeMode&&challengeData&&<ChallengeTask mode={challengeMode} topic={chosenTopic} round={round} feedback={feedback}
      misses={misses} score={points} prompt={challengeData} choose={choose} completed={finished} open={open}/>}
    {panel.mode==='voice'&&<SpeakingTask topic={chosenTopic} progress={progress} topicNote={topicNote}
      markPractice={practise} play={play} onActive={onRecording} onPower={onPower}/>}
    {panel.mode==='recall'&&<RecallTask progress={progress} rateCard={rateCard} play={play} close={close}/>}
    {panel.mode==='seed'&&panel.seed&&<SeedTask week={panel.seed.week} index={panel.seed.index}
      collect={collectSeed} close={close} play={play}/>}
    {panel.mode==='assessment'&&<AssessmentTask topic={chosenTopic} progress={progress}
      scoreAssessment={score} play={play} onActive={onRecording}/>}
    {panel.mode==='build'&&<BuildTask progress={progress} regionWeek={regionWeek||1} availableAcorns={availableAcorns} build={buildItem} play={play}/>}
    {panel.mode==='map'&&<MapTask travelTo={travelTo} close={close} play={play}/>}
    {panel.mode==='journal'&&<JournalTask progress={progress} exportData={()=>exportProgress(progress)}
      importData={data=>{const raw=data&&typeof data==='object'&&'progress' in data?(data as {progress:unknown}).progress:data;replace(raw);addToast('Your learning storybook has been imported.')}}
      open={open}/>}
    {panel.mode==='festival'&&<FestivalTask topic={chosenTopic} open={open} play={play}/>}
    {panel.mode==='bag'&&<BagTask field={progress.field} tool={tool} onEquip={equip} onClose={close} onCraft={craft} onAlbum={()=>open('album')}/>}
    {panel.mode==='missions'&&<MissionTask field={progress.field} now={now} onClaim={claim}/>}
    {panel.mode==='album'&&<FieldGuideTask field={progress.field}/>}
   </OverlayShell>}
  </main>
  {savingError&&<p className="ww-storage-warning" role="alert">{savingError}</p>}
 </div>;
}
