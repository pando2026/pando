// 판도 Korean/English switch. Korean is the source; English comes from data/en/strings.json,
// a dictionary of every Korean string shown on screen (digits replaced by {0},{1}...).
(function(){
 const KEY="pando-lang",H=/[가-힣]/,NUM=/\d[\d,.]*\d|\d/g;
 const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 let lang="ko";
 try{lang=(new URLSearchParams(location.search).get("lang")||localStorage.getItem(KEY)||"ko").toLowerCase()==="en"?"en":"ko"}catch{}
 window.PANDO_LANG=lang;
 let dict=null;
 const big=x=>{const a=Math.abs(x);const f=(v,u)=>(Math.round(v*10)/10).toLocaleString("en-US")+" "+u;return a>=1e12?f(x/1e12,"trillion"):a>=1e9?f(x/1e9,"billion"):a>=1e6?f(x/1e6,"million"):Math.round(x).toLocaleString("en-US")};
 const UNIT={man:1e4,eok:1e8,jo:1e12};
 const ORD=v=>{const n=parseInt(String(v).replace(/,/g,""),10);if(isNaN(n))return v;const t=n%100,u=n%10;return v+(t>=11&&t<=13?"th":u===1?"st":u===2?"nd":u===3?"rd":"th")};
 const SING={years:'year',months:'month',days:'day',weeks:'week',hours:'hour',seats:'seat',countries:'country',people:'person',times:'time',votes:'vote',members:'member',parties:'party',soldiers:'soldier'};
 const sing=t=>t.replace(/(^|[^\d.,])1 (years|months|days|weeks|hours|seats|countries|people|times|votes|members|parties|soldiers)\b/g,(m,a,w)=>a+'1 '+SING[w]);
 const fill=(tpl,nums)=>sing(tpl.replace(/\{(\d+)(?::(mon|man|eok|jo|ord|hide))?\}/g,(m,i,mod)=>{const v=nums[+i];if(v==null)return m;if(mod==="hide")return"";if(mod==="ord")return ORD(v);if(mod==="mon")return MON[parseInt(v,10)-1]||v;if(mod)return big(parseFloat(String(v).replace(/,/g,""))*UNIT[mod]);return v}));
 function tr(s){
  if(!dict||!s||!H.test(s))return s;
  const lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],core=s.trim();
  if(dict[core]!=null)return lead+dict[core]+trail;
  const nums=[];const key=core.replace(NUM,m=>{nums.push(m);return "{"+(nums.length-1)+"}"});
  if(dict[key]!=null)return lead+fill(dict[key],nums)+trail;
  for(const sep of [" · "," / ",", "," | ",": "]){
   if(core.includes(sep)){const parts=core.split(sep),t=parts.map(p=>tr(p));if(t.some((x,i)=>x!==parts[i]))return lead+t.join(sep)+trail}
  }
  return s;
 }
 window.PANDO_TR=tr;
 const ATTRS=["title","aria-label","placeholder","alt"];
 function skip(el){return el&&(el.closest("script,style,[translate=no]"))}
 function walk(root){
  if(!dict)return;
  if(root.nodeType===3){if(!skip(root.parentElement)&&H.test(root.nodeValue)){const t=tr(root.nodeValue);if(t!==root.nodeValue)root.nodeValue=t}return}
  if(root.nodeType!==1||skip(root))return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const L=[];while(n=w.nextNode())L.push(n);
  for(const t of L){if(skip(t.parentElement))continue;const v=t.nodeValue;if(H.test(v)){const x=tr(v);if(x!==v)t.nodeValue=x}}
  for(const el of [root,...root.querySelectorAll("[title],[aria-label],[placeholder],[alt]")]){
   if(skip(el))continue;
   for(const a of ATTRS){const v=el.getAttribute(a);if(v&&H.test(v)){const x=tr(v);if(x!==v)el.setAttribute(a,x)}}
  }
 }
 function toggle(){
  const box=document.createElement("div");box.className="lang-toggle";box.setAttribute("translate","no");box.setAttribute("role","group");box.setAttribute("aria-label","Language");
  box.innerHTML='<button type="button" data-lang="ko"'+(lang==="ko"?' aria-pressed="true"':'')+'>한국어</button><button type="button" data-lang="en"'+(lang==="en"?' aria-pressed="true"':'')+'>EN</button>';
  box.addEventListener("click",e=>{const b=e.target.closest("[data-lang]");if(!b||b.dataset.lang===lang)return;try{localStorage.setItem(KEY,b.dataset.lang)}catch{}const u=new URL(location.href);u.searchParams.delete("lang");if(b.dataset.lang==="en")u.searchParams.set("lang","en");location.href=u.toString()});
  const nav=document.querySelector(".mastnav");if(nav)nav.prepend(box);else document.body.prepend(box);
 }
 function start(){
  toggle();
  if(lang!=="en")return;
  document.documentElement.lang="en";
  document.documentElement.classList.add("lang-en-loading");
  fetch("data/en/strings.json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(d=>{
   dict=d||{};
   walk(document.body);document.title=tr(document.title);
   new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")walk(m.target);else{m.addedNodes.forEach(walk);if(m.type==="attributes")walk(m.target)}}})
    .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
   document.documentElement.classList.remove("lang-en-loading");
  });
  setTimeout(()=>document.documentElement.classList.remove("lang-en-loading"),2500);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
