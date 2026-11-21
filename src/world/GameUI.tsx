import {useMemo,useState} from 'react';
import {Hand, Bug, Shovel, Droplets, Fish, Backpack, ScrollText, Gift, Zap, Footprints, Move, ArrowBigUp, Compass, BookOpen, Flower2} from 'lucide-react';
import {TOOL_IDS,TOOL_META,RESOURCE_NAMES,dailyMissions,missionProgress,levelForXp,FIELD_CATALOG,
 type FieldState,type ToolId,type FieldNode,type Mission,type DiscoveryKind} from './play';
import {REGION_BY_WEEK} from './worldData';

const ICONS={hand:Hand,net:Bug,trowel:Shovel,watering:Droplets,rod:Fish};
export type PlayerMode='idle'|'walk'|'run'|'sneak'|'jump'|'dodge';
export type Vitals={stamina:number;mode:PlayerMode;facing:number};

export function ToolBelt({tool,onEquip,disabled}:{tool:ToolId;onEquip:(id:ToolId)=>void;disabled:boolean}){
 return <nav className="ww-toolbelt" aria-label="Equippable village tools">
  {TOOL_IDS.map(id=>{
   const meta=TOOL_META[id],Icon=ICONS[id];
   return <button key={id} type="button" disabled={disabled} aria-pressed={tool===id}
     aria-label={'Equip '+meta.name+' ('+meta.key+')'} title={meta.name+' · '+meta.description+' · '+meta.key}
     className={'ww-tool-slot'+(tool===id?' selected':'')} onClick={()=>onEquip(id)}>
    <kbd>{meta.key}</kbd><span className="ww-tool-illustration"><Icon size={25} strokeWidth={1.75}/></span><small>{meta.name}</small>
   </button>;
  })}
 </nav>;
}
export function AdventureRibbon({field,now,onMissions}:{field:FieldState;now:number;onMissions:()=>void}){
 const missions=dailyMissions(now);
 const selected=missions.find(m=>!missionProgress(field,m,now).claimed)||missions[0];
 const progress=missionProgress(field,selected,now);
 const level=levelForXp(field.xp);
 return <div className="ww-adventure-status">
  <div className="ww-level"><span className="ww-level-star">✦</span><strong>Explorer {level}</strong><span>{field.xp} XP</span></div>
  <button className="ww-quest-ribbon" onClick={onMissions} title="Field journal (Q)">
   <ScrollText size={18}/>
   <span><small>TODAY'S ADVENTURE</small><strong>{selected.label}</strong></span>
   <em>{progress.claimed?'✓':progress.count+'/'+selected.target}</em><kbd>Q</kbd>
  </button>
 </div>;
}
export function FieldActionHud({tool,target,nearActor,vitals,fishMessage,canAct,onAction,onTalk,onJump,onDodge,onBag,onQuests,onCrouch,onRun}:{
 tool:ToolId;target:FieldNode|null;nearActor:string|null;vitals:Vitals;fishMessage:string;canAct:boolean;
 onAction:()=>void;onTalk:()=>void;onJump:()=>void;onDodge:()=>void;
 onBag:()=>void;onQuests:()=>void;onCrouch:(down:boolean)=>void;onRun:(down:boolean)=>void;
}){
 const stamina=Math.max(0,Math.min(100,vitals.stamina));
 return <div className="ww-action-hud">
  <div className="ww-action-context">
   <span className="ww-action-icon"><Compass size={19}/></span>
   <div className="ww-action-copy"><small>{fishMessage?'PATIENCE & TIMING':target?'YOUR TARGET':nearActor?'A FRIEND NEARBY':'A LIVING WORLD'}</small>
    <strong>{fishMessage||target?.name||nearActor||'Explore • discover • make friends'}</strong>
    <span>{target?TOOL_META[tool].verb+' with '+TOOL_META[tool].name:'Use E to talk, F to use your equipped tool'}</span>
   </div>
  </div>
  <div className="ww-stamina" aria-label={'Stamina '+Math.round(stamina)+' percent'}>
   <div><Zap size={14}/><strong>STAMINA</strong><span>{vitals.mode.toUpperCase()}</span></div>
   <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stamina)} aria-label="Stamina">
    <i style={{width:stamina+'%'}}/></div>
  </div>
  <div className="ww-action-buttons">
   <button disabled={!canAct} className="ww-game-action primary" onClick={onAction} title="Use equipped tool (F)" aria-label="Use equipped tool (F)"><Hand size={21}/><span>Use</span><kbd>F</kbd></button>
   <button disabled={!canAct||!nearActor} className="ww-game-action" onClick={onTalk} title="Talk to a nearby classmate (E)" aria-label="Talk to nearby character (E)"><Move size={20}/><span>Talk</span><kbd>E</kbd></button>
   <button disabled={!canAct} className="ww-game-action" onClick={onJump} title="Jump (Space)" aria-label="Jump (Space)"><ArrowBigUp size={20}/><span>Jump</span><kbd>␣</kbd></button>
   <button disabled={!canAct} className="ww-game-action" onClick={onDodge} title="Dodge (Alt)" aria-label="Dodge (Alt)"><Footprints size={20}/><span>Roll</span><kbd>Alt</kbd></button>
   <button className="ww-game-action ww-touch-utility" onClick={onBag} title="Bag (I)" aria-label="Open field bag (I)"><Backpack size={20}/><span>Bag</span><kbd>I</kbd></button>
   <button className="ww-game-action ww-touch-utility" onClick={onQuests} title="Daily quests (Q)" aria-label="Open daily quests (Q)"><ScrollText size={20}/><span>Quests</span><kbd>Q</kbd></button>
   <button disabled={!canAct} className="ww-game-action ww-touch-motion" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);onCrouch(true)}}
      onPointerUp={()=>onCrouch(false)} onPointerCancel={()=>onCrouch(false)} onLostPointerCapture={()=>onCrouch(false)}
      title="Hold sneak (Ctrl)" aria-label="Hold to sneak (Ctrl)"><span>Sneak</span><kbd>Ctrl</kbd></button>
   <button disabled={!canAct} className="ww-game-action ww-touch-motion" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);onRun(true)}}
      onPointerUp={()=>onRun(false)} onPointerCancel={()=>onRun(false)} onLostPointerCapture={()=>onRun(false)}
      title="Hold sprint (Shift)" aria-label="Hold to sprint (Shift)"><span>Run</span><kbd>⇧</kbd></button>
  </div>
 </div>;
}
export function BagTask({field,onCraft,onEquip,tool,onClose,onAlbum}:{
 field:FieldState;onCraft:()=>void;onEquip:(id:ToolId)=>void;tool:ToolId;onClose:()=>void;onAlbum:()=>void
}){
 const canCraft=field.inventory.berries>=1&&field.inventory.petals>=2;
 return <div className="ww-flow">
  <div className="ww-game-cards-heading">
   <span className="ww-kicker">THE LITTLE LEATHER SATCHEL</span><h3>Everything you've discovered</h3>
   <p>These objects came from the world. Take them to your workshop, the flower garden, or a classmate.</p>
  </div>
  <div className="ww-bag-grid">{(Object.keys(RESOURCE_NAMES) as (keyof typeof RESOURCE_NAMES)[]).map(resource=><div className="ww-bag-item" key={resource}>
   <span className="ww-bag-sigil" data-resource={resource}>{resource==='berries'?'✿':resource==='bugs'?'🦋':resource==='clay'?'◇':resource==='petals'?'❀':resource==='seeds'?'✧':resource==='fish'?'◈':'♡'}</span>
   <strong>{field.inventory[resource]}</strong><small>{RESOURCE_NAMES[resource]}</small>
  </div>)}</div>
  <button className="ww-album-entry" onClick={onAlbum}><BookOpen size={25}/><span>
   <strong>My creature and curiosity album</strong>
   <small>{Object.keys(field.album).length} of {FIELD_CATALOG.length} unique finds · meet new creatures in every district</small>
  </span><span aria-hidden="true">↗</span></button>
  <div className="ww-crafting-card"><span className="ww-kicker">LITTLE WORKSHOP RECIPE</span><div><span className="ww-craft-emblem"><Gift size={28}/></span>
   <div><h3>Friendship bouquet</h3><p>One sunberry + two petals. Press G beside a classmate to deliver your handmade gift, earn XP and grow your friendship.</p>
    <small>Have: {field.inventory.berries} sunberries, {field.inventory.petals} petals</small></div></div>
   <button className="ww-primary" disabled={!canCraft} onClick={onCraft}>Craft bouquet</button>
  </div>
  <h4 className="ww-subheading">Your five equipped tools</h4>
  <div className="ww-bag-tools">{TOOL_IDS.map(id=>{
   const Icon=ICONS[id];return <button key={id} aria-pressed={tool===id} onClick={()=>{onEquip(id);onClose()}}>
    <Icon size={23}/><strong>{TOOL_META[id].name}</strong><small>{TOOL_META[id].description}</small><kbd>{TOOL_META[id].key}</kbd>
   </button>;
  })}</div>
 </div>;
}
const ALBUM_ICONS={bug:Bug,relic:Shovel,flower:Flower2,fish:Fish};
const ALBUM_LABELS:{kind:DiscoveryKind;label:string}[]=[
 {kind:'bug',label:'Flutterbugs'},{kind:'relic',label:'Lost curios'},{kind:'flower',label:'Blooms'},{kind:'fish',label:'Waterlife'}
];
export function FieldGuideTask({field}:{field:FieldState}){
 const [selected,setSelected]=useState<'all'|DiscoveryKind>('all');
 const found=Object.keys(field.album).length,total=FIELD_CATALOG.length;
 const thresholds=[3,8,15,24,total];
 const next=thresholds.find(n=>found<n)||total;
 const displayed=FIELD_CATALOG.filter(entry=>selected==='all'||entry.kind===selected);
 return <div className="ww-flow">
  <div className="ww-field-guide-cover">
   <span className="ww-field-guide-icon"><BookOpen size={37} strokeWidth={1.5}/></span>
   <div><span className="ww-kicker">PERSONAL COLLECTOR'S ALBUM</span><h3>{found} / {total} discoveries</h3>
    <p>Every neighborhood has a species, an old artifact and a flower that can grow. Two districts also have unique fish. Find them in the world, not from a menu.</p></div>
  </div>
  <div className="ww-field-guide-meter" role="progressbar" aria-label="Unique field-guide discoveries"
    aria-valuemin={0} aria-valuemax={total} aria-valuenow={found}>
   <i style={{width:100*found/total+'%'}}/>
  </div>
  <p className="ww-note">Next collection milestone: {found>=total?'Album completed':next+' unique discoveries'}.
   Unlock acorns for reaching 3, 8, 15, 24 and all {total} finds.</p>
  <div className="ww-guide-tabs" role="group" aria-label="Filter your nature album">
   <button aria-pressed={selected==='all'} onClick={()=>setSelected('all')}>All · {found}</button>
   {ALBUM_LABELS.map(({kind,label})=><button key={kind} aria-pressed={selected===kind} onClick={()=>setSelected(kind)}>
    {label} · {Object.values(field.album).filter(d=>d.kind===kind).length}</button>)}
  </div>
  <div className="ww-guide-cards">{displayed.map(template=>{
   const entry=field.album[template.id],Icon=ALBUM_ICONS[template.kind];
   const region=REGION_BY_WEEK.get(template.week);
   return <article key={template.id} className={entry?'found':'hidden'}>
    <span className="ww-guide-art"><Icon size={31} strokeWidth={1.65}/></span>
    <div><span className="ww-kicker">{template.kind.toUpperCase()} · {region?.title}</span>
     <h4>{entry?.name||'Undiscovered'}</h4>
     <p>{entry?('Found '+entry.count+' time'+(entry.count===1?'':'s')+' · first seen '+
      new Date(entry.firstAt).toLocaleDateString()):'Explore this neighborhood with the right tool to reveal its secret.'}</p>
    </div><span className="ww-guide-status">{entry?'✦':'?'}</span>
   </article>;
  })}</div>
 </div>;
}
export function MissionTask({field,now,onClaim}:{field:FieldState;now:number;onClaim:(mission:Mission)=>void}){
 const missions=useMemo(()=>dailyMissions(now),[dayKeyMemo(now)]);
 return <div className="ww-flow">
  <div className="ww-coaching-card"><span className="ww-kicker">THE VILLAGE BULLETIN BOARD</span>
   <h3>Make today an adventure</h3><p>Three changing activities connect exploring, tools and friendship. Each claim is earned once; new objectives appear on a new day.</p></div>
  <div className="ww-daily-quests">{missions.map((mission,i)=>{
   const p=missionProgress(field,mission,now),finished=p.count>=mission.target;
   return <article key={mission.id} className={p.claimed?'claimed':''}>
    <span className="ww-quest-number">{String(i+1).padStart(2,'0')}</span>
    <div className="ww-quest-details"><h3>{mission.label}</h3><p>{mission.description}</p>
     <div className="ww-quest-progress"><i style={{width:Math.min(100,100*p.count/mission.target)+'%'}}/></div>
     <small>{p.count}/{mission.target} complete · {mission.reward} acorns</small></div>
    <button disabled={!finished||p.claimed} className={finished&&!p.claimed?'ww-primary':'ww-secondary'}
     onClick={()=>onClaim(mission)}>{p.claimed?'Collected':finished?'Claim':'In progress'}</button>
   </article>;
  })}</div>
  <p className="ww-note">No wait timers for lessons. You can always practise English; field tasks add optional rewards for real play.</p>
 </div>;
}
function dayKeyMemo(now:number){const d=new Date(now);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()}
