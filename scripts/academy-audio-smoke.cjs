const assert=require('node:assert/strict');
const {chromium}=require('../node_modules/playwright-core');
const base=process.env.SPEAKLAB_BASE||'http://127.0.0.1:5174/ielts-speaking-studio/';
const exe=process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:exe,
  args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1140,height:820},reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   window.__voicePlaybacks=0;
   window.__voiceBufferSamples=0;
   const native=AudioBufferSourceNode.prototype.start;
   AudioBufferSourceNode.prototype.start=function(...args){
    window.__voicePlaybacks++;
    window.__voiceBufferSamples+=this.buffer?.length||0;
    return native.apply(this,args);
   };
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('.ww-world canvas').waitFor({timeout:20000});
  const initial=await page.evaluate(()=>window.__voicePlaybacks);
  assert.equal(initial,0,'No autoplay should happen before a player gesture');
  await page.keyboard.press('2');
  await page.getByRole('button',{name:'Mute sound'}).waitFor({timeout:7000});
  await page.waitForFunction(()=>window.__voicePlaybacks>=1,{timeout:10000});
  const first=await page.evaluate(()=>({count:window.__voicePlaybacks,samples:window.__voiceBufferSamples}));
  assert(first.samples>0,'A decoded Vision asset was actually scheduled by WebAudio');
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.__voicePlaybacks>=2,{timeout:7000});
  await page.waitForTimeout(1100);
  await page.getByRole('button',{name:'Mute sound'}).click();
  await page.getByRole('button',{name:'Enable original world sounds'}).waitFor();
  // A landing cue already requested just before mute may finish decoding;
  // measure only starts after the explicit mute state has settled.
  await page.waitForTimeout(320);
  const mutedBaseline=await page.evaluate(()=>window.__voicePlaybacks);
  const afterMute=await page.evaluate(()=>localStorage.getItem('speaklab-sound-preference'));
  assert.equal(afterMute,'off');
  await page.keyboard.press('2');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
  const muted=await page.evaluate(()=>window.__voicePlaybacks);
  assert.equal(muted,mutedBaseline,'Explicit mute should prevent additional audio voices');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.ww-world canvas').waitFor();
  await page.keyboard.press('3');
  await page.waitForTimeout(400);
  assert.equal(await page.getByRole('button',{name:'Enable original world sounds'}).count(),1,'Muted preference must survive reload');
  await page.getByRole('button',{name:'Enable original world sounds'}).click();
  await page.getByRole('button',{name:'Mute sound'}).waitFor();
  await page.waitForFunction(()=>window.__voicePlaybacks>=1,{timeout:9000});
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log(JSON.stringify({success:true,first,muted,afterRestore:await page.evaluate(()=>window.__voicePlaybacks),errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error('VISION AUDIO INTEGRATION FAILED',e);process.exitCode=1});
