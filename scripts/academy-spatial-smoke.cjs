const {chromium}=require('../node_modules/playwright-core');
const assert=require('node:assert/strict');
const base=process.env.SPEAKLAB_BASE||'http://127.0.0.1:5174/ielts-speaking-studio/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('.ww-world canvas').waitFor();await page.waitForTimeout(800);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('wildwood-travel',{detail:{x:-7.5,z:-.75,actorId:'teacher'}})));
 await page.getByRole('heading',{name:'Professor Maple’s classroom'}).waitFor({timeout:12000});
 await page.getByRole('button',{name:/Flower Harvest/}).click();
 await page.getByRole('heading',{name:'Flower Harvest'}).waitFor();
 const topic=await page.evaluate(()=>window.SPEAKLAB_CONTENT.topics[0]);
 const firstCorrect=topic.week%3;
 const loc=await page.locator('.ww-minimap small').innerText();
 const parts=loc.match(/-?\d+/g).map(Number);
 console.log('ANCHOR_ESTIMATE',parts,'CORRECT',firstCorrect);
 await page.evaluate(({x,z})=>window.dispatchEvent(new CustomEvent('wildwood-travel',{detail:{x,z}})),{
  x:parts[0]+(firstCorrect-1)*2.35,z:parts[1]-2.3
 });
 await page.getByText('2 / 5').waitFor({timeout:12000});
 assert.equal(await page.locator('.ww-round-progress .done').count(),1);
 await page.screenshot({path:'analysis/academy-physical-answer.png',fullPage:true});
 assert.equal(errors.length,0);
 console.log(JSON.stringify({success:true,physicalMarker:true,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error('SPATIAL CHALLENGE FAILED',e);process.exitCode=1});
