import {lessons,topics,topicMap,type Topic} from '../data';
import {THEMES} from '../game/rules';

export type ActorRole='student'|'teacher'|'librarian'|'examiner'|'gardener'|'builder'|'navigator'|'host';
export type Species='fox'|'rabbit'|'bear'|'otter'|'owl'|'bird'|'hedgehog'|'mouse'|'panda'|'lynx'|'deer'|'cat'|'squirrel';
export type Actor={id:string;name:string;role:ActorRole;species:Species;color:string;accent:string;position:[number,number];week:number;topicId?:string;greeting:string;personality:string;accessory:'bow'|'satchel'|'scarf'|'leaf'|'glasses'|'vest'|'hat'};
export type Region={week:number;title:string;center:[number,number];color:string;path:string;accent:string;sky:string;foliage:string;specialty:string;description:string};
const SLOTS=[1,2,3,4,5,0,6,7,8,9,10,11] as const;
const GRID_X=[-17,-5.7,5.7,17],GRID_Z=[-11.4,0,11.4];
const INDEX_BY_WEEK=new Map<number,number>(SLOTS.map((week,i)=>[week,i]));
const centerFor=(week:number):[number,number]=>{
 const index=INDEX_BY_WEEK.get(week)??5;
 return [GRID_X[index%4],GRID_Z[Math.floor(index/4)]];
};
const academy:Region={week:0,title:'Heartwood Academy',center:centerFor(0),color:'#a7d2b4',path:'#ead8bb',
 accent:'#edbd91',sky:'#d2e9d9',foliage:'#83b28d',specialty:'academy',
 description:'The shared schoolhouse, library, practice stage and festival square'};
