import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scoredir=path.join(root,'audio-sources/wildwood');
const manifest=JSON.parse(readFileSync(path.join(scoredir,'manifest.json'),'utf8'));
test('Vision generated 58 unique authored stereo cue scores and real WAV files',()=>{
 assert.equal(manifest.renderer,'Vision acoustic studio');
 assert.equal(manifest.cues.length,58);
 const seen=new Set(),hashes=new Set();
 for(const cue of manifest.cues){
  assert(!seen.has(cue.id),'Duplicate semantic event: '+cue.id);seen.add(cue.id);
  assert.match(cue.path,/^public\/audio\/wildwood\/[a-z-]+\.wav$/);
  const bytes=readFileSync(path.join(root,cue.path));
  const digest=createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest,cue.sha256,'Vision rendered score does not match exported sound: '+cue.id);
  assert(!hashes.has(digest),'Two cues are identical: '+cue.id);hashes.add(digest);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.equal(bytes.readUInt16LE(20),1,'PCM encoding required: '+cue.id);
  assert.equal(bytes.readUInt16LE(22),2,'Stereo performance required: '+cue.id);
  assert.equal(bytes.readUInt32LE(24),48000,'Expected authored sample rate: '+cue.id);
  assert.equal(bytes.readUInt16LE(34),16,'Expected 16-bit PCM');
  assert(Math.abs((bytes.length-44)/(48000*4)-cue.duration)<.01,'Cue duration mismatch: '+cue.id);
  const score=JSON.parse(readFileSync(path.join(scoredir,cue.id+'.json'),'utf8'));
  assert(score.layers.length>=3,'A cue must have meaningful authored acoustic layers');
  assert(score.layers.some(layer=>layer.kind==='fm'));
  assert(score.layers.some(layer=>layer.kind==='modal'));
  assert(score.layers.some(layer=>layer.kind==='noise'));
  assert(score.layers.every(layer=>!['sample','granular'].includes(layer.kind)),'No third-party sample material');
  assert(cue.peakDbFS<-5&&cue.peakDbFS>-70,'Invalid measured peak: '+cue.id);
 }
 const files=readdirSync(path.join(root,'public/audio/wildwood')).filter(name=>name.endsWith('.wav'));
 assert.equal(files.length,manifest.cues.length);
});
test('every district has its own non-identical Vision-rendered acoustic identity',()=>{
 const regions=manifest.cues.filter(cue=>cue.id.startsWith('region-')&&cue.id!=='region-enter');
 assert.equal(regions.length,12);
 assert.equal(new Set(regions.map(cue=>cue.sha256)).size,12);
});
