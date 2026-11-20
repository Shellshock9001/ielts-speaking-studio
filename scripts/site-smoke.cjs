const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright-core');
const base=process.env.SPEAKLAB_BASE||'http://127.0.0.1:5174/ielts-speaking-studio/';
const errors=[],out=[];
(async()=>{
 const executablePath=process.env.BROWSER_EXECUTABLE||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined);
 const browser=await chromium.launch({executablePath,headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce',permissions:['microphone']});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200);
  try{await page.getByRole('heading',{name:/Every word is/}).waitFor({timeout:5000})}catch(e){
    await page.screenshot({path:'analysis/startup-failure.png',fullPage:true});
    console.error('STARTUP DOCUMENT',await page.locator('body').innerText());
    console.error('STARTUP ERRORS',errors);
    throw e;
  }
  await page.screenshot({path:'analysis/village-desktop.png',fullPage:true});
  out.push(['home',await page.title(),await page.locator('canvas').count()]);
  const data=await page.evaluate(()=>({topics:window.SPEAKLAB_CONTENT.topics.length,lessons:window.SPEAKLAB_CONTENT.lessons.length,cues:window.SPEAKLAB_CONTENT.topics.reduce((n,t)=>n+t.cues.length,0),discussions:window.SPEAKLAB_CONTENT.topics.reduce((n,t)=>n+t.discussion.length,0),firstWord:window.SPEAKLAB_CONTENT.lessons[0].expressions[0].phrase}));
  assert.deepEqual([data.topics,data.lessons,data.cues,data.discussions],[44,11,178,132]);out.push(['bank',data]);
  await page.getByRole('button',{name:/Continue Week 01/}).click();
  await page.getByRole('heading',{name:'People and relationships',exact:true}).first().waitFor();
  await page.screenshot({path:'analysis/lesson-desktop.png',fullPage:true});
  const firstTab=page.getByRole('tab',{name:/Word Garden/});
  await firstTab.click();
  await page.getByRole('heading',{name:'Grow your expression garden'}).waitFor();
  await page.getByRole('button',{name:/Reveal meaning/}).first().click();
  await page.getByRole('textbox',{name:'Matching expression'}).fill(data.firstWord);
  await page.getByRole('button',{name:'Check answer'}).click();
  await page.getByText(/That.s it! Now say a new sentence aloud/).waitFor();
  out.push(['word-game','matched']);
  await page.getByRole('tab',{name:/Story Cottage/}).click();
  await page.getByRole('heading',{name:'Turn four clues into one story'}).waitFor();
  await page.screenshot({path:'analysis/story-desktop.png',fullPage:true});
  await page.getByRole('tab',{name:/Speaking Dock/}).click();
  await page.getByRole('heading',{name:'Find your confident voice'}).waitFor();
  await page.getByRole('button',{name:'Start',exact:true}).first().click();
  await page.screenshot({path:'analysis/speaking-desktop.png',fullPage:true});
  out.push(['speaking','timer started']);
  await page.getByRole('button',{name:'Start recording'}).click();
  await page.getByRole('button',{name:/Stop recording/}).waitFor({timeout:10000});
  await page.waitForTimeout(300);
  await page.getByRole('button',{name:/Stop recording/}).click();
  await page.getByRole('link',{name:/Save audio/}).waitFor();
  out.push(['microphone','recording and local playback controls worked']);
  await page.getByRole('button',{name:/Question library/}).first().click();
  await page.getByRole('heading',{name:'The question library.'}).waitFor();
  assert.equal(await page.locator('.topic-card').count(),44);
  await page.getByRole('textbox',{name:'Search speaking topics'}).fill('history');
  const count=await page.locator('.topic-card').count();assert(count>0&&count<44);
  out.push(['search',count]);
  await page.screenshot({path:'analysis/library-desktop.png',fullPage:false});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'The question library.'}).waitFor();
  out.push(['hash-route','retained']);
  if(process.env.OFFLINE_TEST==='1'){
    await page.waitForFunction(()=>navigator.serviceWorker?.controller,{timeout:20000});
    await page.waitForTimeout(1000);
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.getByRole('heading',{name:'The question library.'}).waitFor();
    await context.setOffline(false);
    out.push(['offline','full app loaded from cache']);
  }
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  const mp=await mobile.newPage();mp.on('pageerror',e=>errors.push('mobile:'+e.message));
  await mp.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await mp.getByRole('heading',{name:/Every word is/}).waitFor();
  await mp.screenshot({path:'analysis/village-mobile.png',fullPage:true});
  const overflow=await mp.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert(overflow.width<=overflow.viewport+2,'Mobile horizontal overflow');
  out.push(['mobile',overflow]);
  console.log(JSON.stringify({status:'smoke-ok',out,errors},null,2));
  if(errors.length)process.exitCode=1;
 }finally{await browser.close()}
})().catch(e=>{console.error('SMOKE FAILED',e);process.exitCode=1});
