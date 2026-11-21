const {chromium}=require('../node_modules/playwright-core');
const assert=require('node:assert/strict');
const base=process.env.SPEAKLAB_BASE||'http://127.0.0.1:5174/ielts-speaking-studio/';
const executablePath=process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],results=[];
 try{
  const profiles=[
   ['phone-320',320,700],['phone-390',390,844],['tablet-portrait',820,1180],
   ['tablet-landscape',1180,820],['desktop',1600,900],['ultrawide',2200,1050]
  ];
  for(const [label,width,height] of profiles){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage();
   page.on('pageerror',error=>errors.push(label+': '+error.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(label+': '+m.text())});
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('.ww-world canvas').waitFor({timeout:25000});
   await page.waitForTimeout(720);
   const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert(overflow.scroll<=overflow.viewport+2,'Horizontal overflow: '+label);
   if(label==='phone-320'||label==='tablet-portrait'){
     const old=await page.locator('.ww-minimap small').textContent();
     const joystick=await page.locator('.ww-stick').boundingBox();
     assert(joystick,'Thumbstick missing: '+label);
     const centerX=joystick.x+joystick.width/2,centerY=joystick.y+joystick.height/2;
     await page.mouse.move(centerX,centerY);
     await page.mouse.down();
     await page.mouse.move(centerX+joystick.width*.27,centerY,{steps:4});
     await page.waitForTimeout(800);
     await page.mouse.up();
     const moved=await page.locator('.ww-minimap small').textContent();
     assert.notEqual(old,moved,'Pointer-captured thumbstick did not move the avatar on '+label);
   }
   await page.getByRole('button',{name:'Open village map'}).click();
   await page.getByRole('heading',{name:'The Village Atlas'}).waitFor();
   const rect=await page.evaluate(()=>{
    const r=document.querySelector('.ww-sheet').getBoundingClientRect();
    const c=document.querySelector('.ww-world-controls').getBoundingClientRect();
    return {sheet:{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height},
      controls:{x:c.x,y:c.y,right:c.right,bottom:c.bottom,width:c.width,height:c.height}};
   });
   if(width<1024&&height>width){
    assert(rect.controls.bottom<=rect.sheet.y+2,'Thumbstick buried under the bottom sheet: '+label);
   }
   await page.getByRole('button',{name:'Close activity and return to world'}).click();
   // The first real touch now unlocks original audio automatically.
   await page.getByRole('button',{name:'Mute sound'}).waitFor({timeout:5000});
   const enabled=await page.getByRole('button',{name:'Mute sound'}).getAttribute('aria-pressed');
   assert.equal(enabled,'true','User-activated sounds are not enabled');
   if(label==='phone-320'||label==='tablet-portrait'){
    await page.screenshot({path:'analysis/academy-final-'+label+'.png',fullPage:true});
    await page.getByRole('button',{name:'Open village map'}).click();
    await page.screenshot({path:'analysis/academy-final-'+label+'-map.png',fullPage:true});
   }
   assert.equal(errors.length,0,JSON.stringify(errors));
   results.push({label,overflow,layout:rect,sound:enabled});
   await context.close();
  }
  console.log(JSON.stringify({success:true,results,errors},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error('ACADEMY RESPONSIVE FAILED:',e);process.exitCode=1});
