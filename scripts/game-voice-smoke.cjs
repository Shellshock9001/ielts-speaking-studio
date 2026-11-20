const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require('../node_modules/playwright-core');
// Local browser test fixture only. Derived from SpeakLab's original authored
// Vision audio; never shipped to learners or used as an in-game sample.
function prepareMicrophoneFixture(){
 const input=fs.readFileSync(path.resolve(__dirname,'../public/audio/celebrate.wav'));
 const channels=input.readUInt16LE(22),rate=input.readUInt32LE(24),bits=input.readUInt16LE(34);
 assert.equal(input.toString('ascii',0,4),'RIFF');
 assert.equal(bits,16);assert(rate>=16000);assert(channels===1||channels===2);
 let offset=12,start=-1,size=0;
 while(offset+8<=input.length){
  const label=input.toString('ascii',offset,offset+4),length=input.readUInt32LE(offset+4);
  if(label==='data'){start=offset+8;size=length;break;}
  offset+=8+length+(length%2);
 }
 assert(start>=0&&size>0);
 const frames=Math.floor(size/(channels*2));
 const pcm=new Int16Array(frames);let peak=1;
 for(let i=0;i<frames;i++){
  let sum=0;for(let ch=0;ch<channels;ch++)sum+=input.readInt16LE(start+i*channels*2+ch*2);
  pcm[i]=Math.round(sum/channels);peak=Math.max(peak,Math.abs(pcm[i]));
 }
 const audio=Buffer.alloc(44+frames*2);
 audio.write('RIFF',0);audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);
 audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);
 audio.writeUInt32LE(rate,24);audio.writeUInt32LE(rate*2,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);
 audio.write('data',36);audio.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++)audio.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(pcm[i]*15000/peak))),44+i*2);
 const output=path.resolve(__dirname,'../analysis/voice-test-mono.wav');
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,audio);
 return output;
}
(async()=>{
 const fakeWav=prepareMicrophoneFixture();
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+fakeWav]});
 try{
 const context=await browser.newContext({viewport:{width:990,height:850},permissions:['microphone'],reducedMotion:'reduce'});
 await context.addInitScript(()=>{
 const original=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(type,...args){return (type==='webgl'||type==='webgl2')?null:original.call(this,type,...args)};
 });
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 await page.goto(process.env.SPEAKLAB_BASE||'http://127.0.0.1:4174/ielts-speaking-studio/',{waitUntil:'domcontentloaded'});
 await page.locator('.adventure-fallback').waitFor();
 await page.getByRole('button',{name:'Enter voice challenge'}).click();
 await page.getByRole('button',{name:'Activate microphone quest'}).click();
 await page.getByRole('button',{name:/End & listen/}).waitFor({timeout:10000});
 await page.waitForTimeout(12500);
 const partial=await page.locator('.voice-meter>span').innerText();
 console.log('FIRST_CHECK',partial);
 assert.match(partial,/^[1-4] \/ 4 lanterns$/,'Sustained audible capture should illuminate the first lantern');
 await page.getByRole('button',{name:/End & listen/}).waitFor();
 try{await page.getByText('All four lanterns are glowing.').waitFor({timeout:38000});}
 catch(e){console.error('LAST_METER',await page.locator('.voice-meter>span').innerText());throw e;}
 const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
 assert.equal(progress.quests['1.voice'].wins,1);
 await page.screenshot({path:'analysis/game-voice-complete.png',fullPage:true});
 await page.getByRole('button',{name:/End & listen/}).click();
 await page.getByRole('link',{name:'Save recording'}).waitFor({timeout:10000});
 console.log(JSON.stringify({success:true,partial,quest:progress.quests['1.voice'],errors},null,2));
 if(errors.length)process.exitCode=1;
 }finally{await browser.close()}
})().catch(e=>{console.error('FULL VOICE GAME FAILED',e);process.exitCode=1});
