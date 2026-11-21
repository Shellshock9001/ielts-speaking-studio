/**
 * Game simulation rules are independent of React/WebGL. Every village action
 * has an object, an appropriate equipped tool, a real transition and an
 * authoritative persistent result. The same rules power WebGL and 2D mode.
 */
import {REGIONS,type Actor} from './worldData';

export const TOOL_IDS=['hand','net','trowel','watering','rod'] as const;
export type ToolId=typeof TOOL_IDS[number];
export type FieldResource='berries'|'bugs'|'clay'|'petals'|'seeds'|'fish'|'gifts';
export type FieldKind='fruit'|'bug'|'relic'|'garden'|'pond';
export type FieldNode={id:string;kind:FieldKind;week:number;pos:[number,number];name:string};
export type GardenState={plantedAt:number;wateredAt:number|null};
export type DiscoveryKind='bug'|'relic'|'flower'|'fish';
export type Discovery={id:string;kind:DiscoveryKind;week:number;name:string;count:number;firstAt:number};
const mothNames=[
 'Academy Pencilwing','Orchard Roseflutter','Workshop Copperlace','Canyon Emberwing',
 'Wetland Reedskipper','Harbor Tidewing','Velvet Starwing','Letterbird Paperwing',
 'Town Square Sunlace','Clockwork Hourmoth','Mooncake Lanternwing','Observatory Stardrifter'
];
const relicNames=[
 'Porcelain School Token','Blossom Thimble','Brass Wonder Key','Canyon Sunstone',
 'Glass Reed Bead','Old Harbor Compass','Velvet Movie Charm','Letterbird Seal',
 'Market Copper Button','Meadow Timepiece','Lantern Glass Pendant','Moonlit Star Dial'
];
const flowerNames=[
 'Academy Honeybell','Orchard Rosette','Curiosity Sparkflower','Canyon Marigold',
 'Wetland Bellgrass','Harbor Seafoam','Picture House Starrose','Letterbird Paperlily',
 'Together Sunbloom','Clockwork Meadowbell','Mooncake Lightflower','Observatory Moonpetal'
];
export const FIELD_CATALOG:Discovery[]=REGIONS.flatMap(region=>{
 const w=region.week,slot=(kind:DiscoveryKind,name:string):Discovery=>({
  id:w+':'+kind,kind,week:w,name,count:0,firstAt:0
 });
 const base=[slot('bug',mothNames[w]),slot('relic',relicNames[w]),slot('flower',flowerNames[w])];
 if(w===4)base.push(slot('fish','Reedglass Silverfin'));
 if(w===5)base.push(slot('fish','Wanderlight Sailtail'));
 return base;
});
export const FIELD_CATALOG_BY_ID=new Map(FIELD_CATALOG.map(entry=>[entry.id,entry]));
export type FieldState={
 inventory:Record<FieldResource,number>;
 collected:Record<string,string>;
 gardens:Record<string,GardenState>;
 friends:Record<string,number>;
 giftedAt:Record<string,string>;
 counts:Record<string,number>;
 claims:Record<string,boolean>;
 album:Record<string,Discovery>;
 bonusAcorns:number;
 xp:number;
};
export type ActionEvent='forage'|'bug'|'dig'|'garden'|'fish'|'gift'|'conversation';
export type FieldResult={next:FieldState;changed:boolean;message:string;cue:string;effect?:string};
export type FishRound={week:number;castAt:number;biteAt:number;expiresAt:number;phase:'waiting'|'bite'};
export const TOOL_META:Record<ToolId,{name:string;verb:string;description:string;key:string}>={
 hand:{name:'Gather',verb:'Pick',description:'Collect ripe berries and harvest grown flowers',key:'1'},
 net:{name:'Butterfly Net',verb:'Catch',description:'Time your swing to catch fluttering creatures',key:'2'},
 trowel:{name:'Spade',verb:'Dig / Plant',description:'Find old curiosities and plant new flowers',key:'3'},
 watering:{name:'Watering Can',verb:'Water',description:'Tend a planted garden until it blooms',key:'4'},
 rod:{name:'Fishing Rod',verb:'Cast / Reel',description:'Cast in the water, then react to a bite',key:'5'}
};
export const RESOURCE_NAMES:Record<FieldResource,string>={
 berries:'Sunberries',bugs:'Flutterbugs',clay:'Clay charms',petals:'Petals',seeds:'Flower seeds',fish:'Silverfish',gifts:'Friendship bouquets'
};
export const RESOURCE_OFFSETS:Record<FieldKind,[number,number]>={
 fruit:[-4.15,-2.15],bug:[3.45,3.25],relic:[4.05,-2.25],garden:[0.4,4.35],pond:[1.05,1.55]
};
export function resourceNodes(week:number):FieldNode[]{
 const region=REGIONS.find(r=>r.week===week);
 if(!region)return [];
 return (Object.keys(RESOURCE_OFFSETS) as FieldKind[])
  .filter(kind=>kind!=='pond'||week===4||week===5)
  .map(kind=>{
   const [dx,dz]=RESOURCE_OFFSETS[kind];
   const names:Record<FieldKind,string>={fruit:'Sunberry shrub',bug:'Fluttering butterfly',
    relic:'Buried curiosity',garden:'Flower garden',pond:'Quiet fishing pool'};
   return {id:week+':'+kind,week,kind,pos:[region.center[0]+dx,region.center[1]+dz],name:names[kind]};
  });
}
export function allFieldNodes():FieldNode[]{return REGIONS.flatMap(r=>resourceNodes(r.week))}
export const FIELD_NODES=allFieldNodes();
export const FIELD_BY_ID=new Map(FIELD_NODES.map(n=>[n.id,n]));
export const initialField=():FieldState=>({
 inventory:{berries:0,bugs:0,clay:0,petals:0,seeds:6,fish:0,gifts:0},
 collected:{},gardens:{},friends:{},giftedAt:{},counts:{},claims:{},
 album:{},
 bonusAcorns:0,xp:0
});
const own=(s:FieldState):FieldState=>({
 ...s,inventory:{...s.inventory},collected:{...s.collected},gardens:{...s.gardens},
 friends:{...s.friends},giftedAt:{...s.giftedAt},counts:{...s.counts},claims:{...s.claims},album:{...s.album}
});
export function dayKey(now:number){const date=new Date(now);return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')}
export function hydrateField(raw:unknown):FieldState{
 const base=initialField();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return base;
 const obj=raw as Record<string,unknown>;
 const numbers=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?
  Object.fromEntries(Object.entries(value).filter(([,n])=>typeof n==='number'&&Number.isFinite(n)&&n>=0).map(([k,n])=>[k,Math.floor(n as number)])):{};
 const strings=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?
  Object.fromEntries(Object.entries(value).filter(([,v])=>typeof v==='string'&&v.length<60)):{};
 const bools=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?
  Object.fromEntries(Object.entries(value).filter(([,v])=>v===true)):{};
 const persistedInventory=numbers(obj.inventory);
 const inventory=Object.fromEntries(Object.entries(base.inventory).map(([key,val])=>[key,persistedInventory[key]??val])) as FieldState['inventory'];
 const gardens:FieldState['gardens']={};
 const album:FieldState['album']={};
 if(obj.album&&typeof obj.album==='object'&&!Array.isArray(obj.album))
  for(const [id,value] of Object.entries(obj.album)){
   const source=FIELD_CATALOG_BY_ID.get(id);
   if(!source||!value||typeof value!=='object')continue;
   const entry=value as Record<string,unknown>;
   if(typeof entry.count!=='number'||!Number.isFinite(entry.count)||entry.count<1)continue;
   album[id]={...source,count:Math.min(1000000,Math.floor(entry.count)),
    firstAt:typeof entry.firstAt==='number'&&Number.isFinite(entry.firstAt)?entry.firstAt:0};
  }
 if(obj.gardens&&typeof obj.gardens==='object'&&!Array.isArray(obj.gardens))
   for(const [id,entry] of Object.entries(obj.gardens)){
    if(!FIELD_BY_ID.has(id)||FIELD_BY_ID.get(id)?.kind!=='garden'||!entry||typeof entry!=='object')continue;
    const record=entry as Record<string,unknown>;
    if(typeof record.plantedAt!=='number'||!Number.isFinite(record.plantedAt))continue;
    gardens[id]={plantedAt:record.plantedAt,wateredAt:typeof record.wateredAt==='number'&&Number.isFinite(record.wateredAt)?record.wateredAt:null};
   }
 return {...base,inventory,collected:strings(obj.collected),gardens,album,friends:numbers(obj.friends),giftedAt:strings(obj.giftedAt),
  counts:numbers(obj.counts),claims:bools(obj.claims),bonusAcorns:Math.min(1000000,Math.max(0,Number(obj.bonusAcorns)||0)),xp:Math.max(0,Number(obj.xp)||0)};
}
export function track(state:FieldState,event:ActionEvent,now:number):FieldState{
 const copy=own(state),key=dayKey(now)+':'+event;
 copy.counts[key]=(copy.counts[key]||0)+1;
 return copy;
}
export function discover(state:FieldState,kind:DiscoveryKind,week:number,now:number):FieldState{
 const template=FIELD_CATALOG_BY_ID.get(week+':'+kind);
 if(!template)return state;
 const next=own(state),old=next.album[template.id];
 next.album[template.id]={...template,count:(old?.count||0)+1,firstAt:old?.firstAt||now};
 const unique=Object.keys(next.album).length;
 // The field guide rewards discovering *different* wildlife and artifacts,
 // never repeatedly collecting the same resource in the same district.
 if(!old&&[3,8,15,24,38].includes(unique)){
  next.bonusAcorns+=unique===38?16:unique===24?10:unique===15?7:unique===8?5:3;
  next.xp+=unique*4;
 }
 return next;
}
export function gardenReady(g:GardenState|undefined,now:number):boolean{
 return Boolean(g?.wateredAt&&now-g.wateredAt>=26000);
}
export function available(node:FieldNode,state:FieldState,now:number){
 if(node.kind==='garden'){
  const g=state.gardens[node.id];
  return !g?'empty':gardenReady(g,now)?'ready':g.wateredAt?'growing':'dry';
 }
 return state.collected[node.id]===dayKey(now)?'depleted':'ready';
}
export function nearestNode(x:number,z:number,tool:ToolId,range=2.25):FieldNode|null{
 const matching:Record<ToolId,FieldKind[]>={hand:['fruit','garden'],net:['bug'],trowel:['relic','garden'],watering:['garden'],rod:['pond']};
 let best:FieldNode|null=null,d=range;
 for(const n of FIELD_NODES){
  if(!matching[tool].includes(n.kind))continue;
  const dist=Math.hypot(n.pos[0]-x,n.pos[1]-z);
  if(dist<d){d=dist;best=n}
 }
 return best;
}
const result=(state:FieldState,message:string,cue:string,effect?:string):FieldResult=>({next:state,changed:false,message,cue,effect});
export function actionForNode(state:FieldState,node:FieldNode,tool:ToolId,now:number,bugPhase=1):FieldResult{
 const status=available(node,state,now);
 const next=own(state);
 if(node.kind==='fruit'&&tool==='hand'){
  if(status==='depleted')return result(state,'The berries have been picked today. Explore another grove.','try-again');
  next.inventory.berries+=2;next.collected[node.id]=dayKey(now);next.xp+=9;
  return {next:track(next,'forage',now),changed:true,message:'+2 sunberries · a lovely find!',cue:'berry-pick',effect:'berry'};
 }
 if(node.kind==='bug'&&tool==='net'){
  if(status==='depleted')return result(state,'This butterfly has already joined your collection today.','try-again');
  if(bugPhase<-.35)return result(state,'The butterfly fluttered out of reach. Watch its wings and swing again!','net-miss','miss');
  next.inventory.bugs+=1;next.collected[node.id]=dayKey(now);next.xp+=16;
  return {next:track(discover(next,'bug',node.week,now),'bug',now),changed:true,
   message:mothNames[node.week]+' caught! Your field guide has a new story.',cue:'net-catch',effect:'bug'};
 }
 if(node.kind==='relic'&&tool==='trowel'){
  if(status==='depleted')return result(state,'Nothing else is buried at this spot today.','try-again');
  next.inventory.clay+=1;next.collected[node.id]=dayKey(now);next.xp+=12;
  return {next:track(discover(next,'relic',node.week,now),'dig',now),changed:true,
   message:'Uncovered '+relicNames[node.week]+'! Your field guide remembers it.',cue:'dig-discover',effect:'earth'};
 }
 if(node.kind==='garden'&&tool==='trowel'){
  if(status!=='empty')return result(state,'There is already a flower growing here. Try watering it.','try-again');
  if(next.inventory.seeds<1)return result(state,'You need a flower seed. Harvest a grown garden or visit the village bag.','try-again');
  next.inventory.seeds--;next.gardens[node.id]={plantedAt:now,wateredAt:null};next.xp+=5;
  return {next,changed:true,message:'Seed planted! Equip the watering can (4) and tend it.',cue:'garden-till',effect:'soil'};
 }
 if(node.kind==='garden'&&tool==='watering'){
  if(status==='empty')return result(state,'Plant a flower with your spade (3) before watering.','try-again');
  if(status==='ready')return result(state,'Your flowers are blooming. Gather them with your hands (1)!','page-turn');
  if(status==='growing')return result(state,'The soil is already moist. Let the flowers grow.','garden-water');
  next.gardens[node.id]={...next.gardens[node.id],wateredAt:now};next.xp+=5;
  return {next,changed:true,message:'Watered! Your flower will bloom in about half a minute.',cue:'garden-water',effect:'water'};
 }
 if(node.kind==='garden'&&tool==='hand'){
  if(status==='empty')return result(state,'This garden is empty. Plant a flower seed with the spade (3).','page-turn');
  if(status==='dry')return result(state,'Your seed needs water! Equip the watering can (4).','try-again');
  if(status==='growing')return result(state,'Still growing! Come back when its petals open.','page-turn');
  next.inventory.petals+=2;next.inventory.berries++;next.inventory.seeds++;delete next.gardens[node.id];next.xp+=22;
  return {next:track(discover(next,'flower',node.week,now),'garden',now),changed:true,
   message:flowerNames[node.week]+' bloomed! +2 petals, +1 berry, +1 seed.',cue:'garden-bloom',effect:'flower'};
 }
 return result(state,'Equip the appropriate tool and move closer to an object.','try-again');
}
export function craftGift(state:FieldState):FieldResult{
 if(state.inventory.berries<1||state.inventory.petals<2)
  return result(state,'A friendship bouquet takes 1 berry and 2 petals. Grow a flower and pick berries first.','try-again');
 const next=own(state);next.inventory.berries--;next.inventory.petals-=2;next.inventory.gifts++;next.xp+=20;
 return {next,changed:true,message:'A friendship bouquet! Find a classmate and press G to give it.',cue:'craft-done',effect:'craft'};
}
export function giveGift(state:FieldState,actor:Actor,now:number):FieldResult{
 if(state.inventory.gifts<1)return result(state,'Craft a bouquet from your bag (I) first.','try-again');
 const key=dayKey(now);
 if(state.giftedAt[actor.id]===key)return result(state,actor.name+' already received a gift today. Visit a new friend!','page-turn');
 const next=own(state);next.inventory.gifts--;next.giftedAt[actor.id]=key;
 next.friends[actor.id]=(next.friends[actor.id]||0)+1;next.xp+=14;
 return {next:track(next,'gift',now),changed:true,message:actor.name+' loved your bouquet! Friendship level '+next.friends[actor.id],cue:'gift-give',effect:'heart'};
}
export function beginFishing(week:number,now:number):FishRound{
 const delay=1600+((week*29+Math.floor(now/997))%5)*360;
 return {week,castAt:now,biteAt:now+delay,expiresAt:now+delay+1900,phase:'waiting'};
}
export function fishPhase(round:FishRound,now:number):'waiting'|'bite'|'escaped'{
 return now>round.expiresAt?'escaped':now>=round.biteAt?'bite':'waiting';
}
export function reelFish(state:FieldState,round:FishRound,now:number):FieldResult{
 if(fishPhase(round,now)!=='bite')return result(state,'No bite yet. Keep your rod steady!','fish-escape');
 const next=own(state);next.inventory.fish++;next.xp+=19;
 const species=FIELD_CATALOG_BY_ID.get(round.week+':fish')?.name||'Silverfish';
 return {next:track(discover(next,'fish',round.week,now),'fish',now),changed:true,
  message:'You landed a '+species+'! A well-timed reel.',cue:'fish-reel',effect:'fish'};
}
export type Mission={id:string;label:string;description:string;event:ActionEvent;target:number;reward:number};
const MISSIONS:Mission[]=[
 {id:'pick-treats',label:'Pack a picnic',description:'Gather berries from two groves',event:'forage',target:2,reward:3},
 {id:'wing-spotter',label:'Catch a flutterbug',description:'Use your net when the butterfly is in reach',event:'bug',target:1,reward:3},
 {id:'secret-curios',label:'Hidden treasures',description:'Uncover a buried curiosity with the spade',event:'dig',target:1,reward:3},
 {id:'garden-lover',label:'Grow a memory',description:'Plant, water and harvest a flower',event:'garden',target:1,reward:4},
 {id:'kindness',label:'Make a friend smile',description:'Craft a bouquet and give it to a classmate',event:'gift',target:1,reward:4},
 {id:'story-exchange',label:'Tell a real story',description:'Share and save a conversation with a student',event:'conversation',target:1,reward:4},
 {id:'fish-story',label:'By the water',description:'Time a fishing reel to catch a fish',event:'fish',target:1,reward:4}
];
export function dailyMissions(now:number):Mission[]{
 const date=dayKey(now),seed=[...date].reduce((sum,char)=>sum*31+char.charCodeAt(0)|0,17);
 const rotated=[...MISSIONS].sort((a,b)=>((Math.imul(seed^(a.id.length*23),2654435761)>>>0)-(Math.imul(seed^(b.id.length*23),2654435761)>>>0)));
 return rotated.slice(0,3);
}
export function missionProgress(state:FieldState,mission:Mission,now:number){
 const key=dayKey(now);
 return {count:Math.min(mission.target,state.counts[key+':'+mission.event]||0),claimed:Boolean(state.claims[key+':'+mission.id])};
}
export function claimMission(state:FieldState,mission:Mission,now:number):FieldResult{
 const p=missionProgress(state,mission,now);
 if(p.claimed)return result(state,'Already claimed. New goals appear tomorrow.','page-turn');
 if(p.count<mission.target)return result(state,'Keep exploring! '+p.count+' / '+mission.target+' completed.','page-turn');
 const next=own(state);next.claims[dayKey(now)+':'+mission.id]=true;next.bonusAcorns+=mission.reward;next.xp+=20;
 return {next,changed:true,message:mission.label+' completed! +'+mission.reward+' acorns',cue:'quest-claimed',effect:'celebrate'};
}
export function levelForXp(xp:number){return Math.floor(Math.sqrt(Math.max(0,xp)/90))+1}
