/* Soft procedural music (v7 part B): Web Audio only, no files. A music box over a soft pad, pentatonic, slow; every phrase is made new
   (motif, its variation, a contrast phrase, chord progressions), so it does not loop. Quiet (about -24 dB), ducks to 30 % while Pip
   speaks, pauses when the page is hidden. index.html decides when it plays (mood / stop) and whether at all (on).
   PipMusic.init({ctx}) ctx = the game's AudioContext (or a function returning it); without one the music makes its own on first use.
   mood("map"|"story"|"party"), stop(), on(bool), speak(bool) (index.html: around every voice clip), state(), level() (tests) */
(function(){
"use strict";
const VOL=.063,DUCK=.3,TICK=350,AHEAD=1.1;   /* -24 dB; the scheduler wakes ~3x a second and plans 1.1 s ahead */
const PENTA=[0,2,4,7,9];
const CH={I:[0,4,7],ii:[2,5,9],IV:[5,9,12],V:[7,11,14],vi:[-3,0,4]};
const PROG=[["I","vi","IV","V"],["I","IV","vi","V"],["I","V","vi","IV"],["vi","IV","I","V"],["I","IV","I","V"],["IV","I","ii","V"],["I","vi","ii","V"]];
/* rhythms of one bar in eighths (0..7); a number of them per mood density */
const RH=[[0,4],[0,2,4],[0,3,4,6],[0,2,4,6],[0,2,3,4,6],[0,4,6],[0,1,2,4],[0,6],[0,2,6]];
const MOODS={
  map:{root:60,bpm:62,dens:[0,1,2,5,7,8],mel:[72,88],padLp:900,pad:.05,bell:.22,bass:0},
  story:{root:65,bpm:56,dens:[0,1,5,7,8,2],mel:[69,84],padLp:700,pad:.06,bell:.2,bass:0},
  party:{root:67,bpm:88,dens:[2,3,4,6,2,3],mel:[74,91],padLp:1300,pad:.035,bell:.24,bass:.16}};
const mtof=m=>440*Math.pow(2,(m-69)/12);
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const GEST=["pointerup","touchend","click","keydown"];let waitG=null;
let A={ctx:null},ctx=null,master=null,duck=null,fx=null,own=false;
let enabled=true,want=null,tr=null,timer=0,talk=0,relT=0,notes=0,ana=null;
const live=new Set();
function getCtx(){
  if(ctx)return ctx;
  let c=typeof A.ctx==="function"?A.ctx():A.ctx;
  /* the game makes its context on the first touch: wait for it (listeners added now run after the game's own), never make a second one */
  if(!c&&A.ctx){if(!waitG){waitG=()=>{if(!(typeof A.ctx==="function"?A.ctx():A.ctx))return;GEST.forEach(t=>document.removeEventListener(t,waitG,true));waitG=null;sync()};
    GEST.forEach(t=>document.addEventListener(t,waitG,true))}return null}
  if(!c){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{c=new AC();own=true}catch(e){return null}
    const go=()=>{if(c.state!=="running"&&!document.hidden){try{c.resume()}catch(e){}}};["pointerdown","keydown","touchend"].forEach(t=>document.addEventListener(t,go,true))}
  ctx=c;
  master=c.createGain();master.gain.value=0;duck=c.createGain();duck.gain.value=talk?DUCK:1;duck.connect(master);master.connect(c.destination);
  /* a soft echo (one delay with a dark feedback loop) gives the music box its room */
  const d=c.createDelay(1),fb=c.createGain(),lp=c.createBiquadFilter(),wet=c.createGain();
  d.delayTime.value=.37;fb.gain.value=.28;lp.type="lowpass";lp.frequency.value=1800;wet.gain.value=.35;
  d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(wet);wet.connect(duck);fx=d;
  return c;
}
const now=()=>ctx?ctx.currentTime:0;
function ramp(p,v,t,tc){try{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.setTargetAtTime(v,t,tc)}catch(e){}}
function voice(oscs,end){const v={oscs,end};live.add(v);oscs[0].onended=()=>live.delete(v);return v}
/* one music-box note: a sine with a quieter octave that fades faster, a soft attack, a long tail */
function bell(t,m,vel,bus){
  const c=ctx,f=mtof(m),g=c.createGain(),o1=c.createOscillator(),o2=c.createOscillator(),g2=c.createGain(),dur=1.9;
  o1.type="sine";o2.type="sine";o1.frequency.value=f;o2.frequency.value=f*2.003;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vel,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  g2.gain.value=.22;g2.gain.setValueAtTime(.22,t);g2.gain.exponentialRampToValueAtTime(.001,t+.5);
  o1.connect(g);o2.connect(g2);g2.connect(g);g.connect(bus);g.connect(fx);
  o1.start(t);o2.start(t);o1.stop(t+dur+.05);o2.stop(t+.55);notes++;voice([o1,o2],t+dur);
}
/* the pad: the chord, two soft triangles per bar through the bar's low-pass filter, slow in and out */
function pad(t,ms,len,cfg,bus){
  const c=ctx,lp=c.createBiquadFilter(),g=c.createGain(),os=[];
  lp.type="lowpass";lp.frequency.value=cfg.padLp;lp.Q.value=.3;
  const a=Math.min(1.4,len*.4),r=1.6;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(cfg.pad,t+a);g.gain.setValueAtTime(cfg.pad,t+len-.2);g.gain.linearRampToValueAtTime(0,t+len+r);
  ms.forEach((m,i)=>{const o=c.createOscillator();o.type="triangle";o.frequency.value=mtof(m);o.detune.value=i%2?4:-4;o.connect(lp);o.start(t);o.stop(t+len+r+.05);os.push(o)});
  lp.connect(g);g.connect(bus);voice(os,t+len+r);
}
function pluck(t,m,vel,bus){
  const c=ctx,o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=mtof(m);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vel,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.45);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+.5);voice([o],t+.5);
}
/* ---- composition: phrases of 4 bars, a section = A A' B A'' (16 bars), then a new section with a new motif and progression ---- */
function scaleNotes(cfg){const out=[];for(let m=cfg.mel[0]-12;m<=cfg.mel[1]+12;m++)if(PENTA.includes(((m-cfg.root)%12+12)%12))out.push(m);return out}
function nearest(arr,m){let b=arr[0];arr.forEach(x=>{if(Math.abs(x-m)<Math.abs(b-m))b=x});return b}
function chordTones(cfg,ch){const base=CH[ch].map(x=>x+cfg.root);const out=[];for(let o=-24;o<=24;o+=12)base.forEach(x=>out.push(x+o));return out}
/* a motif: per bar a rhythm and the steps of a random walk on the pentatonic scale */
function motif(cfg){
  const bars=[];for(let b=0;b<4;b++){const r=rnd(cfg.dens.map(i=>RH[i]));bars.push({r,steps:r.map((_,i)=>i===0?0:rnd([-2,-1,-1,1,1,2,0,1,-1]))})}
  bars[3]={r:rnd([[0],[0,4],[0,2]]),steps:[0,1,-1]};   /* the 4th bar breathes: one long note or two */
  return bars;
}
function vary(mo){return mo.map((b,i)=>i===3?b:{r:b.r,steps:b.steps.map((s,k)=>k&&Math.random()<.35?-s:s)})}
function newSection(t){
  const cfg=t.cfg,A1=motif(cfg),B=motif(cfg);
  t.plan=[A1,vary(A1),B,vary(A1)];t.progs=[rnd(PROG),null,rnd(PROG),null];t.progs[1]=t.progs[0];t.progs[3]=Math.random()<.5?t.progs[0]:rnd(PROG);
  t.center=cfg.mel[0]+Math.floor((cfg.mel[1]-cfg.mel[0])*(.3+Math.random()*.4));
}
function bar(t,when){
  const cfg=t.cfg,beat=60/cfg.bpm,e=beat/2,len=beat*4;
  if(t.bar%16===0)newSection(t);
  const ph=Math.floor(t.bar/4)%4,bi=t.bar%4,mo=t.plan[ph][bi],ch=t.progs[ph][bi],sc=t.sc,ct=chordTones(cfg,ch);
  /* the pad: chord tones around the root (low), the first bar of a section a little louder */
  const padNotes=CH[ch].map(x=>x+cfg.root-12).map(m=>m>cfg.root+2?m-12:m);
  pad(when,padNotes.slice(0,ch==="I"||ch==="IV"?3:2),len,cfg,t.bus);
  if(cfg.bass){pluck(when,CH[ch][0]+cfg.root-24,cfg.bass,t.bus);pluck(when+beat*2,CH[ch][0]+cfg.root-24+(Math.random()<.5?7:12),cfg.bass*.8,t.bus)}
  if(Math.random()<.12&&ph!==0)return;   /* now and then a bar with the pad only */
  let m=nearest(ct.filter(x=>x>=cfg.mel[0]&&x<=cfg.mel[1]),t.last||t.center);
  mo.r.forEach((p,i)=>{
    if(i>0){let k=sc.indexOf(nearest(sc,m))+mo.steps[i];k=Math.max(0,Math.min(sc.length-1,k));m=sc[k]}
    if(m>cfg.mel[1])m-=12;if(m<cfg.mel[0])m+=12;
    if(p===0||p===4)m=Math.random()<.7?nearest(ct,m):m;   /* strong beats lean on the chord */
    const vel=cfg.bell*(p===0?1:p===4?.85:.7)*(.85+Math.random()*.25);
    bell(when+p*e+(Math.random()-.5)*.012,m,vel,t.bus);
  });
  if(bi===3&&ph===3)m=nearest(chordTones(cfg,"I"),t.center);   /* a section ends at home */
  t.last=m;
}
function loop(){
  timer=0;if(!tr||!ctx)return;
  const n=now();
  if(ctx.state==="running"){
    if(tr.next<n)tr.next=n+.08;
    while(tr.next<n+AHEAD){bar(tr,tr.next);tr.next+=60/tr.cfg.bpm*4;tr.bar++}
  }
  timer=setTimeout(loop,TICK);
}
function startTrack(m){
  const c=getCtx();if(!c)return;
  const cfg=MOODS[m],bus=c.createGain();bus.gain.value=0;bus.connect(duck);bus.gain.setTargetAtTime(1,now(),.6);
  tr={m,cfg,bus,bar:0,next:now()+.15,sc:scaleNotes(cfg),last:0,plan:null,progs:null,center:0};
  ramp(master.gain,VOL,now(),.15);
  clearTimeout(timer);loop();
}
function fadeTrack(t,sec){if(!t)return;ramp(t.bus.gain,0,now(),sec/3);setTimeout(()=>{try{t.bus.disconnect()}catch(e){}},sec*1000+1500)}
function halt(){clearTimeout(timer);timer=0}
function killAll(){const t=now();live.forEach(v=>v.oscs.forEach(o=>{try{o.stop(t)}catch(e){}}));live.clear()}
const playing=()=>!!tr&&!!timer;
function sync(){   /* plays what is wanted, if allowed and visible */
  if(!enabled||!want||document.hidden){if(tr&&master){ramp(master.gain,0,now(),.05);halt()}if(own&&ctx&&document.hidden&&ctx.state==="running"){try{ctx.suspend()}catch(e){}}return}
  if(own&&ctx&&ctx.state!=="running"){try{ctx.resume()}catch(e){}}
  if(tr&&tr.m===want){if(!timer){ramp(master.gain,VOL,now(),.2);tr.next=now()+.1;loop()}return}
  const old=tr;tr=null;fadeTrack(old,1.5);startTrack(want);
}
document.addEventListener("visibilitychange",sync);
window.PipMusic={
  init(api){A=Object.assign({},api||{});if(A.onSpeak)try{A.onSpeak(s=>PipMusic.speak(s))}catch(e){}return PipMusic},
  mood(m){if(!MOODS[m])return;want=m;sync()},
  stop(){want=null;halt();const old=tr;tr=null;if(old)fadeTrack(old,1.2)},
  on(v){enabled=!!v;if(!enabled){halt();if(master){const t=now();try{master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(0,t)}catch(e){}}killAll();const old=tr;tr=null;if(old)try{old.bus.disconnect()}catch(e){}}
    else sync()},
  /* true when a voice clip starts, false when it ends (counted, so overlapping clips work); the music comes back a moment after */
  speak(s){talk=Math.max(0,talk+(s?1:-1));if(!duck)return;clearTimeout(relT);
    if(talk)ramp(duck.gain,DUCK,now(),.06);else relT=setTimeout(()=>{if(!talk&&duck)ramp(duck.gain,1,now(),.35)},350)},
  state(){return {on:enabled,mood:want,playing:playing(),track:tr?tr.m:null,duck:duck?+duck.gain.value.toFixed(3):1,talk,live:live.size,notes,tick:TICK,
    vol:master?+master.gain.value.toFixed(4):0,ctx:ctx?ctx.state:"none",own,hidden:document.hidden,bar:tr?tr.bar:0}},
  /* tests: the output level now (rms, peak) */
  level(){if(!ctx||!master)return {rms:0,peak:0};
    if(!ana){ana=ctx.createAnalyser();ana.fftSize=2048;master.connect(ana);const z=ctx.createGain();z.gain.value=0;ana.connect(z);z.connect(ctx.destination)}
    const b=new Float32Array(ana.fftSize);ana.getFloatTimeDomainData(b);let s=0,p=0;for(const x of b){s+=x*x;if(Math.abs(x)>p)p=Math.abs(x)}return {rms:Math.sqrt(s/b.length),peak:p}},
  MOODS
};
})();
