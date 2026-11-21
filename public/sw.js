/* SpeakLab Academy: independently hosted static game with cache-on-use audio. */
const CACHE='speaklab-village-2026-11-20';
const BASE=new URL(self.registration.scope);
const GENERATED_ASSETS=[];
const CORE=[
  './','./index.html','./content.js','./favicon.svg','./manifest.webmanifest',
  './images/friends.webp','./images/library.webp','./images/teamwork.webp',
  './images/market.webp','./images/nature.webp','./images/cinema.webp',
  // Critical tactile sounds are available even on a first offline revisit.
  // The rest of the original sound library is still cached on first use.
  './audio/wildwood/foot-grass.wav','./audio/wildwood/foot-wood.wav',
  './audio/wildwood/hop-takeoff.wav','./audio/wildwood/hop-land.wav',
  './audio/wildwood/tool-equip.wav','./audio/wildwood/peer-hello.wav',
  './audio/wildwood/chat-open.wav','./audio/wildwood/chat-choice.wav',
  './audio/wildwood/page-turn.wav','./audio/wildwood/map-open.wav',
  './audio/wildwood/bag-open.wav','./audio/wildwood/correct.wav',
  './audio/wildwood/try-again.wav','./audio/wildwood/quest-accept.wav',
  './audio/wildwood/berry-pick.wav','./audio/wildwood/net-swish.wav'
];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll([...CORE,...GENERATED_ASSETS].map(path=>new URL(path,BASE).toString()));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('speaklab-village-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{const response=await fetch(request);if(response.ok)await cache.put(new URL('./',BASE).toString(),response.clone());return response;}
      catch{const offline=await cache.match(new URL('./',BASE).toString(),{ignoreVary:true});if(offline)return offline;throw Error('SpeakLab has not been cached on this device yet.');}
    })());
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // cache.addAll() uses a default Fetch Request, while ES modules and
    // stylesheets use destination-specific headers. Some hosts include
    // Vary: Accept/Origin, so matching by Request object rejects an otherwise
    // exact, cached, same-origin asset during offline module boot.
    const hit=await cache.match(request.url,{ignoreVary:true});
    if(hit)return hit;
    const response=await fetch(request);
    if(response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  })());
});
