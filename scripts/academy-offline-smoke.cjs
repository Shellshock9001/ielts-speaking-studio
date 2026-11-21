const assert=require('node:assert/strict');
const {chromium}=require('../node_modules/playwright-core');
const base=process.env.SPEAKLAB_BASE||'http://127.0.0.1:4174/ielts-speaking-studio/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:920,height:800},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  page.on('requestfailed',req=>errors.push('request failed: '+req.url()+' :: '+req.failure()?.errorText));
  await page.goto(base,{waitUntil:'load',timeout:30000});
  await page.locator('.ww-world canvas').waitFor({timeout:25000});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker?.controller),{timeout:30000});
  await page.getByRole('button',{name:'Enable original world sounds'}).click();
  await page.getByRole('button',{name:'Mute sound'}).waitFor();
  await page.waitForTimeout(1200);
  const before=await page.evaluate(async()=>({
    controller:!!navigator.serviceWorker.controller,
    script:navigator.serviceWorker.controller?.scriptURL,
    names:await caches.keys(),
    entries:await (async()=>{
      const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('speaklab-village-')));
      return (await cache.keys()).map(request=>request.url);
    })()
  }));
  console.log('CACHE_BEFORE_OFFLINE',JSON.stringify(before));
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(4500);
  console.log('OFFLINE DIAGNOSTIC',JSON.stringify({
    before,
    url:page.url(),title:await page.title(),
    text:(await page.locator('body').innerText()).slice(0,1200),
    canvas:await page.locator('canvas').count(),
    fallback:await page.locator('.ww-2d-world').count(),
    errors
  }));
  await page.locator('.ww-world canvas').waitFor({timeout:30000});
  await page.getByRole('button',{name:'Open village map'}).click();
  await page.getByRole('heading',{name:'The Village Atlas'}).waitFor();
  await page.getByRole('button',{name:'Close activity and return to world'}).click();
  await page.getByRole('button',{name:'Open learning storybook'}).click();
  await page.getByRole('heading',{name:'My Storybook'}).waitFor();
  assert.equal(await page.locator('.ww-journal-topics button').count(),44);
  assert.equal(errors.length,0);
  await context.setOffline(false);
  console.log(JSON.stringify({success:true,offline:true,coreCache:before,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error('ACADEMY OFFLINE CHECK FAILED',e);process.exitCode=1});
