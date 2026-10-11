/* Frontline atlas for the artifact: a self-contained vector world map.
   No tile servers (the artifact sandbox blocks them). Natural Earth I projection,
   the same formula used to pre-project data/world.json, so pins line up. */
(function(global){
 "use strict";
 const NS="http://www.w3.org/2000/svg";
 const raw=(lon,lat)=>{
  const l=lon*Math.PI/180,p=lat*Math.PI/180,p2=p*p,p4=p2*p2;
  return [l*(0.8707-0.131979*p2+p4*(-0.013791+p4*(0.003971*p2-0.001529*p4))),
          p*(1.007226+p2*(0.015085+p4*(-0.044475+0.028874*p2-0.005916*p4)))];
 };
 const el=(name,attrs={})=>{const n=document.createElementNS(NS,name);for(const k in attrs)n.setAttribute(k,attrs[k]);return n};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

 function mount(target,options={}){
  const frame=typeof target==="string"?document.querySelector(target):target;
  const onSelect=options.onSelect||(()=>{});
  frame.classList.add("vmap");
  frame.innerHTML='<svg class="vmap-svg" role="img" aria-label="세계 지도"><g class="vmap-land"></g><g class="vmap-pins"></g></svg>'+
   '<div class="vmap-controls"><button type="button" data-z="in" aria-label="확대">+</button><button type="button" data-z="out" aria-label="축소">−</button><button type="button" data-z="reset" aria-label="전체 보기">⟲</button></div>'+
   '<div class="vmap-tip" hidden></div><p class="vmap-loading">지도를 그리는 중…</p>';
  const svg=frame.querySelector("svg"),land=svg.querySelector(".vmap-land"),pinLayer=svg.querySelector(".vmap-pins"),tip=frame.querySelector(".vmap-tip");
  let focused=false,scaleNow=1,world=null,items=Array.isArray(options.items)?options.items:[],view=null,home=null;
  const project=(lon,lat)=>{const [x,y]=raw(lon,lat);return [world.w/2+x*world.k,(world.top-y)*world.k]};

  function setView(v){
   // Keep at least part of the map on screen and the zoom within sensible bounds.
   const minW=home.w/14,maxW=home.w;
   const w=Math.min(maxW,Math.max(minW,v.w)),h=w*home.h/home.w;
   const x=Math.min(home.x+home.w-w*.25,Math.max(home.x-w*.75,v.x));
   const y=Math.min(home.y+home.h-h*.25,Math.max(home.y-h*.75,v.y));
   view={x,y,w,h};
   svg.setAttribute("viewBox",[x,y,w,h].map(n=>n.toFixed(2)).join(" "));
   const s=w/home.w;scaleNow=w/(frame.clientWidth||w);
   pinLayer.querySelectorAll(".vmap-pin").forEach(g=>g.setAttribute("transform",`translate(${g.dataset.x} ${g.dataset.y}) scale(${scaleNow.toFixed(4)})`));
   frame.classList.toggle("vmap-zoomed",s<.55);
   scheduleLabels();
  }
  function fitHome(){
   const r=frame.getBoundingClientRect(),aspect=(r.width||800)/(r.height||420);
   let w=world.w,h=w/aspect;
   if(h<world.h){h=world.h;w=h*aspect}
   home={x:(world.w-w)/2,y:(world.h-h)/2,w,h};
  }
  function zoomAt(factor,cx,cy){
   const nw=view.w*factor,nh=view.h*factor;
   setView({x:cx-(cx-view.x)*factor,y:cy-(cy-view.y)*factor,w:nw,h:nh});
  }
  function toSvg(clientX,clientY){
   const r=svg.getBoundingClientRect();
   return [view.x+(clientX-r.left)/r.width*view.w,view.y+(clientY-r.top)/r.height*view.h];
  }

  // Show as many labels as fit without overlapping; stories win over country markers.
  let labelFrame=0;
  function scheduleLabels(){cancelAnimationFrame(labelFrame);labelFrame=requestAnimationFrame(placeLabels)}
  function placeLabels(){
   const taken=[],fr=frame.getBoundingClientRect();
   const pins=[...pinLayer.querySelectorAll(".vmap-pin")].sort((a,b)=>(b.dataset.type==="story")-(a.dataset.type==="story"));
   for(const g of pins){const r=g.querySelector(".vmap-dot").getBoundingClientRect();taken.push({l:r.left-1,r:r.right+1,t:r.top-1,b:r.bottom+1})}
   for(const g of pins){
    const t=g.querySelector(".vmap-label");t.classList.remove("vmap-label--on");
    const r=t.getBBox?t.getBoundingClientRect():null;if(!r||!r.width)continue;
    const box={l:r.left-2,r:r.right+2,t:r.top-1,b:r.bottom+1};
    const inside=box.l>=fr.left&&box.r<=fr.right&&box.t>=fr.top&&box.b<=fr.bottom;
    if(inside&&!taken.some(o=>box.l<o.r&&box.r>o.l&&box.t<o.b&&box.b>o.t)){taken.push(box);t.classList.add("vmap-label--on")}
   }
  }
  function focusPins(){
   const ps=[...pinLayer.querySelectorAll(".vmap-pin--story")].map(g=>[+g.dataset.x,+g.dataset.y]);
   if(!ps.length)return;
   const med=arr=>arr.sort((a,b)=>a-b)[Math.floor(arr.length/2)];
   const cx=med(ps.map(p=>p[0])),cy=med(ps.map(p=>p[1]));
   const h=world.h*.72,w=h*home.w/home.h;
   setView({x:cx-w/2,y:cy-h/2,w,h});
  }
  function drawLand(){
   const frag=document.createDocumentFragment();
   for(const c of world.countries){
    const p=el("path",{d:c.d,class:"vmap-country"+(c.c?" vmap-link":"")});
    if(c.c){p.dataset.code=c.c;p.dataset.name=c.n}
    frag.appendChild(p);
   }
   land.replaceChildren(frag);
  }
  function drawPins(){
   if(!world)return;
   const watched=new Set(items.filter(i=>i.type==="country").map(i=>i.id));
   land.querySelectorAll(".vmap-country").forEach(p=>p.classList.toggle("vmap-watch",watched.has(p.dataset.code)));
   const frag=document.createDocumentFragment();
   // Country markers first so story pins sit on top.
   const ordered=[...items].sort((a,b)=>(a.type==="story")-(b.type==="story"));
   for(const it of ordered){
    let lon=it.lon,lat=it.lat;
    if(!Number.isFinite(lon)||!Number.isFinite(lat)){
     const c=world.countries.find(c=>c.c===it.id);if(!c)continue;lon=c.lon;lat=c.lat;
    }
    const [x,y]=project(lon,lat);
    const g=el("g",{class:"vmap-pin vmap-pin--"+it.type,transform:`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scaleNow.toFixed(4)})`,tabindex:"0",role:"button","aria-label":(it.label||"")+(it.subtitle?" · "+it.subtitle:"")});
    g.dataset.type=it.type;g.dataset.id=it.id;g.dataset.x=x.toFixed(1);g.dataset.y=y.toFixed(1);
    if(it.type==="story"){g.appendChild(el("circle",{class:"vmap-halo",r:"9"}));g.appendChild(el("circle",{class:"vmap-dot",r:"4.5"}))}
    else g.appendChild(el("rect",{class:"vmap-dot",x:"-3.4",y:"-3.4",width:"6.8",height:"6.8",transform:"rotate(45)"}));
    const t=el("text",{class:"vmap-label",x:"8",y:"4"});t.textContent=it.label||"";g.appendChild(t);
    frag.appendChild(g);
   }
   pinLayer.replaceChildren(frag);
   // Narrow screens open framed on the story cluster, once, so pins are tappable.
   if(!focused&&pinLayer.querySelector(".vmap-pin--story")){focused=true;const r=frame.getBoundingClientRect();if(r.width/r.height<1.3)focusPins()}
   scheduleLabels();
  }

  // Pointer: drag to pan, tap to select. Two fingers pinch-zoom.
  const pts=new Map();let drag=null,moved=false,pinch=null;
  svg.addEventListener("pointerdown",e=>{
   if(!view)return;
   pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
   moved=false;
   if(pts.size===1)drag={x:e.clientX,y:e.clientY,v:{...view}};
   if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),v:{...view},c:toSvg((a.x+b.x)/2,(a.y+b.y)/2)};drag=null}
  });
  svg.addEventListener("pointermove",e=>{
   if(!pts.has(e.pointerId))return;
   pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
   const r=svg.getBoundingClientRect();
   if(pinch&&pts.size===2){
    const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y);
    if(d>0){const f=pinch.d/d;view={...pinch.v};zoomAt(f,pinch.c[0],pinch.c[1])}
    moved=true;return;
   }
   if(drag){
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
    if(moved){if(!svg.hasPointerCapture?.(e.pointerId))svg.setPointerCapture?.(e.pointerId);frame.classList.add("vmap-dragging");setView({...drag.v,x:drag.v.x-dx/r.width*drag.v.w,y:drag.v.y-dy/r.height*drag.v.h})}
   }
  });
  const end=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(!pts.size){drag=null;frame.classList.remove("vmap-dragging")}};
  svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
  svg.addEventListener("wheel",e=>{if(!view)return;e.preventDefault();const [cx,cy]=toSvg(e.clientX,e.clientY);zoomAt(e.deltaY>0?1.2:1/1.2,cx,cy)},{passive:false});
  svg.addEventListener("click",e=>{
   if(moved){moved=false;return}
   const pin=e.target.closest(".vmap-pin");
   if(pin){onSelect({type:pin.dataset.type,id:pin.dataset.id});return}
   const c=e.target.closest(".vmap-link");
   if(c)onSelect({type:"country",id:c.dataset.code});
  });
  svg.addEventListener("keydown",e=>{const pin=e.target.closest?.(".vmap-pin");if(pin&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onSelect({type:pin.dataset.type,id:pin.dataset.id})}});
  svg.addEventListener("pointerover",e=>{
   const c=e.target.closest(".vmap-link,.vmap-pin");
   if(!c||e.pointerType==="touch"){tip.hidden=true;return}
   tip.textContent=c.dataset.name||c.getAttribute("aria-label")||"";tip.hidden=!tip.textContent;
  });
  svg.addEventListener("pointerleave",()=>{tip.hidden=true});
  svg.addEventListener("pointermove",e=>{if(tip.hidden)return;const r=frame.getBoundingClientRect();tip.style.left=(e.clientX-r.left+12)+"px";tip.style.top=(e.clientY-r.top+12)+"px"});
  frame.querySelector(".vmap-controls").addEventListener("click",e=>{
   const b=e.target.closest("button");if(!b||!view)return;
   const cx=view.x+view.w/2,cy=view.y+view.h/2;
   if(b.dataset.z==="in")zoomAt(1/1.6,cx,cy);else if(b.dataset.z==="out")zoomAt(1.6,cx,cy);else setView(home);
  });
  let resizeTimer=0;
  global.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!world)return;const s=view.w/home.w;fitHome();setView({x:view.x,y:view.y,w:home.w*s,h:home.h*s})},150)});

  fetch("data/world.json").then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(data=>{
   world=data;frame.querySelector(".vmap-loading")?.remove();
   drawLand();fitHome();
   setView(home);drawPins();
  }).catch(()=>{const p=frame.querySelector(".vmap-loading");if(p)p.textContent="지도 자료를 불러오지 못했습니다. 아래 목록에서 항목을 고르세요."});

  return {setItems(next){items=Array.isArray(next)?next:[];drawPins()},destroy(){frame.replaceChildren()}};
 }
 global.FrontlineAtlas={mount};
})(window);
