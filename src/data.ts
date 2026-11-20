export type Topic = { id:string; title:string; cues:string[]; discussion:string[]; week:number };
export type Expression = { phrase:string; meaning:string; example?:string };
export type Lesson = { week:number; title:string; objective:string; topics:string[]; expressions:Expression[]; grammar:string; pronunciation:string; warmup:string[]; model:string; homework:string };
export type Content = {topics:Topic[]; lessons:Lesson[]};
declare global {interface Window { SPEAKLAB_CONTENT: Content }}
export const content = window.SPEAKLAB_CONTENT;
if (!content?.topics?.length || !content.lessons?.length) throw new Error('The complete IELTS source question bank failed to load.');
export const lessons=content.lessons;
export const topics=content.topics;
export const topicMap = new Map(topics.map(t=>[t.id,t]));
export const imageBase = import.meta.env.BASE_URL + 'images/';
export const audioBase = import.meta.env.BASE_URL + 'audio/';
export const stations=['garden','story','speak','debate'] as const;
export type Station=typeof stations[number];
export const photos=['friends','library','teamwork','market','nature','cinema'] as const;
export const photoOfWeek=['friends','library','teamwork','market','nature','cinema','friends','teamwork','nature','market','library'];
