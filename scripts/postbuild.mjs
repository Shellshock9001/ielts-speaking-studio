import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const manifest=JSON.parse(readFileSync(path.join(dist,'.vite','manifest.json'),'utf8'));
const assets=new Set();
for(const entry of Object.values(manifest)){
  if(entry.file)assets.add('./'+entry.file);
  for(const file of entry.css||[])assets.add('./'+file);
  for(const file of entry.assets||[])assets.add('./'+file);
}
if(!assets.size)throw Error('Build manifest had no assets to cache.');
const script=path.join(dist,'sw.js');
const original=readFileSync(script,'utf8');
const marker='const GENERATED_ASSETS=[];';
if(!original.includes(marker))throw Error('Offline cache manifest insertion point disappeared.');
const cacheMarker="const CACHE='speaklab-village-2026-11-20';";
if(!original.includes(cacheMarker))throw Error('Offline cache version marker disappeared.');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const absolute=path.join(directory,entry.name);
  return entry.isDirectory()?walk(absolute):[absolute];
});
const fingerprint=createHash('sha256');
// Service-worker behavior participates in the cache identity; an SW-only
// fix must not keep the old release cache name.
fingerprint.update(original);
for(const file of walk(dist).filter(file=>file!==script).sort()){
  fingerprint.update(path.relative(dist,file).replaceAll('\\','/'));
  fingerprint.update(readFileSync(file));
}
const version='speaklab-village-'+fingerprint.digest('hex').slice(0,12);
writeFileSync(script,original.replace(marker,'const GENERATED_ASSETS='+JSON.stringify([...assets])+';').replace(cacheMarker,"const CACHE='"+version+"';"));
console.log('Prepared offline cache '+version+' for '+assets.size+' compiled assets.');
