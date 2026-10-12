/* PANDO conflict board ("갈등도").
   Who is involved in a conflict and how, drawn on a light map:
   - camps first (which side each actor is on), then one line per pair of actors,
     coloured by relation (적대 red · 지원 green · 중재 grey), arrows for direction;
   - line labels stay hidden until a line or actor is hovered, focused or clicked;
   - below the map, the camps and a relation table grouped by kind, each with its source.
   Data: data/boards.json (researched) or an automatic board from civics conflicts. */
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
 let occP=null;const getOcc=()=>occP||(occP=fetch("data/occupied.json").then(r=>r.json()).then(d=>d.items||[]).catch(()=>[]));
 const getAnchors=()=>anchorP||(anchorP=fetch("data/anchors.json").then(r=>r.json()).catch(()=>({})));

 // relation kinds → three classes the reader can tell apart at a glance
 const TYPES={
  attack:{ko:"공격·교전",cls:"hostile"},sanction:{ko:"제재·단교",cls:"hostile"},claim:{ko:"주장·의혹",cls:"hostile"},
  high:{ko:"무력 충돌",cls:"hostile"},medium:{ko:"긴장·제재",cls:"hostile"},low:{ko:"외교·무역 마찰",cls:"hostile"},
  troops:{ko:"병력 지원",cls:"support"},arms:{ko:"무기·부품",cls:"support"},finance:{ko:"자금·원조",cls:"support"},
  trade:{ko:"거래",cls:"support"},support:{ko:"정치적 지지",cls:"support"},
  mediate:{ko:"중재",cls:"talk"},talks:{ko:"협상·합의",cls:"talk"}
 };
 const CLASS={hostile:{ko:"적대",desc:"공격·제재·비난"},support:{ko:"지원",desc:"병력·무기·자금·지지"},talk:{ko:"중재·협상",desc:"회담·중재"}};
 const TIER={official:"당사자 공식",counter:"상대측 공식",press:"언론",research:"연구기관"};
 const KIND={armed:"무장단체",org:"국제기구·연합",company:"기업",person:"인물",item:"시설·자원"};
 const ICON={ // 24×24 glyphs, drawn in white on a dark disc
  armed:"M1 9.6L5.2 10v2.6L2 13.8zM5.2 9.4h10v2.8h-10zM15.2 10h7.6v1.1h-7.6zM10.6 12.2h2.1l1.1 4.3-1.9.6zM7 12.2h1.7l-.9 3.4-1.5-.4zM16.5 9.4h1v-.8h-1z",
  org:"M12 2.5L2.5 7.5h19zM4.5 9h2.4v8.2H4.5zm4.4 0h2.4v8.2H8.9zm4.4 0h2.4v8.2h-2.4zm4.4 0h2.4v8.2h-2.4zM2.5 18.6h19v2.4h-19z",
  company:"M2.5 21V11l5.5 3v-3l5.5 3V5h3.5v3H20v13zM5 18h2v-2H5zm4.5 0h2v-2h-2zm4.5 0h2v-2h-2z",
  person:"M12 3.5a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zM4.5 21c0-4.2 3.3-6.8 7.5-6.8s7.5 2.6 7.5 6.8z",
  item:"M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"
 };
 const textW=(s,fs)=>[...String(s)].reduce((a,ch)=>a+(/[ㄱ-힝]/.test(ch)?1:0.6),0)*fs;
 function short(s,n=10){s=String(s||"");return s.length>n?s.slice(0,n-1)+"…":s}
 function nameOf(board,id){const a=board.actors.find(x=>x.id===id);return a?a.label:id}

 // Automatic board from civics conflicts when no researched board exists.
 function autoBoard(code,conflict,civics,names){
  const name=c=>names?.(c)||c;
  const actors=[{id:code,code,label:name(code),side:"a"}];
  const other=conflict.with||("ns:"+conflict.withName);
  actors.push(conflict.with?{id:other,code:conflict.with,label:conflict.withName,side:"b"}:{id:other,label:short(conflict.withName,12),icon:"armed",near:code,side:"b",note:conflict.withName});
  const links=[{from:other,to:code,type:conflict.level||"low",label:short(conflict.kind||"갈등",14),detail:conflict.detail||conflict.brief,source:(conflict.sources||[])[0]||null,tier:"press",main:true}];
  return {id:"auto",auto:true,title:name(code)+" ↔ "+conflict.withName,hook:"",summary:conflict.brief||"",actors,links,background:[],videos:[]};
 }

 async function render(slot,board,opts={}){
  slot.innerHTML='<p class="board-loading">갈등도를 그리는 중…</p>';
  let world,anchors;try{[world,anchors]=await Promise.all([getWorld(),getAnchors()])}catch(e){slot.innerHTML='<p class="board-loading">지도 자료를 불러오지 못했습니다.</p>';return}
  const uid=String(opts.uid||"x").replace(/[^\w-]/g,"");
  const project=(lon,lat)=>{const [x,y]=raw(((lon-(world.lon0||0))%360+540)%360-180,lat);return [world.w/2+x*world.k,(world.top-y)*world.k]};
  const flags=global.__FLAGS||{};
  const camp=s=>s==="a"||s==="a2"?"A":s==="b"||s==="b2"?"B":"N";
  const nodes=board.actors.map(a=>({...a}));
  for(const a of nodes){let p=null;if(a.code&&anchors[a.code])p=anchors[a.code];else if(Number.isFinite(a.lat)&&Number.isFinite(a.lon))p=project(a.lon,a.lat);
   if(!p&&a.near&&anchors[a.near])p=[anchors[a.near][0]+8,anchors[a.near][1]+6];if(!p)p=[500,200];a.x=p[0];a.y=p[1]}
  // view: fit both main sides and nearby actors; far ones sit on the rim, pointing home
  const base=nodes.filter(n=>n.side==="a"||n.side==="b");const core0=base.length?base:nodes;
  const bx=core0.reduce((s,n)=>s+n.x,0)/core0.length,by=core0.reduce((s,n)=>s+n.y,0)/core0.length;
  const spread=Math.max(40,...core0.map(n=>Math.hypot(n.x-bx,n.y-by)));const near=Math.max(spread*2.3,120);
  const core=nodes.filter(n=>core0.includes(n)||Math.hypot(n.x-bx,n.y-by)<=near);
  let x0=Math.min(...core.map(n=>n.x)),x1=Math.max(...core.map(n=>n.x)),y0=Math.min(...core.map(n=>n.y)),y1=Math.max(...core.map(n=>n.y));
  const ASP=1.7;let w=Math.max(x1-x0,100)*1.5,h=Math.max(y1-y0,50)*1.7;if(w/h<ASP)w=h*ASP;else h=w/ASP;w=Math.min(w,1000);h=Math.min(h,w/ASP);
  const cx=(x0+x1)/2,cy=(y0+y1)/2+h*0.04;const vb=[cx-w/2,cy-h/2,w,h];
  for(const n of nodes){if(core.includes(n))continue;const dx=n.x-cx,dy=n.y-cy;const hw=w/2-w*0.07,hh=h/2-h*0.14;const t=Math.min(hw/Math.abs(dx||1e-6),hh/Math.abs(dy||1e-6));n.x=cx+dx*t;n.y=cy+dy*t;n.rim=true}
  const r=w*0.024,fs=r*0.62;
  // box = badge + name (+ kind) below; push overlapping boxes apart
  for(const n of nodes){const lines=n.code?1:2;n.bw=Math.max(r*2.3,textW(n.label,fs)+fs*1.1);n.bt=r*1.15;n.bb=r*1.35+fs*1.5*lines}
  for(let it=0;it<160;it++){let moved=false;
   for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const A=nodes[i],B=nodes[j];
    const ox=(A.bw+B.bw)/2+r*0.25-Math.abs(B.x-A.x);const oyA=B.y>=A.y?A.bb+B.bt:B.bb+A.bt;const oy=oyA+r*0.2-Math.abs(B.y-A.y);
    if(ox>0&&oy>0){moved=true;if(ox<oy){const s=(B.x>=A.x?1:-1)*ox/2;A.x-=s;B.x+=s}else{const s=(B.y>=A.y?1:-1)*oy/2;A.y-=s;B.y+=s}}}
   for(const n of nodes){n.x=Math.max(vb[0]+n.bw/2+r*0.3,Math.min(vb[0]+w-n.bw/2-r*0.3,n.x));n.y=Math.max(vb[1]+n.bt+r*1.5,Math.min(vb[1]+h-n.bb-r*0.2,n.y))}
   if(!moved)break}
  const pos={};for(const n of nodes)pos[n.id]=n;

  // one edge per pair of actors
  const pairs=new Map();
  board.links.forEach((l,i)=>{if(!pos[l.from]||!pos[l.to])return;const key=[l.from,l.to].sort().join("|");if(!pairs.has(key))pairs.set(key,{key,a:l.from,b:l.to,items:[]});pairs.get(key).items.push(i)});
  const clsOf=i=>(TYPES[board.links[i].type]||TYPES.support).cls;
  for(const p of pairs.values()){const c=p.items.map(clsOf);p.cls=c.includes("hostile")?"hostile":c.includes("support")?"support":"talk";
   const froms=new Set(p.items.map(i=>board.links[i].from));p.dir=froms.size===1?[...froms][0]:null;if(p.dir){p.a=p.dir;p.b=board.links[p.items[0]].to}}

  const svg=el("svg",{class:"board-svg",viewBox:vb.map(v=>v.toFixed(2)).join(" "),role:"img","aria-label":board.title+" 갈등도"});
  const defs=el("defs");svg.appendChild(defs);
  const clip=el("clipPath",{id:"bclip-"+uid,clipPathUnits:"objectBoundingBox"});clip.appendChild(el("circle",{cx:.5,cy:.5,r:.5}));defs.appendChild(clip);
  for(const c of Object.keys(CLASS)){const m=el("marker",{id:"barrow-"+c+"-"+uid,viewBox:"0 0 10 10",refX:"8.5",refY:"5",markerWidth:"4.2",markerHeight:"4.2",orient:"auto"});m.appendChild(el("path",{d:"M0 0L10 5L0 10z",class:"board-arrow board-arrow--"+c}));defs.appendChild(m)}
  svg.appendChild(el("rect",{x:vb[0]-w,y:vb[1]-h,width:w*3,height:h*3,class:"board-sea"}));
  const land=el("g",{class:"board-land"});const sideOf={};for(const n of nodes)if(n.code)sideOf[n.code]=n.side;
  for(const c of world.countries)land.appendChild(el("path",{d:c.d,class:"board-country"+(c.c&&sideOf[c.c]?" board-side-"+sideOf[c.c]:"")}));
  // Hatched occupied / armed-group-controlled areas (same data as the world map).
  try{const occ=await getOcc();if(occ.length){
   const pf=el("pattern",{id:"bocc-f-"+uid,patternUnits:"userSpaceOnUse",width:"2.4",height:"2.4",patternTransform:"rotate(45)"});pf.appendChild(el("rect",{width:"2.4",height:"2.4",class:"occ-bg"}));pf.appendChild(el("line",{x1:0,y1:0,x2:0,y2:2.4,class:"occ-line"}));defs.appendChild(pf);
   const pp=el("pattern",{id:"bocc-p-"+uid,patternUnits:"userSpaceOnUse",width:"3.6",height:"3.6",patternTransform:"rotate(45)"});pp.appendChild(el("line",{x1:0,y1:0,x2:0,y2:3.6,class:"occ-line occ-line--part"}));defs.appendChild(pp);
   for(const o of occ){if(!o.d)continue;const p=el("path",{d:o.d,class:"board-occ",fill:"url(#bocc-"+(o.extent==="partial"?"p":"f")+"-"+uid+")"});const t=el("title");t.textContent=(o.holder||"")+" "+(o.kind||"")+" · "+(o.name||"");p.appendChild(t);land.appendChild(p)}
  }}catch(e){}
  svg.appendChild(land);
  const linkG=el("g",{class:"board-links"});
  let pi=0;
  for(const p of pairs.values()){const A=pos[p.a],B=pos[p.b];const dx=B.x-A.x,dy=B.y-A.y;const d=Math.hypot(dx,dy)||1;
   const bend=0.12*((pi++%2)?1:-1);const mx=(A.x+B.x)/2-dy*bend,my=(A.y+B.y)/2+dx*bend;
   const u1=Math.hypot(mx-A.x,my-A.y)||1,u2=Math.hypot(mx-B.x,my-B.y)||1;
   const sx=A.x+(mx-A.x)/u1*r*1.2,sy=A.y+(my-A.y)/u1*r*1.2,ex=B.x+(mx-B.x)/u2*r*1.35,ey=B.y+(my-B.y)/u2*r*1.35;
   const dpath="M"+sx.toFixed(2)+" "+sy.toFixed(2)+"Q"+mx.toFixed(2)+" "+my.toFixed(2)+" "+ex.toFixed(2)+" "+ey.toFixed(2);
   p.mid=[0.25*sx+0.5*mx+0.25*ex,0.25*sy+0.5*my+0.25*ey];
   const main=p.items.some(i=>board.links[i].main)||(camp((pos[p.a]||{}).side)!==camp((pos[p.b]||{}).side)&&(pos[p.a].side==="a"||pos[p.a].side==="b")&&(pos[p.b].side==="a"||pos[p.b].side==="b"));
   const g=el("g",{class:"board-pair board-pair--"+p.cls+(main?" board-main":""),"data-pair":p.key,tabindex:"0",role:"button","aria-label":nameOf(board,p.a)+(p.dir?" → ":" ↔ ")+nameOf(board,p.b)+": "+p.items.map(i=>board.links[i].label).join(", ")});
   g.appendChild(el("path",{d:dpath,class:"board-hit"}));
   g.appendChild(el("path",{d:dpath,class:"board-line"+(p.cls==="talk"?" board-line--dash":""),style:"stroke-width:"+(r*(main?0.17:0.11)*Math.min(1.6,1+0.15*(p.items.length-1))).toFixed(3),"marker-end":p.dir&&p.cls!=="talk"?"url(#barrow-"+p.cls+"-"+uid+")":""}));
   g.appendChild(el("path",{d:dpath,class:"board-flow",style:"stroke-width:"+(r*0.12).toFixed(3)+";stroke-dasharray:"+(r*0.05).toFixed(2)+" "+(r*0.9).toFixed(2)}));
   if(p.items.length>1){const b=el("g",{class:"board-count",transform:"translate("+p.mid[0].toFixed(2)+" "+p.mid[1].toFixed(2)+")"});b.appendChild(el("circle",{r:(r*0.42).toFixed(2)}));const t=el("text",{"font-size":(r*0.5).toFixed(2),"text-anchor":"middle","dominant-baseline":"central"});t.textContent=p.items.length;b.appendChild(t);g.appendChild(b)}
   linkG.appendChild(g)}
  svg.appendChild(linkG);
  const nodeG=el("g",{class:"board-nodes"});
  for(const n of nodes){const g=el("g",{class:"board-node board-camp-"+camp(n.side)+(n.side==="a"||n.side==="b"?" board-node--main":""),"data-node":n.id,transform:"translate("+n.x.toFixed(2)+" "+n.y.toFixed(2)+")",tabindex:"0",role:"button","aria-label":n.label+(n.code?"":" ("+(KIND[n.icon]||"주체")+")")});
   g.appendChild(el("circle",{r:(r*1.12).toFixed(2),class:"board-ring"}));
   if(n.code&&flags[n.code])g.appendChild(el("image",{href:flags[n.code],x:-r,y:-r,width:r*2,height:r*2,preserveAspectRatio:"xMidYMid slice","clip-path":"url(#bclip-"+uid+")"}));
   else{g.appendChild(el("circle",{r:r.toFixed(2),class:"board-disc"}));g.appendChild(el("path",{d:ICON[n.icon]||ICON.item,class:"board-icon",transform:"translate("+(-r*0.66).toFixed(2)+" "+(-r*0.66).toFixed(2)+") scale("+(r*1.32/24).toFixed(4)+")"}))}
   const nm=el("g",{class:"board-name",transform:"translate(0 "+(r*1.35+fs*0.75).toFixed(2)+")"});const tw=textW(n.label,fs)+fs*0.9;
   nm.appendChild(el("rect",{x:(-tw/2).toFixed(2),y:(-fs*0.78).toFixed(2),width:tw.toFixed(2),height:(fs*1.56).toFixed(2),rx:(fs*0.25).toFixed(2)}));
   const t=el("text",{"font-size":fs.toFixed(2),"text-anchor":"middle","dominant-baseline":"central"});t.textContent=n.label;nm.appendChild(t);g.appendChild(nm);
   if(!n.code){const k=el("text",{class:"board-kind","font-size":(fs*0.8).toFixed(2),"text-anchor":"middle","dominant-baseline":"central",y:(r*1.35+fs*2.25).toFixed(2)});k.textContent=KIND[n.icon]||"주체";g.appendChild(k)}
   nodeG.appendChild(g)}
  svg.appendChild(nodeG);

  // ── HTML around the map
  const campsOf={A:[],B:[],N:[]};for(const a of board.actors)campsOf[camp(a.side)].push(a);
  const lead=s=>{const all=board.actors.filter(a=>a.side===s),st=all.filter(a=>a.code);return (st.length?st:all).map(a=>a.label).join("·")};
  const campName={A:(lead("a")||"한쪽")+" 쪽",B:(lead("b")||"맞은편")+" 쪽",N:"중재·제3자"};
  const chip=a=>'<button type="button" class="board-who" data-who="'+esc(a.id)+'">'+(a.code&&flags[a.code]?'<img src="'+flags[a.code]+'" alt="">':'<i class="board-who-ic" aria-hidden="true"></i>')+'<span>'+esc(a.label)+'</span>'+(a.code?"":'<small>'+esc(KIND[a.icon]||"주체")+'</small>')+((a.side==="a2"||a.side==="b2")?'<em>돕는 쪽</em>':"")+'</button>';
  const camps='<div class="board-camps">'+["A","B","N"].filter(k=>campsOf[k].length).map(k=>'<div class="board-camp board-camp--'+k+'"><h5><i></i>'+esc(campName[k])+'</h5><div>'+campsOf[k].map(chip).join("")+'</div></div>').join("")+'</div>';
  const legend='<div class="board-legend">'+Object.entries(CLASS).filter(([c])=>[...pairs.values()].some(p=>p.cls===c)).map(([c,v])=>'<span><i class="board-ln board-ln--'+c+'"></i><b>'+v.ko+'</b> '+v.desc+'</span>').join("")+'<span class="board-legend-tip">선·주체에 마우스를 올리거나 누르면 내용이 보여요</span></div>';
  const row=i=>{const l=board.links[i],t=TYPES[l.type]||TYPES.support,s=l.source;return '<li><button type="button" data-link-row="'+i+'"><span class="board-rel"><b>'+esc(nameOf(board,l.from))+'</b><span class="board-arw board-arw--'+t.cls+'">→</span><b>'+esc(nameOf(board,l.to))+'</b></span><span class="board-what"><span class="board-chip board-chip--'+t.cls+'">'+esc(t.ko)+'</span>'+esc(l.label)+(l.since?' <small>'+esc(String(l.since))+'~</small>':"")+'</span></button></li>'};
  const groups=Object.keys(CLASS).map(c=>{const ids=board.links.map((l,i)=>i).filter(i=>pos[board.links[i].from]&&pos[board.links[i].to]&&clsOf(i)===c);return ids.length?'<section class="board-group board-group--'+c+'"><h5>'+CLASS[c].ko+' <small>'+ids.length+'</small></h5><ul>'+ids.map(row).join("")+'</ul></section>':""}).join("");
  const bg=(board.background||[]).length?'<details class="board-bg"><summary>어떻게 여기까지 왔나 <small>'+board.background.length+'</small></summary><ol>'+board.background.map(b=>'<li><time>'+esc(b.date)+'</time><span>'+esc(b.text)+' '+(b.source?'<a href="'+esc(safe(b.source[2]))+'" target="_blank" rel="noopener noreferrer">'+esc(b.source[0])+' ↗</a>':"")+'</span></li>').join("")+'</ol></details>':"";
  const vids=(board.videos||[]).length?'<div class="board-videos"><h5>날리지식에서 더 깊이 보기</h5><ul>'+board.videos.map(v=>'<li><a href="https://www.youtube.com/watch?v='+esc(v.id)+'" target="_blank" rel="noopener noreferrer">'+esc(v.title||"영상")+' ↗</a><span>'+esc(v.why||"")+'</span></li>').join("")+'</ul><p>유튜브 영상은 단서입니다. 판도는 영상이 인용한 원문을 직접 확인한 내용만 위 관계·경위에 실었습니다.</p></div>':"";
  slot.innerHTML='<div class="board">'+
   '<header class="board-head"><span class="board-kicker">'+(board.auto?"갈등도 · 자동 구성":"갈등도 · "+esc(board.asOf||"")+" 기준")+'</span><h4>'+esc(board.title)+'</h4>'+(board.hook?'<p class="board-hook">'+esc(board.hook)+'</p>':"")+(board.summary&&!board.auto?'<p class="board-summary">'+esc(board.summary)+'</p>':"")+'</header>'+
   camps+legend+'<div class="board-stage"><div class="board-tip" hidden></div></div>'+
   '<div class="board-detail" aria-live="polite"></div>'+
   '<div class="board-groups">'+groups+'</div>'+bg+vids+
   (board.auto?'<p class="board-auto-note">이 갈등은 아직 주체별 조사 전이라 판도 갈등 관계 자료로 자동 구성했습니다.</p>':"")+'</div>';
  const stage=slot.querySelector(".board-stage"),tip=stage.querySelector(".board-tip"),detail=slot.querySelector(".board-detail");
  stage.insertBefore(svg,tip);

  const linkHtml=i=>{const l=board.links[i],t=TYPES[l.type]||TYPES.support,s=l.source;
   return '<article class="board-card"><header><span class="board-chip board-chip--'+t.cls+'">'+esc(t.ko)+'</span><h5>'+esc(nameOf(board,l.from))+' → '+esc(nameOf(board,l.to))+' · '+esc(l.label)+'</h5>'+(l.since?'<small>'+esc(String(l.since))+'부터</small>':"")+'</header>'+(l.detail?'<p>'+esc(l.detail)+'</p>':"")+(l.dispute?'<p class="board-dispute"><b>반론</b> '+esc(l.dispute)+'</p>':"")+(s?'<p class="board-src">'+(l.tier&&TIER[l.tier]?'<span class="board-tier board-tier--'+esc(l.tier)+'">'+TIER[l.tier]+'</span>':"")+'<a href="'+esc(safe(s[2]))+'" target="_blank" rel="noopener noreferrer">'+esc(s[0])+(s[1]?' · '+esc(s[1]):"")+' ↗</a></p>':"")+'</article>'};
  const highlight=(pairKeys,nodeIds)=>{svg.classList.toggle("board-focus",!!pairKeys);
   svg.querySelectorAll("[data-pair]").forEach(n=>n.classList.toggle("on",!!pairKeys&&pairKeys.includes(n.dataset.pair)));
   svg.querySelectorAll("[data-node]").forEach(n=>n.classList.toggle("on",!!nodeIds&&nodeIds.includes(n.dataset.node)))};
  const showTip=(html,x,y)=>{const box=stage.getBoundingClientRect(),pt=svg.createSVGPoint();pt.x=x;pt.y=y;const m=svg.getScreenCTM();if(!m)return;const q=pt.matrixTransform(m);
   tip.innerHTML=html;tip.hidden=false;const tx=Math.max(8,Math.min(box.width-tip.offsetWidth-8,q.x-box.left-tip.offsetWidth/2));const ty=q.y-box.top-tip.offsetHeight-12;tip.style.left=tx+"px";tip.style.top=(ty<6?q.y-box.top+18:ty)+"px"};
  const pairTip=p=>'<b>'+esc(nameOf(board,p.a))+(p.dir?" → ":" ↔ ")+esc(nameOf(board,p.b))+'</b>'+p.items.map(i=>{const l=board.links[i],t=TYPES[l.type]||TYPES.support;return '<span><i class="board-dot board-dot--'+t.cls+'"></i>'+esc(l.label)+'</span>'}).join("");
  const nodeTip=id=>{const a=board.actors.find(x=>x.id===id)||{};const ps=[...pairs.values()].filter(p=>p.a===id||p.b===id);
   return '<b>'+esc(a.label||id)+'</b><small>'+esc(a.code?{A:campName.A,B:campName.B,N:"중재·제3자"}[camp(a.side)]:(KIND[a.icon]||"주체")+" · "+{A:campName.A,B:campName.B,N:"중재·제3자"}[camp(a.side)])+'</small>'+ps.map(p=>{const o=p.a===id?p.b:p.a;return '<span><i class="board-dot board-dot--'+p.cls+'"></i>'+esc(nameOf(board,o))+' · '+esc(CLASS[p.cls].ko)+'</span>'}).join("")};
  const selectPair=(key,soft)=>{const p=pairs.get(key);if(!p)return;if(!soft)highlight([key],[p.a,p.b]);detail.innerHTML=p.items.map(linkHtml).join("");
   slot.querySelectorAll("[data-link-row]").forEach(b=>b.classList.toggle("on",p.items.includes(+b.dataset.linkRow)))};
  const selectNode=id=>{const ps=[...pairs.values()].filter(p=>p.a===id||p.b===id);highlight(ps.map(p=>p.key),[id,...ps.flatMap(p=>[p.a,p.b])]);
   const a=board.actors.find(x=>x.id===id)||{};
   detail.innerHTML='<article class="board-card"><header><h5>'+esc(a.label||id)+'</h5><small>'+esc(a.code?"국가":(KIND[a.icon]||"주체"))+' · '+esc({A:campName.A,B:campName.B,N:"중재·제3자"}[camp(a.side)])+((a.side==="a2"||a.side==="b2")?" (돕는 쪽)":"")+'</small></header>'+(a.note?'<p>'+esc(a.note)+'</p>':"")+'<ul class="board-node-rel">'+ps.flatMap(p=>p.items).map(i=>{const l=board.links[i],t=TYPES[l.type]||TYPES.support;return '<li><button type="button" data-link-row="'+i+'"><span class="board-chip board-chip--'+t.cls+'">'+esc(t.ko)+'</span>'+esc(nameOf(board,l.from))+' → '+esc(nameOf(board,l.to))+' · '+esc(l.label)+'</button></li>'}).join("")+'</ul>'+(a.code&&opts.onCountry?'<button type="button" class="board-goto" data-board-country="'+esc(a.code)+'">'+esc(a.label)+' 국가 정보 →</button>':"")+'</article>'};
  const selectLink=i=>{const l=board.links[i];if(!l)return;const key=[l.from,l.to].sort().join("|");highlight([key],[l.from,l.to]);detail.innerHTML=linkHtml(i);
   slot.querySelectorAll("[data-link-row]").forEach(b=>b.classList.toggle("on",+b.dataset.linkRow===i))};
  svg.addEventListener("pointerover",e=>{const pg=e.target.closest("[data-pair]"),nd=e.target.closest("[data-node]");
   if(nd){const n=pos[nd.dataset.node];showTip(nodeTip(nd.dataset.node),n.x,n.y-r*1.2)}else if(pg){const p=pairs.get(pg.dataset.pair);showTip(pairTip(p),p.mid[0],p.mid[1])}});
  svg.addEventListener("pointerleave",()=>{tip.hidden=true});
  svg.addEventListener("pointerout",e=>{if(!e.relatedTarget||!svg.contains(e.relatedTarget))tip.hidden=true});
  slot.addEventListener("click",e=>{const rw=e.target.closest("[data-link-row]");if(rw){selectLink(+rw.dataset.linkRow);return}
   const who=e.target.closest("[data-who]");if(who){selectNode(who.dataset.who);return}
   const pg=e.target.closest("[data-pair]");if(pg){selectPair(pg.dataset.pair);return}
   const nd=e.target.closest("[data-node]");if(nd){selectNode(nd.dataset.node);return}
   const bc=e.target.closest("[data-board-country]");if(bc&&opts.onCountry){opts.onCountry(bc.dataset.boardCountry)}});
  slot.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const pg=e.target.closest("[data-pair]"),nd=e.target.closest("[data-node]");if(pg){e.preventDefault();selectPair(pg.dataset.pair)}else if(nd){e.preventDefault();selectNode(nd.dataset.node)}});
  svg.addEventListener("focusin",e=>{const pg=e.target.closest("[data-pair]"),nd=e.target.closest("[data-node]");if(pg){const p=pairs.get(pg.dataset.pair);showTip(pairTip(p),p.mid[0],p.mid[1])}else if(nd){const n=pos[nd.dataset.node];showTip(nodeTip(nd.dataset.node),n.x,n.y-r*1.2)}});
  svg.addEventListener("focusout",()=>{tip.hidden=true});
  const mainPair=[...pairs.values()].find(p=>p.items.some(i=>board.links[i].main))||[...pairs.values()].find(p=>{const A=pos[p.a],B=pos[p.b];return (A.side==="a"&&B.side==="b")||(A.side==="b"&&B.side==="a")});
  if(mainPair&&opts.preselect!==false)selectPair(mainPair.key,true);
 }
 global.PandoBoard={render,autoBoard};
})(window);
