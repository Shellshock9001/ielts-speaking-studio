import {lessons,topicMap,type Lesson} from '../data';

export type Challenge='word'|'story'|'debate'|'voice';
export type GameMode='explore'|Challenge;
export type QuestResult={best:number;wins:number;last:string};
export type GameQuestion={prompt:string;options:[string,string,string];correct:number;explanation:string;storyBeat?:string};
export type ChapterTheme={
  name:string;description:string;sky:string;ground:string;path:string;foliage:string;accent:string;night:boolean;
  specialty:'hearts'|'books'|'rocks'|'ponds'|'sails'|'cinema'|'letters'|'market'|'clocks'|'lanterns'|'stars';
  companion:string;greeting:string;bonus:string;
};
export const THEMES:ChapterTheme[]=[
 {name:'Friendship Orchard',description:'A golden orchard of memories and people',sky:'#def0e3',ground:'#9ac78f',path:'#e9d7ad',foliage:'#77a38c',accent:'#f0aaab',night:false,specialty:'hearts',companion:'Pip the fox',greeting:'Great stories begin with a person you remember. Who comes to mind?',bonus:'Describe a memorable friend in one vivid sentence.'},
 {name:'Curiosity Workshop',description:'A playful hillside of books and inventions',sky:'#dae9f4',ground:'#9ebeb1',path:'#e3d4b8',foliage:'#639fa3',accent:'#edc483',night:false,specialty:'books',companion:'Mochi the rabbit',greeting:'New skills grow when you try, fail, and try again.',bonus:'Tell me how you learned something difficult.'},
 {name:'Courage Canyon',description:'Rocky trails for brave problem-solvers',sky:'#f4dfd0',ground:'#c8b38b',path:'#f7d9a7',foliage:'#8fa27a',accent:'#d78f6e',night:false,specialty:'rocks',companion:'Bramble the bear',greeting:'Every challenge has a turning point. What was yours?',bonus:'Explain what changed when the problem was solved.'},
 {name:'Whispering Wetlands',description:'A valley of crowded markets and quiet forests',sky:'#d5ebe8',ground:'#91c1a8',path:'#eadac4',foliage:'#65aa8c',accent:'#87bed6',night:false,specialty:'ponds',companion:'Nori the otter',greeting:'Places have sound, texture, light and emotion. Notice them all.',bonus:'Describe one sound that defines a place.'},
 {name:'Wanderlight Harbor',description:'Ships, skylines and faraway adventures',sky:'#cae6f2',ground:'#a7c8ae',path:'#e7d0a6',foliage:'#66a4a4',accent:'#eab77b',night:false,specialty:'sails',companion:'Tilly the fox',greeting:'Pack your ideas. Where should our next story take us?',bonus:'Recommend a destination using a specific reason.'},
 {name:'Starlit Picture House',description:'A twilight cinema of stories and reviews',sky:'#353b60',ground:'#8ca2a2',path:'#cfb9a6',foliage:'#6d819c',accent:'#e9acba',night:true,specialty:'cinema',companion:'Lumi the owl',greeting:'Every movie leaves an impression. Can you explain yours?',bonus:'Describe a scene and how it changed your opinion.'},
 {name:'Letterbird Village',description:'A lively village of voices and conversations',sky:'#e2dff2',ground:'#9dc8b0',path:'#e3d4c0',foliage:'#8fabb3',accent:'#b6a1dc',night:false,specialty:'letters',companion:'Sunny the sparrow',greeting:'The best conversations have a story worth sharing.',bonus:'Retell a conversation with a clear beginning and outcome.'},
 {name:'Together Town Square',description:'A cooperative community of neighbors and shops',sky:'#e6eccc',ground:'#b5c893',path:'#ead7b8',foliage:'#83a873',accent:'#d7a57d',night:false,specialty:'market',companion:'Patch the hedgehog',greeting:'Teamwork grows when everyone has a role.',bonus:'Give an example of how collaboration changed a result.'},
 {name:'Clockwork Meadow',description:'A calm glade of routines and healthy habits',sky:'#dfe9d5',ground:'#a6c3a0',path:'#f0dfbb',foliage:'#84ad83',accent:'#a6b4df',night:false,specialty:'clocks',companion:'Dot the dormouse',greeting:'Small daily choices can change an entire week.',bonus:'Explain a habit and its long-term effect.'},
 {name:'Mooncake Festival',description:'Lanterns, homes and traditions after sunset',sky:'#4b4b72',ground:'#95a98c',path:'#d6bf9b',foliage:'#758d83',accent:'#f6c67d',night:true,specialty:'lanterns',companion:'Mei the red panda',greeting:'Traditions are stories people share across generations.',bonus:'Describe a family tradition and why it matters.'},
 {name:'Skyward Observatory',description:'A starry meadow for ambitions and big questions',sky:'#364365',ground:'#829b9c',path:'#c3bbad',foliage:'#677c9a',accent:'#f1d098',night:true,specialty:'stars',companion:'Nova the lynx',greeting:'A good idea becomes stronger when you can defend it.',bonus:'Name one ambition and a practical step toward it.'}
];
export const CHALLENGE_META:Record<Challenge,{title:string;subtitle:string;emoji:string;guide:string}> = {
 word:{title:'Word Harvest',subtitle:'Run to the right blossom',emoji:'✿',guide:'Read the definition. Move to the flower carrying the matching English expression.'},
 story:{title:'Story Trail',subtitle:'Build a coherent journey',emoji:'◇',guide:'Follow the narrative clues and collect the next useful detail for your speaking story.'},
 debate:{title:'Reasoning Run',subtitle:'Construct a balanced case',emoji:'⚑',guide:'Collect evidence roles in order and avoid misleading argument moves.'},
 voice:{title:'Voice Lanterns',subtitle:'Make the village glow',emoji:'◉',guide:'Speak aloud to illuminate the lanterns, then listen to your own recorded story.'}
};
const rotate=<T,>(arr:T[],n:number)=>arr.slice(n).concat(arr.slice(0,n));
export function chapterLesson(week:number):Lesson{return lessons[Math.max(0,Math.min(10,week-1))]}
export function chapterTheme(week:number):ChapterTheme{return THEMES[Math.max(0,Math.min(10,week-1))]}
function choices(right:string,wrong1:string,wrong2:string,seed:number):{options:[string,string,string];correct:number}{
 const index=(seed+3)%3;
 const list=[wrong1,wrong2,wrong1] as [string,string,string];
 list[index]=right;
 if(index===0){list[1]=wrong1;list[2]=wrong2}
 if(index===1){list[0]=wrong1;list[2]=wrong2}
 if(index===2){list[0]=wrong1;list[1]=wrong2}
 return {options:list,correct:index};
}
export const QUEST_ROUNDS={word:5,story:4,debate:4,voice:4};
export function buildQuestion(week:number,kind:Exclude<Challenge,'voice'>,round:number):GameQuestion {
 const lesson=chapterLesson(week);
 const expressions=lesson.expressions;
 // A four-beat story and a four-part argument stay on one subject throughout.
 // Changing to a different cue card each round undermines coherence practice.
 const topic=topicMap.get(lesson.topics[0])!;
 if(kind==='word'){
  const correctIndex=round%expressions.length;
  const target=expressions[correctIndex];
  const other=expressions.filter((_,i)=>i!==correctIndex);
  const [wrong1,wrong2]=rotate(other,(week+round)%other.length);
  return {prompt:'Harvest the expression meaning: '+target.meaning, ...choices(target.phrase,wrong1.phrase,wrong2.phrase,week+round),
    explanation:'“'+target.phrase+'” means '+target.meaning+'. Now try it in an original sentence.'};
 }
 if(kind==='story'){
  const beat=round%4;
  const cue=topic.cues[beat]||topic.cues[topic.cues.length-1];
  const options=choices(cue,topic.cues[(beat+1)%topic.cues.length],topic.cues[(beat+2)%topic.cues.length],week+round);
  const roles=['Introduce the central person, place or event.','Establish a useful detail or background.','Give the listener a concrete example or moment.','Explain the meaning and your final reflection.'];
  return {prompt:'Story trail: collect the next cue, '+roles[beat],...options,
    storyBeat:cue,explanation:'Story clue collected: '+cue+'. Keep your account connected to “'+topic.title+'”.'};
 }
 const functions=[
 ['State a defensible main point','Repeat the question without an opinion','Change to an unrelated experience','A discussion begins with a clear, relevant position.'],
 ['Explain a reason that supports the point','Use a vague filler instead of a reason','Offer an unrelated celebrity name','Relevant reasoning makes your position understandable.'],
 ['Give a specific real or plausible example','Make a sweeping claim without an example','Repeat the first sentence word for word','Examples make abstract arguments concrete.'],
 ['Recognize a limitation or other perspective','Insist every situation is exactly the same','Abandon the original question','Nuance shows you can handle complex ideas without losing your position.']
 ] as const;
 const [right,a,b,explanation]=functions[round%4];
 return {prompt:topic.discussion[round%topic.discussion.length],...choices(right,a,b,week+round),
  explanation,storyBeat:['Position','Reason','Example','Nuance'][round]};
}
export function rewardScore(correct:number,misses:number,seconds:number,rounds=5):number{
 const answerPoints=Math.round(60*Math.max(0,correct)/Math.max(1,rounds));
 const speedPoints=Math.max(0,20-Math.floor(Math.max(0,seconds)/10)*2);
 return Math.max(10,Math.min(100,20+answerPoints+speedPoints-Math.max(0,misses)*10));
}
export function rankLabel(score:number){return score>=90?'Gold acorn':score>=70?'Silver acorn':'Bronze acorn'}
