/* SpeakLab Village: independent static-first offline cache. */
const CACHE='speaklab-village-2026-11-20';
const BASE=new URL(self.registration.scope);
const GENERATED_ASSETS=[];
const CORE=[
  './','./index.html','./content.js','./favicon.svg',
  './images/friends.webp','./images/library.webp','./images/teamwork.webp',
  './images/market.webp','./images/nature.webp','./images/cinema.webp',
  './audio/arrival.wav','./audio/bloom.wav','./audio/turn.wav','./audio/celebrate.wav'
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
      catch{const offline=await cache.match(new URL('./',BASE).toString());if(offline)return offline;throw Error('SpeakLab has not been cached on this device yet.');}
    })());
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(request);
    if(hit)return hit;
    const response=await fetch(request);
    if(response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  })());
});