export const REGIONS:Region[]=[academy,...THEMES.map((theme,index)=>({
 week:index+1,title:theme.name,center:centerFor(index+1),color:theme.ground,path:theme.path,
 accent:theme.accent,sky:theme.sky,foliage:theme.foliage,specialty:theme.specialty,description:theme.description
}))];
export const REGION_BY_WEEK=new Map(REGIONS.map(region=>[region.week,region]));
const names=[
 ['Pip','Mallow','Fern','Button'],['Mochi','Tinker','Kiki','Sage'],
 ['Bramble','Clover','Pebble','Ember'],['Nori','Lulu','Drizzle','Rumi'],
 ['Tilly','Sunny','Coco','Puddle'],['Lumi','Mimi','Star','Dolly'],
 ['Poppy','Toto','Nell','Wren'],['Patch','Mika','Bibi','Hazel'],
 ['Dot','Cinnamon','Moss','Fifi'],['Mei','Tama','Cloud','Olive'],
 ['Nova','Ivy','Taro','Juno']
];
const kinds:Species[]=['fox','rabbit','bear','otter','owl','bird','hedgehog','mouse','panda','lynx','deer','cat','squirrel'];
const colors=['#d9a17f','#eed4c4','#b59b84','#aa9c8a','#aa91ac','#d2c1ab','#b69b86','#bbb6b0','#c89480','#bcac93','#d1ae82','#d7acae','#bfac88'];
const accents=['#f6d09e','#edb6ac','#b3cda7','#d4add9','#9ac8bd','#d4c994'];
const props:Actor['accessory'][]=['bow','satchel','scarf','leaf','glasses','vest','hat'];
const positions:[[number,number],[number,number],[number,number],[number,number]]=[
 [-2.45,-2.4],[2.35,-2.15],[-2.65,2.4],[2.35,2.45]
];
const personalities=[
 'I like comparing two sides of an experience.',
 'I notice little details and try to make stories vivid.',
 'I enjoy listening carefully and asking why.',
 'I try to be thoughtful even when I disagree.'
];
const studentGreeting=(topic:Topic,index:number,week:number)=>{
 const starters=[
  'I have a story about '+topic.title.toLowerCase()+'. Want to compare experiences?',
  'Our speaking club picked '+topic.title.toLowerCase()+'. I have a question for you!',
  'I am practising an interview about '+topic.title.toLowerCase()+'. Could we rehearse together?',
  'I have been curious about '+topic.title.toLowerCase()+'. What do you think?'
 ];
 const opener=starters[index%starters.length];
 const followup=topic.discussion[(week+index)%topic.discussion.length];
 return opener+' '+followup;
};
export const STUDENTS:Actor[]=lessons.flatMap((lesson,i)=>{
 const region=REGION_BY_WEEK.get(lesson.week)!;
 return lesson.topics.map((topicId,j)=>{
  const topic=topicMap.get(topicId)!;
  const idx=i*4+j;
  return {id:'student:'+topicId,name:names[i][j],role:'student' as const,
    species:kinds[(idx*3+i)%kinds.length],color:colors[(idx*5+j)%colors.length],
    accent:accents[(idx+j)%accents.length],
    position:[region.center[0]+positions[j][0],region.center[1]+positions[j][1]] as [number,number],
    week:lesson.week,topicId,greeting:studentGreeting(topic,j,lesson.week),
    personality:personalities[(i+j)%personalities.length],accessory:props[(i+2*j)%props.length]
  };
 });
});
const makeStaff=(id:string,name:string,role:ActorRole,species:Species,color:string,accent:string,
  dx:number,dz:number,greeting:string,personality:string,accessory:Actor['accessory']):Actor=>({
 id,name,role,species,color,accent,position:[academy.center[0]+dx,academy.center[1]+dz],
 week:0,greeting,personality,accessory
});
export const STAFF:Actor[]=[
 makeStaff('teacher','Professor Maple','teacher','owl','#a9a2c6','#f1d49f',-1.8,-.75,
  'Welcome to our school! Every adventure begins by trying one idea aloud.',
  'Patient, gently curious and fond of stories.','glasses'),
 makeStaff('librarian','Quill','librarian','squirrel','#c8a889','#b3d5c2',1.95,-1.7,
  'I keep the word memories safe. Shall we see which ones are ready to bloom?',
  'Loves words, rereading and thoughtful questions.','satchel'),
 makeStaff('examiner','Ada','examiner','deer','#cfb697','#ded3ba',2.45,1.4,
  'Ready for a practice interview? I will guide you through every stage.',
  'A calm host who helps you rehearse authentic test timing.','vest'),
 makeStaff('gardener','Bloom','gardener','rabbit','#e6c9c7','#b3d4a7',-3.1,2.15,
  'The learning garden is growing. Bring a phrase to plant in your memory!',
  'Likes playful experiments and sharing seeds.','bow'),
 makeStaff('builder','Caramel','builder','bear','#c4ab91','#edca9b',.15,2.35,
  'Every new word can help us make our village feel more like home.',
  'A carpenter with a love of small crafted details.','hat'),
 makeStaff('navigator','Fable','navigator','fox','#dbab87','#abd1bd',.3,-2.55,
  'There are eleven neighborhoods, all connected by walkable forest paths.',
  'The class explorer who knows every trail.','scarf'),
 makeStaff('host','Glitter','host','cat','#d9b4bb','#ddcaa2',-3.25,-2.75,
  'Our speaking festival celebrates every student who gives a story a try.',
  'A warm, theatrical master of ceremonies.','leaf')
];
export const ALL_ACTORS=[...STAFF,...STUDENTS];
export const ACTOR_BY_ID=new Map(ALL_ACTORS.map(actor=>[actor.id,actor]));
export const TOPIC_ACTOR=new Map(STUDENTS.map(actor=>[actor.topicId!,actor]));
export const ACADEMY_SPAWN:[number,number]=[academy.center[0],academy.center[1]+4];
export const WORLD_BOUNDS={minX:GRID_X[0]-5,maxX:GRID_X[3]+5,minZ:GRID_Z[0]-5,maxZ:GRID_Z[2]+5};
export const SEED_OFFSETS:[number,number][]=[[-3.35,.6],[-.45,-3.5],[3.3,.75],[.5,3.45],[-3.1,-1.9]];
export function seedPoint(week:number,index:number):[number,number]{
 const region=REGION_BY_WEEK.get(week);
 if(!region||week<1||index<0||index>=SEED_OFFSETS.length)throw Error('Unknown vocabulary seed');
 const [dx,dz]=SEED_OFFSETS[index];
 return [region.center[0]+dx,region.center[1]+dz];
}
export function closestRegion(x:number,z:number):Region{
 let candidate=REGIONS[0],dist=Infinity;
 for(const region of REGIONS){const d=(x-region.center[0])**2+(z-region.center[1])**2;
   if(d<dist){dist=d;candidate=region}}
 return candidate;
}
export function actorsNear(week:number){return ALL_ACTORS.filter(a=>a.week===week)}
export function zonesNear(x:number,z:number):Region[]{
 return REGIONS.filter(region=>Math.abs(region.center[0]-x)<17&&Math.abs(region.center[1]-z)<17);
}
export function lessonOfTopic(topicId:string){const topic=topicMap.get(topicId);return topic?lessons[topic.week-1]:lessons[0]}
export function expectedTotal(){return {districts:11,students:STUDENTS.length,topics:topics.length,staff:STAFF.length}}
