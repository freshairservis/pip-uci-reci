/* PipOffline: keeps the game's big files (voice clips, 3D Pip sheets) on the phone so it plays without internet.
   The service worker precaches only the small app shell; the clips and sheets are fetched when the game needs them and,
   in the background after start, all the rest (4 at a time, the current planets first) into one long-lived cache.
   Every file has its hash in the URL (?v=...), so after an update only changed files are downloaded again.
     PipOffline.get(url)      -> Promise<Response>: from the cache, else the network (and kept)
     PipOffline.start(list)   -> background download of [{url, prio}] (lower prio first); safe to call again
     PipOffline.state         -> {total, have, failed, busy, done}
     PipOffline.on(fn)        -> fn(state) on every change
   Without CacheStorage (file://, very old browsers) get() is a plain fetch and start() does nothing. */
(function(){
"use strict";
var NAME="pip-assets-v1",C=null,st={total:0,have:0,failed:0,busy:false,done:false},fns=[],queue=[],seen={},run=0,LS="pip.offline";
var ok=typeof caches!=="undefined"&&window.isSecureContext!==false&&location.protocol!=="file:";
function cache(){if(!C)C=caches.open(NAME);return C}
function emit(){fns.forEach(function(f){try{f(st)}catch(e){}})}
function abs(u){return new URL(u,location.href).href}
function get(url){
  if(!ok)return fetch(url);
  var u=abs(url);
  return cache().then(function(c){return c.match(u).then(function(hit){
    if(hit)return hit;
    return fetch(u).then(function(res){if(res&&res.ok){var cl=res.clone();c.put(u,cl).catch(function(){})}return res});
  })}).catch(function(){return fetch(u)});
}
function next(){
  while(run<4&&queue.length){
    var it=queue.shift();run++;
    (function(u){
      cache().then(function(c){return c.match(u).then(function(hit){
        if(hit)return true;
        return fetch(u).then(function(res){if(!res.ok)throw new Error(res.status);return c.put(u,res).then(function(){return true})});
      })}).then(function(){st.have++},function(){st.failed++}).then(function(){run--;
        if(!queue.length&&!run)finish();else next();emit()});
    })(it.url);
  }
}
function finish(){
  st.busy=false;st.done=st.failed===0;
  if(st.done){try{localStorage.setItem(LS,key)}catch(e){}prune()}
  emit();
}
var key="",keep={};
/* drop clips / sheets from older versions that this version no longer uses */
function prune(){cache().then(function(c){return c.keys().then(function(ks){ks.forEach(function(r){if(!keep[r.url])c.delete(r)})})}).catch(function(){})}
function start(list){
  if(!ok||!list||!list.length)return;
  list=list.slice().sort(function(a,b){return a.prio-b.prio});
  keep={};list.forEach(function(it){keep[abs(it.url)]=1});
  var h=2166136261;list.forEach(function(it){for(var i=0;i<it.url.length;i++){h^=it.url.charCodeAt(i);h=Math.imul(h,16777619)}});
  key=String(h>>>0)+":"+list.length;
  var stored="";try{stored=localStorage.getItem(LS)||""}catch(e){}
  if(stored===key){                             /* all there already: check a few, the browser may have cleared space */
    var probe=list.filter(function(){return Math.random()<6/list.length}).slice(0,6);
    cache().then(function(c){return Promise.all(probe.map(function(it){return c.match(abs(it.url))}))}).then(function(r){
      if(r.every(Boolean)){st={total:list.length,have:list.length,failed:0,busy:false,done:true};emit()}
      else{try{localStorage.removeItem(LS)}catch(e){}start(list)}
    }).catch(function(){});
    return;
  }
  var add=list.filter(function(it){var u=abs(it.url);if(seen[u])return false;seen[u]=1;return true});
  st.total=Object.keys(seen).length;st.busy=true;st.done=false;st.failed=0;
  add.forEach(function(it){queue.push({url:abs(it.url)})});
  emit();next();
}
/* a failed download (no internet for a moment): try those again when the phone is back online */
addEventListener("online",function(){if(st.failed&&!st.busy){var l=Object.keys(seen).map(function(u){return {url:u,prio:0}});seen={};st.have=0;start(l)}});
window.PipOffline={get:get,start:start,on:function(f){fns.push(f)},get state(){return st},supported:ok};
})();
