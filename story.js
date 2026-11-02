/* Pip's story (SPEC-v5 part B): first() = the intro cartoon on the very first start, chapter(n) = a short chapter after
   each galaxy (2..6). A small interactive cartoon, not a video: the real 3D Pip (.pip elements, upgraded by pipsprite.js),
   CSS-drawn scenes, Twemoji (emoji.js swaps emoji text), transform/opacity animations only. The game hands over what it
   shares with PipStory.init(api); the save goes through window.__pip (S, save). Every call returns a promise that never
   rejects: a skip or an error just ends the story (result.skipped). */
(function(){
"use strict";
let A={},K=1,R=null,TMN=0;const LOG=[];
const STOP={stop:1},u=n=>`calc(var(--u)*${n})`,P=(x,y)=>`translate(${u(x)},${u(y)})`;
const TXT=k=>((window.PIP_CONTENT||{}).pip_phrases||{})[k]||"";
const RM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const LITE=()=>document.documentElement.classList.contains("lite");
const S=()=>window.__pip.S,SAVE=()=>{try{window.__pip.save()}catch(e){}};
const rnd=n=>Math.floor(Math.random()*n),shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
/* stage units (u): the stage is 100u x 177.8u (9:16), centred; --u is set from the screen size */
const PY=121,PS=32,PH=PS*1.08;                    /* Pip's feet line and size */
const sy=x=>226-Math.sqrt(12100-(x-50)*(x-50));    /* the planet's surface: a circle r=110u, top at 116u */
const FR=[[8,190],[23,60],[77,235],[92,275]];      /* friends: x, hue-rotate */
const READ=["СОК","ЛОПТА","КРОФНА","ЧОКОЛАДА"],START=[1,2,4,6,8];
const ONE={happy:1,wave:1,giggle:1,eat:1,yum:1,yuck:1};   /* one-shot sprite states: set idle first to replay */
const STAR="polygon(50% 0%,62% 36%,100% 36%,69% 58%,80% 94%,50% 72%,20% 94%,31% 58%,0% 36%,38% 36%)";
const CF=["#ffd54a","#7ee0b5","#ff9ec7","#6bc7ff","#b48cff"];
const TITLES={1:"Књига са неба",2:"Позив кући",3:"Мала слова",4:"Пипова књига",5:"Писмо са загонеткама",6:"Повратак кући"};

const CSS=`
.pst{position:fixed;inset:0;z-index:64;overflow:hidden;--u:3.6px;color:#f3f5ff;font-family:var(--body,"Andika",sans-serif);
  background:radial-gradient(ellipse 90% 45% at 50% 100%,rgba(120,80,220,.35),transparent 70%),linear-gradient(180deg,#070a2a 0%,#111850 55%,#22195c 100%);
  -webkit-user-select:none;user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.pst *{box-sizing:border-box}.pst [hidden]{display:none!important}
:where(.pst) button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pst img.emo{width:1.1em;height:1.1em;vertical-align:-.16em;display:inline-block;object-fit:contain;pointer-events:none}
.pst .pip{position:relative;width:var(--ps);height:calc(var(--ps)*1.08);flex:none}
.pst .pip svg{width:100%;height:100%;overflow:visible;display:block}
.pst .pip canvas.pip-spr{position:absolute;pointer-events:none}
.pst .pip.spr svg>:not(.zz){visibility:hidden}
.pst-sky{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(1.6px 1.6px at 22px 38px,rgba(255,255,255,.8),transparent),radial-gradient(1px 1px at 120px 92px,rgba(255,255,255,.6),transparent),radial-gradient(1.3px 1.3px at 76px 132px,rgba(255,236,250,.6),transparent),radial-gradient(1px 1px at 160px 20px,rgba(255,255,255,.7),transparent);background-size:170px 170px}
.pst-sky i{position:absolute;width:7px;height:7px;background:#fff6d0;clip-path:${STAR};animation:pst-tw 2.4s ease-in-out infinite alternate}
.pst-sky b{position:absolute;left:0;right:0;top:calc(var(--sh)*-1);height:calc(var(--sh)*2);display:none;background-image:radial-gradient(2px 2px at 30px 40px,#fff,transparent),radial-gradient(1.5px 1.5px at 130px 100px,#fff,transparent),radial-gradient(2px 2px at 84px 150px,#cfe0ff,transparent);background-size:170px 170px}
.pst-fly .pst-sky b{display:block;animation:pst-str 1.4s linear infinite}
.pst-st{position:absolute;left:50%;top:50%;width:${u(100)};height:${u(177.78)};margin:${u(-88.89)} 0 0 ${u(-50)}}
.pst-fb,.pst-land,.pst-fx,.pst-ui{position:absolute;inset:0;pointer-events:none}
.pst-fb{z-index:1}.pst-land{z-index:2}.pst-pw{z-index:4}.pst-fx{z-index:5}.pst-ui{z-index:6}.pst-bub{z-index:7}
.pst-st button{pointer-events:auto}
.pst-gr{position:absolute;left:${u(-60)};top:${u(116)};width:${u(220)};height:${u(220)};border-radius:50%;
  background:radial-gradient(circle at 50% 5%,#a585f2 0,#7d57da 11%,#5d39b0 28%,#3e2580 52%);box-shadow:0 0 ${u(8)} rgba(170,130,255,.5),inset 0 ${u(1)} 0 rgba(255,255,255,.25)}
.pst[data-g=sea] .pst-gr{background:radial-gradient(circle at 50% 5%,#b9f6f2 0,#5fd3dc 11%,#2f97bd 28%,#1e5d8e 52%);box-shadow:0 0 ${u(8)} rgba(110,230,240,.45),inset 0 ${u(1)} 0 rgba(255,255,255,.3)}
.pst[data-g=forest] .pst-gr{background:radial-gradient(circle at 50% 5%,#c4f59a 0,#6fcf62 11%,#3a9a4c 28%,#245e37 52%);box-shadow:0 0 ${u(8)} rgba(150,240,140,.4),inset 0 ${u(1)} 0 rgba(255,255,255,.3)}
.pst[data-g=gold] .pst-gr{background:radial-gradient(circle at 50% 5%,#ffe29a 0,#c98bd9 10%,#7a3fa8 26%,#43206e 52%);box-shadow:0 0 ${u(8)} rgba(255,210,120,.45),inset 0 ${u(1)} 0 rgba(255,240,200,.35)}
.pst-gr i{position:absolute;border-radius:50%;background:rgba(10,0,40,.2);box-shadow:inset 0 ${u(.8)} 0 rgba(255,255,255,.12)}
.pst-gr i:nth-child(1){left:${u(70)};top:${u(9)};width:${u(13)};height:${u(4.6)}}
.pst-gr i:nth-child(2){left:${u(126)};top:${u(15)};width:${u(18)};height:${u(6)}}
.pst-gr i:nth-child(3){left:${u(94)};top:${u(36)};width:${u(24)};height:${u(8)}}
.pst-gr i:nth-child(4){left:${u(64)};top:${u(44)};width:${u(12)};height:${u(4.4)}}
.pst-gr i:nth-child(5){left:${u(142)};top:${u(46)};width:${u(11)};height:${u(4)}}
.pst-fr{position:absolute;width:${u(17)}}
.pst-far{position:absolute;left:${u(79)};top:${u(50)};width:${u(10)};height:${u(10)};border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffd9a8,#f08a5d 60%,#a8483a);opacity:.85}
.pst-far::after{content:"";position:absolute;left:${u(-4.5)};top:${u(3.6)};width:${u(19)};height:${u(3)};border-radius:50%;border:${u(.7)} solid rgba(255,225,190,.75);transform:rotate(-16deg)}
.pst-q{position:absolute;left:50%;top:${u(-9)};width:${u(8.5)};height:${u(8.5)};margin-left:${u(-4.25)};border-radius:50%;background:#fffdf6;color:#2b3170;
  font:700 ${u(6)}/${u(8.5)} var(--head,"Rubik",sans-serif);text-align:center;box-shadow:0 ${u(.6)} 0 rgba(0,0,0,.25);animation:pst-pop .5s backwards,pst-bob 1.3s ease-in-out .5s infinite alternate}
.pst-pw{position:absolute;left:${u(50-PS/2)};top:${u(PY-PH)};width:${u(PS)};height:${u(PH)};cursor:pointer}
.pst-ring{position:absolute;left:50%;top:56%;width:${u(42)};height:${u(42)};margin:${u(-21)};border-radius:50%;border:${u(.9)} solid #ffd54a;box-shadow:0 0 ${u(4)} rgba(255,213,74,.55),inset 0 0 ${u(4)} rgba(255,213,74,.3);opacity:0;pointer-events:none}
.pst-pw.pst-on .pst-ring{animation:pst-ring 1s ease-in-out infinite alternate}
.pst-row>.pst-on{z-index:2}
.pst-on::after{content:"";position:absolute;inset:${u(-1.8)};border-radius:inherit;border:${u(.8)} solid #ffd54a;box-shadow:0 0 ${u(3)} rgba(255,213,74,.6);animation:pst-ring 1s ease-in-out infinite alternate;pointer-events:none}
.pst-pw.pst-on::after{display:none}
.pst-bub{position:absolute;left:${u(5)};right:${u(5)};top:${u(16)};background:#fffdf6;color:#2b3170;border-radius:${u(6)};padding:${u(3)} ${u(5)};text-align:center;
  box-shadow:0 ${u(1.2)} 0 rgba(0,0,0,.25);opacity:0;transition:opacity .25s;pointer-events:none}
.pst-bub.on{opacity:1}
.pst-bub p{margin:0;font:500 clamp(17px,${u(5.4)},34px)/1.3 var(--head,"Rubik",sans-serif)}
.pst-bub::after{content:"";position:absolute;left:var(--tx,50%);bottom:${u(-2.2)};width:${u(5)};height:${u(5)};margin-left:${u(-2.5)};background:inherit;transform:rotate(45deg);border-radius:0 0 ${u(1)} 0}
.pst-bub.fr{background:#ffe3f2}
.pst-bub.big p{font:700 clamp(30px,${u(10)},64px)/1.15 var(--body,"Andika",sans-serif);letter-spacing:.1em;padding-left:.1em}
.pst-top{position:absolute;left:0;right:0;top:0;z-index:9;display:flex;align-items:flex-start;gap:8px;padding:max(10px,env(safe-area-inset-top,0px)) max(10px,env(safe-area-inset-right,0px)) 0 max(10px,env(safe-area-inset-left,0px));pointer-events:none}
.pst-top>*{pointer-events:auto}
.pst-skip{margin-left:auto;min-height:44px;min-width:96px;padding:0 16px;border-radius:22px;border:1.5px solid rgba(243,245,255,.3);background:rgba(10,14,50,.55);color:#a3abd6;font:500 15px var(--head,"Rubik",sans-serif)}
.pst-skip.arm{border-color:#ffd54a;color:#ffd54a;background:rgba(10,14,50,.85)}
.pst-note{max-width:calc(100% - 124px);background:rgba(10,14,50,.88);border:1.5px solid #ffd54a;border-radius:14px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;font:500 14px/1.3 var(--head,"Rubik",sans-serif)}
.pst-note button{min-height:44px;border:0;border-radius:12px;background:#ffd54a;color:#0e1238;font:700 15px var(--head,"Rubik",sans-serif);padding:0 10px}
.pst-hand{position:absolute;z-index:8;pointer-events:none;font-size:48px;line-height:1;animation:pst-hand .8s ease-in-out infinite}
/* props */
.pst-row{position:absolute;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:${u(4.5)};transform:translateY(-50%)}
.pst-pop{animation:pst-pop .5s cubic-bezier(.3,1.5,.5,1) backwards}
.pst-cb{position:relative;width:${u(27)};height:${u(27)};border-radius:50%;border:${u(.6)} solid rgba(255,255,255,.75);padding:0;display:grid;place-items:center;font-size:${u(13)};line-height:1;
  background:radial-gradient(circle at 30% 26%,rgba(255,255,255,.95) 0 7%,rgba(255,255,255,.16) 10% 34%,rgba(126,224,181,.22) 62%,rgba(255,158,199,.4) 100%);box-shadow:inset ${u(-1)} ${u(-1.4)} ${u(3)} rgba(107,199,255,.3)}
.pst-cb span{display:block;animation:pst-bob 1.7s ease-in-out infinite alternate}
.pst-cb:nth-child(2) span{animation-delay:-.6s}.pst-cb:nth-child(3) span{animation-delay:-1.2s}
.pst-gb{position:relative;width:${u(36)};height:${u(34)};border-radius:${u(7)};border:${u(.6)} solid rgba(243,245,255,.35);background:rgba(26,32,88,.92);padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(1)}}
.pst-gb span{font-size:${u(14)};line-height:1}
.pst-gb small{font:700 clamp(14px,${u(4.4)},26px) var(--head,"Rubik",sans-serif);color:#f3f5ff}
.pst-wc{position:absolute;left:${u(8)};right:${u(8)};top:${u(44)};height:${u(24)};border-radius:${u(4)};background:#fffdf6;color:#2b3170;display:grid;place-items:center;
  font:700 ${u(11)}/1 var(--body,"Andika",sans-serif);letter-spacing:.08em;padding-left:.08em;box-shadow:0 ${u(1.4)} 0 rgba(0,0,0,.28),0 0 0 ${u(1.2)} #c22f48;transition:background .3s}
.pst-wc.ok{background:#d9fbe9}
.pst-pb{position:relative;width:${u(26)};height:${u(26)};border-radius:${u(6)};border:${u(.6)} solid rgba(243,245,255,.35);background:rgba(26,32,88,.92);padding:0;display:grid;place-items:center;font-size:${u(12.5)};line-height:1}
.pst-pb.ok{background:#7ee0b5;border-color:#7ee0b5}
.pst-pill{position:relative;min-height:max(64px,${u(17)});padding:0 ${u(7)};border-radius:${u(9)};border:${u(.5)} solid rgba(243,245,255,.35);background:rgba(10,14,50,.55);color:#cdd3f5;font:500 clamp(16px,${u(4.8)},28px) var(--head,"Rubik",sans-serif)}
.pst-bk{position:absolute;width:${u(20)};height:${u(24)};padding:0;border:0;border-radius:${u(1.2)} ${u(2.6)} ${u(2.6)} ${u(1.2)};
  background:linear-gradient(90deg,#9e1f35 0 13%,#e8405a 14% 100%);box-shadow:${u(1)} ${u(1)} 0 #fffdf6,${u(1.8)} ${u(1.8)} 0 #e3d8c2,0 ${u(2)} ${u(3)} rgba(0,0,0,.35)}
.pst-bk i{position:absolute;left:30%;top:20%;width:58%;height:46%;background:#ffd54a;clip-path:${STAR}}
.pst-bk b{position:absolute;left:30%;right:14%;height:${u(1.2)};border-radius:${u(.6)};background:rgba(255,255,255,.55)}
.pst-bk b:nth-of-type(1){top:72%}.pst-bk b:nth-of-type(2){top:80%;right:30%}
.pst-ob{position:absolute;left:${u(11)};top:${u(46.5)};width:${u(78)};height:${u(34)};display:flex;padding:${u(1.2)};border-radius:${u(2.4)};background:#c22f48;box-shadow:0 ${u(1.6)} ${u(3)} rgba(0,0,0,.35)}
.pst-pg{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(.8)};padding:${u(1.6)};color:#2b3170;font:700 ${u(6.2)}/1.15 var(--body,"Andika",sans-serif)}
.pst-pg:first-child{border-radius:${u(1.6)} 0 0 ${u(1.6)};background:linear-gradient(90deg,#fffdf6 78%,#e7dcc6)}
.pst-pg:last-child{border-radius:0 ${u(1.6)} ${u(1.6)} 0;background:linear-gradient(270deg,#fffdf6 78%,#e7dcc6)}
.pst-pg svg{width:100%;height:100%}.pst-pg path{fill:none;stroke:#2b3170;stroke-width:2.8;stroke-linecap:round;opacity:.72}
.pst-pg .em{font-size:${u(9)};line-height:1;letter-spacing:-.1em}
.pst-pg .sn{font-size:${u(5)};text-align:center;line-height:1.3}
.pst-pg .sl{display:inline-block;font-size:${u(9)};color:#c22f48}
.pst-rk{position:absolute;width:${u(22)};height:${u(36.7)};padding:0;border:0;background:none;border-radius:50%}
.pst-rk.pst-on::after{inset:${u(-3)} ${u(-6)}}
.pst-rk svg{width:100%;height:100%;overflow:visible;display:block}
.pst .rk-body{fill:#f3f5ff}.pst .rk-fin{fill:#ff7a8a}.pst .rk-win{fill:#4fc3f7}.pst .rk-flame{fill:#ffd54a;opacity:0;transform-box:fill-box;transform-origin:50% 0}
.pst-rk.fire .rk-flame{opacity:1;animation:pst-flame .15s ease-in-out infinite alternate}
.pst-rk.shk svg{animation:pst-shk .12s linear infinite}
.pst-ts{position:absolute;width:${u(7.5)};height:${u(7.5)};margin:${u(-3.75)};border-radius:50%;border:${u(.5)} dashed rgba(243,245,255,.5);display:grid;place-items:center;font-size:${u(6.6)};line-height:1}
.pst-ts.on{border-color:transparent;animation:pst-pop .45s ease-out}
.pst-sp{position:absolute;width:${u(4)};height:${u(4)};margin:${u(-2)};background:#fff3b8;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);pointer-events:none;animation:pst-sp .7s ease-out forwards}
.pst-sp.b{animation-name:pst-bu}
.pst-pf{position:absolute;width:${u(5)};height:${u(5)};margin:${u(-2.5)};border-radius:50%;background:rgba(220,210,255,.55);pointer-events:none;animation:pst-bu .6s ease-out forwards}
.pst-cf{position:absolute;inset:0;z-index:8;pointer-events:none}
.pst-cf i{position:absolute;top:-6%;width:${u(3)};height:${u(4.2)};border-radius:${u(.6)};background:var(--c);animation:pst-cf var(--t) linear var(--d) both}
.pst-cf i.s{width:${u(5)};height:${u(5)};border-radius:0;clip-path:${STAR}}
.pst-scr{position:absolute;left:${u(23)};top:${u(44)};width:${u(54)};height:${u(54)};border-radius:50%;overflow:hidden;border:${u(2.2)} solid #c9d1e6;
  background:radial-gradient(1.2px 1.2px at 30% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 20%,#fff,transparent),radial-gradient(circle at 50% 30%,#2a3a8a,#0d1240 70%);box-shadow:0 0 ${u(5)} rgba(120,180,255,.45),inset 0 0 ${u(4)} rgba(0,0,0,.6)}
.pst-scr .g{position:absolute;left:${u(-18)};top:${u(31)};width:${u(86)};height:${u(86)};border-radius:50%;background:radial-gradient(circle at 50% 5%,#a585f2 0,#7d57da 12%,#5d39b0 30%,#3e2580 52%)}
.pst-scr .fr{position:absolute;width:${u(13)}}
.pst-scr::after{content:"";position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.22),transparent 45%);pointer-events:none}
.pst-con{position:absolute;left:${u(-8)};right:${u(-8)};top:${u(127)};height:${u(80)};border-radius:${u(12)} ${u(12)} 0 0;background:linear-gradient(180deg,#56609f 0,#323a78 ${u(3)},#232a5e 40%,#1a1f4a);box-shadow:inset 0 ${u(.8)} 0 rgba(255,255,255,.3),0 ${u(-2)} ${u(5)} rgba(0,0,0,.35)}
.pst-con i{position:absolute;top:${u(3)};width:${u(3)};height:${u(3)};border-radius:50%;background:var(--c);box-shadow:0 0 ${u(1.6)} var(--c);animation:pst-blink 1.6s ease-in-out infinite}
.pst-wk{position:relative;width:${u(28)};height:${u(29)};border-radius:${u(5)};border:0;background:#fffdf6;color:#2b3170;padding:${u(1)};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${u(1)};box-shadow:0 ${u(1.2)} 0 rgba(0,0,0,.3)}
.pst-wk span{font-size:${u(11)};line-height:1}
.pst-wk b{font:700 ${u(5.2)}/1 var(--body,"Andika",sans-serif);letter-spacing:.04em;white-space:nowrap}
.pst-wk b.lw{font-size:${u(4)}}
.pst-tl{position:relative;width:${u(28)};height:${u(22)};border-radius:${u(5)};border:${u(.6)} solid rgba(243,245,255,.35);background:rgba(26,32,88,.92);padding:0;
  display:flex;align-items:center;justify-content:center;gap:${u(2.4)};font:700 ${u(11)}/1 var(--body,"Andika",sans-serif)}
.pst-tl i{font-style:normal;display:inline-block;min-width:${u(6.5)};height:${u(9)};border-bottom:${u(.6)} dashed rgba(243,245,255,.6)}
.pst-tl.ok{background:#7ee0b5;border-color:#7ee0b5;color:#0e1238}.pst-tl.ok i{border-bottom-color:transparent}
.pst-lt{position:absolute;width:${u(12)};height:${u(12)};margin:${u(-6)};display:grid;place-items:center;font:700 ${u(9)}/1 var(--body,"Andika",sans-serif);color:var(--c);text-shadow:0 ${u(.5)} 0 rgba(0,0,0,.35)}
.pst-lt span{display:block;animation:pst-bob 1.5s ease-in-out infinite alternate}
.pst-rays{position:absolute;width:${u(64)};height:${u(64)};margin:${u(-32)};border-radius:50%;pointer-events:none;background:repeating-conic-gradient(rgba(255,213,74,.32) 0 10deg,transparent 10deg 24deg);
  -webkit-mask:radial-gradient(circle,#000 22%,transparent 68%);mask:radial-gradient(circle,#000 22%,transparent 68%);animation:pst-spin 14s linear infinite}
.pst-wv{position:absolute;width:${u(10)};height:${u(10)};margin:${u(-5)};border-radius:50%;border:${u(.8)} solid #7ee0b5;border-left-color:transparent;border-bottom-color:transparent;transform:rotate(0);pointer-events:none;animation:pst-wv 1.5s ease-out infinite}
.pst-env{position:absolute;width:${u(30)};height:${u(20)};padding:0;border:0;background:none;border-radius:${u(1.6)};perspective:${u(70)}}
.pst-env>*{position:absolute;pointer-events:none}
.pst-env .b{z-index:0;inset:0;border-radius:${u(1.6)};background:#e9dfc8;box-shadow:0 ${u(1.4)} ${u(2.5)} rgba(0,0,0,.35)}
.pst-env .pa{z-index:1;left:9%;right:9%;top:8%;height:84%;border-radius:${u(1)};background:#fff linear-gradient(transparent 30%,rgba(43,49,112,.35) 30% 34%,transparent 34% 50%,rgba(43,49,112,.35) 50% 54%,transparent 54%)}
.pst-env .fr{z-index:2;inset:0;border-radius:${u(1.6)};background:linear-gradient(160deg,#fffdf6,#efe5cf);clip-path:polygon(0 0,50% 56%,100% 0,100% 100%,0 100%)}
.pst-env .fl{left:0;right:0;top:0;height:60%;background:#f6eedb;clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:50% 0;z-index:3}
.pst-env .sl{left:50%;top:44%;width:${u(6)};height:${u(6)};margin:${u(-3)};border-radius:50%;background:#ff5c7a;box-shadow:inset 0 0 0 ${u(.8)} #e23d5d;z-index:4}
.pst-env.op .fl{z-index:0}
.pst-qm{position:absolute;margin:${u(-5)} 0 0 ${u(-3)};font:700 ${u(10)}/1 var(--head,"Rubik",sans-serif);color:var(--c);text-shadow:0 ${u(.6)} 0 rgba(0,0,0,.35);pointer-events:none}
.pst-qm span{display:block;animation:pst-bob 1.4s ease-in-out infinite alternate}
/* parent screen + "О игри" */
.pst-par{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,10,38,.62);overflow-y:auto}
.pst-pc{width:100%;max-width:440px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;margin:auto}
.pst-pc h1{margin:0;font:700 clamp(30px,9vw,48px)/1.1 var(--head,"Rubik",sans-serif);color:#ffd54a}
.pst-pc p{margin:0;font:400 clamp(17px,4.9vw,23px)/1.45 var(--body,"Andika",sans-serif);max-width:22em}
.pst-pc p.snd{color:#cdd3f5;font-size:clamp(16px,4.5vw,21px)}
.pst-b1{min-height:72px;width:100%;max-width:320px;margin-top:6px;border:0;border-radius:36px;background:#ffd54a;color:#0e1238!important;font:700 28px var(--head,"Rubik",sans-serif)!important;box-shadow:0 6px 0 rgba(0,0,0,.25)}
.pst-b1:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.25)}
.pst-b2{min-height:64px;min-width:160px;padding:0 28px;border-radius:32px;border:2px solid rgba(243,245,255,.25);background:#1a2058;font:700 20px var(--head,"Rubik",sans-serif)!important}
.pst-ab{position:absolute;inset:0;z-index:11;background:#0e1238;overflow-y:auto;-webkit-user-select:text;user-select:text}
.pst-abi{max-width:520px;margin:0 auto;padding:0 16px max(28px,env(safe-area-inset-bottom,0px))}
.pst-abh{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(14px,env(safe-area-inset-top,0px)) 0 10px;background:#0e1238;border-bottom:1px solid rgba(243,245,255,.15)}
.pst-abh h2{margin:0;font:700 26px var(--head,"Rubik",sans-serif)}
.pst-abh button{min-height:56px;padding:0 20px;border-radius:14px;border:2px solid rgba(243,245,255,.25);background:#1a2058;font:700 17px var(--head,"Rubik",sans-serif)}
.pst-ab h3{font:700 19px var(--head,"Rubik",sans-serif);margin:24px 0 8px;color:#ffd54a}
.pst-ab p{font-size:17px;line-height:1.45;margin:8px 0}.pst-ab .muted{color:#a3abd6;font-size:15px}
.pst-ab .pst-b2{display:block;margin:26px auto 0}
@keyframes pst-ring{from{transform:scale(.94);opacity:.45}to{transform:scale(1.06);opacity:1}}
@keyframes pst-bob{to{transform:translateY(${u(-1.6)})}}
@keyframes pst-tw{from{opacity:.2}to{opacity:1}}
@keyframes pst-str{to{transform:translateY(var(--sh))}}
@keyframes pst-sp{from{opacity:1;transform:scale(1) rotate(0)}to{opacity:0;transform:scale(.15) rotate(140deg)}}
@keyframes pst-bu{from{opacity:1;transform:translate(0,0) scale(1)}to{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.35)}}
@keyframes pst-pop{from{transform:scale(.2);opacity:0}65%{transform:scale(1.1);opacity:1}to{transform:scale(1)}}
@keyframes pst-flame{to{transform:scaleY(1.5)}}
@keyframes pst-shk{25%{transform:translateX(${u(-.5)}) rotate(-2deg)}75%{transform:translateX(${u(.5)}) rotate(2deg)}}
@keyframes pst-cf{from{transform:translate(0,0) rotate(0)}to{transform:translate(var(--x),112vh) rotate(var(--r))}}
@keyframes pst-hand{50%{transform:translate(-6px,-8px) scale(.86)}}
@keyframes pst-wv{from{transform:scale(.5);opacity:.95}to{transform:scale(1.6);opacity:0}}
@keyframes pst-spin{to{transform:rotate(360deg)}}
@keyframes pst-blink{50%{opacity:.35}}
.lite .pst-sky i,.lite .pst-rays,.lite .pst-con i{animation:none}
@media (prefers-reduced-motion:reduce){.pst *,.pst *::before,.pst *::after{animation:none!important}.pst-pw.pst-on .pst-ring{opacity:1}}`;
function css(){if(document.getElementById("pstCss"))return;const s=document.createElement("style");s.id="pstCss";s.textContent=CSS;document.head.appendChild(s)}

/* ---- run machinery: one story at a time; every timer / wait / animation is tracked so a skip or the end cleans up all ---- */
function tmo(f,ms,raw){const r=R;if(!r||r.dead)return 0;const t=setTimeout(()=>{if(r.tm.delete(t))TMN--;f()},raw?ms:ms*K);r.tm.add(t);TMN++;return t}
function untm(t){const r=R;if(r&&t&&r.tm.delete(t)){clearTimeout(t);TMN--}}
function sl(ms){const r=R;return new Promise((res,rej)=>{if(!r||r.dead)return rej(STOP);const o={rej};r.wt.add(o);tmo(()=>{if(r.wt.delete(o))res()},ms)})}
function guard(p){const r=R;return new Promise((res,rej)=>{if(r.dead)return rej(STOP);const o={rej};r.wt.add(o);
  Promise.resolve(p).then(v=>{if(r.wt.delete(o))res(v)},e=>{if(r.wt.delete(o))rej(e)})})}
const bg=p=>p.catch(e=>{if(e!==STOP)console.error(e)});
function kill(r,quiet){if(r.dead)return;r.dead=true;if(!quiet){try{A.stopAll&&A.stopAll()}catch(e){}}
  const w=[...r.wt];r.wt.clear();w.forEach(o=>{try{o.rej(STOP)}catch(e){}});
  r.tm.forEach(t=>{clearTimeout(t);TMN--});r.tm.clear();r.an.forEach(a=>{try{a.cancel()}catch(e){}});r.an.clear()}
function close(r,fast){return new Promise(res=>{const el=r.root;el.style.transition=`opacity ${(fast?200:500)*K}ms`;el.style.opacity="0";el.style.pointerEvents="none";
  setTimeout(()=>{el.remove();r.off.forEach(f=>{try{f()}catch(e){}});r.off=[];if(R===r)R=null;res()},(fast?220:520)*K)})}
function go(name,fn){
  if(R){R.skipped=true;kill(R)}
  const r=R=build(name);
  return (async()=>{let err=null;
    try{await fn(r)}catch(e){if(e!==STOP){err=e;console.error(e)}}
    const sk=r.dead||!!err;r.res.skipped=sk;if(err)r.res.error=String(err&&err.message||err);
    try{r.fin&&r.fin(sk)}catch(e){console.error(e)}
    kill(r,true);await close(r,sk);return r.res})();
}
function mk(cls,html,par,tag){const e=document.createElement(tag||"div");e.className=cls;if(tag==="button")e.type="button";if(html)e.innerHTML=html;if(par)par.appendChild(e);return e}
function build(name){css();
  const root=mk("pst");root.id="pipStory";root.lang="sr";root.dataset.story=name;root.setAttribute("role","dialog");root.setAttribute("aria-label","Пипова прича");
  let tw="";for(let i=0,n=LITE()?4:11;i<n;i++)tw+=`<i style="left:${rnd(94)+3}%;top:${rnd(58)+3}%;animation-delay:-${rnd(24)/10}s;transform:scale(${(.6+rnd(6)/10).toFixed(1)})"></i>`;
  root.innerHTML=`<div class="pst-sky">${tw}<b></b></div><div class="pst-st"><div class="pst-fb"></div><div class="pst-land"><div class="pst-frs"></div><div class="pst-gr"><i></i><i></i><i></i><i></i><i></i></div></div>`+
    `<div class="pst-pw"><b class="pst-ring"></b></div><div class="pst-fx"></div><div class="pst-ui"></div><div class="pst-bub" aria-live="polite"><p></p></div></div>`+
    `<div class="pst-top"><div class="pst-note" hidden><span>Не чујете Пипа? Појачајте звук.</span><button type="button">Провера звука</button></div><button type="button" class="pst-skip" hidden>Прескочи</button></div>`;
  document.body.appendChild(root);
  const q=s=>root.querySelector(s);
  const r={name,root,dead:false,tm:new Set(),wt:new Set(),an:new Set(),off:[],res:{skipped:false},fr:[],U:3.6,
    st:q(".pst-st"),fb:q(".pst-fb"),land:q(".pst-land"),frs:q(".pst-frs"),pw:q(".pst-pw"),fx:q(".pst-fx"),ui:q(".pst-ui"),bub:q(".pst-bub"),skip:q(".pst-skip"),note:q(".pst-note")};
  const fit=()=>{const w=root.clientWidth,h=root.clientHeight;r.U=Math.min(w/100,h/177.78);root.style.setProperty("--u",r.U.toFixed(3)+"px");root.style.setProperty("--sh",Math.ceil(h/170)*170+"px")};
  fit();addEventListener("resize",fit);r.off.push(()=>removeEventListener("resize",fit));
  r.pip=pipEl(PS);r.pw.appendChild(r.pip);r.pw.style.opacity="0";mk("pst-far","",r.fb);
  let arm=0,at=0;r.off.push(()=>clearTimeout(at));
  r.skip.addEventListener("click",()=>{if(r.dead)return;if(arm){r.skipped=true;kill(r);return}
    arm=1;r.skip.textContent="Сигурно?";r.skip.classList.add("arm");clearTimeout(at);at=setTimeout(()=>{arm=0;r.skip.textContent="Прескочи";r.skip.classList.remove("arm")},3000)});
  r.note.querySelector("button").addEventListener("click",()=>{try{A.openSC&&A.openSC()}catch(e){console.error(e)}});
  return r;
}
function pipEl(ps){const d=document.createElement("div");d.innerHTML=A.pipHTML?A.pipHTML(100):'<div class="pip" data-s="idle"></div>';
  const p=d.firstElementChild;p.removeAttribute("id");p.style.setProperty("--ps",u(ps));return p}
/* sprite state; never scale or rotate an ancestor of a .pip: pipsprite.js sizes its canvas from the on-screen box */
function ps(el,s){const p=el&&(el.classList.contains("pip")?el:el.querySelector(".pip"));if(!p)return;
  if(p.dataset.s===s&&ONE[s]){p.dataset.s="idle";tmo(()=>{p.dataset.s=s},170,true)}else p.dataset.s=s}
/* keyframes (transform/opacity); reduced motion: no travel, the end state fades in */
function kf(el,fr,ms,o){const r=R;o=o||{};if(r.dead)return Promise.reject(STOP);
  const end=fr[fr.length-1],fin=()=>{if(end.transform!=null)el.style.transform=end.transform;if(end.opacity!=null)el.style.opacity=end.opacity};
  if(RM()||!el.animate){fin();if(el.animate&&(end.opacity==null||+end.opacity>0)&&el.isConnected)el.animate([{opacity:0},{opacity:end.opacity==null?1:+end.opacity}],{duration:260});return sl(RM()?220:ms)}
  let a;try{a=el.animate(fr,{duration:Math.max(1,ms*K),delay:(o.delay||0)*K,easing:o.ease||"ease-in-out",fill:"both"})}catch(e){fin();return sl(ms)}
  r.an.add(a);
  return guard(a.finished.catch(()=>{})).then(()=>{fin();r.an.delete(a);a.cancel()},e=>{r.an.delete(a);throw e});
}
function mv(el,p,ms,o){const cs=getComputedStyle(el),a={},b={};
  if(p.t!=null){a.transform=cs.transform==="none"?"translate(0px,0px)":cs.transform;b.transform=p.t}
  if(p.o!=null){a.opacity=cs.opacity;b.opacity=String(p.o)}
  return kf(el,[a,b],ms,o)}
const show=(el,ms)=>mv(el,{o:1},ms||400),hide=(el,ms)=>mv(el,{o:0},ms||400);
/* Pip / a friend speaks: big bubble + the clip; a missing / failing clip never blocks (pause to read, then on) */
function bub(t,who,o){const r=R,b=r.bub;o=o||{};
  if(t==null){b.classList.remove("on");return}
  b.firstChild.textContent=t;b.classList.toggle("fr",!!o.fr);b.classList.toggle("big",!!o.big);
  const was=b.classList.contains("on");b.classList.add("on");
  const br=b.getBoundingClientRect(),w=(who||r.pw).getBoundingClientRect();
  b.style.setProperty("--tx",Math.round(Math.max(30,Math.min(br.width-30,w.left+w.width/2-br.left)))+"px");
  if(b.animate&&!RM())b.animate(was?[{opacity:.35},{opacity:1}]:[{transform:"translateY(10px) scale(.92)",opacity:0},{transform:"none",opacity:1}],{duration:260*K,easing:"ease-out"});
}
async function talk(k,o){o=o||{};const r=R,key=o.key||"pp:"+k,t=o.text!=null?o.text:TXT(k);
  bub(t,o.who,o);r.root.dataset.say=k;LOG.push(key);if(LOG.length>300)LOG.shift();
  const t0=Date.now();let to=0;const safe=new Promise(res=>{to=tmo(res,6000+t.length*150)});
  try{await guard(Promise.race([Promise.resolve().then(()=>o.key?A.say(key):A.pp(k)),safe]))}catch(e){if(r.dead)throw STOP}
  untm(to);
  if(Date.now()-t0<250*Math.min(1,K))await sl(600+t.length*45);
  await sl(o.gap==null?280:o.gap);
}
/* wait for a tap on one of els (glowing); resolves its index, or -1 after o.auto ms */
function tapOn(els,w,o){const r=R;o=o||{};els=[].concat(els).filter(Boolean);
  return new Promise((res,rej)=>{if(r.dead)return rej(STOP);let tm=0,ht=0,hand=null,hs=[];
    const off=()=>{els.forEach((e,i)=>{e.removeEventListener("click",hs[i]);e.classList.remove("pst-on")});untm(tm);untm(ht);if(hand)hand.remove();r.wt.delete(ob);if(r.root.dataset.wait===w)delete r.root.dataset.wait};
    const ob={rej:e=>{off();rej(e)}};
    hs=els.map((e,i)=>{const h=ev=>{ev.preventDefault();ev.stopPropagation();off();res(i)};e.addEventListener("click",h);if(!o.plain)e.classList.add("pst-on");return h});
    r.wt.add(ob);r.root.dataset.wait=w;
    if(o.auto)tm=tmo(()=>{off();res(-1)},o.auto);
    if(o.hand&&!RM())ht=tmo(()=>{const a=els[0].getBoundingClientRect();hand=mk("pst-hand","👆",r.root);hand.style.left=Math.round(a.left+a.width*.58)+"px";hand.style.top=Math.round(a.top+a.height*.52)+"px"},o.hand,true);
  })}
/* little effects (none with reduced motion, fewer in lite mode) */
function at(r,el){const a=el.getBoundingClientRect(),s=r.st.getBoundingClientRect();return {x:a.left+a.width/2-s.left,y:a.top+a.height/2-s.top}}
function fxEl(r,cls,x,y,ms){const e=mk(cls,"",r.fx);e.style.left=x;e.style.top=y;e.style.animationDuration=ms*K+"ms";tmo(()=>e.remove(),ms+30);return e}
function trail(r,el,ms){if(RM())return;const step=LITE()?260:120,end=Date.now()+ms*K;
  const tick=()=>{if(r.dead||Date.now()>end||!el.isConnected)return;const p=at(r,el);fxEl(r,"pst-sp",p.x+(rnd(9)-4)*r.U+"px",p.y+(rnd(9)-4)*r.U+"px",700);tmo(tick,step,true)};tick()}
function burst(r,el,n){if(RM())return;const c=at(r,el);n=LITE()?Math.ceil(n/2):n;
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,d=r.U*(14+rnd(9)),e=fxEl(r,"pst-sp b",c.x+"px",c.y+"px",800);e.style.setProperty("--dx",Math.round(Math.cos(a)*d)+"px");e.style.setProperty("--dy",Math.round(Math.sin(a)*d)+"px")}}
function puff(r,x,y){if(RM())return;for(let i=0,n=LITE()?2:4;i<n;i++){const e=fxEl(r,"pst-pf",u(x+(i%2?3:-3)),u(y),650);e.style.setProperty("--dx",u((i%2?1:-1)*(6+i*2)));e.style.setProperty("--dy",u(-2-i))}}
function confetti(r){if(RM())return;const c=mk("pst-cf","",r.root);let h="";
  for(let i=0,n=LITE()?14:36;i<n;i++)h+=`<i class="${i%3?"":"s"}" style="left:${rnd(100)}%;--c:${CF[i%5]};--d:${(rnd(14)/10*K).toFixed(2)}s;--t:${((2+rnd(14)/10)*K).toFixed(2)}s;--x:${rnd(80)-40}px;--r:${rnd(900)-450}deg"></i>`;
  c.innerHTML=h;tmo(()=>c.remove(),4200)}
function row(r,y,items,cls){const box=mk("pst-row","",r.ui);box.style.top=u(y);
  return {box,bs:items.map((it,i)=>{const b=mk(cls+" pst-pop",it.h,box,"button");b.style.animationDelay=i*140*K+"ms";b.style.animationDuration=500*K+"ms";if(it.l)b.setAttribute("aria-label",it.l);if(it.d)Object.assign(b.dataset,it.d);return b})}}
async function pickOut(row,i){row.bs.forEach(b=>{b.disabled=true;b.style.animation="none"});
  await Promise.all(row.bs.map((b,j)=>j===i?mv(b,{t:"scale(1.25)",o:0},450,{ease:"ease-out"}):mv(b,{t:"scale(.6)",o:0},300)));row.box.remove()}
function friends(r,hide){r.frs.innerHTML="";r.fr=FR.map(([x,h])=>{const w=mk("pst-fr","",r.frs),p=pipEl(17);
  p.style.filter=`hue-rotate(${h}deg) saturate(1.15)`;w.appendChild(p);w.style.left=u(x-8.5);w.style.top=u(sy(x)+1.6-18.36);if(hide)w.style.transform=`translateY(${u(24)})`;return w})}
function rise(r,q,st){return Promise.all(r.fr.map((w,i)=>{ps(w,st||"idle");if(q)tmo(()=>{if(!w.querySelector(".pst-q"))mk("pst-q","?",w)},350+i*160);
  return mv(w,{t:"translateY(0px)"},800,{ease:"cubic-bezier(.3,1.35,.5,1)",delay:i*160})}))}
const hop=(w,d)=>kf(w,[{transform:"translateY(0px)"},{transform:`translateY(${u(-6)})`,offset:.4},{transform:"translateY(0px)"}],520,{delay:d||0,ease:"ease-out"});
function book(r,x,bottom){const b=mk("pst-bk","<i></i><b></b><b></b>",r.fx,"button");b.setAttribute("aria-label","Књига");b.style.left=u(x-10);b.style.top=u(bottom-24);return b}
function squig(n){let d="";for(let row=0;row<4;row++){let x=8;const y=14+row*16;while(x<78){const L=4*(2+((n*5+row*3+x)%4));d+=`M${x} ${y}`;for(let k=0;k<L;k+=4)d+="q1 -3.4 2 0t2 0";x+=L+6}}
  return `<svg viewBox="0 0 100 76" aria-hidden="true"><path d="${d}"/></svg>`}
function spread(r,L,Rt){const o=mk("pst-ob",`<div class="pst-pg">${L}</div><div class="pst-pg">${Rt}</div>`,r.fx);o.style.opacity="0";return o}
/* the closed book flies to the middle and opens as the spread */
async function openBook(r,bk,ob){const a=bk.getBoundingClientRect(),c=ob.getBoundingClientRect();
  await mv(bk,{t:`translate(${Math.round(c.left+c.width/2-a.left-a.width/2)}px,${Math.round(c.top+c.height/2-a.top-a.height/2)}px) scale(1.4)`},800,{ease:"cubic-bezier(.4,0,.2,1)"});
  await Promise.all([hide(bk,250),kf(ob,[{transform:"scaleX(.25)",opacity:0},{transform:"scaleX(1)",opacity:1}],600,{ease:"cubic-bezier(.3,1.3,.5,1)"})]);bk.remove()}
function rocket(r,x,bottom,par,w){w=w||22;const k=mk("pst-rk",A.ROCKET_SVG||"🚀",par||r.fx,"button");k.setAttribute("aria-label","Ракета");k.style.left=u(x-w/2);k.style.top=u(bottom-w*5/3);k.style.width=u(w);k.style.height=u(w*5/3);return k}
function stream(r,on){r.root.classList.toggle("pst-fly",on&&!RM());r.fb.querySelector(".pst-far").hidden=on}
const pipIn=r=>{r.pw.style.transform=P(0,-110);return kf(r.pw,[{transform:P(0,-110),opacity:1,easing:"ease-in"},{transform:P(0,4),opacity:1,offset:.7,easing:"ease-out"},{transform:P(0,-4),opacity:1,offset:.85,easing:"ease-in-out"},{transform:P(0,0),opacity:1}],1300,{ease:"linear"})};

/* ================= first(): the intro ================= */
async function parentScreen(r){
  const p=mk("pst-par",`<div class="pst-pc"><div class="pst-pp"></div><h1>Пип учи речи</h1><p>Игра за учење читања за децу од 4 до 7 година. Пип ће детету све објаснити у кратком цртаном филму.</p>`+
    `<p class="snd">🔊 Појачајте звук и дајте телефон детету.</p><button type="button" class="pst-b1" data-k="go">Почни</button><button type="button" class="pst-b2" data-k="ab">О игри</button></div>`,r.root);
  const pp=pipEl(28),far=r.fb.querySelector(".pst-far");p.querySelector(".pst-pp").appendChild(pp);pp.dataset.s="wave";far.hidden=true;
  for(;;){
    const i=await tapOn([p.querySelector("[data-k=go]"),p.querySelector("[data-k=ab]")],"start",{plain:true});
    if(i===0)break;
    const ab=mk("pst-ab",`<div class="pst-abi"><div class="pst-abh"><h2>О игри</h2><button type="button">Назад</button></div><div class="pst-abt">${A.ABOUT||""}</div><button type="button" class="pst-b2">Назад</button></div>`,r.root);
    await tapOn([...ab.querySelectorAll("button")],"about",{plain:true});ab.remove();
  }
  try{A.unlock&&A.unlock()}catch(e){}
  await hide(p,350);p.remove();far.hidden=false;
}
async function sHello(r,note,rep){
  r.skip.hidden=false;
  await pipIn(r);puff(r,50,PY);
  ps(r.pip,"wave");await talk("st1_hello");
  let t=await tapOn(r.pw,"pip",{auto:12000,hand:2600});
  if(t<0&&note){
    r.note.hidden=false;const nb=r.note.getBoundingClientRect().bottom+8,bt=r.bub.getBoundingClientRect().top;if(nb>bt)r.bub.style.transform=`translateY(${Math.ceil(nb-bt)}px)`;
    ps(r.pip,"wave");await talk("st1_hello");t=await tapOn(r.pw,"pip",{hand:1500});
    r.note.hidden=true;r.bub.style.transform="";
  }
  if(t>=0){r.res.heard=true;if(!rep)S().soundOk=true;ps(r.pip,"happy");burst(r,r.pw,10);await talk("st1_heard")}
}
async function sHome(r){
  friends(r,true);ps(r.pip,"happy");
  await Promise.all([rise(r,true,"thinking"),talk("st1_home")]);
}
async function sFall(r){
  ps(r.pip,"listen");r.fr.forEach(w=>ps(w,"listen"));
  const bk=r.bk=book(r,50,136),z=" scale(.72)";bk.disabled=true;   /* lands small, at Pip's feet: his face stays free */
  bk.style.transform=`translate(${u(40)},${u(-140)}) rotate(-40deg)`+z;
  const fall=kf(bk,[{transform:`translate(${u(40)},${u(-140)}) rotate(-40deg)`+z},{transform:`translate(${u(30)},${u(-90)}) rotate(60deg)`+z,offset:.35},{transform:`translate(${u(10)},${u(-36)}) rotate(200deg)`+z,offset:.7},
    {transform:`translate(0px,${u(3)}) rotate(350deg)`+z,offset:.9},{transform:"translate(0px,0px) rotate(360deg)"+z}],2200,{ease:"cubic-bezier(.45,0,.75,1)"});
  trail(r,bk,2100);
  await Promise.all([fall,talk("st1_fall",{gap:0})]);
  puff(r,50,134);r.fr.forEach((w,i)=>{ps(w,"happy");bg(hop(w,i*80))});ps(r.pip,"thinking");
  const ch=row(r,149,[{h:"<span>📖</span>",l:"Књига",d:{c:"book"}},{h:"<span>🍕</span>",l:"Пица",d:{c:"pizza"}},{h:"<span>🎈</span>",l:"Балон",d:{c:"balloon"}}],"pst-cb");
  await talk("st1_what");
  const i=await tapOn(ch.bs,"choice");
  await pickOut(ch,i);r.res.choice=["book","pizza","balloon"][i];
  if(i===0){ps(r.pip,"happy");r.fr.forEach((w,j)=>{ps(w,"happy");bg(hop(w,j*90))});burst(r,bk,12);await talk("st1_book")}
  else{ps(r.pip,"giggle");r.fr.forEach(w=>ps(w,"giggle"));await talk(i===1?"st1_notpizza":"st1_notballoon")}
}
async function sOpen(r,ask,rep){
  r.fr.forEach(w=>{const q=w.querySelector(".pst-q");if(q)bg(hide(q,300).then(()=>q.remove()));ps(w,"idle")});
  const ob=r.ob=spread(r,squig(1),squig(2));ps(r.pip,"thinking");
  await openBook(r,r.bk,ob);
  await talk("st1_open");
  if(!ask)return;
  ps(r.pip,"idle");
  const g=row(r,149,[{h:"<span>👧</span><small>Девојчица</small>",d:{g:"f"}},{h:"<span>👦</span><small>Дечак</small>",d:{g:"m"}}],"pst-gb");
  await talk("st1_who");
  const i=await tapOn(g.bs,"gender"),gd=i===1?"m":"f";
  r.res.gender=gd;if(!rep){const s=S();s.gender=gd;s.gAsk=true;SAVE()}
  await pickOut(g,i);ps(r.pip,"happy");r.fr.forEach((w,j)=>bg(hop(w,j*90)));
  await talk(gd==="m"?"st1_boy":"st1_girl");
}
function readOpts(w){const W=A.WORDS||[],me=(A.WM||{})[w]||W.find(x=>x.w===w)||{w,e:"❔"};
  let f=shuf(W.filter(x=>x.w!==w&&x.w[0]===w[0]&&x.e&&x.e!==me.e));
  if(f.length<2)f=f.concat(shuf(W.filter(x=>x.w[0]!==w[0]&&x.e)));
  return shuf([me,f[0],f[1]])}
async function sRead(r,rep){
  /* close-up: the planet slides away, Pip floats up, a page with the word comes out of the book */
  bub(null);
  await Promise.all([mv(r.land,{t:`translateY(${u(140)})`},900),mv(r.pw,{t:P(0,-17)},900),hide(r.ob,500)]);
  ps(r.pip,"listen");
  const wc=mk("pst-wc pst-pop","<b></b>",r.fx);wc.style.animationDuration=500*K+"ms";
  let right=0,metoo=false,cur=null;
  for(let n=0;n<READ.length;n++){const w=READ[n];
    wc.dataset.word=w;wc.firstChild.textContent=w;wc.classList.remove("ok");
    if(n)bg(kf(wc,[{transform:"rotateX(80deg)",opacity:.3},{transform:"none",opacity:1}],400,{ease:"ease-out"}));
    const op=readOpts(w);
    cur=row(r,121,op.map(x=>({h:`<span>${x.e}</span>`,d:{w:x.w}})),"pst-pb");
    const pr=row(r,149,[{h:"Још не знам"}],"pst-pill"),pill=pr.bs[0];pill.style.animationDelay=450*K+"ms";
    if(n===0)await talk("st1_try");else await talk("st1_more");
    ps(r.pip,"listen");
    const j=await tapOn([...cur.bs,pill],"read");
    pr.box.remove();
    if(j===3){metoo=true;await pickOut(cur,-1);break}
    const ok=cur.bs[j].dataset.w===w;
    if(!ok){await pickOut(cur,-1);break}   /* no "wrong" feedback: the check just stops */
    right++;cur.bs[j].classList.add("ok");wc.classList.add("ok");ps(r.pip,"happy");burst(r,cur.bs[j],8);
    await sl(650);await pickOut(cur,j);
  }
  const start=START[right];r.res.start=start;r.res.right=right;
  if(!rep){const s=S();s.planet=s.visit=start;s.gal=A.galOf?A.galOf(start):1;s.stars=0;if(start>=3&&A.unlockAll)A.unlockAll();if(A.syncInv)A.syncInv(false);SAVE()}
  if(metoo){ps(r.pip,"giggle");await talk("st1_metoo")}
  await hide(wc,300);wc.remove();
  await Promise.all([mv(r.land,{t:"translateY(0px)"},900),mv(r.pw,{t:P(0,0)},900)]);
  if(right>=2){ps(r.pip,"dance");r.fr.forEach((w,i)=>{ps(w,"happy");bg(hop(w,i*90))});await talk("st1_reader")}
  else if(!metoo){ps(r.pip,"happy");await talk("st1_learn")}
}
async function sRocket(r){
  if(r.ob&&r.ob.isConnected)bg(hide(r.ob,400).then(()=>r.ob.remove()));
  ps(r.pip,"happy");r.fr.forEach(w=>ps(w,"idle"));
  const rk=rocket(r,50,121,r.fb,34);rk.disabled=true;rk.classList.add("fire");rk.style.transform=`translateY(${u(-150)})`;
  await Promise.all([mv(r.pw,{t:P(0,5)},700),kf(rk,[{transform:`translateY(${u(-150)})`,easing:"ease-out"},{transform:`translateY(${u(3)})`,offset:.85},{transform:"translateY(0px)"}],1600,{ease:"linear"})]);
  rk.classList.remove("fire");puff(r,38,121);puff(r,62,121);
  const ts=[];for(let i=0;i<8;i++){const a=Math.PI*(1-i/7),e=mk("pst-ts pst-pop","",r.fx);e.style.left=u(50+43*Math.cos(a));e.style.top=u(97-40*Math.sin(a));e.style.animationDelay=i*60*K+"ms";e.style.animationDuration=400*K+"ms";ts.push(e)}
  const lit=(async()=>{await sl(900);for(const e of ts){e.classList.remove("pst-pop");void e.offsetWidth;e.classList.add("on");e.textContent="⭐";await sl(340)}})();
  await Promise.all([talk("st1_rocket"),lit]);
  ps(r.pip,"wave");await talk("st1_go");
  rk.disabled=false;const tp=tapOn([rk,r.pw],"rocket",{hand:4000});r.pw.classList.remove("pst-on");await tp;rk.disabled=true;
  bub(null);r.fr.forEach(w=>ps(w,"wave"));ps(r.pip,"happy");
  await mv(r.pw,{t:P(0,-16),o:0},600,{ease:"ease-in"});
  rk.classList.add("fire","shk");await sl(700);rk.classList.remove("shk");
  trail(r,rk,1500);bg(Promise.all(ts.map(e=>hide(e,1200))));
  await kf(rk,[{transform:"translate(0px,0px)"},{transform:`translate(${u(6)},${u(-210)})`}],1600,{ease:"cubic-bezier(.5,0,.9,.5)"});
}
function first(o){o=o||{};const only=!!o.storyOnly,rep=!!o.replay;
  return go(only?"story":"first",async r=>{Object.assign(r.res,{start:null,gender:null,heard:false});
    r.fin=sk=>{if(rep)return;const s=S();s.hello=true;if(!only&&(!sk||s.soundOk))s.scSeen=true;s.story=Object.assign({},s.story,{1:1});SAVE()};
    if(!only)await parentScreen(r);
    await sHello(r,!only,rep);
    await sHome(r);
    await sFall(r);
    await sOpen(r,!only,rep);
    if(!only)await sRead(r,rep);
    await sRocket(r);
  })}

/* ================= chapters 2..6 (after each galaxy) ================= */
function knownWords(){const W=(A.WORDS||[]).filter(x=>x.e),kn=shuf(W.filter(x=>A.known&&A.known(x.w)));
  let p=kn.filter(x=>x.w.length<=6).concat(kn.filter(x=>x.w.length>6));
  if(p.length<3)p=p.concat(shuf(W.filter(x=>x.p===1&&!p.includes(x))));
  return p.slice(0,3)}
async function ch2(r){
  stream(r,true);r.land.style.transform=`translateY(${u(80)})`;
  const sc=mk("pst-scr","",r.fb);sc.style.opacity="0";
  const fs=[[10,190],[27,60],[44,275]].map(([x,h])=>{const w=mk("fr","",sc),p=pipEl(13);p.style.filter=`hue-rotate(${h}deg) saturate(1.15)`;w.appendChild(p);
    w.style.left=u(x-6.5);w.style.top=u(33.5-14.04+(x===27?-1.5:1));w.style.transform=`translateY(${u(20)})`;return w});mk("g","",sc,"i");
  const con=mk("pst-con",[12,30,70,88].map((x,i)=>`<i style="left:${x}%;--c:${CF[i]};animation-delay:-${i*.4}s"></i>`).join(""),r.fx);
  r.pw.style.transform=P(0,10);ps(r.pip,"happy");await show(r.pw,500);
  await talk("st2_a");
  ps(r.pip,"idle");await show(sc,500);
  await Promise.all(fs.map((w,i)=>{ps(w,"wave");return mv(w,{t:"translateY(0px)"},700,{ease:"cubic-bezier(.3,1.35,.5,1)",delay:i*150})}));
  ps(fs[1],"happy");await talk("st2_b",{who:sc,fr:true});
  ps(r.pip,"happy");
  const ws=knownWords(),cards=row(r,151,ws.map(x=>({h:`<span>${x.e}</span><b${x.w.length>6?' class="lw"':""}>${x.w}</b>`,d:{w:x.w}})),"pst-wk");
  await talk("st2_c");
  const i=await tapOn(cards.bs,"word"),w=ws[Math.max(0,i)].w;r.res.word=w;
  await pickOut(cards,i);
  ps(r.pip,"happy");await talk("w",{key:"p:"+w,text:w,big:true});
  fs.forEach((f,j)=>{ps(f,j===1?"dance":"happy");bg(hop(f,j*110))});burst(r,sc,12);
  await sl(500);await talk("st2_d",{who:sc,fr:true});
  fs.forEach(f=>ps(f,"wave"));await sl(900);
}
async function ch3(r){
  r.root.dataset.g="sea";
  await pipIn(r);ps(r.pip,"happy");
  const bk=book(r,77,125);bk.classList.add("pst-pop");bk.style.animationDuration=500*K+"ms";
  await talk("st3_a");
  await tapOn(bk,"book",{auto:15000,hand:4000});
  ps(r.pip,"thinking");
  const ob=spread(r,"<b>мама</b><b>мачка</b>","<b>сок</b><b>риба</b>");
  await openBook(r,bk,ob);
  await talk("st3_b");
  const L=[["А","а"],["Б","б"],["М","м"]];
  [...ob.children].forEach((pg,i)=>pg.innerHTML=i?L.map(x=>`<span class="sl">${x[1]}</span>`).join(""):squig(3));
  ob.lastChild.style.flexDirection="row";ob.lastChild.style.gap=u(5);
  const tl=row(r,146,L.map(x=>({h:`${x[0]}<i></i>`,d:{l:x[0]}})),"pst-tl"),sm=[...ob.querySelectorAll(".sl")],done=[];
  ps(r.pip,"idle");
  while(done.length<3){
    const left=tl.bs.filter((b,i)=>!done.includes(i));
    const j=await tapOn(left,"pair",{auto:15000,hand:done.length?0:3500});
    const todo=j<0?left:[left[j]];
    for(const b of todo){const i=tl.bs.indexOf(b),s=sm[i],slot=b.querySelector("i"),a=s.getBoundingClientRect(),c=slot.getBoundingClientRect();done.push(i);b.disabled=true;
      await mv(s,{t:`translate(${Math.round(c.left+c.width/2-a.left-a.width/2)}px,${Math.round(c.top+c.height/2-a.top-a.height/2)}px)`},700,{ease:"cubic-bezier(.4,0,.2,1)"});
      s.style.visibility="hidden";slot.textContent=L[i][1];b.classList.add("ok");burst(r,b,6);ps(r.pip,"happy");
      await talk("l",{key:"l:"+L[i][0],text:L[i][0]+" "+L[i][1],big:true,gap:150});}
  }
  ps(r.pip,"dance");await talk("st3_c");await sl(600);
}
async function ch4(r){
  r.root.dataset.g="forest";
  await pipIn(r);
  const abc=shuf([..."абвгдђежзиклмнопрстћуфхцчш"]).slice(0,LITE()?6:10),n=abc.length;
  const lts=abc.map((ch,i)=>{const a=Math.PI*(.92+i/(n-1)*1.16),x=50+Math.cos(a)*41,y=103+Math.sin(a)*31*(i%2?.78:1);
    const e=mk("pst-lt pst-pop",`<span style="animation-delay:-${(i*.37).toFixed(2)}s">${ch}</span>`,r.fx);e.style.left=u(x);e.style.top=u(y);e.style.setProperty("--c",CF[i%5]);e.style.animationDelay=i*90*K+"ms";e.style.animationDuration=500*K+"ms";return e});
  ps(r.pip,"dance");await talk("st4_a");
  ps(r.pip,"happy");
  const ry=mk("pst-rays","",r.fb);ry.style.left=u(50);ry.style.top=u(63);ry.style.opacity="0";
  const bk=book(r,50,75);bk.classList.add("pst-pop");bk.style.animationDuration=500*K+"ms";bg(show(ry,600));
  await talk("st4_b");
  await tapOn(bk,"book",{auto:15000,hand:3500});
  const c=at(r,bk);
  await Promise.all(lts.map((e,i)=>{e.style.animation="none";const p=at(r,e);return mv(e,{t:`translate(${Math.round(c.x-p.x)}px,${Math.round(c.y-p.y)}px)`,o:0},700,{delay:i*60,ease:"ease-in"})}));
  lts.forEach(e=>e.remove());burst(r,bk,10);
  const st=((window.PIP_CONTENT||{}).stories||[])[0],pg=st&&st.pages&&st.pages[0]||{s:"Пип иде у шуму.",e:"🌲🌳🌲"};
  const ob=spread(r,`<span class="em">${pg.e}</span>`,`<span class="sn">${pg.s}</span>`);
  bk.style.transform="none";await Promise.all([hide(bk,250),kf(ob,[{transform:"scaleX(.25)",opacity:0},{transform:"scaleX(1)",opacity:1}],600,{ease:"cubic-bezier(.3,1.3,.5,1)"})]);bk.remove();
  ps(r.pip,"listen");
  const wv=[0,1].map(i=>{const e=mk("pst-wv","",r.fx);e.style.left=u(70);e.style.top=u(93);e.style.animationDelay=i*.7+"s";return e});
  await talk("st4_c");await sl(1200);wv.forEach(e=>e.remove());bg(hide(ry,400));
}
async function ch5(r){
  r.root.dataset.g="gold";
  r.pw.style.transform=P(-16,0);ps(r.pip,"idle");await show(r.pw,500);
  const ev=mk("pst-env",'<i class="b"></i><i class="pa"></i><i class="fr"></i><i class="fl"></i><i class="sl"></i>',r.fx,"button");ev.setAttribute("aria-label","Писмо");ev.disabled=true;
  ev.style.left=u(58);ev.style.top=u(104);
  const fly=kf(ev,[{transform:`translate(${u(-80)},${u(-92)}) rotate(-25deg)`},{transform:`translate(${u(-40)},${u(-70)}) rotate(14deg)`,offset:.3},{transform:`translate(${u(-6)},${u(-58)}) rotate(-12deg)`,offset:.55},
    {transform:`translate(${u(6)},${u(-24)}) rotate(10deg)`,offset:.8},{transform:"translate(0px,0px) rotate(0deg)"}],2200,{ease:"ease-in-out"});
  trail(r,ev,2000);ps(r.pip,"listen");
  await fly;puff(r,73,124);
  ps(r.pip,"happy");await talk("st5_a");
  ev.disabled=false;await tapOn(ev,"letter",{auto:15000,hand:3500});ev.disabled=true;
  const fl=ev.querySelector(".fl"),pa=ev.querySelector(".pa");
  bg(hide(ev.querySelector(".sl"),200));await kf(fl,[{transform:"rotateX(0deg)"},{transform:"rotateX(180deg)"}],450,{ease:"ease-in"});ev.classList.add("op");
  await kf(pa,[{transform:"translateY(0px)"},{transform:`translateY(${u(-11)})`}],450,{ease:"ease-out"});
  const c=at(r,pa),n=LITE()?4:7;
  const qs=Array.from({length:n},(_,i)=>{const e=mk("pst-qm","<span>?</span>",r.fx);e.style.left=c.x+"px";e.style.top=c.y+"px";e.style.setProperty("--c",CF[i%5]);e.firstChild.style.animationDelay=-i*.3+"s";
    const a=Math.PI*(1.15+i/(n-1)*.6);return mv(e,{t:`translate(${Math.round(Math.cos(a)*r.U*(18+i%3*6))}px,${Math.round(Math.sin(a)*r.U*(22+i%2*8))}px)`},700,{delay:i*80,ease:"cubic-bezier(.3,1.4,.5,1)"})});
  await Promise.all(qs);
  ps(r.pip,"thinking");await talk("st5_b");
  ps(r.pip,"wave");await talk("st5_c");await sl(600);
}
async function ch6(r){
  stream(r,true);r.land.style.transform=`translateY(${u(80)})`;
  r.pw.style.transform=P(-14,-16);ps(r.pip,"dance");await show(r.pw,500);
  await talk("st6_a");
  const rk=rocket(r,88,126,r.fb);rk.disabled=true;rk.classList.add("fire");rk.style.transform=`translate(${u(50)},${u(-40)})`;
  await kf(rk,[{transform:`translate(${u(50)},${u(-40)})`},{transform:`translate(${u(-14)},${u(-22)})`}],1100,{ease:"ease-out"});rk.classList.remove("fire");
  ps(r.pip,"happy");await talk("st6_b");
  rk.disabled=false;await tapOn(rk,"rocket",{auto:15000,hand:3500});rk.disabled=true;bub(null);
  await mv(r.pw,{t:P(22,-22),o:0},600,{ease:"ease-in"});
  rk.classList.add("fire");trail(r,rk,2600);friends(r,true);
  await Promise.all([kf(rk,[{transform:`translate(${u(-14)},${u(-22)})`},{transform:`translate(${u(-44)},${u(-66)}) rotate(-28deg)`,offset:.35},{transform:`translate(${u(-30)},${u(-92)}) rotate(20deg)`,offset:.55},
      {transform:`translate(${u(-6)},${u(-50)}) rotate(8deg)`,offset:.8},{transform:"translate(0px,0px) rotate(0deg)"}],2800,{ease:"ease-in-out"}),
    (async()=>{await sl(900);stream(r,false);await mv(r.land,{t:"translateY(0px)"},1500,{ease:"ease-out"})})()]);
  rk.classList.remove("fire");puff(r,88,126);
  r.pw.style.transform=P(0,0);ps(r.pip,"happy");await show(r.pw,400);
  await rise(r,false,"wave");
  const ob=spread(r,squig(4),squig(5));ob.style.left=u(30);ob.style.top=u(64);ob.style.width=u(40);ob.style.height=u(18);ob.style.padding=u(.8);
  await kf(ob,[{transform:"scale(.3)",opacity:0},{transform:"scale(1)",opacity:1}],500,{ease:"cubic-bezier(.3,1.4,.5,1)"});
  await talk("st6_c");
  ob.style.pointerEvents="auto";await tapOn(ob,"book",{auto:12000,hand:3000});
  confetti(r);ps(r.pip,"dance");r.fr.forEach((w,i)=>{ps(w,"dance");bg(hop(w,i*120))});burst(r,ob,12);
  await sl(1500);ps(r.pip,"wave");await talk("st6_d");await sl(1200);
}
const CH={2:ch2,3:ch3,4:ch4,5:ch5,6:ch6};
function chapter(n,o){o=o||{};n=+n;
  if(n===1)return first({storyOnly:true,replay:o.replay});
  if(!CH[n])return Promise.resolve({skipped:true,error:"no chapter "+n});
  return go("ch"+n,async r=>{r.fin=()=>{if(o.replay)return;const s=S();s.story=Object.assign({},s.story,{[n]:1});SAVE()};
    r.skip.hidden=false;await CH[n](r)})}

window.PipStory={
  init(api){A=api||{};return window.PipStory},
  first,chapter,TITLES,
  speed(k){K=k>0?k:1},
  active:()=>!!R,
  stop(){if(R){R.skipped=true;kill(R)}},
  state:()=>R?{story:R.name,wait:R.root.dataset.wait||"",say:R.root.dataset.say||""}:{story:"",wait:"",say:""},
  get log(){return LOG},
  timers:()=>TMN
};
})();
