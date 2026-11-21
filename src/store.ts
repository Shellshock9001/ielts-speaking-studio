import { useCallback, useEffect, useState } from 'react';
import {BUILD_COST,spentAcorns,type BuildingId} from './game/buildings';
import {hydrateField,initialField,type FieldState} from './world/play';

export type Score={date:string; topic:string; fluency:number; lexical:number; grammar:number; pronunciation:number; notes:string};
export type Card={interval:number; due:string; seen:number};
export type QuestResult={best:number;wins:number;last:string};
export type Progress={
 completed:number[]; notes:Record<string,string>; topicNotes:Record<string,string>; reflection:Record<string,string>;
 rubric:Score[]; cards:Record<string,Card>; reviewedTopics:string[]; quizResults:Record<string,number>;
 quests:Record<string,QuestResult>;
 foundSeeds:Record<string,boolean>;
 decorations:Record<string,string[]>;
 worldPosition:[number,number]|null;
 field:FieldState;
 lastVisit:number|null;
};
const key='speaklab-progress-v1';
export const blank=():Progress=>({completed:[],notes:{},topicNotes:{},reflection:{},rubric:[],cards:{},reviewedTopics:[],quizResults:{},quests:{},foundSeeds:{},decorations:{},worldPosition:null,field:initialField(),lastVisit:null});
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object' && value!==null && !Array.isArray(value);
export function hydrate(value:unknown):Progress{
  const initial=blank();
  if(!object(value))return initial;
  return {
    completed:Array.isArray(value.completed)?value.completed.filter(v=>Number.isInteger(v)&&v>0&&v<=11):[],
    notes:object(value.notes)?Object.fromEntries(Object.entries(value.notes).filter(([,v])=>typeof v==='string')) as Record<string,string>:{},
    topicNotes:object(value.topicNotes)?Object.fromEntries(Object.entries(value.topicNotes).filter(([,v])=>typeof v==='string')) as Record<string,string>:{},
    reflection:object(value.reflection)?Object.fromEntries(Object.entries(value.reflection).filter(([,v])=>typeof v==='string')) as Record<string,string>:{},
    rubric:Array.isArray(value.rubric)?value.rubric.filter(object).map(v=>({
      date:String(v.date||''),topic:String(v.topic||''),notes:String(v.notes||''),
      fluency:Number(v.fluency||v.average||0),lexical:Number(v.lexical||v.average||0),
      grammar:Number(v.grammar||v.average||0),pronunciation:Number(v.pronunciation||v.average||0)
    })).filter(s=>[s.fluency,s.lexical,s.grammar,s.pronunciation].every(Number.isFinite)):[],
    cards:object(value.cards)?Object.fromEntries(Object.entries(value.cards).filter(([,v])=>object(v)).map(([k,item])=>{const v=item as Record<string,unknown>;return [k,{interval:Number(v.interval||1),due:String(v.due||'1970-01-01'),seen:Number(v.seen||0)}]})):{},
    reviewedTopics:Array.isArray(value.reviewedTopics)?value.reviewedTopics.filter(v=>typeof v==='string'):[],
    quizResults:object(value.quizResults)?Object.fromEntries(Object.entries(value.quizResults).filter(([,v])=>Number.isFinite(v)).map(([k,v])=>[k,Number(v)])):{},
    quests:object(value.quests)?Object.fromEntries(Object.entries(value.quests).filter(([,v])=>object(v)).map(([k,item])=>{
      const v=item as Record<string,unknown>;
      return [k,{best:Math.max(0,Math.min(100,Number(v.best)||0)),wins:Math.max(0,Number(v.wins)||0),last:String(v.last||'')}];
    })): {},
    foundSeeds:object(value.foundSeeds)?Object.fromEntries(Object.entries(value.foundSeeds).filter(([,v])=>v===true)) as Record<string,boolean>: {},
    decorations:object(value.decorations)?Object.fromEntries(Object.entries(value.decorations).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[
      k,[...new Set((v as unknown[]).filter((id):id is BuildingId=>typeof id==='string'&&BUILD_COST.has(id as BuildingId)))]
    ])) as Record<string,string[]>:{},
    worldPosition:Array.isArray(value.worldPosition)&&value.worldPosition.length===2&&value.worldPosition.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<200)?
      [value.worldPosition[0],value.worldPosition[1]]:null,
    field:hydrateField(value.field),
    lastVisit:typeof value.lastVisit==='number'?value.lastVisit:null
  };
}
function getInitial(){try{return hydrate(JSON.parse(localStorage.getItem(key)||'null'))}catch{return blank()}}
export function useProgress(){
  const [progress,setProgress]=useState<Progress>(getInitial);
  const [savingError,setSavingError]=useState('');
  const update=useCallback((fn:(p:Progress)=>Progress)=>{
    setProgress(current=>{const next=fn(current);try{localStorage.setItem(key,JSON.stringify({...next,lastVisit:Date.now()}));setSavingError('')}catch{setSavingError('Local storage is full or unavailable. Export your work.')};return next;});
  },[]);
  const note=useCallback((id:string,value:string)=>update(p=>({...p,notes:{...p.notes,[id]:value}})),[update]);
  const topicNote=useCallback((id:string,value:string)=>update(p=>({...p,topicNotes:{...p.topicNotes,[id]:value}})),[update]);
  const complete=useCallback((week:number)=>update(p=>({...p,completed:[...new Set([...p.completed,week])]})),[update]);
  const practise=useCallback((id:string)=>update(p=>({...p,reviewedTopics:[...new Set([...p.reviewedTopics,id])]})),[update]);
  const score=useCallback((s:Score)=>update(p=>({...p,rubric:[...p.rubric,s]})),[update]);
  const rateCard=useCallback((id:string,remembered:boolean)=>update(p=>{
    const old=p.cards[id];const interval=remembered?(old?.interval?Math.min(old.interval*2,30):3):1;
    const due=new Date(Date.now()+interval*86400000).toISOString().slice(0,10);
    return {...p,cards:{...p.cards,[id]:{interval,due,seen:(old?.seen||0)+1}}};
  }),[update]);
  const replace=useCallback((value:unknown)=>update(()=>hydrate(value)),[update]);
  const awardQuest=useCallback((week:number,kind:string,points:number)=>update(p=>{
    const id=week+'.'+kind;const old=p.quests[id];
    return {...p,quests:{...p.quests,[id]:{best:Math.max(old?.best||0,points),wins:(old?.wins||0)+1,last:new Date().toISOString()}}};
  }),[update]);
  const buildItem=useCallback((week:number,item:BuildingId)=>update(p=>{
    const cost=BUILD_COST.get(item);
    if(!cost||!Number.isInteger(week)||week<1||week>11)return p;
    const key=String(week),owned=p.decorations[key]||[];
    const earned=Object.values(p.quests).reduce((sum,v)=>sum+Math.floor(v.best/20),0)+Object.values(p.foundSeeds).filter(Boolean).length+p.field.bonusAcorns;
    if(owned.includes(item)||earned-spentAcorns(p.decorations)<cost)return p;
    return {...p,decorations:{...p.decorations,[key]:[...owned,item]}};
  }),[update]);
  return {progress,update,note,topicNote,complete,practise,score,rateCard,replace,awardQuest,buildItem,savingError};
}
export function exportProgress(progress:Progress){
  const blob=new Blob([JSON.stringify({format:'SpeakLab Village progress',version:2,exportedAt:new Date().toISOString(),progress},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='speaklab-progress.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function useReducedMotion(){
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const listener=()=>setReduced(media.matches);media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener)},[]);
  return reduced;
}
