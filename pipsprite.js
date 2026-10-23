/* PipSprite: draws the pre-rendered 3D Pip (tools/pip3d -> assets/pip/) into every `.pip` element.
   The game keeps driving Pip as before: pip(state) sets data-s on all .pip elements; this module just watches.
   Outfits: PipSprite.setWear({head:"crown",face:"",neck:"scarf",back:""}).
   Until a state's sheet has loaded (or if images fail / no canvas) the SVG Pip stays visible as before.
   Images come from window.PIP_SPRITES (data URIs, single-file build) or from assets/pip/ (PWA). */
(function(){
"use strict";
var BASE=(window.PIP_SPRITE_BASE||"assets/pip/"),SCALE=1.2;
var META=window.PIP_SPRITE_META||null,IMG={},wear={},els=[],tick=0,last=0,reduced=false;
try{reduced=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
function src(f){return (window.PIP_SPRITES&&window.PIP_SPRITES[f])||BASE+f}
function img(f,prio){
  var o=IMG[f];if(o)return o;
  o=IMG[f]={ok:false,bad:false,el:new Image()};
  o.el.decoding="async";o.el.onload=function(){o.ok=true};o.el.onerror=function(){o.bad=true};
  if(prio)o.el.src=src(f);else (window.requestIdleCallback||setTimeout)(function(){o.el.src=src(f)});
  return o;
}
function layers(anim){
  var a=[],it=META.items,order=["back","body","neck","face","head"];
  order.forEach(function(s){
    if(s==="body"){a.push(META.anims[anim].file);return}
    var id=wear[s];if(id&&it[id]&&it[id].files[anim])a.push(it[id].files[anim]);
  });
  return a;
}
function ready(anim){return layers(anim).every(function(f){var o=img(f,true);return o.ok||o.bad})&&img(META.anims[anim].file,true).ok}
function attach(el){
  var c=document.createElement("canvas");c.className="pip-spr";c.setAttribute("aria-hidden","true");
  el.appendChild(c);
  var st={el:el,c:c,ctx:c.getContext("2d"),s:"",anim:"idle",f:0,done:false,w:0,h:0,on:false};
  els.push(st);el._pipSpr=st;return st;
}
function size(st){
  var r=st.el.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  var w=Math.round(r.width*SCALE),h=Math.round(w*META.frameH/META.frameW);
  if(w<4)return false;
  if(w!==st.w||h!==st.h){st.w=w;st.h=h;st.c.width=Math.round(w*dpr);st.c.height=Math.round(h*dpr);
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
  var a=META.anims[st.anim],fi=frameOf(st),col=fi%a.cols,row=Math.floor(fi/a.cols),W=META.frameW,H=META.frameH,x=st.ctx;
  x.clearRect(0,0,st.c.width,st.c.height);
  layers(st.anim).forEach(function(f){var o=IMG[f];if(o&&o.ok)x.drawImage(o.el,col*W,row*H,W,H,0,0,st.c.width,st.c.height)});
}
function step(st){
  var s=st.el.dataset.s||"idle";
  if(!META.anims[s])s="idle";
  if(s!==st.s&&ready(s)){st.s=s;st.anim=s;st.f=0;st.done=false}   /* until the new sheet is there, the old one keeps playing */
  else if(!st.s)return;
  else if(!st.done){
    var a=META.anims[st.anim];
    if(st.f<a.frames-1)st.f++;
    else if(a.loop)st.f=0;
    else if(!a.hold&&st.anim!=="idle"&&ready("idle")){st.anim="idle";st.f=0}   /* one-shot finished: back to floating */
    else st.done=true;
  }
  if(!st.on&&st.s){st.on=true;st.el.classList.add("spr")}
  if(st.on)draw(st);
}
/* new .pip elements, or ones whose innerHTML was redrawn (outfit change): attach / re-append the canvas at once,
   and draw the current frame right away, so the flat SVG never flashes */
function scan(){
  var list=document.querySelectorAll(".pip");
  for(var i=0;i<list.length;i++){
    var st=list[i]._pipSpr||attach(list[i]);
    if(st.c.parentNode!==st.el)st.el.appendChild(st.c);
    if(!st.on&&size(st)){var s=st.el.dataset.s||"idle";if(!META.anims[s])s="idle";
      if(ready(s)){st.s=s;st.anim=s;st.f=0;st.done=false;st.on=true;st.el.classList.add("spr");draw(st)}}
    else if(st.on&&size(st))draw(st);
  }
  els=els.filter(function(st){return st.el.isConnected});
}
var pend=false;
function soon(){if(!pend){pend=true;Promise.resolve().then(function(){pend=false;scan()})}}
function loop(t){
  requestAnimationFrame(loop);
  if(document.hidden||t-last<1000/META.fps-2)return;last=t;tick++;
  scan();
  els.forEach(function(st){if(st.el.offsetParent===null&&st.el.getClientRects().length===0)return;if(size(st))step(st)});
}
function start(meta){
  META=meta;if(!META||!META.anims||!META.anims.idle)return;
  var c=document.createElement("canvas");if(!c.getContext||!c.getContext("2d"))return;
  ["idle","listen","happy","thinking"].forEach(function(a){img(META.anims[a].file,true)});
  Object.keys(META.anims).forEach(function(a){img(META.anims[a].file,false)});
  requestAnimationFrame(loop);
  try{new MutationObserver(soon).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
}
window.PipSprite={
  setWear:function(w){wear=Object.assign({},w||{});if(META)Object.keys(META.anims).forEach(function(a){layers(a).forEach(function(f){img(f,a==="idle")})});
    els.forEach(function(st){if(st.on)draw(st)})},
  active:function(){return els.some(function(st){return st.on})},
  start:start
};
if(META)start(META);
else if(window.fetch)fetch(BASE+"pip.json").then(function(r){return r.ok?r.json():null}).then(function(j){if(j)start(j)}).catch(function(){});
})();
