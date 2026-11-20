import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(path.join(root,'public','content.js'),'utf8');
const page={};
vm.runInNewContext(source,{window:page},{timeout:1000,filename:'content.js'});
const {topics,lessons}=page.SPEAKLAB_CONTENT;

test('all original speaking prompts survive the React replacement',()=>{
  assert.equal(topics.length,44);
  assert.equal(topics.reduce((n,t)=>n+t.cues.length,0),178);
  assert.equal(topics.reduce((n,t)=>n+t.discussion.length,0),132);
  assert.equal(new Set(topics.map(t=>t.id)).size,44);
  for(const topic of topics){
    assert.match(topic.title,/^Describe /);
    assert(topic.cues.every(q=>typeof q==='string'&&q.trim()));
    assert.equal(topic.discussion.length,3);
    assert(topic.discussion.every(q=>q.endsWith('?')));
  }
});
test('the 11 thematic lessons retain all 44 source topics exactly once',()=>{
  assert.equal(lessons.length,11);
  const ids=lessons.flatMap(l=>l.topics);
  assert.equal(ids.length,44);
  assert.equal(new Set(ids).size,44);
  assert.equal([...new Set(ids)].sort().join('|'),Array.from(topics,t=>t.id).sort().join('|'));
  lessons.forEach((l,i)=>{assert.equal(l.week,i+1);assert.equal(l.topics.length,4);assert(l.expressions.length>=5);assert(l.model.length>100);});
});
test('the site imports no remote runtime scripts or remote font files',()=>{
  const index=readFileSync(path.join(root,'index.html'),'utf8');
  const src=readFileSync(path.join(root,'src','styles.css'),'utf8');
  assert.doesNotMatch(index,/https?:\/\//i);
  assert.doesNotMatch(src,/@import\s+url\(/i);
  assert.doesNotMatch(index,/(googleapis|gstatic|jsdelivr|unpkg|cloudflare)/i);
});
