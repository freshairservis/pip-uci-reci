/* Anonymous counting for the father's statistics page (GoatCounter, no cookies, no third-party script).
   Only milestones are sent, never anything about the child: "the game was opened", "a new player", "played on a 2nd day",
   "reached planet 5", "watched / skipped the story", "did a reading check". No device id: each milestone is sent once per phone,
   so the counts on the dashboard are numbers of phones. Not sent from localhost / file:// (tests, the single-file build).
   window.PipStats = {send(path,title), state()} */
(function(){
  const URL="https://pipucireci.goatcounter.com/count",KEY="pip.stats";
  const live=!window.__noStats&&(/^https?:$/.test(location.protocol)&&!/^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname)||window.__statsTest);   /* __noStats: our tests of the live site */
  let st={first:"",days:[],sent:{},q:[]};
  try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&typeof j==="object")st=Object.assign(st,j)}catch(e){}
  if(!Array.isArray(st.days))st.days=[];if(!st.sent||typeof st.sent!=="object")st.sent={};if(!Array.isArray(st.q))st.q=[];
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
  const day=(d=new Date())=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const ago=k=>Math.round((new Date(day())-new Date(k))/864e5);

  /* one hit = one no-cors request (the answer is not read); only a failed network trip is kept in a small queue for later,
     so a hit is never counted twice */
  function hit(path,title,event){
    if(!live)return;
    const p=new URLSearchParams({p:path,t:title||path,rnd:Math.random().toString(36).slice(2)});
    if(event)p.set("e","true");else{p.set("s",screen.width+","+screen.height+","+(window.devicePixelRatio||1));if(document.referrer)p.set("r",document.referrer)}
    if(!navigator.onLine){if(st.q.length<60){st.q.push([path,title,event]);save()}return}
    fetch(URL+"?"+p,{mode:"no-cors",credentials:"omit",keepalive:true,cache:"no-store"}).catch(()=>{if(st.q.length<60){st.q.push([path,title,event]);save()}});
  }
  function flush(){if(!live||!navigator.onLine||!st.q.length)return;const q=st.q;st.q=[];save();q.forEach(a=>hit(a[0],a[1],a[2]))}
  /* a milestone: once per phone */
  function once(path,title){if(st.sent[path])return;st.sent[path]=day();save();hit(path,title,true)}

  function check(){
    const P=window.__pip;if(!P)return;const S=P.S;if(!S)return;
    if(window.matchMedia&&matchMedia("(display-mode: standalone)").matches||navigator.standalone)once("instalirana","Игра инсталирана на телефон");
    /* days with real play (at least one round) */
    if(S.total>0){const d=day();if(!st.days.includes(d)){st.days.push(d);if(st.days.length>400)st.days=st.days.slice(-400);save()}
      const n=st.days.length;[2,3,5,10,20,40].forEach(k=>{if(n>=k)once("povratak/igrao-"+k+"-dana","Играо "+k+" различитих дана")});
      if(st.first){const a=ago(st.first);[[7,"posle-nedelju-dana","Вратио се после недељу дана"],[14,"posle-2-nedelje","Вратио се после 2 недеље"],[30,"posle-mesec-dana","Вратио се после месец дана"]]
        .forEach(([k,p,t])=>{if(a>=k&&st.days.some(x=>ago(x)<=a-k))once("povratak/"+p,t)})}
      [20,50,100,250,500,1000].forEach(k=>{if(S.total>=k)once("rundi/"+k,k+" одиграних рунди")})}
    const pl=S.planet||1;for(let k=2;k<=pl;k++)once("planeta/"+String(k).padStart(2,"0"),"Стигао до планете "+k);
    const gal=P.galOf?P.galOf(pl):1;for(let k=2;k<=gal;k++)once("galaksija/"+k,"Стигао до галаксије "+k);
    if(S.allDone)once("galaksija/kraj","Прешао целу игру");
    if(S.story)Object.keys(S.story).forEach(n=>once("prica/deo-"+n,"Видео део приче "+n));
    if(Array.isArray(S.checks)&&S.checks.length){[1,2,3,5].forEach(k=>{if(S.checks.length>=k)once("provera-citanja/"+k,"Урађена провера читања ("+k+")")})}
    if(Array.isArray(S.letters)&&S.letters.length)[1,3,10].forEach(k=>{if(S.letters.length>=k)once("papir/"+k,k+" писма на папиру")});
    /* v8: a second child on the phone (the profile list is kept by the game; nothing about the children is sent) */
    try{const pr=JSON.parse(localStorage.getItem("pip.profiles"));if(pr&&Array.isArray(pr.list)&&pr.list.length>=2)once("profili/2","Додато друго дете")}catch(e){}
    flush();
  }

  /* the story tells how it went: watched to the end or skipped, and where the reading check put the child */
  function wrapStory(){
    const PS=window.PipStory;if(!PS||PS.__stats)return;PS.__stats=1;
    const f=PS.first,c=PS.chapter;
    if(f)PS.first=function(o){return f.apply(this,arguments).then(r=>{if(!(o&&o.replay)){
      once("prica/uvod-"+(r&&r.skipped?"preskocen":"odgledan"),"Увод: "+(r&&r.skipped?"прескочен":"одгледан до краја"));
      if(r&&r.start&&!(o&&o.storyOnly))once("pocetak/planeta-"+String(r.start).padStart(2,"0"),"Провера на почетку: креће од планете "+r.start)}return r})};
    if(c)PS.chapter=function(n,o){return c.apply(this,arguments).then(r=>{if(!(o&&o.replay))once("prica/deo-"+n+"-"+(r&&r.skipped?"preskocen":"odgledan"),"Део "+n+": "+(r&&r.skipped?"прескочен":"одгледан"));return r})};
  }

  if(!st.first){st.first=day();save();once("novi-igrac","Нови играч (први пут отворио игру)")}
  hit("/","Пип учи речи");   /* every opening of the game = a visit */
  wrapStory();
  addEventListener("load",()=>{wrapStory();setTimeout(check,4000)});
  addEventListener("online",flush);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)check()});
  setInterval(check,60000);
  window.PipStats={send:(p,t)=>hit(p,t,true),check,state:()=>JSON.parse(JSON.stringify(st)),live};
})();
