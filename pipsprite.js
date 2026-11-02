/* PipSprite: draws the pre-rendered 3D Pip (tools/pip3d -> assets/pip/) into every `.pip` element.
   The game keeps driving Pip as before: pip(state) sets data-s on all .pip elements; this module just watches.
   Outfits: PipSprite.setWear({head:"crown",face:"",neck:"scarf",back:""}).
   Until a state's sheet has loaded (or if images fail / no canvas) the SVG Pip stays visible as before.
   Images come from window.PIP_SPRITES (data URIs, single-file build) or from assets/pip/ (PWA; META.v = file hashes).
   Light on phones: a sheet is loaded only when Pip first needs it (idle/listen/happy/thinking at start), every Pip is
   drawn once per frame, nothing runs while no Pip is on screen, and PipSprite.setQuality("auto"|"full"|"lite"):
   lite = half-resolution sheets (assets/pip/lo/), 8 fps, 1x pixels, unused sheets released. auto picks lite on
   low-memory / data-saver phones, or when drawing turns out slow. */
(function(){
"use strict";
var BASE=(window.PIP_SPRITE_BASE||"assets/pip/"),SCALE=1.2,FIRST=["idle","listen","happy","thinking"];
var META=window.PIP_SPRITE_META||null,IMG={},wear={},els=[],last=0,reduced=false,raf=0,dirty=true;
var want="auto",lite=false,why="",slow=0,cost=[],io=null,ro=null;
try{reduced=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
function weak(){
  var n=navigator,m=n.deviceMemory,c=n.connection;
  if(c&&c.saveData)return "штедња података";
  if(m&&m<=2)return "мало меморије ("+m+" GB)";
  if(n.hardwareConcurrency&&n.hardwareConcurrency<=2)return "спор процесор";
  return "";
}
function hasLo(){return !window.PIP_SPRITES&&!(META&&META.nolo)}
function useLo(){return lite&&hasLo()}
function fps(){return lite?8:(META.fps||12)}
function src(f){
  if(window.PIP_SPRITES&&window.PIP_SPRITES[f])return window.PIP_SPRITES[f];
  var p=(useLo()?"lo/":"")+f,v=META.v&&META.v[p];
  return BASE+p+(v?"?v="+v:"");
}
function img(f){
  var key=(useLo()?"lo/":"")+f,o=IMG[key];
  if(o){o.t=Date.now();return o}
  o=IMG[key]={ok:false,bad:false,el:new Image(),t:Date.now(),lo:useLo()};
  o.el.decoding="async";o.el.onload=function(){o.ok=true;kick()};o.el.onerror=function(){o.bad=true;kick()};
  o.el.src=src(f);
  return o;
}
function layers(anim){
  var a=[],it=META.items;
  ["back","body","neck","face","head"].forEach(function(s){
    if(s==="body"){a.push(META.anims[anim].file);return}
    var id=wear[s];if(id&&it[id]&&it[id].files[anim])a.push(it[id].files[anim]);
  });
  return a;
}
/* a state can be shown when its body sheet is there and every outfit layer has loaded or failed */
function ready(anim){var ok=true;layers(anim).forEach(function(f,i){var o=img(f);if(!(o.ok||o.bad))ok=false});return ok&&img(META.anims[anim].file).ok}
function attach(el){
  var c=document.createElement("canvas");c.className="pip-spr";c.setAttribute("aria-hidden","true");
  el.appendChild(c);
  var st={el:el,c:c,ctx:c.getContext("2d"),s:"",anim:"idle",f:0,done:false,w:0,h:0,on:false,vis:true,rs:true,drawn:""};
  els.push(st);el._pipSpr=st;
  if(io)io.observe(el);if(ro)ro.observe(el);
  return st;
}
function size(st){
  if(!st.rs&&st.w)return true;
  var r=st.el.getBoundingClientRect(),dpr=Math.min(lite?1:2,window.devicePixelRatio||1);
  var w=Math.round(r.width*SCALE),h=Math.round(w*META.frameH/META.frameW);
  if(w<4)return false;
  st.rs=false;
  var cw=Math.round(w*dpr),ch=Math.round(h*dpr);
  if(w!==st.w||h!==st.h||cw!==st.c.width){st.w=w;st.h=h;st.c.width=cw;st.c.height=ch;st.drawn="";
    st.c.style.width=w+"px";st.c.style.height=h+"px";st.c.style.left=Math.round((r.width-w)/2)+"px";
    st.c.style.top=Math.round(r.height-h+(h-r.height)*0.25)+"px"}
  return true;
}
function frameOf(st){
  var a=META.anims[st.anim];
  if(reduced)return a.loop?0:Math.floor(a.frames/2);
  return Math.min(st.f,a.frames-1);
}
function draw(st){
  var a=META.anims[st.anim],fi=frameOf(st),col=fi%a.cols,row=Math.floor(fi/a.cols),x=st.ctx,ls=layers(st.anim);
  var sig=st.anim+fi+"|"+ls.join()+st.c.width+(lite?"l":"");
  if(sig===st.drawn)return;                     /* same picture as last time (held frame, reduced motion): nothing to do */
  st.drawn=sig;
  x.clearRect(0,0,st.c.width,st.c.height);
  ls.forEach(function(f){var o=img(f);if(!o.ok){var b=IMG[(o.lo?"":"lo/")+f];if(b&&b.ok)o=b}   /* quality just changed: the other size until the new one is there */
    if(o.ok){var k=o.lo?0.5:1,W=META.frameW*k,H=META.frameH*k;x.drawImage(o.el,col*W,row*H,W,H,0,0,st.c.width,st.c.height)}});
}
function step(st){
  var s=st.el.dataset.s||"idle";
  if(!META.anims[s])s="idle";
  if(s!==st.s&&ready(s)){st.s=s;st.anim=s;st.f=0;st.done=false}   /* until the new sheet is there, the old one keeps playing */
  else if(!st.s)return;
  else if(!st.done&&!reduced){
    var a=META.anims[st.anim];
    if(st.f<a.frames-1)st.f++;
    else if(a.loop)st.f=0;
    else if(!a.hold&&st.anim!=="idle"&&ready("idle")){st.anim="idle";st.f=0}   /* one-shot finished: back to floating */
    else st.done=true;
  }
  if(!st.on){st.on=true;st.el.classList.add("spr")}
  draw(st);
}
/* new .pip elements, or ones whose innerHTML was redrawn (outfit change): attach / re-append the canvas at once and
   draw the current frame right away, so the flat SVG never flashes. Runs only after the DOM changed. */
function scan(){
  dirty=false;
  var list=document.querySelectorAll(".pip");
  for(var i=0;i<list.length;i++){
    var st=list[i]._pipSpr||attach(list[i]);
    if(st.c.parentNode!==st.el){st.el.appendChild(st.c);st.drawn=""}
    if(!st.on&&size(st)){var s=st.el.dataset.s||"idle";if(!META.anims[s])s="idle";
      if(ready(s)){st.s=s;st.anim=s;st.f=0;st.done=false;st.on=true;st.el.classList.add("spr");draw(st)}}
  }
  els=els.filter(function(st){if(st.el.isConnected)return true;if(io)io.unobserve(st.el);if(ro)ro.unobserve(st.el);return false});
}
function shown(st){return st.vis&&!(st.el.offsetParent===null&&st.el.getClientRects().length===0)}
function loop(t){
  raf=0;
  if(document.hidden)return;                    /* visibilitychange restarts it */
  if(dirty)scan();
  var any=false;
  for(var i=0;i<els.length;i++)if(els[i].vis){any=true;break}
  if(!any&&!dirty)return;                       /* no Pip on screen: sleep until the DOM / visibility changes */
  raf=requestAnimationFrame(loop);
  if(t-last<1000/fps()-2)return;last=t;
  var t0=performance.now();
  els.forEach(function(st){if(shown(st)&&size(st))step(st)});
  measure(performance.now()-t0);
  if(lite&&Math.random()<0.02)release();
}
function kick(){dirty=true;if(!raf&&!document.hidden&&META)raf=requestAnimationFrame(loop)}
/* auto quality: if drawing a frame keeps taking long (old phone), switch to lite once */
function measure(ms){
  if(want!=="auto"||lite)return;
  cost.push(ms);if(cost.length<48)return;
  var avg=cost.reduce(function(a,b){return a+b},0)/cost.length;cost=[];
  if(avg>9){if(++slow>=2)setLite(true,"споро цртање ("+avg.toFixed(1)+" ms)")}else slow=0;
}
/* lite: forget sheets of states not used for a while (they are cached on disk, reloading is quick) */
function release(){
  var now=Date.now(),keep={};
  els.forEach(function(st){layers(st.anim).concat(layers("idle")).forEach(function(f){keep[(useLo()?"lo/":"")+f]=1})});
  Object.keys(IMG).forEach(function(k){if(!keep[k]&&now-IMG[k].t>20000){IMG[k].el.src="";delete IMG[k]}});
}
function setLite(on,reason){
  if(on===lite)return;lite=on;why=reason||"";cost=[];slow=0;
  FIRST.forEach(function(a){img(META.anims[a].file)});
  els.forEach(function(st){st.rs=true;st.drawn=""});kick();
}
function apply(){
  if(!META)return;
  if(want==="full")setLite(false,"изабрано");
  else if(want==="lite")setLite(true,"изабрано");
  else{var w=weak();if(w)setLite(true,w);else if(lite&&why.indexOf("споро")<0)setLite(false,"")}
}
function start(meta){
  META=meta;if(!META||!META.anims||!META.anims.idle)return;
  var c=document.createElement("canvas");if(!c.getContext||!c.getContext("2d"))return;
  apply();
  FIRST.forEach(function(a){img(META.anims[a].file)});
  try{io=new IntersectionObserver(function(es){es.forEach(function(e){var st=e.target._pipSpr;if(st)st.vis=e.isIntersecting});kick()})}catch(e){io=null}
  try{ro=new ResizeObserver(function(es){es.forEach(function(e){var st=e.target._pipSpr;if(st){st.rs=true;st.drawn=""}});kick()})}catch(e){ro=null}
  if(!ro)addEventListener("resize",function(){els.forEach(function(st){st.rs=true});kick()});
  try{new MutationObserver(kick).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["data-s","hidden","class"]})}catch(e){}
  document.addEventListener("visibilitychange",function(){if(!document.hidden)kick()});
  kick();
}
window.PipSprite={
  setWear:function(w){wear=Object.assign({},w||{});
    if(META){layers("idle").forEach(function(f){img(f)});els.forEach(function(st){layers(st.anim).forEach(function(f){img(f)});st.drawn=""});kick()}},
  setQuality:function(q){want=q==="full"||q==="lite"?q:"auto";apply()},
  active:function(){return els.some(function(st){return st.on})},
  /* every sheet of the current quality (for the offline download): [{url, prio}] — the first states first */
  files:function(){
    if(!META||window.PIP_SPRITES)return [];
    var out=[];Object.keys(META.anims).forEach(function(a){
      var p=FIRST.indexOf(a)>=0?3:6;out.push({url:src(META.anims[a].file),prio:p});
      Object.keys(META.items).forEach(function(id){var f=META.items[id].files[a];if(f)out.push({url:src(f),prio:p+1})});
    });
    return out;
  },
  ready:function(){return !!META},
  info:function(){
    var n=0,px=0;Object.keys(IMG).forEach(function(k){var o=IMG[k];if(o.ok){n++;px+=o.el.naturalWidth*o.el.naturalHeight}});
    return {want:want,lite:lite,why:why,fps:META?fps():0,dpr:Math.min(lite?1:2,window.devicePixelRatio||1),sheets:n,mb:Math.round(px*4/1e5)/10,
      running:!!raf,pips:els.length,lo:useLo()};
  },
  start:start
};
if(META)start(META);
else if(window.fetch)fetch(BASE+"pip.json").then(function(r){return r.ok?r.json():null}).then(function(j){if(j)start(j)}).catch(function(){});
})();
