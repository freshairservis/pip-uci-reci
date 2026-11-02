/* G17 „Прочитај и уради“ (v7 part B): read a command, do it in a little scene. Tap commands: tap the item. Drag commands: drag the item onto
   its place (finger follows; a tap on the item and then a tap on the place does the same, for small hands and keyboards). Two-step commands
   need both steps in order. The command is NOT read aloud at first (reading is the task); a tap on Pip or the first mistake: Pip reads it.
   PipDoRead.game(api) returns an object shaped like index.html's GAMES.Gx; index.html registers it as GAMES.G17.
   api: C?, planet(), session(), CASE(), say(k), ph(k), pp(k), gk(b), wait(ms), correct(R,voice), wrong(R,el,o), reduced(), chime? */
(function(){
"use strict";
/* scene layout, in units (u = scene width / 100, also limited by the height): x in % of the width, rows measured from the bottom.
   Places stand on the floor at the back, the things to move lie in front (two rows) — the finger drags upwards */
const ROWS={f:13.5,b:39.5,p:68},MS=25,ME=21,PS=28,PE=26,ZONE=28;
const SLOTS={4:[["b",32],["b",68],["f",15],["f",85]],5:[["b",32],["b",68],["f",15],["f",50],["f",85]]};
const PX=[18,50,82];
/* where a thing sits once it is on / in a place (dy in u above the place's centre) */
const ON={krevet:5,stolica:6,kutija:1,tanjir:3,korpa:2,sto:8,drvo:6,kuca:-2,trava:4,voda:1,pesak:2,kofa:1};
const ART={sto:'<span class="dr-table" aria-hidden="true"></span>'};
const CSS=`
.round.dr17{flex:1;min-height:0;margin:0;gap:8px;padding:0 0 4px;justify-content:center}
.dr-cmd{flex:none;width:100%;max-width:480px;border-radius:22px;background:var(--pad-bg,#fffdf6);color:var(--pad-ink,#2b3170);padding:12px 16px;text-align:center;
  font:700 var(--fs,28px)/1.28 var(--body);box-shadow:0 6px 16px rgba(0,0,0,.35),inset 0 0 0 2px rgba(150,110,60,.22);overflow-wrap:break-word}
.dr-cmd .dn{opacity:.45;transition:opacity .4s}
.dr-cmd .dn::after{content:" ✓";color:#17a673}
.round.lk .dr-cmd{opacity:.92}
.dr-wrap{flex:1;min-height:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.dr-sc{position:relative;flex:none;width:100%;height:300px;border-radius:24px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.35),inset 0 0 0 3px rgba(255,255,255,.35);
  --u:3.2px;--fl:calc(var(--u)*56);touch-action:manipulation;-webkit-user-select:none;user-select:none;contain:layout paint}
.dr-sc::before,.dr-sc::after,.dr-d{content:"";position:absolute;pointer-events:none}
/* room: warm wall with dots, a window, a framed picture, wooden floor, a round rug */
.dr-room{background:radial-gradient(ellipse 44% calc(var(--u)*13) at 50% calc(100% - var(--u)*26),#ffc9d6 0 62%,#ffb3c6 63% 74%,transparent 75%),
  repeating-linear-gradient(90deg,rgba(90,50,20,.13) 0 2px,transparent 2px calc(var(--u)*16.6)) left bottom/100% var(--fl) no-repeat,
  linear-gradient(transparent calc(100% - var(--fl) - var(--u)*2),#fff4e8 0 calc(100% - var(--fl)),#d9a06a 0 calc(100% - var(--fl) + var(--u)*1.4),#e6b27c 0),
  radial-gradient(circle,rgba(255,255,255,.55) 0 calc(var(--u)*.9),transparent calc(var(--u)*1.1)) 0 0/calc(var(--u)*9) calc(var(--u)*9),linear-gradient(#ffe2c6,#ffd3b0)}
.dr-room::before{left:8%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*0);width:calc(var(--u)*24);height:calc(var(--u)*18);border:calc(var(--u)*1.3) solid #fff;border-radius:calc(var(--u)*2);
  background:linear-gradient(90deg,transparent calc(50% - var(--u)*.6),#fff 0 calc(50% + var(--u)*.6),transparent 0),radial-gradient(circle at 75% 30%,#fff6b0 0 calc(var(--u)*2.6),transparent calc(var(--u)*3)),linear-gradient(#8fd3ff,#d8f1ff);box-shadow:0 2px 6px rgba(120,60,20,.25)}
.dr-room::after{right:10%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*2);width:calc(var(--u)*15);height:calc(var(--u)*12);border:calc(var(--u)*1.2) solid #e0a060;border-radius:calc(var(--u)*1);
  background:radial-gradient(circle at 50% 60%,#ff8fa8 0 calc(var(--u)*2.4),transparent calc(var(--u)*2.7)),linear-gradient(#bdf0d6,#e9fff3);box-shadow:0 2px 5px rgba(120,60,20,.25)}
/* kitchen: tiles, a window with a curtain, a chequered floor */
.dr-kitchen{background:linear-gradient(transparent calc(100% - var(--fl) - var(--u)*2.4),#9ed8c8 0 calc(100% - var(--fl)),transparent 0),
  conic-gradient(#e7f7f2 25%,#fff 0 50%,#e7f7f2 0 75%,#fff 0) 0 0/calc(var(--u)*8) calc(var(--u)*8)}
.dr-kitchen .dr-floor{left:0;right:0;bottom:0;height:var(--fl);background:conic-gradient(#f4dfb4 25%,#e9c78f 0 50%,#f4dfb4 0 75%,#e9c78f 0) 0 0/calc(var(--u)*12) calc(var(--u)*12)}
.dr-kitchen::before{left:9%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*0);width:calc(var(--u)*22);height:calc(var(--u)*17);border:calc(var(--u)*1.2) solid #fff;border-radius:calc(var(--u)*1.6);
  background:linear-gradient(90deg,#ff9fb0 0 22%,transparent 0 78%,#ff9fb0 0),linear-gradient(#a7dcff,#e3f5ff);box-shadow:0 2px 6px rgba(0,80,60,.2)}
.dr-kitchen::after{right:12%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*2);width:calc(var(--u)*11);height:calc(var(--u)*11);border-radius:50%;border:calc(var(--u)*1.1) solid #ffb36b;
  background:linear-gradient(90deg,transparent calc(50% - 1px),#2b3170 0 calc(50% + 1px),transparent 0) 50% 20%/100% 35% no-repeat,linear-gradient(transparent calc(50% - 1px),#2b3170 0 calc(50% + 1px),transparent 0) 70% 50%/35% 100% no-repeat,#fff}
/* yard: sky, sun, a cloud, a hill, a fence, grass */
.dr-yard{background:repeating-linear-gradient(90deg,#fff7e6 0 calc(var(--u)*4),transparent 0 calc(var(--u)*7)) left calc(100% - var(--fl) + var(--u)*1)/100% calc(var(--u)*12) no-repeat,
  linear-gradient(transparent calc(100% - var(--fl)),#8fd46b 0 calc(100% - var(--fl) + var(--u)*3),#7fc95d 0),
  radial-gradient(ellipse 70% calc(var(--u)*22) at 15% calc(100% - var(--fl) + var(--u)*2),#a9e38a 0 98%,transparent 100%),
  radial-gradient(ellipse 60% calc(var(--u)*18) at 90% calc(100% - var(--fl) + var(--u)*2),#b8eb9a 0 98%,transparent 100%),linear-gradient(#8fd6ff,#d9f3ff 70%)}
.dr-yard::before{right:8%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*-2);width:calc(var(--u)*16);height:calc(var(--u)*16);border-radius:50%;background:radial-gradient(circle,#fff3a0 0 45%,#ffd54a 46% 62%,rgba(255,213,74,.35) 63%,transparent 71%)}
.dr-yard::after{left:6%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*2);width:calc(var(--u)*30);height:calc(var(--u)*11);
  background:radial-gradient(circle at 30% 65%,#fff 0 calc(var(--u)*5),transparent calc(var(--u)*5.3)),radial-gradient(circle at 55% 45%,#fff 0 calc(var(--u)*6),transparent calc(var(--u)*6.3)),radial-gradient(circle at 78% 68%,#fff 0 calc(var(--u)*4.4),transparent calc(var(--u)*4.7))}
/* sea: sky, sun, the sea on the left, sand on the right and in front */
.dr-sea{background:radial-gradient(ellipse 95% calc(var(--u)*62) at 100% 100%,#f8e3ad 0 97%,#ecd093 98% 99.5%,transparent 100%),
  repeating-linear-gradient(transparent 0 calc(var(--u)*4.4),rgba(255,255,255,.28) calc(var(--u)*4.4) calc(var(--u)*5.1)) left 0 bottom var(--fl)/100% calc(var(--u)*22) no-repeat,
  linear-gradient(transparent calc(100% - var(--fl) - var(--u)*26),#5fc0ea 0 calc(100% - var(--fl) - var(--u)*24),#43aee0 0),linear-gradient(#9fe0ff,#e4f7ff)}
.dr-sea::before{right:10%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*0);width:calc(var(--u)*15);height:calc(var(--u)*15);border-radius:50%;background:radial-gradient(circle,#fff3a0 0 45%,#ffcf40 46% 62%,rgba(255,207,64,.35) 63%,transparent 71%)}
.dr-sea::after{left:8%;bottom:calc(var(--db,calc(var(--u)*86)) + var(--u)*2);width:calc(var(--u)*26);height:calc(var(--u)*10);
  background:radial-gradient(circle at 30% 65%,#fff 0 calc(var(--u)*3.6),transparent calc(var(--u)*3.9)),radial-gradient(circle at 55% 45%,#fff 0 calc(var(--u)*4.6),transparent calc(var(--u)*4.9)),radial-gradient(circle at 78% 66%,#fff 0 calc(var(--u)*3.2),transparent calc(var(--u)*3.5))}
/* things and places */
.dri{position:absolute;left:calc(var(--x)*1% - var(--s)*var(--u)/2);bottom:calc(var(--y)*var(--u) - var(--s)*var(--u)/2);width:calc(var(--s)*var(--u));height:calc(var(--s)*var(--u));
  border:0;background:none;padding:0;margin:0;border-radius:30%;display:grid;place-items:center;color:inherit;-webkit-tap-highlight-color:transparent;z-index:2;cursor:pointer}
.dri .dr-e{position:relative;z-index:1;font:calc(var(--e)*var(--u)*.9)/1 var(--emoji);display:block;filter:drop-shadow(0 calc(var(--u)*.6) calc(var(--u)*.5) rgba(60,40,20,.28))}
.dri .dr-e img.emo{width:calc(var(--e)*var(--u));height:calc(var(--e)*var(--u));vertical-align:top}
.dri::after{content:"";position:absolute;left:18%;right:18%;bottom:4%;height:12%;border-radius:50%;background:rgba(60,40,20,.18)}
.dri.mv{z-index:4;touch-action:none}
.dri.mv.fr{z-index:5}
.dri::before{content:"";position:absolute;inset:-6%;border-radius:50%;opacity:0;transition:opacity .2s,transform .2s;
  background:radial-gradient(circle,rgba(255,236,140,.95) 0 38%,rgba(255,213,74,.45) 56%,transparent 70%)}
.dri.hint::before,.dri.sel::before{opacity:1;animation:drglow 1.2s ease-in-out infinite}
@keyframes drglow{50%{opacity:.55}}
.dr-sc.dg .dri.pl::before{opacity:.0;background:radial-gradient(circle,rgba(255,255,255,.55) 0 50%,transparent 70%);border:calc(var(--u)*.7) dashed rgba(255,255,255,.95);inset:-8%}
.dr-sc.dg.drag .dri.pl::before{opacity:.75}
.dr-sc.dg .dri.pl.hov::before{opacity:1;transform:scale(1.12);background:radial-gradient(circle,rgba(255,240,150,.95) 0 45%,rgba(255,213,74,.5) 62%,transparent 72%);border-color:#ffd54a;animation:none}
.dr-sc.dg .dri.pl.hint::before{opacity:1;border-color:#ffd54a;background:radial-gradient(circle,rgba(255,236,140,.9) 0 40%,transparent 70%)}
.dri.mv.drag{z-index:9;transition:none!important}
.dri.mv.drag .dr-e{filter:drop-shadow(0 calc(var(--u)*2) calc(var(--u)*1.4) rgba(40,20,0,.35))}
.dri.mv.drag::after,.dri.on::after{opacity:0}
.dri.mv.back{transition:transform .32s cubic-bezier(.3,1.4,.5,1)}
.dri.mv.set{transition:transform .28s ease-out}
.dri.on{z-index:3;pointer-events:none}
.dri.ok .dr-e{animation:drok .5s ease-out}
@keyframes drok{40%{transform:scale(1.22)}}
.dri.wiggle .dr-e{animation:wig .4s}
.dri.hop .dr-e{animation:drhop .35s ease-out}
@keyframes drhop{40%{transform:translateY(-12%)}}
.dri.dim{opacity:.5}
.round.lk .dri{cursor:default}
.dr-table{display:block;width:calc(var(--e)*var(--u));height:calc(var(--e)*var(--u)*.72);margin-top:calc(var(--e)*var(--u)*.2);border-radius:calc(var(--u)*1.2) calc(var(--u)*1.2) 0 0;
  background:linear-gradient(#c98a4f,#a96a35) 0 0/100% 24% no-repeat,linear-gradient(#94592b,#94592b) 12% 100%/11% 78% no-repeat,linear-gradient(#94592b,#94592b) 88% 100%/11% 78% no-repeat,
  linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)) 50% 24%/100% 6% no-repeat}
.dr-i-trava::after{left:-4%;right:-4%;bottom:6%;height:24%;background:radial-gradient(ellipse at 50% 60%,#5fbf45 0 55%,#77cf58 56% 68%,transparent 70%)}
.dr-hand{position:fixed;left:0;top:0;width:64px;height:64px;pointer-events:none;z-index:72;transition:transform 1s cubic-bezier(.4,0,.2,1),opacity .3s}
.dr-hand i{display:block;font:normal 56px/64px var(--emoji);text-align:center;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45))}
.dr-hand b{position:absolute;left:12px;top:-14px;width:40px;height:40px;border-radius:50%;background:rgba(255,236,140,.75);box-shadow:0 0 14px rgba(255,213,74,.9);opacity:0;transition:opacity .25s}
.dr-hand.dn b{opacity:1}
@media (prefers-reduced-motion:reduce){.dri.mv.back,.dri.mv.set,.dr-hand{transition:none!important}.dri::before{animation:none!important}}
`;
function css(){if(document.getElementById("pipDoReadCss"))return;const s=document.createElement("style");s.id="pipDoReadCss";s.textContent=CSS;document.head.appendChild(s)}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function wpick(a,wt){let t=0;const w=a.map(x=>{const v=Math.max(.01,wt(x));t+=v;return v});let r=Math.random()*t;for(let i=0;i<a.length;i++){r-=w[i];if(r<=0)return a[i]}return a[a.length-1]}

function game(api){
  css();
  const C=api.C||window.PIP_CONTENT,DR=C.doread,SC=DR.scenes;
  const recent=[];let saidSes=null,dragSes=null,lastSc="";
  const up=()=>(api.CASE?api.CASE():"up")==="up";
  const reduced=()=>api.reduced?api.reduced():false;
  const need=R=>R.step===0?{a:R.cmd.a,to:R.cmd.to}:{a:R.cmd.a2,to:R.cmd.to2};
  const el=(R,id)=>R.el&&R.el.querySelector(`[data-it="${id}"]`);
  const sel=id=>`#dr17 [data-it="${id}"]`;
  /* the command, split at the comma of a two-step command so the done half can be marked */
  function cmdHTML(R){
    const s=up()?R.cmd.s.toUpperCase():R.cmd.s;
    const parts=R.cmd.a2?(()=>{const i=s.indexOf(", ");return i>0?[s.slice(0,i+1),s.slice(i+2)]:[s]})():[s];
    return parts.map((p,i)=>`<span data-k="${i}">${esc(p)}</span>`).join(" ");
  }
  const fsz=R=>{const n=R.cmd.s.length,k=up()?1:1.08;return Math.round((n>44?22:n>32?24:n>20?26:30)*k)};

  function pick(R,force){   /* force (tests): a command or its sentence */
    const pl=api.planet(),all=DR.cmds.filter(c=>c.pl<=pl&&SC[c.sc]);
    let pool=all.filter(c=>!recent.includes(c.s));if(!pool.length)pool=all.length?all:DR.cmds;
    if(R.demo){const t=pool.filter(c=>!c.to);if(t.length)pool=t}   /* the "show me" round is a tap command: the hand taps the answer */
    const own=pool.filter(c=>c.pl===pl),src=own.length&&Math.random()<.7?own:pool;
    const top=Math.max(...src.map(c=>c.pl));
    const fc=force&&(typeof force==="string"?DR.cmds.find(c=>c.s===force):force);
    const cmd=fc||wpick(src,c=>(c.sc===lastSc?.4:1)*(pl>10&&c.pl>=top-2?2:1));
    recent.push(cmd.s);if(recent.length>5)recent.shift();lastSc=cmd.sc;
    R.cmd=cmd;R.sc=SC[cmd.sc];R.drag=!!cmd.to;R.step=0;R.sel=null;R.on={};R.rh=0;R.letters=R.letters||[];
    /* the things to move go to the front slots in a new order each time; the places keep theirs */
    const mv=R.sc.items.filter(x=>!x.place),slots=SLOTS[mv.length]||SLOTS[5];
    R.pos={};shuffle(mv).forEach((x,i)=>{const s=slots[i%slots.length];R.pos[x.id]={x:s[1],y:ROWS[s[0]],row:s[0]}});
    R.sc.items.filter(x=>x.place).forEach((x,i)=>{R.pos[x.id]={x:PX[i%3],y:ROWS.p,row:"p"}});
  }
  function itemHTML(R,x){
    const p=R.pos[x.id],s=x.place?PS:MS,e=x.place?PE:ME;
    return `<button type="button" class="dri ${x.place?"pl":"mv"}${p.row==="f"?" fr":""} dr-i-${x.id}" data-id="it_${x.id}" data-it="${x.id}" aria-label="${esc(x.w.toLowerCase())}" style="--x:${p.x};--y:${p.y};--s:${s};--e:${e}">${ART[x.id]||`<span class="dr-e" aria-hidden="true">${x.e}</span>`}</button>`;
  }
  /* the command and the scene stay together, centred: the scene is as wide as the stage and gets the height left under the command
     (at most 1.3x its width); u = the size unit (both directions must fit). The window / sun sit lower in a short scene (--db) */
  function layout(R){
    const w=R.wrap;if(!w||!w.isConnected)return;
    const W=w.clientWidth,H=w.clientHeight-R.cmdEl.offsetHeight-10;if(!W||H<=0)return;
    const h=Math.floor(Math.min(H,W*1.3)),u=Math.min(W/100,h/90,5.4);
    const sc=R.el;sc.style.height=h+"px";sc.style.setProperty("--u",u.toFixed(3)+"px");sc.style.setProperty("--db",Math.round(Math.max(72*u,Math.min(86*u,h-21*u)))+"px");R.u=u;
  }
  /* finger hit test: the nearest place whose centre is within ZONE units of the point */
  function placeAt(R,x,y){
    let best=null,bd=1e9;const lim=ZONE*R.u;
    R.el.querySelectorAll(".dri.pl").forEach(p=>{const r=p.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(x-cx,y-cy);if(d<lim&&d<bd){bd=d;best=p}});
    return best;
  }
  function hov(R,p){R.el.querySelectorAll(".dri.pl.hov").forEach(e=>{if(e!==p)e.classList.remove("hov")});if(p)p.classList.add("hov")}
  function slideBack(b){b.classList.remove("drag","sel");b.classList.add("back");b.style.transform="";setTimeout(()=>b.classList.remove("back"),380)}
  /* the thing moves onto the place: its base position becomes the place's, the transform carries it from where it is now */
  function settle(R,b,p){
    const id=b.dataset.it,pid=p.dataset.it,pp=R.pos[pid],r0=b.getBoundingClientRect();
    b.classList.remove("drag","sel","hint","back");b.style.transition="none";b.style.transform="";
    b.style.setProperty("--x",pp.x);b.style.setProperty("--y",pp.y+(ON[pid]||3));
    const r1=b.getBoundingClientRect();
    b.style.transform=`translate(${Math.round(r0.left+r0.width/2-(r1.left+r1.width/2))}px,${Math.round(r0.top+r0.height/2-(r1.top+r1.height/2))}px)`;
    void b.offsetWidth;b.style.transition="";b.classList.add("set","on");b.style.transform="scale(.82)";
    setTimeout(()=>b.classList.remove("set"),340);
    R.on[id]=pid;p.classList.remove("hov","hint");
  }
  /* a drop (by dragging or tap-then-tap): right thing on the right place = the step is done; a wrong place = a mistake; nowhere = no mistake */
  function drop(R,b,p){
    hov(R,null);R.el.classList.remove("drag");
    if(!p){slideBack(b);return}
    const n=need(R),id=b.dataset.it;
    if(id===n.a&&p.dataset.it===n.to){
      settle(R,b,p);R.sel=null;R.step++;
      if(R.cmd.a2&&R.step===1){
        const s0=R.cmdEl.querySelector('[data-k="0"]');if(s0)s0.classList.add("dn");
        R.el.querySelectorAll(".dri.hint").forEach(e=>e.classList.remove("hint"));if(api.chime)api.chime();
        return}
      b.classList.add("ok");api.correct(R,()=>api.pp(api.gk("pp_did_it")));return;
    }
    slideBack(b);R.sel=null;
    setTimeout(()=>{if(!b.classList.contains("drag")){b.classList.add("wiggle");setTimeout(()=>b.classList.remove("wiggle"),450)}},330);
    api.wrong(R,null);
  }
  /* drag with pointer events (mouse, pen, touch): the finger keeps its grip point on the thing, the thing grows a little */
  function bindDrag(R){
    const sc=R.el;let D=null;
    const end=(e,cancel)=>{
      if(!D||(e&&e.pointerId!==D.id))return;const d=D;D=null;
      try{d.b.releasePointerCapture(d.id)}catch(x){}
      if(!d.moved)return;
      R.dragT=performance.now();
      if(cancel||R.locked||R.done){hov(R,null);sc.classList.remove("drag");slideBack(d.b);return}
      drop(R,d.b,placeAt(R,d.lx,d.ly));
    };
    sc.addEventListener("pointerdown",e=>{
      const b=e.target.closest(".dri.mv");
      if(D||!b||!R.drag||R.locked||R.done||b.classList.contains("on")||(e.pointerType==="mouse"&&e.button!==0))return;
      D={b,id:e.pointerId,x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};
      try{b.setPointerCapture(e.pointerId)}catch(x){}
    });
    sc.addEventListener("pointermove",e=>{
      if(!D||e.pointerId!==D.id)return;
      const dx=e.clientX-D.x0,dy=e.clientY-D.y0;D.lx=e.clientX;D.ly=e.clientY;
      if(!D.moved){if(Math.hypot(dx,dy)<8)return;D.moved=true;D.b.classList.remove("back","sel","hop");D.b.classList.add("drag");sc.classList.add("drag");R.sel=null;
        sc.querySelectorAll(".dri.sel").forEach(x=>x.classList.remove("sel"))}
      e.preventDefault();
      D.b.style.transform=`translate(${Math.round(dx)}px,${Math.round(dy)}px) scale(1.14)`;
      hov(R,placeAt(R,e.clientX,e.clientY));
    });
    sc.addEventListener("pointerup",e=>end(e,false));
    sc.addEventListener("pointercancel",e=>end(e,true));
    sc.addEventListener("lostpointercapture",e=>{if(D&&e.pointerId===D.id&&D.moved)end(e,false)});
    R.cancelDrag=()=>{if(D)end({pointerId:D.id},true)};
  }
  /* the first drag round of a session: a hand shows the gesture (from the front row up to the places), not the answer */
  async function dragHand(R){
    const sc=R.el;if(!sc||!sc.isConnected)return;
    const r=sc.getBoundingClientRect(),u=R.u,h=document.createElement("div");
    const x0=r.left+r.width*.5,y0=r.bottom-ROWS.f*u,x1=r.left+r.width*.5,y1=r.bottom-ROWS.p*u;
    const mv=(x,y)=>{h.style.transform=`translate(${Math.round(x-32)}px,${Math.round(y-6)}px)`};
    h.className="dr-hand";h.innerHTML="<b></b><i>👆</i>";h.setAttribute("aria-hidden","true");h.style.transition="none";mv(x0,y0);document.body.appendChild(h);void h.offsetWidth;
    try{
      if(reduced()){h.classList.add("dn");await api.wait(500);mv(x1,y1);await api.wait(700);return}
      h.style.transition="";await api.wait(150);h.classList.add("dn");await api.wait(300);mv(x1,y1);await api.wait(1050);h.classList.remove("dn");await api.wait(250);
    }finally{h.remove()}
  }
  const GM={
    pick,
    build(R){
      return `<div class="round dr17" id="dr17"><div class="dr-wrap"><div class="dr-cmd" id="drCmd" style="--fs:${fsz(R)}px">${cmdHTML(R)}</div>
        <div class="dr-sc dr-${R.sc.bg}${R.drag?" dg":""}" data-bg="${R.sc.bg}">${R.sc.bg==="kitchen"?'<i class="dr-d dr-floor"></i>':""}${[...R.sc.items.filter(x=>!x.place),...R.sc.items.filter(x=>x.place)].map(x=>itemHTML(R,x)).join("")}</div></div></div>`;
    },
    mount(R){
      const rd=document.getElementById("dr17");if(!rd)return;
      R.wrap=rd.querySelector(".dr-wrap");R.el=rd.querySelector(".dr-sc");R.cmdEl=rd.querySelector(".dr-cmd");
      layout(R);
      if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!R.wrap.isConnected){ro.disconnect();return}layout(R)});ro.observe(R.wrap);ro.observe(R.cmdEl)}
      else{const f=()=>{if(!R.wrap.isConnected){removeEventListener("resize",f);return}layout(R)};addEventListener("resize",f)}
      bindDrag(R);
    },
    async prompt(R){
      const ses=api.session();
      if(saidSes!==ses){saidSes=ses;await api.ph("i_doread")}else await api.wait(300);
      if(R.drag&&dragSes!==ses){dragSes=ses;await api.ph("i_doread_drag");await dragHand(R)}
    },
    async replay(R){await api.ph("i_doread");if(R.drag)await api.ph("i_doread_drag")},
    /* a tap on Pip (index.html's tapPip) or the first mistake: Pip reads the command */
    async read(R){R.rh=1;await api.ph("i_doread_help");await api.say("d:"+R.cmd.s)},
    free(R,b){return !!(R.dragT&&performance.now()-R.dragT<600&&b.closest&&b.closest("#dr17"))},   /* the click that ends a drag is not a tap */
    tap(R,b){
      const id=b.dataset.it;if(!id||b.classList.contains("on"))return;
      if(!R.drag){
        if(id===R.cmd.a){b.classList.add("ok");correctTap(R)}else wrongTap(R,b);
        return;
      }
      if(b.classList.contains("mv")){   /* tap a thing: it is picked up (a tap on the same thing puts it down) */
        const was=R.sel===id;R.el.querySelectorAll(".dri.sel").forEach(e=>e.classList.remove("sel"));R.sel=was?null:id;
        if(!was){b.classList.add("sel");b.classList.remove("hop");void b.offsetWidth;b.classList.add("hop")}
        return;
      }
      if(R.sel){const s=el(R,R.sel);if(s){drop(R,s,b);return}}
      b.classList.remove("hop");void b.offsetWidth;b.classList.add("hop");
    },
    async help(R,lv,fast){
      if(!R.rh){if(fast)await api.wait(200);await GM.read(R)}
      else{if(!fast)await api.ph(lv>=2?"h_almost":"h_try");await api.say("d:"+R.cmd.s)}
    },
    hint(R){
      if(!R.el)return;const n=need(R);if(!n.a)return;
      const a=el(R,n.a);if(a)a.classList.add("hint");
      if(R.drag){const p=el(R,n.to);if(p)p.classList.add("hint")}
    },
    onLock(R,on){if(on&&R.cancelDrag)R.cancelDrag()},
    /* the test hook: what to tap now (a drag command: the thing, or its place once the thing is picked up) */
    ans(R){
      if(!R||!R.cmd||R.done)return null;const n=need(R);if(!n.a)return null;
      if(!R.drag)return sel(n.a);
      return R.sel===n.a?sel(n.to):sel(n.a);
    },
    drag(R){if(!R||!R.cmd||!R.drag||R.done)return null;const n=need(R);return n.a?{a:sel(n.a),to:sel(n.to),step:R.step}:null},
  };
  function correctTap(R){api.correct(R,()=>api.pp(api.gk("pp_did_it")))}
  function wrongTap(R,b){api.wrong(R,b)}
  return GM;
}
window.PipDoRead={game,version:1};
})();
