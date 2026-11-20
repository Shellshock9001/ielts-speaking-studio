import { readFileSync,writeFileSync } from 'node:fs';
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
writeFileSync(script,original.replace(marker,'const GENERATED_ASSETS='+JSON.stringify([...assets])+';'));
console.log('Prepared offline cache for '+assets.size+' compiled assets.');
