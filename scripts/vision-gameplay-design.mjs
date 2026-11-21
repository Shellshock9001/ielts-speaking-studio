/**
 * Retains the actual playable-game creative direction in Vision, not a theme
 * suggestion. This is the source of the HUD, action loops, input grammar and
 * sound production that the game implementation follows.
 */
import path from 'node:path';
const root='C:/ShellShockHive/Vision';
const {Client}=await import('file:///'+path.join(root,'node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js').replaceAll('\\','/'));
const {StdioClientTransport}=await import('file:///'+path.join(root,'node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js').replaceAll('\\','/'));
const client=new Client({name:'speaklab-playable-world-author',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'engine/server.mjs')],cwd:root}));
const call=async(name,args)=>{
 const result=await client.callTool({name,arguments:args});
 if(result.isError)throw Error(result.content?.find(c=>c.type==='text')?.text||name);
 return result.structuredContent||JSON.parse(result.content.find(c=>c.type==='text').text);
};
const sessionId='15002263-9dc1-4056-908a-00f95724b47d';
const directions=[
 {name:'SpeakLab — Hands-On Living Village Gameplay',
  centralIdea:'One explorable English-speaking village with real action and progression loops instead of a 3D decorative lesson menu. A player uses a continuous PC/gamepad/touch input system to move, gather, fish, catch bugs, plant, water, harvest, craft, gift and learn. Cause, timing, world reaction and saved result matter.',
  composition:'The playful 3D world remains foreground. The bottom of the game holds a real five-slot tool belt labeled with functioning 1–5 shortcuts and 3D tool identities. Lower-left shows directional/thumb controls when appropriate; lower-right exposes context-sensitive Action, Jump and Dodge. Upper-left HUD carries stamina and one actual quest. When teaching opens, tactile notebook sheets emerge without unmounting the world. Icons are in-world materials, not generic settings panels.',
  signatureInteraction:'WASD/arrow: run/walk; Shift: stamina-based sprint; Ctrl: crouch/sneak; Space: physically hop; Alt: evasive burst; E: speak/interact; F: use selected tool with real 3D target; keys 1-5/Tab: equip physical tools; I: bag and craft; Q: field journal/quest; G: give a crafted gift to nearby classmate; M map; J learning storybook; H controls; camera right-drag/wheel, touch orbit/joystick/actions and standard gamepad sticks/buttons. Gathering berries, catching flitting butterflies, timed fishing, multi-stage garden growth, digging treasures and crafting have visible outcomes and retained state. Rotating missions reward varied authentic actions.',
  responsiveTransformation:'Desktop keyboard/mouse/gamepad: context HUD plus readable tool belt, not a virtual mobile-only control screen. Portrait touch: left thumbstick, right action triad and compact tools, no overlap with journal. Landscape tablet: control ribbons and side journal. Full touch and keyboard equivalence for 2D fallback and reduced-motion state. Safe areas and first-interaction audio activation are explicit.',
  visualLanguage:'Handmade storybook village, tactile sculpted clay and warm lacquered tool handles, paper cutout blooms and tool icons, stitched leather bag, embossed wood keycaps, character emotes expressed by model pose. Original whimsical fieldwork vocabulary, no copying existing commercial-game characters, inventory artwork or audio.',
  motionStrategy:'Acceleration, turning, hop arc/landing, low sneaking pose and small dust puffs, dodge follow-through, stamina recovery, camera orbit damping; each gameplay action animates its actual tool and target and triggers a unique Vision-authored sound matched to contact. No full page navigation, fake success, floating labels that claim unsupported actions or repetitive generic click loops.',
  implementationApproach:'One React Three Fiber canvas with deterministic 3D resource nodes, typed actions, owned input state and stateful daily missions; persist world actions, resources and crafted items alongside existing 44 study topics, 11 districts and 51 NPCs. Vision must author the layered score assets for new actions, and the actual control design is implemented/tested. Browser test keyboard/touch/gamepad where possible, action feedback and inventory, focus isolation, muted/locked playback, responsive and 2D fallback.',
  tradeoffs:'First-class complete solo gameplay over unimplemented multiplayer claims. Keep the original progress/import/export and private microphone pipeline. Avoid hollow hotkeys, exploitably unlimited farming and 3D objects that cannot be interacted with. Preserve existing mini-games but create deeper village loops around them.',
  referenceResponse:[
   {requirement:'Screenshot shows D-pad/Explore/Run but user rejects this as a complete game',designAnswer:'A visible control grammar with real action targets and outcomes: D-pad/joystick for movement, stamina sprint, hop, dodge, sneak, camera orbit, toolbelt and practical inventory, quest and crafting flows. Bind all controls and test resulting simulation.'},
   {requirement:'Where are all sounds?',designAnswer:'Author missing jump/land, sprint, roll, tool swing, harvest, catch success/failure, digging, planting, watering, reel, fishing bite, bag open, equip and gifting performances with Vision; activate audio after genuine gesture, save opt-out, stage audio in real action handlers and check output on playback.'},
   {requirement:'Be more addicting and unique',designAnswer:'Loop: explore and spot material → approach using movement/camera → select correct tool → play physical timing/interaction → world reacts → inventory/garden/NPC relationships update → rotating quest and craft reward → new creative place/object. English study challenges remain usable inside this world.'}
  ]
 },
 {name:'Shortcut Bar Without Simulation (rejected alternative)',
  centralIdea:'Add keyboard legends and more menu shortcuts to the old 3D viewer.',
  composition:'More buttons around the same viewport.',signatureInteraction:'WASD, extra menu toggles and simple cosmetic jump.',
  responsiveTransformation:'Shrink labels on mobile.',visualLanguage:'Retain current pastel UI unchanged.',
  motionStrategy:'Button hovers without gameplay consequences.',
  implementationApproach:'Small UI changes only.',
  tradeoffs:'Easy but explicitly fails the demand for a real interactive game.',
  referenceResponse:[{requirement:'User explicitly rejects labels pretending to be actions',designAnswer:'Rejected: no new causal world systems.'}]
 }
];
try{
 const result=await call('vision_submit_directions',{sessionId,directions});
 const ids=result.directionIds||[];
 if(!ids.length)throw Error('Vision did not retain direction IDs');
 const chosen=await call('vision_choose_direction',{sessionId,directionId:ids[0],justification:'Chosen because it connects input to world simulation, 3D object consequences, persistent rewards, authored sensory events and multi-device player experiences. The shortcut-only alternative fails the request.'});
 process.stdout.write(JSON.stringify({sessionId,directions:ids,selected:chosen.chosen?.name,status:chosen.status,revision:chosen.revision||chosen.sessionRevision},null,2)+'\n');
}finally{await client.close()}
