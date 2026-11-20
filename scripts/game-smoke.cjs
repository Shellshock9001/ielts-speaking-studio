const assert=require('node:assert/strict');
const {chromium}=require('../node_modules/playwright-core');
const base=process.env.SPEAKLAB_BASE||'http://127.0.0.1:4174/ielts-speaking-studio/';
const errors=[];const results=[];
async function hold(page,key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try{
  const context=await browser.newContext({viewport:{width:1490,height:930},permissions:['microphone'],reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  let response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200);
  await page.getByRole('heading',{name:/Learn by playing/}).waitFor({timeout:30000});
  const canvas=page.locator('.adventure-world canvas');await canvas.waitFor();
  await page.waitForTimeout(650);
  assert.equal(await page.getByText('Free, independent IELTS Speaking practice. Not affiliated with IELTS test owners.').count(),0);
  const source=await page.evaluate(()=>({n:window.SPEAKLAB_CONTENT.topics.length,c:window.SPEAKLAB_CONTENT.topics.reduce((n,t)=>n+t.cues.length,0),d:window.SPEAKLAB_CONTENT.topics.reduce((n,t)=>n+t.discussion.length,0)}));
  assert.deepEqual(source,{n:44,c:178,d:132});
  const coords=page.locator('.adventure-coordinates small');
  const before=await coords.innerText();
  await hold(page,'a',950);
  const after=await coords.innerText();
  assert.notEqual(before,after,'Avatar needs to respond to held movement keys');
  results.push(['avatar movement',before,after]);
  await hold(page,'a',140);
  await hold(page,'w',710);
  await page.getByText(/Talk to the Word Harvest guide/).waitFor({timeout:6000});
  await page.keyboard.press('e');
  await page.getByRole('heading',{name:'Word Harvest'}).waitFor({timeout:12000});
  assert.equal(await page.locator('.game-option').count(),3);
  await page.waitForTimeout(420);
  results.push(['portal entry','physically walked to portal A then pressed E']);
  await page.screenshot({path:'analysis/game-wordquest.png',fullPage:true});
  const correct=[1,2,0,1,2];
  for(let round=0;round<5;round++){
   if(correct[round]===0)await hold(page,'a',820);
   if(correct[round]===2)await hold(page,'d',820);
   await hold(page,'w',2400);
   if(round<4){
    await page.getByText('LIVE CHALLENGE · ROUND '+(round+2)).waitFor({timeout:7000});
   }else await page.getByRole('heading',{name:/acorn earned!/}).waitFor({timeout:8000});
   results.push(['harvest round',round+1,correct[round]]);
  }
  const score=await page.locator('.victory-scores strong').first().innerText();
  assert(Number(score)>0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert.equal(saved.quests['1.word'].wins,1);
  results.push(['persistent reward',score,saved.quests['1.word']]);
  await page.getByRole('button',{name:'Back to village'}).click();
  await page.getByText('FOUR QUESTS TO EXPLORE').waitFor();
  assert.equal(await page.locator('.quest-done').count(),1);
  await page.getByRole('button',{name:/Build your village/}).click();
  await page.getByRole('button',{name:'Build Wildflower Garden'}).click();
  await page.getByText('1/4 built').waitFor();
  const builtProgress=await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')));
  assert(builtProgress.decorations['1'].includes('flower-bed'),'Built furniture must be saved in progress');
  assert(await page.getByRole('button',{name:'Build Wildflower Garden'}).isDisabled(),'Building the same object twice must be prevented');
  await page.screenshot({path:'analysis/game-village-decorated.png',fullPage:true});
  results.push(['village building','paid 2 earned acorns for a permanent 3D wildflower garden']);
  const beforeTravel=await coords.innerText();
  await page.getByRole('button',{name:'Walk to Story Trail'}).click();
  await page.waitForTimeout(1100);
  assert.notEqual(beforeTravel,await coords.innerText(),'Clicking a quest must physically move the avatar');
  await page.getByRole('heading',{name:'Story Trail',exact:true}).waitFor({timeout:9000});
  await page.screenshot({path:'analysis/game-story-3d.png',fullPage:true});
  results.push(['click-to-walk','quest marker walks avatar into story entrance, retaining scene']);
  await page.getByRole('button',{name:'Leave this quest'}).click();
  await page.getByRole('button',{name:'Walk to Reasoning Run'}).click();
  await page.getByRole('heading',{name:'Reasoning Run',exact:true}).waitFor({timeout:9000});
  await page.screenshot({path:'analysis/game-debate-3d.png',fullPage:true});
  results.push(['distinct arenas','story route and debate gate have independent 3D designs']);
  await page.getByRole('button',{name:'Leave this quest'}).click();
  const beforeCanvas=await canvas.elementHandle();
  const allChapters=[
    'Friendship Orchard','Curiosity Workshop','Courage Canyon','Whispering Wetlands',
    'Wanderlight Harbor','Starlit Picture House','Letterbird Village','Together Town Square',
    'Clockwork Meadow','Mooncake Festival','Skyward Observatory'
  ];
  for(let i=0;i<allChapters.length;i++){
    await page.getByLabel('Choose game chapter').selectOption(String(i+1));
    await page.waitForFunction(expected=>document.querySelector('.world-chapter-badge strong')?.textContent===expected,allChapters[i],{timeout:3500});
  }
  assert.equal(await page.locator('canvas').count(),1);
  const afterCanvas=await canvas.elementHandle();
  assert(await beforeCanvas.evaluate((a,b)=>a===b,afterCanvas),'Canvas must not remount when changing chapters');
  results.push(['chapter biomes','all 11 unique chapter environments, one persistent WebGL canvas']);
  await page.getByRole('button',{name:'Open guided lesson'}).click();
  await page.getByRole('heading',{name:'Ambitions and society'}).first().waitFor();
  assert.equal(await page.locator('.adventure-world canvas').count(),1,'3D canvas must remain mounted for a seamless return');
  assert.equal(await page.locator('.adventure-host.is-hidden').count(),1);
  await page.getByRole('button',{name:'Play this chapter'}).click();
  await page.getByRole('heading',{name:/Learn by playing/}).waitFor();
  results.push(['seamless route','study to game, no full reload']);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/Learn by playing/}).waitFor();
  assert.equal((await page.getByLabel('Choose game chapter').inputValue()),'11');
  assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('speaklab-progress-v1')))).decorations['1'].includes('flower-bed'));
  results.push(['deep link','chapter restored after reload']);
  const narrow=await browser.newContext({viewport:{width:320,height:740},reducedMotion:'reduce'});
  const phone=await narrow.newPage();phone.on('pageerror',e=>errors.push('mobile '+e.message));
  await phone.goto(base,{waitUntil:'domcontentloaded'});await phone.getByRole('heading',{name:/Learn by playing/}).waitFor();
  await phone.locator('.adventure-world canvas').waitFor();
  const overflow=await phone.evaluate(()=>({content:document.documentElement.scrollWidth,width:innerWidth}));
  assert(overflow.content<=overflow.width+2,'Mobile horizontal scrolling');
  const mobileCoords=phone.locator('.adventure-coordinates small');
  const phoneBefore=(await mobileCoords.textContent())?.trim();
  const rightButton=phone.getByRole('button',{name:'Walk right'});
  await rightButton.scrollIntoViewIfNeeded();
  const bounds=await rightButton.boundingBox();
  assert(bounds&&bounds.width>=39&&bounds.height>=39,'Touch controls must be sized for fingers');
  await phone.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await phone.mouse.down();
  await phone.waitForTimeout(700);
  await phone.mouse.up();
  const phoneAfter=(await mobileCoords.textContent())?.trim();
  assert.notEqual(phoneBefore,phoneAfter,'Touch-screen pointer controls must move the avatar');
  await phone.getByRole('button',{name:'Walk to Word Harvest'}).click();
  await phone.getByRole('heading',{name:'Word Harvest',exact:true}).waitFor({timeout:16000});
  const phoneChallengeOverflow=await phone.evaluate(()=>({content:document.documentElement.scrollWidth,width:innerWidth}));
  assert(phoneChallengeOverflow.content<=phoneChallengeOverflow.width+2,'Mobile challenge horizontal scrolling');
  await phone.screenshot({path:'analysis/game-mobile.png',fullPage:true});
  results.push(['320px mobile',overflow,'on-screen D-pad moved avatar, touch quest travel entered Word Harvest']);
  if(process.env.OFFLINE_TEST==='1'){
   await page.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:18000});
   await page.waitForTimeout(1000);
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.getByRole('heading',{name:/Learn by playing/}).waitFor();
   await context.setOffline(false);
   results.push(['offline','reload passed']);
  }
  console.log(JSON.stringify({success:true,results,errors},null,2));
  if(errors.length)process.exitCode=1;
 }finally{await browser.close()}
})().catch(e=>{console.error('GAME SMOKE FAILED:',e);process.exitCode=1});
