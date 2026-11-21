/**
 * Actual Vision acoustic studio production for the Wildwood game.
 *
 * This is an offline authoring tool, not part of the browser. It asks Vision
 * to validate/retain editable layered scores and render new stereo PCM WAVs.
 * Each cue has its own frequency gestures, materials, envelope and space.
 * No stock samples, sample packs, borrowed music or canned button clicks.
 *
 * Run on the design workstation, which has Vision:
 *   node scripts/vision-score-world.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const vision=process.env.VISION_ROOT||'C:/ShellShockHive/Vision';
const sessionId='15002263-9dc1-4056-908a-00f95724b47d';
const scoreDir=path.join(root,'audio-sources','wildwood');
const publicDir=path.join(root,'public','audio','wildwood');
// Pass the entire authored score directly over MCP stdin instead of passing a
// large JSON command-line argument (which exceeds the Windows process limit).
const {Client}=await import('file:///'+path.join(vision,'node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js').replaceAll('\\','/'));
const {StdioClientTransport}=await import('file:///'+path.join(vision,'node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js').replaceAll('\\','/'));
const client=new Client({name:'speaklab-wildwood-sound-author',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(vision,'engine/server.mjs')],cwd:vision}));
const call=async(method,args)=>{
 const response=await client.callTool({name:method,arguments:args});
 if(response.isError)throw Error(method+': '+response.content?.find(x=>x.type==='text')?.text);
 return response.structuredContent||JSON.parse(response.content?.find(x=>x.type==='text')?.text||'{}');
};
const startPoints=(d,values)=>[[0,values[0]],[d,values[1]]];
const env=(duration,attack=.045,release=.27)=>{
  const a=Math.min(duration*.33,attack),r=Math.min(duration*.45,release);
  return [[0,0],[a,.94],[duration-r,.68],[duration,0]];
};
const profiles=[
  // id,event,shape,length,fundamental,ratio,motion,pan,brightness
  ['foot-grass','walk on planted paths','soft felt-and-sedge movement',.25,183,2.19,-.11,-.25,.21],
  ['foot-wood','walk on classroom boards','tiny hollow timber contact',.24,232,1.75,-.24,.21,.18],
  ['move-start','accelerate from rest','two suspended bell seeds lifting',.43,358,3.06,.13,.14,.14],
  ['peer-hello','greet classmate','warm glass bead meets soft plectrum',.74,466,2.15,.26,-.22,.2],
  ['mentor-hello','speak to classroom guide','rounded ceramic double mallet',.99,309,2.73,.17,.31,.19],
  ['chat-open','open a conversation','rustling blossom followed by a thin chime',.58,543,2.64,-.12,-.12,.24],
  ['chat-choice','choose a dialogue reply','three playful suspended wooden overtones',.45,528,2.18,.1,.26,.18],
  ['correct','answer a challenge correctly','upward soft marimba harmonics in stereo',.89,418,2.72,.36,-.3,.19],
  ['try-again','revise a wrong answer','warm downturned felt bell, no harsh buzz',.66,346,1.94,-.18,.16,.12],
  ['seed-find','discover a word seed','petal unfurl with bright glass interior',1.06,624,3.18,.42,-.29,.24],
  ['page-turn','open journal or notebook','fluffed paper brush over hollow wooden spine',.57,295,2.34,.22,.21,.28],
  ['region-enter','enter another forest district','descending wind-ceramic arc',1.26,354,3.41,.5,-.19,.2],
  ['voice-rise','speech lights a lantern','low luminous windchime with slow bloom',1.17,550,2.59,.55,.15,.2],
  ['assessment-start','begin a practice interview','gentle three-part resonant chime',1.48,392,2.2,.3,-.35,.17],
  ['assessment-finish','complete speaking interview','joyful staggered bell choir with airy tail',2.06,441,2.64,.48,.21,.22],
  ['furniture-place','place village furniture','solid cork wood bounce with floral overtones',.9,248,2.1,.21,-.22,.28],
  ['quest-accept','accept a teacher assignment','inviting rising glass-and-wood flourish',.83,468,2.43,.27,.22,.22],
  ['quest-finish','finish a classroom mission','harmonized gentle double bell and paper sparkle',1.57,520,2.89,.47,-.28,.22],
  ['map-open','open the woodland atlas','soft parchment fan and ceramic glint',.66,577,2.75,.18,.08,.28],
  ['festival-cheer','friends celebrate together','playful bell cascade with soft breath and wood warmth',2.25,657,3.14,.49,-.31,.22],
  ['classroom-door','cross a classroom threshold','soft carved wood and glass sliding motion',.91,302,2.48,-.31,.2,.19],
  ['memory-recall','review a spaced-memory card','quiet three-note shimmering growth',1.02,490,2.73,.32,-.18,.18],
];
// Distinct, authored atmospheric transitions for each continuous neighborhood.
// These are one-time environmental performances as the player enters an area,
// not a repetitive generic background loop.
profiles.push(
 ['region-academy','enter Heartwood Academy','frosted classroom glass, paper spine and warm pencil taps',3.06,417,2.37,.17,-.24,.22],
 ['region-orchard','enter Friendship Orchard','soft fruit-blossom bells and passing leaf air',3.38,611,2.81,.28,.29,.19],
 ['region-workshop','enter Curiosity Workshop','gentle pear-wood tools and little ceramic invention gears',2.83,343,3.11,.18,-.27,.23],
 ['region-canyon','enter Courage Canyon','sunny sandstone harmonics and a distant breeze',3.15,276,1.87,-.15,.32,.22],
 ['region-wetlands','enter Whispering Wetlands','watery reed resonance and quiet liquid chimes',3.4,478,3.37,.35,-.39,.2],
 ['region-harbor','enter Wanderlight Harbor','hanging rope-harbor bells and sea-breeze air',3.65,390,2.16,-.25,.31,.2],
 ['region-picturehouse','enter Starlit Picture House','dim amber film-theater glass, small velvet swirls',3.2,542,2.94,-.19,-.21,.15],
 ['region-letterbird','enter Letterbird Village','airy paper charms and lively chirping resonators',2.82,692,3.23,.4,.37,.2],
 ['region-together','enter Together Town Square','warm cooperative timber rhythms and familiar little bells',3.45,326,2.59,.27,-.25,.21],
 ['region-clockwork','enter Clockwork Meadow','rounded hourglass ticking over gentle sustained melody',3.14,555,3.48,-.26,.27,.18],
 ['region-mooncake','enter Mooncake Festival','luminous silk lanterns and soft ceremonial bells',3.75,477,2.77,.34,-.32,.18],
 ['region-observatory','enter Skyward Observatory','quiet crystal star arpeggios and deep telescope resonance',3.96,660,2.61,.26,.38,.21]
);
// Action choreography: each signal has its own editable envelope, evolving
// pitched resonators, surface texture, body and stereo response. These are
// original authored performances rendered by Vision, not renamed click files.
profiles.push(
 ['hop-takeoff','feet leave the clay path','little boot push, airy cloth lift and hopeful rising bead',.41,340,2.18,.41,-.15,.16],
 ['hop-land','character lands with weight','felt soles and soil compression with a low woody answer',.46,175,1.48,-.43,.2,.25],
 ['dash-boost','start a sprint','wind through folded ribbon and brief forward wood percussion',.51,317,3.03,.26,-.32,.27],
 ['sneak-rustle','step quietly while crouching','soft linen brushing leaves with mellow contact',.32,217,1.33,-.17,.22,.12],
 ['dodge-roll','roll into a safe evasive burst','grounded lacquer tumble, brushed leaf sweep and landing bead',.8,283,2.4,-.31,-.34,.28],
 ['berry-pick','pluck sunberries from a shrub','fruit skin tension, two soft pop resonances and basket rustle',.82,541,3.13,.16,.24,.26],
 ['net-swish','swing the butterfly net','airfoil cloth sweep and flexible bamboo handle',.51,406,1.79,-.23,-.18,.3],
 ['net-catch','catch a fluttering creature','net drape, captured-wing flutter and three joyful ceramic notes',1.1,618,2.83,.41,.33,.25],
 ['net-miss','butterfly escapes the net','thin gust, loose fabric and descending playful reed',.64,388,2.02,-.35,-.28,.29],
 ['dig-scrape','spade scrapes woodland earth','wooden handle traction and granular sandy grit',.53,196,2.31,-.22,-.28,.28],
 ['dig-discover','uncover a little clay charm','earth falls away, old glass ornament rings and warm little flourish',1.18,419,2.57,.29,.3,.24],
 ['garden-till','set a seed into fertile soil','soft dirt parting, little root rattle and gentle seed settling',.83,287,1.87,-.35,.26,.27],
 ['garden-water','pour a small watering can','glugging copper can, fluid droplets and resonant leaf cup',1.37,583,2.23,-.19,-.37,.28],
 ['garden-bloom','petals open after tended growth','three-part soft foliage unfolding and bright lilting ceramic blossom',1.9,697,3.2,.38,.42,.27],
 ['fish-cast','cast a fishing line into a pond','rod flex, flying line and tiny water contact in stereo',1.16,319,2.64,.25,-.28,.26],
 ['fish-bite','bobber plunges in water','water plop, short tension chord and eager signal bell',.64,552,2.6,.32,.36,.28],
 ['fish-reel','catch and reel a fish','taut elastic line, wet splashes and joyfully resonant bamboo',1.57,473,2.96,.36,-.36,.3],
 ['fish-escape','fish slips free or early reel','slinky line recoil and light water ripple',.85,250,1.96,-.25,.31,.23],
 ['tool-equip','grip and equip a field tool','small fitting snap, handle cloth and tactile wood tick',.47,478,2.37,-.08,-.25,.16],
 ['bag-open','unfold the field satchel','thick fabric, stitched leather flap, wooden toggle and warm paper',.9,288,2.01,.15,.29,.22],
 ['craft-done','bind a handmade friendship bouquet','woven ribbon drawing tight, soft petal rustle and warm sparkle',1.35,626,3.22,.26,-.34,.22],
 ['gift-give','hand a bouquet to a friend','fabric handoff, gentle joined bells and small rising affectionate choir',1.61,492,2.59,.32,.37,.21],
 ['quest-claimed','stamp the daily journal and award acorns','book page stamped with wood, metallic acorn shower and winning tones',1.79,534,2.96,.44,-.29,.21],
 ['friend-wave','greet a friend with animated paw','soft cuff swish and little cheerful reed',.62,410,2.15,.21,.18,.14]
);
const themes={
  melodic:['correct','seed-find','assessment-finish','quest-finish','festival-cheer'],
  parchment:['chat-open','page-turn','map-open','memory-recall'],
  woody:['foot-grass','foot-wood','furniture-place','classroom-door'],
};
function scoreFor(profile,index){
  const [id,,character,duration,pitch,ratio,motion,pan,brightness]=profile;
  const short=duration<.35;
  const bodyD=duration*(short?.91:.8);
  const upperD=duration*.72;
  const fundamental=Math.max(120,pitch);
  const multimodal=themes.woody.includes(id);
  const modal=[{frequency:fundamental*.5,decay:duration*.25,amplitude:.6},
    {frequency:fundamental*(multimodal?1.28:1.72),decay:duration*.33,amplitude:.25},
    {frequency:fundamental*(multimodal?2.48:3.31),decay:duration*.14,amplitude:.08},
    {frequency:fundamental*(multimodal?4.82:5.16),decay:duration*.08,amplitude:.045}];
  const layers=[
    {id:id+'/warm-body',role:'Acoustic material body: tuned timber and warm ceramic modes',
      kind:'modal',start:0,duration:bodyD,gain:multimodal?.105:.075,
      pan:pan,envelope:env(bodyD,.008,.1),modes:modal},
    {id:id+'/glass-swish',role:'Distinct pitched response with pitch bend and soft inharmonic sparkle',
      kind:'fm',start:duration*.08,duration:upperD,gain:.056,
      pan:-pan,envelope:env(upperD,.045,.29),
      frequency:startPoints(upperD,[pitch,pitch*(1+motion)]),
      ratio,index:startPoints(upperD,[brightness*1.7,brightness*.3])},
    {id:id+'/velvet-air',role:'High-frequency soft surface air, no abrasive stock impact',
      kind:'noise',start:duration*.024,duration:duration*.73,gain:multimodal?.018:.012,
      pan:pan*.8,envelope:env(duration*.73,.011,.15),
      cutoff:startPoints(duration*.73,[multimodal?1750:3000,multimodal?840:1440]),filter:'lowpass'},
  ];
  if(!short){
    const delay=duration*.3,d2=duration*.62;
    layers.push({
      id:id+'/answer-bell',role:'Secondary resonator answering from the opposite side of the scene',
      kind:'fm',start:delay,duration:d2,gain:.027,pan:pan>0?-.67:.65,
      envelope:env(d2,.03,d2*.34),
      frequency:startPoints(d2,[pitch*(index%3===0?1.25:1.5),pitch*(index%3===0?1.48:1.92)]),
      ratio:ratio*1.2,index:startPoints(d2,[.45,.08])
    });
  }
  if(duration>1.3){
    const start=duration*.52,d3=duration*.4;
    layers.push({id:id+'/floating-tail',role:'Slow spaced high harmony and stereo decay',
      kind:'modal',start,duration:d3,gain:.017,pan:pan,
      envelope:env(d3,.03,.2),modes:modal.map(m=>({...m,frequency:m.frequency*2,amplitude:m.amplitude*.7}))});
  }
  return {version:1,sampleRate:48000,duration,gain:.74,seed:19234+index*1291,layers};
}
fs.mkdirSync(scoreDir,{recursive:true});fs.mkdirSync(publicDir,{recursive:true});
const session=await call('vision_session',{sessionId});
const expectedRevision=session.revision;
if(!expectedRevision)throw Error('Vision returned no session revision');
const sound={
  purpose:'Every stateful classroom, character, object and learning event receives its own musical-acoustic voice with spatial specificity.',
  audience:'English learners practicing on mobile, tablet and desktop with optional audio, headphones or small phone speakers.',
  identity:'Hand-made miniature bells, felt wood, bloom breath, ceramic glints and warm paper swishes; original compositional gestures with independent envelopes, spectral layers and stereo placement. Never familiar stock taps.',
  references:[{source:'User creative direction, 2026-11-20',principle:'Cute cohesive sonic world, responsive tactile motion, distinct voices for actions',limits:'Never reproduce specific copyrighted game music or sound; no generic sample packs'}],
  assets:[],
  cues:profiles.map((profile,index)=>{
    const [id,event,character,duration]=profile;
    const score=scoreFor(profile,index);
    fs.writeFileSync(path.join(scoreDir,id+'.json'),JSON.stringify(score,null,2)+'\n');
    return {id,event,intent:'Make '+event+' feel physical and delightful without competing with student speech.',
      character,whenSilent:'Muted, hidden tab, untrusted autoplay state, microphone capture, or student selecting silence.',
      visualAlternative:'Matching scale, bloom or position transition remains legible without sound.',
      interruption:'Fade or stop prior member of the same event family; preserve unrelated environmental ownership.',
      repetition:'Variable scheduling through meaningful input; footsteps are gated by contact distance; no unbounded overlapping voices.',
      mixContext:'Low-level side channel beneath recorded speaking; no compulsory backing music.',
      verification:'Play through actual game route, measure peaks and timing, listen on phone and desktop, inspect repeated action comfort.',
      score,beats:[]
    };
  })
};
const defined=await call('vision_define_sound',{sessionId,expectedRevision,design:sound});
let revision=defined.sessionRevision;
if(!revision)throw Error('No retained sound contract revision');
console.log('Vision sound contract defined',sound.cues.length,'cues');
const receipts=[];
for(const profile of profiles){
  const id=profile[0];
  const result=await call('vision_render_sound',{sessionId,expectedRevision:revision,cueId:id,maxWorkingBytes:64*1024*1024,maxPlanBytes:16*1024*1024});
  if(!result?.receipt?.wavPath)throw Error('Vision rendering failed '+id+': '+JSON.stringify(result).slice(0,400));
  revision=result.sessionRevision;
  const destination=path.join(publicDir,id+'.wav');
  fs.copyFileSync(result.receipt.wavPath,destination);
  receipts.push({id,path:'public/audio/wildwood/'+id+'.wav',sha256:result.receipt.metrics.sha256,peakDbFS:result.receipt.metrics.peakDbFS,
    duration:profile[3],layers:scoreFor(profile,0).layers.length,visionReceipt:result.receipt.id});
  console.log('Vision rendered',id,profile[3]+'s',result.receipt.metrics.peakDbFS+' dBFS');
}
fs.writeFileSync(path.join(scoreDir,'manifest.json'),JSON.stringify({sessionId,renderer:'Vision acoustic studio',cues:receipts},null,2)+'\n');
console.log('Vision-authored assets complete',receipts.length);
await client.close();
