/* PANDO conflict board ("갈등도"): draws who is involved in a conflict and how,
   on a desaturated map with round flag badges, labelled links and a source credit,
   in the spirit of map explainers. Data: data/boards.json (researched boards) or an
   automatic board built from civics conflicts. Projection matches map.js. */
(function(global){
 "use strict";
 const NS="http://www.w3.org/2000/svg";
 const el=(n,a={})=>{const x=document.createElementNS(NS,n);for(const k in a)x.setAttribute(k,a[k]);return x};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const safe=u=>/^https?:\/\//.test(String(u||""))?String(u):"#";
 const raw=(lon,lat)=>{const l=lon*Math.PI/180,p=lat*Math.PI/180,p2=p*p,p4=p2*p2;
  return [l*(0.8707-0.131979*p2+p4*(-0.013791+p4*(0.003971*p2-0.001529*p4))),p*(1.007226+p2*(0.015085+p4*(-0.044475+0.028874*p2-0.005916*p4)))]};
 let worldP=null,anchorP=null;
 const getWorld=()=>worldP||(worldP=fetch("data/world.json").then(r=>r.json()));
 const getAnchors=()=>anchorP||(anchorP=fetch("data/anchors.json").then(r=>r.json()).catch(()=>({})));
 const TYPES={
  attack:{ko:"공격·교전",cls:"attack"},troops:{ko:"병력",cls:"mil"},arms:{ko:"무기·부품",cls:"mil"},
  finance:{ko:"자금·원조",cls:"money"},trade:{ko:"거래",cls:"money"},sanction:{ko:"제재·단교",cls:"sanction"},
  mediate:{ko:"중재",cls:"talk"},talks:{ko:"협상·합의",cls:"talk"},claim:{ko:"주장·의혹",cls:"claim"},support:{ko:"지지",cls:"support"},
  high:{ko:"무력 충돌",cls:"attack"},medium:{ko:"긴장·제재",cls:"sanction"},low:{ko:"외교·무역 마찰",cls:"support"}
 };
 const TIER={official:"당사자 공식",counter:"상대측 공식",press:"언론",research:"연구기관"};
 const ICON={ // 24x24 glyphs, drawn white
  armed:"M4 13h11l2-2h3v2h-2l-1 2H9l-1 3H6l1-3H4z",
  org:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 2c1 1.3 1.8 3.5 2 6h-4c.2-2.5 1-4.7 2-6zm-6.8 6a7 7 0 0 1 3-4.6c-.6 1.3-1 3-1.2 4.6zm0 2h1.8c.2 1.7.6 3.3 1.2 4.6a7 7 0 0 1-3-4.6zm4.8 0h4c-.2 2.5-1 4.7-2 6-1-1.3-1.8-3.5-2-6zm5.8 4.6c.6-1.3 1-2.9 1.2-4.6h1.8a7 7 0 0 1-3 4.6zm1.2-6.6c-.2-1.7-.6-3.3-1.2-4.6a7 7 0 0 1 3 4.6z",
  company:"M4 20V8l6-3v4l6-3v14zm3-3h2v-2H7zm0-4h2v-2H7zm5 4h2v-2h-2zm0-4h2v-2h-2z",
  person:"M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 16c0-3.9 3.1-6 7-6s7 2.1 7 6z",
  item:"M12 3l8 9-8 9-8-9z"
 };

 // Automatic board from civics conflicts when no researched board exists.
 function autoBoard(code,conflict,civics,names){
  const name=c=>names?.(c)||c;
  const actors=[{id:code,code,label:name(code),side:"a"}];
  const other=conflict.with||("ns:"+conflict.withName);
  actors.push(conflict.with?{id:other,code:conflict.with,label:conflict.withName,side:"b"}:{id:other,label:short(conflict.withName),icon:"armed",near:code,side:"b",note:conflict.withName});
  const links=[{from:other,to:code,type:conflict.level||"low",label:short(conflict.kind||"갈등",12),detail:conflict.detail||conflict.brief,source:(conflict.sources||[])[0]||null,tier:"press",main:true}];
  const add=(from,list)=>{for(const c of (list||[]).slice(0,6)){if(!c.with||c.with===code||c.with===conflict.with)continue;
   if(!actors.find(a=>a.id===c.with))actors.push({id:c.with,code:c.with,label:c.withName,side:"n",faint:true});
   links.push({from,to:c.with,type:c.level||"low",label:short(c.brief||c.kind,12),detail:c.detail||c.brief,source:(c.sources||[])[0]||null,tier:"press",faint:true})}};
  add(code,civics?.[code]?.conflicts);if(conflict.with)add(conflict.with,civics?.[conflict.with]?.conflicts);
  return {id:"auto",auto:true,title:name(code)+" ↔ "+conflict.withName,hook:"",summary:conflict.brief||"",actors:actors.slice(0,12),links:links.filter(l=>actors.find(a=>a.id===l.to)&&actors.find(a=>a.id===l.from)),background:[],videos:[]};
 }
 function short(s,n=10){s=String(s||"");return s.length>n?s.slice(0,n-1)+"…":s}

 async function render(slot,board,opts={}){
  slot.innerHTML='<p class="board-loading">갈등도를 그리는 중…</p>';
  let world,anchors;try{[world,anchors]=await Promise.all([getWorld(),getAnchors()])}catch(e){slot.innerHTML='<p class="board-loading">지도 자료를 불러오지 못했습니다.</p>';return}
  const project=(lon,lat)=>{const [x,y]=raw(lon,lat);return [world.w/2+x*world.k,(world.top-y)*world.k]};
  const flags=global.__FLAGS||{};
  // positions
  const pos={};const nodes=board.actors.map(a=>({...a}));
  for(const a of nodes){let p=null;if(a.code&&anchors[a.code])p=anchors[a.code];else if(Number.isFinite(a.lat)&&Number.isFinite(a.lon))p=project(a.lon,a.lat);
   if(!p&&a.near&&anchors[a.near])p=[anchors[a.near][0]+6,anchors[a.near][1]+5];if(!p)p=[500,200];a.x=p[0];a.y=p[1];a.hx=p[0];a.hy=p[1]}
  // view box: fit the core (both sides and nearby actors); far actors sit on the rim pointing home
  const core0=nodes.filter(n=>n.side==="a"||n.side==="b");const base=core0.length?core0:nodes;
  const bx=base.reduce((a,n)=>a+n.x,0)/base.length,by=base.reduce((a,n)=>a+n.y,0)/base.length;
  const spread=Math.max(40,...base.map(n=>Math.hypot(n.x-bx,n.y-by)));const near=Math.max(spread*2.2,110);
  const core=nodes.filter(n=>base.includes(n)||Math.hypot(n.x-bx,n.y-by)<=near);
  let x0=Math.min(...core.map(n=>n.x)),x1=Math.max(...core.map(n=>n.x)),y0=Math.min(...core.map(n=>n.y)),y1=Math.max(...core.map(n=>n.y));
  const ASP=1.6;let w=Math.max(x1-x0,90)*1.4,h=Math.max(y1-y0,40)*1.55;if(w/h<ASP)w=h*ASP;else h=w/ASP;w=Math.min(w,1000);h=Math.min(h,w/ASP);
  let cx=(x0+x1)/2,cy=(y0+y1)/2+h*0.03;const vb=[cx-w/2,cy-h/2,w,h];
  for(const n of nodes){if(core.includes(n))continue;const dx=n.x-cx,dy=n.y-cy;const hw=w/2-w*0.06,hh=h/2-h*0.1;const t=Math.min(hw/Math.abs(dx||1e-6),hh/Math.abs(dy||1e-6));n.x=cx+dx*t;n.y=cy+dy*t;n.rim=true}
  const r=w*0.026;
  // relax overlapping badges
  for(let it=0;it<80;it++){let moved=false;for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const A=nodes[i],B=nodes[j];let dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||0.01;const min=r*2.9;if(d<min){const push=(min-d)/2;dx/=d;dy/=d;if(!dx&&!dy){dx=1}A.x-=dx*push;A.y-=dy*push;B.x+=dx*push;B.y+=dy*push;moved=true}}
   for(const n of nodes){n.x=Math.max(vb[0]+r*1.6,Math.min(vb[0]+w-r*1.6,n.x));n.y=Math.max(vb[1]+r*1.4,Math.min(vb[1]+h-r*2.2,n.y))}if(!moved)break}
  for(const n of nodes)pos[n.id]=n;
  const svg=el("svg",{class:"board-svg"+(board.links.filter(l=>!l.faint).length>6?" board-quiet":""),viewBox:vb.map(v=>v.toFixed(2)).join(" "),role:"img","aria-label":board.title+" 갈등도"});
  const defs=el("defs");svg.appendChild(defs);
  const clip=el("clipPath",{id:"bclip-"+(opts.uid||"x"),clipPathUnits:"objectBoundingBox"});clip.appendChild(el("circle",{cx:.5,cy:.5,r:.5}));defs.appendChild(clip);
  for(const c of ["attack","mil","money","sanction","talk","claim","support"]){const m=el("marker",{id:"barrow-"+c+"-"+(opts.uid||"x"),viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"5",markerHeight:"5",orient:"auto-start-reverse"});m.appendChild(el("path",{d:"M0 0L10 5L0 10z",class:"board-arrow board-arrow--"+c}));defs.appendChild(m)}
  svg.appendChild(el("rect",{x:vb[0]-w,y:vb[1]-h,width:w*3,height:h*3,class:"board-sea"}));
  const land=el("g",{class:"board-land"});const sideOf={};for(const n of nodes)if(n.code)sideOf[n.code]=n.side;
  for(const c of world.countries){const p=el("path",{d:c.d,class:"board-country"+(c.c&&sideOf[c.c]?" board-side-"+sideOf[c.c]:"")});land.appendChild(p)}
  svg.appendChild(land);
  // links
  const linkG=el("g",{class:"board-links"}),labelG=el("g",{class:"board-link-labels"});
  const pairCount={};
  board.links.forEach((l,i)=>{const A=pos[l.from],B=pos[l.to];if(!A||!B)return;const key=[l.from,l.to].sort().join("|");const k=pairCount[key]=(pairCount[key]||0)+1;
   const t=TYPES[l.type]||TYPES.support;const dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||1;const sign=(k%2?1:-1)*(l.from<l.to?1:-1);const bend=(0.18+0.14*Math.floor((k-1)/2))*sign;
   const mx=(A.x+B.x)/2-dy*bend,my=(A.y+B.y)/2+dx*bend;
   // trim ends to badge edges
   const ux1=(mx-A.x),uy1=(my-A.y),n1=Math.hypot(ux1,uy1)||1,ux2=(mx-B.x),uy2=(my-B.y),n2=Math.hypot(ux2,uy2)||1;
   const sx=A.x+ux1/n1*r*1.12,sy=A.y+uy1/n1*r*1.12,ex=B.x+ux2/n2*r*1.25,ey=B.y+uy2/n2*r*1.25;
   const dpath="M"+sx.toFixed(2)+" "+sy.toFixed(2)+"Q"+mx.toFixed(2)+" "+my.toFixed(2)+" "+ex.toFixed(2)+" "+ey.toFixed(2);
   const g=el("g",{class:"board-link board-link--"+t.cls+(l.faint?" board-faint":"")+(l.main?" board-main":""),"data-link":i,tabindex:"0",role:"button","aria-label":(nameOf(board,l.from)+" → "+nameOf(board,l.to)+" "+l.label)});
   g.appendChild(el("path",{d:dpath,class:"board-hit"}));
   g.appendChild(el("path",{d:dpath,class:"board-line","marker-end":l.type==="mediate"||l.type==="talks"||l.type==="support"?"":"url(#barrow-"+t.cls+"-"+(opts.uid||"x")+")",style:"stroke-width:"+(r*(l.main?0.13:l.faint?0.05:0.085)).toFixed(3)}));
   if(t.cls==="attack"||t.cls==="mil"||t.cls==="money")g.appendChild(el("path",{d:dpath,class:"board-flow",style:"stroke-width:"+(r*0.16).toFixed(3)+";stroke-dasharray:0 "+(r*0.55).toFixed(2)}));
   linkG.appendChild(g);
   const lx=0.25*sx+0.5*mx+0.25*ex,ly=0.25*sy+0.5*my+0.25*ey;
   if(!l.faint){const lab=el("g",{class:"board-link-label board-link-label--"+t.cls,"data-link":i,transform:"translate("+lx.toFixed(2)+" "+ly.toFixed(2)+")"});
    const fs=r*0.42,tw=Math.max(2,[...String(l.label)].reduce((a,ch)=>a+(/[ㄱ-힝]/.test(ch)?1:0.58),0))*fs+fs*0.9;
    lab.appendChild(el("rect",{x:-tw/2,y:-fs*0.85,width:tw,height:fs*1.7,rx:fs*0.3}));const tx=el("text",{"font-size":fs.toFixed(2),"text-anchor":"middle","dominant-baseline":"central"});tx.textContent=l.label;lab.appendChild(tx);labelG.appendChild(lab)}
  });
  svg.appendChild(linkG);
  // nodes
  const nodeG=el("g",{class:"board-nodes"});
  for(const n of nodes){const g=el("g",{class:"board-node board-node--"+(n.side||"n")+(n.faint?" board-faint":""),"data-node":n.id,transform:"translate("+n.x.toFixed(2)+" "+n.y.toFixed(2)+")",tabindex:"0",role:"button","aria-label":n.label});
   const rr=n.faint?r*0.72:r;
   if(n.code&&flags[n.code]){g.appendChild(el("circle",{r:rr*1.08,class:"board-ring"}));const im=el("image",{href:flags[n.code],x:-rr,y:-rr,width:rr*2,height:rr*2,preserveAspectRatio:"xMidYMid slice","clip-path":"url(#bclip-"+(opts.uid||"x")+")"});g.appendChild(im)}
   else{g.appendChild(el("rect",{x:-rr,y:-rr,width:rr*2,height:rr*2,rx:rr*0.28,class:"board-tile"}));const ic=el("path",{d:ICON[n.icon]||ICON.item,class:"board-icon",transform:"translate("+(-rr*0.62)+" "+(-rr*0.62)+") scale("+(rr*1.24/24).toFixed(4)+")"});g.appendChild(ic)}
   const fs=rr*0.5,tw=[...String(n.label)].reduce((a,ch)=>a+(/[ㄱ-힝]/.test(ch)?1:0.6),0)*fs+fs;
   const lg=el("g",{class:"board-name",transform:"translate(0 "+(rr*1.62).toFixed(2)+")"});lg.appendChild(el("rect",{x:-tw/2,y:-fs*0.8,width:tw,height:fs*1.6,rx:fs*0.2}));const t=el("text",{"font-size":fs.toFixed(2),"text-anchor":"middle","dominant-baseline":"central"});t.textContent=n.label;lg.appendChild(t);g.appendChild(lg);
   nodeG.appendChild(g)}
  svg.appendChild(nodeG);svg.appendChild(labelG);
  // credit
  const credit=el("text",{class:"board-credit",x:(vb[0]+w-r*0.4).toFixed(2),y:(vb[1]+r*0.75).toFixed(2),"text-anchor":"end","font-size":(r*0.4).toFixed(2)});credit.textContent=board.auto?"출처 : 판도 갈등 관계 자료":"출처 : 관계를 누르면 표시";svg.appendChild(credit);
  const brand=el("text",{class:"board-brand",x:(vb[0]+r*0.5).toFixed(2),y:(vb[1]+r*0.95).toFixed(2),"font-size":(r*0.62).toFixed(2)});brand.textContent="판도 갈등도";svg.appendChild(brand);

  const legendTypes=[...new Set(board.links.filter(l=>!l.faint).map(l=>(TYPES[l.type]||TYPES.support).cls))];
  const legendNames={attack:"공격·교전",mil:"병력·무기",money:"자금·거래",sanction:"제재·긴장",talk:"중재·협상",claim:"주장·의혹",support:"지지·마찰"};
  const sides=[["a",nameOf(board,(board.actors.find(a=>a.side==="a")||{}).id)],["b",nameOf(board,(board.actors.find(a=>a.side==="b")||{}).id)],["a2","앞쪽을 돕는 쪽"],["b2","맞은편을 돕는 쪽"],["n","중재·제3자"]].filter(([s])=>board.actors.some(a=>a.side===s));
  const rows=board.links.map((l,i)=>l.faint?"":'<li><button type="button" data-link-row="'+i+'"><span class="board-chip board-chip--'+(TYPES[l.type]||TYPES.support).cls+'">'+esc((TYPES[l.type]||{}).ko||l.type)+'</span><span class="board-row-text"><b>'+esc(nameOf(board,l.from))+' → '+esc(nameOf(board,l.to))+'</b> · '+esc(l.label)+(l.since?' <small>'+esc(l.since)+'~</small>':"")+'</span></button></li>').join("");
  const others=board.links.filter(l=>l.faint);
  const bg=(board.background||[]).length?'<details class="board-bg" open><summary>어떻게 여기까지 왔나</summary><ol>'+board.background.map(b=>'<li><time>'+esc(b.date)+'</time><span>'+esc(b.text)+' '+(b.source?'<a href="'+esc(safe(b.source[2]))+'" target="_blank" rel="noopener noreferrer">'+esc(b.source[0])+' ↗</a>':"")+'</span></li>').join("")+'</ol></details>':"";
  const vids=(board.videos||[]).length?'<div class="board-videos"><h5>날리지식에서 더 깊이 보기</h5><ul>'+board.videos.map(v=>'<li><a href="https://www.youtube.com/watch?v='+esc(v.id)+'" target="_blank" rel="noopener noreferrer">'+esc(v.title||"영상")+' ↗</a><span>'+esc(v.why||"")+'</span></li>').join("")+'</ul><p>유튜브 영상은 단서입니다. 판도는 영상이 인용한 원문을 직접 확인한 내용만 위 관계·경위에 실었습니다.</p></div>':"";
  slot.innerHTML='<div class="board">'+
   '<header class="board-head"><span class="board-kicker">'+(board.auto?"갈등도 · 자동 구성":"갈등도 · "+esc(board.asOf||""))+'</span><h4>'+esc(board.title)+'</h4>'+(board.hook?'<p class="board-hook">'+esc(board.hook)+'</p>':"")+(board.summary&&!board.auto?'<p class="board-summary">'+esc(board.summary)+'</p>':"")+'</header>'+
   '<div class="board-stage"></div>'+
   '<div class="board-legend">'+sides.map(([s,l])=>'<span><i class="board-sw board-sw--'+s+'"></i>'+esc(l)+'</span>').join("")+legendTypes.map(c=>'<span><i class="board-ln board-ln--'+c+'"></i>'+esc(legendNames[c])+'</span>').join("")+'</div>'+
   '<div class="board-detail" aria-live="polite"><p class="board-tip">선이나 아래 목록을 누르면 근거가 나옵니다.</p></div>'+
   '<ul class="board-rows">'+rows+'</ul>'+
   (others.length?'<p class="board-others">흐린 선: 두 나라가 따로 겪는 다른 갈등 '+others.length+'건</p>':"")+
   bg+vids+(board.auto?'<p class="board-auto-note">이 갈등은 아직 주체별 조사 전이라 판도 갈등 관계 자료로 자동 구성했습니다.</p>':"")+'</div>';
  slot.querySelector(".board-stage").appendChild(svg);
  const detail=slot.querySelector(".board-detail");
  const select=i=>{const l=board.links[i];if(!l)return;svg.classList.add("board-focus");
   svg.querySelectorAll("[data-link]").forEach(n=>n.classList.toggle("on",n.dataset.link===String(i)));
   svg.querySelectorAll("[data-node]").forEach(n=>n.classList.toggle("on",n.dataset.node===l.from||n.dataset.node===l.to));
   slot.querySelectorAll("[data-link-row]").forEach(b=>b.classList.toggle("on",b.dataset.linkRow===String(i)));
   const s=l.source;credit.textContent=s?("출처 : "+s[0]+(s[1]?"("+short(s[1],46)+")":"")):"출처 : 판도 갈등 관계 자료";
   detail.innerHTML='<div class="board-card"><span class="board-chip board-chip--'+(TYPES[l.type]||TYPES.support).cls+'">'+esc((TYPES[l.type]||{}).ko||l.type)+'</span><h5>'+esc(nameOf(board,l.from))+' → '+esc(nameOf(board,l.to))+' · '+esc(l.label)+'</h5><p>'+esc(l.detail||"")+'</p>'+(l.dispute?'<p class="board-dispute"><b>반론</b> '+esc(l.dispute)+'</p>':"")+(s?'<p class="board-src">'+(l.tier&&TIER[l.tier]?'<span class="board-tier board-tier--'+esc(l.tier)+'">'+TIER[l.tier]+'</span>':"")+'<a href="'+esc(safe(s[2]))+'" target="_blank" rel="noopener noreferrer">'+esc(s[0])+' · '+esc(s[1]||"")+' ↗</a></p>':"")+'</div>'};
  const selectNode=id=>{const ls=board.links.map((l,i)=>[l,i]).filter(([l])=>l.from===id||l.to===id);svg.classList.add("board-focus");
   svg.querySelectorAll("[data-link]").forEach(n=>n.classList.toggle("on",ls.some(([,i])=>String(i)===n.dataset.link)));
   svg.querySelectorAll("[data-node]").forEach(n=>n.classList.toggle("on",n.dataset.node===id||ls.some(([l])=>l.from===n.dataset.node||l.to===n.dataset.node)));
   const a=board.actors.find(x=>x.id===id);detail.innerHTML='<div class="board-card"><h5>'+esc(a?.label||id)+'</h5>'+(a?.note?'<p>'+esc(a.note)+'</p>':"")+'<p>관계 '+ls.length+'개: '+ls.map(([l])=>esc(l.label)).join(" · ")+'</p>'+(a?.code&&opts.onCountry?'<button type="button" class="board-goto" data-board-country="'+esc(a.code)+'">'+esc(a.label)+' 국가 정보 →</button>':"")+'</div>'};
  slot.addEventListener("click",e=>{const row=e.target.closest("[data-link-row]");if(row){select(+row.dataset.linkRow);return}
   const lk=e.target.closest("[data-link]");if(lk){select(+lk.dataset.link);return}
   const nd=e.target.closest("[data-node]");if(nd){selectNode(nd.dataset.node);return}
   const bc=e.target.closest("[data-board-country]");if(bc&&opts.onCountry){opts.onCountry(bc.dataset.boardCountry);return}});
  slot.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const lk=e.target.closest("[data-link]");if(lk){e.preventDefault();select(+lk.dataset.link)}const nd=e.target.closest("[data-node]");if(nd){e.preventDefault();selectNode(nd.dataset.node)}});
  const first=board.links.findIndex(l=>l.main)>=0?board.links.findIndex(l=>l.main):board.links.findIndex(l=>!l.faint);
  if(first>=0&&opts.preselect!==false)select(first);
 }
 function nameOf(board,id){const a=board.actors.find(x=>x.id===id);return a?a.label:id}
 global.PandoBoard={render,autoBoard};
})(window);
