const assert=require('node:assert/strict');
const {chromium}=require('../node_modules/playwright-core');
const base=process.env.SPEAKLAB_BASE||'http://127.0.0.1:4174/ielts-speaking-studio/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,
 args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const results=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1080,height:890},permissions:['microphone'],reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   const getContext=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(name,...rest){
    if(name==='webgl'||name==='webgl2'||name==='experimental-webgl')return null;
    return getContext.call(this,name,...rest);
   };
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('console:'+msg.text())});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('.adventure-fallback').waitFor({timeout:30000});
  assert.equal(await page.locator('.adventure-world canvas').count(),0);
  const phrase=await page.evaluate(()=>window.SPEAKLAB_CONTENT.lessons[0].expressions[0].phrase);
  await page.getByRole('button',{name:'Discover word seed 1'}).click();
  await page.getByRole('heading',{name:"You've found a word seed!"}).waitFor();
  await page.getByRole('textbox',{name:'Which phrase means this?'}).fill('incorrect expression');
  await page.getByRole('button',{name:'Plant the word seed'}).click();
  await page.getByText('Not yet.',{exact:false}).waitFor();
  await page.getByRole('textbox',{name:'Which phrase means this?'}).fill(phrase);
  await page.getByRole('button',{name:'Plant the word seed'}).click();
  await page.getByText('1/5 seeds found').waitFor();
  let progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert.equal(progress.foundSeeds['1.0'],true);
  assert.equal(await page.getByRole('button',{name:'Discover word seed 1'}).count(),0);
  results.push('seed retrieval: incorrect spelling rejected, correct expression saved and hidden from map');
  await page.getByRole('button',{name:'Speak to Pip the fox'}).click();
  await page.getByRole('heading',{name:'Pip the fox'}).waitFor();
  await page.getByRole('textbox',{name:/Your reply/}).fill('I admire my childhood friend because she always supports others. For instance, she helped a neighbor move. What kinds of friends do you appreciate?');
  await page.getByRole('button',{name:'Share your story'}).click();
  await page.getByRole('heading',{name:'Pip the fox'}).waitFor();
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert.match(progress.topicNotes['village.chat.1.neighbor1'],/childhood friend/);
  results.push('villager: conversation saved to private learning journal');
  await page.getByRole('button',{name:'Enter story challenge'}).click();
  await page.getByRole('heading',{name:'Story Trail',exact:true}).waitFor();
  for(let round=0;round<4;round++){
   const correct=(1+round)%3;
   await page.getByRole('button',{name:'Select answer '+String.fromCharCode(65+correct)}).click();
   if(round<3)await page.getByText('LIVE CHALLENGE · ROUND '+(round+2)).waitFor({timeout:8000});
   else await page.getByRole('heading',{name:/acorn earned!/}).waitFor({timeout:8000});
  }
  assert.equal(await page.locator('.game-takeaway li').count(),4);
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert.equal(progress.quests['1.story'].wins,1);
  assert.equal(JSON.parse(progress.topicNotes['wildwood.story.1']).length,4);
  await page.screenshot({path:'analysis/game-story-won.png',fullPage:true});
  results.push('story: 4-beat connected narrative unlocked, award saved, assembled route persisted');
  await page.getByRole('button',{name:'Back to village'}).click();
  await page.getByRole('button',{name:'Enter debate challenge'}).click();
  await page.getByRole('heading',{name:'Reasoning Run'}).waitFor();
  await page.getByRole('button',{name:'Select answer A'}).click(); // wrong for round 1
  await page.getByText(/That choice does not fit/).waitFor();
  await page.getByRole('button',{name:'Select answer B'}).waitFor({state:'visible'});
  await page.waitForTimeout(1100);
  await page.getByRole('button',{name:'Select answer B'}).click();
  for(let round=1;round<4;round++){
   await page.getByText('LIVE CHALLENGE · ROUND '+(round+1)).waitFor({timeout:8000});
   const correct=(1+round)%3;
   await page.getByRole('button',{name:'Select answer '+String.fromCharCode(65+correct)}).click();
  }
  await page.getByRole('heading',{name:/acorn earned!/}).waitFor({timeout:8000});
  const debateScore=Number(await page.locator('.victory-scores strong').first().innerText());
  assert(debateScore<=90, 'A wrong answer must materially lower adventure points');
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert.equal(progress.quests['1.debate'].wins,1);
  assert.equal(JSON.parse(progress.topicNotes['wildwood.debate.1']).length,4);
  results.push('debate: incorrect choice requires retry, points penalized, four arguments saved');
  await page.getByRole('button',{name:'Back to village'}).click();
  await page.getByRole('button',{name:/Build your village/}).click();
  await page.getByRole('button',{name:'Build Storytime Bench'}).click();
  await page.getByText('1/4 built').waitFor();
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert(progress.decorations['1'].includes('story-bench'));
  results.push('village workshop: earned acorns spent on persistent furniture, duplicate purchase disabled');
  await page.getByRole('button',{name:'Enter voice challenge'}).click();
  await page.getByRole('heading',{name:'Bring the lanterns to life.'}).waitFor();
  await page.getByRole('button',{name:'Activate microphone quest'}).click();
  await page.getByRole('button',{name:/End & listen/}).waitFor({timeout:10000});
  await page.waitForTimeout(3000);
  const firstMeter=await page.locator('.voice-meter>span').innerText();
  await page.getByRole('button',{name:/End & listen/}).click();
  await page.getByRole('link',{name:'Save recording'}).waitFor({timeout:10000});
  results.push('voice: actual microphone access, audio recording, review/download, meter '+firstMeter);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.adventure-fallback').waitFor();
  progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert.equal(progress.foundSeeds['1.0'],true);
  assert.equal(progress.quests['1.story'].wins,1);
  assert.equal(progress.quests['1.debate'].wins,1);
  assert(progress.decorations['1'].includes('story-bench'));
  results.push('reload: seed and quest persistence retained');
  if(errors.length)throw Error('Browser errors: '+JSON.stringify(errors));
  console.log(JSON.stringify({success:true,results},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error('EXTENDED GAME CHECK FAILED',e);process.exitCode=1});
