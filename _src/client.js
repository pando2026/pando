(()=>{
 const $=s=>document.querySelector(s);
 const state={edition:null,countries:[],watch:[],filter:"전체",query:"",countryQuery:"",countryRegion:"전체",active:null,previousFocus:null,countryRequest:0,feedAll:false,watchAll:false,countriesAll:false};
 const FEED_PREVIEW=6,WATCH_PREVIEW=4;
 let installPrompt=null,lastEditionCheck=0,editionBusy=false;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const safeUrl=u=>{try{const p=new URL(u);return p.protocol==="https:"?esc(p.href):"#"}catch{return "#"}};
 const regionNames={"East Asia & Pacific":"동아시아·태평양","Europe & Central Asia":"유럽·중앙아시아","Latin America & Caribbean":"중남미·카리브","Middle East & North Africa":"중동·북아프리카","North America":"북아메리카","South Asia":"남아시아","Sub-Saharan Africa":"사하라 이남 아프리카"};
 const koreanNames={XK:"코소보"};
 const regionDisplay=new Intl.DisplayNames(["ko"],{type:"region"});
 const countryName=c=>{try{return koreanNames[c.code]||regionDisplay.of(c.code)||c.name||c.code}catch{return c.name||c.code}};
 const flagEmoji=code=>/^[A-Z]{2}$/.test(code)?[...code].map(ch=>String.fromCodePoint(127397+ch.charCodeAt(0))).join(""):"🌐";
 const flag=(code,kind="")=>/^[A-Z]{2}$/.test(code)?'<span class="flag '+esc(kind)+'"><img loading="lazy" src="https://flagcdn.com/w80/'+code.toLowerCase()+'.png" alt="'+esc(code)+' 국기" onerror="this.style.display=\'none\'"/><span aria-hidden="true">'+flagEmoji(code)+'</span></span>':"";
 const namedCountry=code=>{const c=state.countries.find(v=>v.code===code);return c?countryName(c):countryName({code,name:code})};
 const regionLabel=s=>regionNames[s]||s||"지역 정보 없음";
 const number=(value,digits=1)=>new Intl.NumberFormat("ko-KR",{maximumFractionDigits:digits}).format(value);
 const day=s=>{try{return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"long",day:"numeric",weekday:"long"}).format(new Date(s+"T12:00:00+09:00"))}catch{return s}};
 const time=s=>{try{return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(s))}catch{return s}};
 const watchCapitals={ET:[38.75,9.03],ER:[38.93,15.33],FR:[2.35,48.86],DE:[13.41,52.52],LV:[24.1,56.95],JP:[139.69,35.69]};
 const atlas=window.FrontlineAtlas.mount("#map",{items:[],onSelect:item=>item.type==="occupied"?showOccupied(item.id):item.type==="country"?openCountry(item.id):openStory(item.id)});
 // Occupied / armed-group-controlled areas (hatched on the world map and on conflict boards).
 let occData=null;const loadOcc=()=>occData||(occData=fetch("data/occupied.json").then(r=>r.json()).then(d=>d.items||[]).catch(()=>[]));
 loadOcc().then(list=>{state.occupied=list;atlas.setOccupied&&atlas.setOccupied(list,true)});
 function occCard(o,withLink=true){return '<div class="occ-card"><p class="occ-card-head"><i class="occ-key'+(o.extent==="partial"?" occ-key--part":"")+'"></i><b>'+esc(o.name)+'</b><span class="bloc-kind">'+esc(o.kind||"")+'</span>'+(o.extent==="partial"?'<span class="occ-part">일부 지역</span>':"")+'</p>'+
  '<p class="occ-meta"><span>통제</span> <b>'+esc(o.holder||"")+'</b>'+(o.since?' · <span>'+esc(String(o.since))+'년부터</span>':"")+'</p>'+(o.note?'<p>'+esc(o.note)+'</p>':"")+
  '<p class="bloc-src">'+(o.sources||[]).map(s=>sourceLink(s[2],(s[0]||"")+(s[1]?" · "+s[1]:""))).join(" · ")+(withLink&&o.owner?' · <button type="button" class="occ-open" data-occ-country="'+esc(o.owner)+'">'+esc(namedCountry(o.owner))+' 국가 정보 →</button>':"")+'</p></div>'}
 function showOccupied(id){const o=(state.occupied||[]).find(x=>x.id===id);const info=$("#bloc-info");if(!o||!info)return;
  document.querySelectorAll("#bloc-bar [data-bloc]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.bloc==="")));atlas.setBloc&&atlas.setBloc(null);
  info.innerHTML=occCard(o);info.scrollIntoView({block:"nearest",behavior:"smooth"})}
 function drawMap(){
  const stories=(state.edition?.stories||[]).filter(s=>Number.isFinite(s.lon)&&Number.isFinite(s.lat))
   .map(s=>({type:"story",id:s.id,lon:s.lon,lat:s.lat,label:s.label||s.place,subtitle:s.headline}));
  // How many of this edition's stories each country is a main subject of: drives the map shading.
  const heat={};for(const s of state.edition?.stories||[])for(const code of mainCodes(s))heat[code]=(heat[code]||0)+1;
  const countries=[...new Set([...Object.keys(heat),...state.watch.map(w=>w.code)])].map(code=>{
   const country=state.countries.find(c=>c.code===code);
   const coord=Number.isFinite(country?.capitalLon)&&Number.isFinite(country?.capitalLat)?[country.capitalLon,country.capitalLat]:watchCapitals[code];
   const n=heat[code]||0;
   return coord||n?{type:"country",id:code,lon:coord?.[0],lat:coord?.[1],label:namedCountry(code),heat:n,subtitle:n?"이번 판 사건 "+n+"건 · 국가 자료":"국가 자료 · 수도 위치"}:null;
  }).filter(Boolean);
  atlas.setItems([...stories,...countries]);
  renderMapQuickList();
 }
 function renderMapQuickList(){
  const element=$("#map-quick-list");if(!element)return;
  const articles=(state.edition?.stories||[]).map(s=>'<button type="button" class="map-quick-link" data-open="'+esc(s.id)+'"><i class="map-mini-dot"></i><span>'+esc(s.label||s.place)+'</span><small>현장</small></button>');
  const countries=state.watch.map(w=>'<button type="button" class="map-quick-link" data-country="'+esc(w.code)+'"><i class="map-mini-dot country-key"></i><span>'+flag(w.code,"flag-quick")+esc(namedCountry(w.code))+'</span><small>국가</small></button>');
  element.innerHTML=[...articles,...countries].join("");
 }
 function drawFilters(){
  const names=["전체",...new Set(state.edition.stories.map(mainRegion))];
  $("#filters").innerHTML=names.map(v=>'<button type="button" class="filter '+(state.filter===v?"active":"")+'" data-filter="'+esc(v)+'" aria-pressed="'+(state.filter===v)+'">'+esc(v)+"</button>").join("")+'<input class="search" id="search" type="search" placeholder="지역·주체 검색" aria-label="뉴스 검색" value="'+esc(state.query)+'">';
  $("#search").addEventListener("input",e=>{state.query=e.target.value;drawFeed()});
 }
 function drawFeed(){
  const stories=state.edition.stories.filter(s=>(state.filter==="전체"||mainRegion(s)===state.filter)&&(!state.query||[s.place,s.headline,s.summary,...s.actors.map(a=>a[0]),...s.economy.map(a=>a[0])].join(" ").toLowerCase().includes(state.query.toLowerCase())));
  const limited=!state.feedAll&&state.filter==="전체"&&!state.query&&stories.length>FEED_PREVIEW;
  const visible=limited?stories.slice(0,FEED_PREVIEW):stories;
  $("#feed").innerHTML=(visible.length?visible.map(s=>'<button class="story-card" data-open="'+esc(s.id)+'" type="button"><div class="meta-line"><span>'+esc(s.region)+" / "+esc(s.place)+'</span><span class="status">● '+esc(s.level)+'</span></div><div class="story-card-flags">'+[...new Set([...mainCodes(s),...(s.countryCodes||[])])].slice(0,4).map(code=>flag(code,"flag-story")).join("")+'</div><h3>'+esc(s.headline)+'</h3><p>'+esc(s.summary)+'</p><div class="story-bottom"><span>'+esc(s.eventDate)+" · "+esc(s.topic)+'</span><b>사건 읽기 ↗</b></div></button>').join(""):'<div class="empty">해당 조건에 맞는 사건이 없습니다.</div>')+
   (limited?'<button type="button" class="more-button" data-more="feed">나머지 '+(stories.length-FEED_PREVIEW)+'건 더 보기</button>':"");
 }
 function cited(item,s){
  return item[4].map(i=>s.sources[i]?'<a class="cite" href="'+safeUrl(s.sources[i][3])+'" target="_blank" rel="noopener noreferrer">['+(i+1)+"]</a>":"").join("");
 }
 // One story belongs to one main region and its main countries (watchCodes); others are only mentioned.
 const mainRegion=s=>String(s.region||"").split(" · ")[0].trim();
 const mainCodes=s=>Array.isArray(s.watchCodes)&&s.watchCodes.length?s.watchCodes:(s.countryCodes||[]).slice(0,1);
 function entries(items,s){
  return items.map(a=>'<div class="entry"><div class="entry-head"><strong>'+esc(a[0])+'</strong><span class="badge '+(/주장|전|논쟁|안 됨/.test(a[3])?"warn":"")+'">'+esc(a[3])+'</span></div><div class="role">'+esc(a[1])+'</div><p>'+esc(a[2])+cited(a,s)+"</p></div>").join("");
 }
 // ---- 판도 해설 (explainers) ----
 const TIER={official:"공식 문서",counter:"상대국 공식",press:"언론",research:"연구기관"};
 function explainerCard(x){
  return '<button type="button" class="explain-card" data-explain="'+esc(x.id)+'"><span class="explain-kicker">'+esc(x.kicker||"해설")+' · '+esc(x.date||"")+'</span><strong>'+esc(x.title)+'</strong><p>'+esc(x.hook||x.summary||"")+'</p><span class="explain-flags">'+(x.countries||[]).map(c=>flag(c,"mini")).join("")+'<em>읽기 →</em></span></button>';
 }
 loadBlocs().then(renderBlocBar);
 fetch("data/fx.json").then(r=>r.ok?r.json():null).then(j=>{state.fx=j}).catch(()=>{});
 async function loadExplainers(){
  try{const r=await api("/api/explainers");state.explainers=await r.json()}catch{state.explainers=[]}
  const box=$("#explain-list");if(box)box.innerHTML=(state.explainers||[]).length?state.explainers.map(explainerCard).join(""):'<p class="data-caption">첫 해설을 준비하고 있습니다.</p>';
 }
 function openExplainer(id){
  const x=(state.explainers||[]).find(e=>e.id===id);if(!x)return;
  const src=x.sources||[],A={};(x.actors||[]).forEach(a=>A[a.id]=a);
  const cite=ids=>(ids||[]).filter(i=>src[i]).map(i=>'<a class="cite-n" href="#xs-'+i+'" data-cite="'+i+'">'+(i+1)+'</a>').join("");
  const badge=a=>{if(!a)return "";const ini=(a.name||"?").slice(0,1);return '<span class="actor"><span class="actor-face">'+esc(ini)+(a.country?'<span class="actor-flag">'+flag(a.country,"mini")+'</span>':"")+'</span><span class="actor-text"><b>'+esc(a.name)+'</b><small>'+esc([a.party,a.role].filter(Boolean).join(" · "))+'</small></span></span>'};
  const sides={"질의":[],"답변":[],"증인":[],"관련":[]};(x.actors||[]).forEach(a=>(sides[a.side]||sides["관련"]).push(a));
  const cast=Object.entries(sides).filter(([,v])=>v.length).map(([k,v])=>'<div class="cast-group"><span>'+esc(k)+'</span><div>'+v.map(badge).join("")+'</div></div>').join("");
  const ex=(x.exchanges||[]).map((e,i)=>'<article class="xchg"><header><span class="xchg-n">'+(i+1)+'</span><b>'+esc(e.topic||"")+'</b></header>'+
   '<div class="bubble bubble-q">'+badge(A[e.asker])+'<p>'+esc(e.q)+'</p></div>'+
   '<div class="bubble bubble-a">'+badge(A[e.answerer])+'<p>'+esc(e.a)+'</p>'+(e.quote?'<blockquote>“'+esc(e.quote)+'”</blockquote>':"")+'</div>'+
   (e.context?'<div class="xchg-ctx"><span>숨은 맥락</span><p>'+esc(e.context)+'</p></div>':"")+
   (e.basis?'<div class="xchg-basis"><span>근거</span><p>'+esc(e.basis)+' '+cite(e.src)+'</p></div>':"")+'</article>').join("");
  const tl=(x.timeline||[]).map(t=>'<li><time>'+esc(t.date)+'</time><p>'+esc(t.text)+' '+cite(t.src)+'</p></li>').join("");
  const terms=(x.terms||[]).map(t=>'<div class="term"><header><b>'+esc(t.term)+'</b><span class="term-kind'+(/공식/.test(t.kind||"")&&!/비공식/.test(t.kind||"")?" term-official":"")+'">'+esc(t.kind||"")+'</span></header><p>'+esc(t.text)+'</p>'+(t.who?'<small>'+esc(t.who)+'</small>':"")+'</div>').join("");
  const bg=(x.background||[]).map(b=>'<div class="bg-item"><h4>'+esc(b.title)+'</h4><p>'+esc(b.text)+' '+cite(b.src)+'</p></div>').join("");
  const list=(arr,cls)=>arr&&arr.length?'<ul class="'+cls+'">'+arr.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>':"";
  const srcs=src.map((s,i)=>'<li id="xs-'+i+'"><span class="xs-n">'+(i+1)+'</span><div><span class="tier tier-'+esc(s.tier||"press")+'">'+esc(TIER[s.tier]||"언론")+'</span> <b>'+esc(s.outlet)+'</b> · '+esc(s.date||"")+'<br>'+sourceLink(s.url,s.title)+(s.titleKo&&s.titleKo!==s.title?'<small>'+esc(s.titleKo)+'</small>':"")+'</div></li>').join("");
  const P=x.purpose||{};
  $("#detail").innerHTML='<div class="detail-kicker">PANDO / '+esc(x.kicker||"해설")+'</div><h2>'+esc(x.title)+'</h2>'+
   '<p class="explain-hook">'+esc(x.hook||"")+'</p><p class="lead">'+esc(x.summary||"")+'</p>'+
   (P.what||P.why?'<section class="explain-sec purpose"><h3>이 자리는</h3><dl>'+(P.what?'<div><dt>무슨 자리</dt><dd>'+esc(P.what)+'</dd></div>':"")+(P.why?'<div><dt>왜 열렸나</dt><dd>'+esc(P.why)+'</dd></div>':"")+(P.stakes?'<div><dt>걸린 것</dt><dd>'+esc(P.stakes)+'</dd></div>':"")+'</dl></section>':"")+
   (cast?'<section class="explain-sec"><h3>등장인물</h3>'+cast+'</section>':"")+
   (ex?'<section class="explain-sec"><h3>오간 말</h3>'+ex+'</section>':"")+
   (tl?'<section class="explain-sec"><h3>어떻게 여기까지 왔나</h3><ol class="xtimeline">'+tl+'</ol></section>':"")+
   (terms?'<section class="explain-sec"><h3>용어 정리</h3><div class="terms">'+terms+'</div></section>':"")+
   (bg?'<section class="explain-sec"><h3>배경</h3>'+bg+'</section>':"")+
   (x.takeaways?.length?'<section class="explain-sec"><h3>읽어야 할 것</h3>'+list(x.takeaways,"takeaways")+'</section>':"")+
   (x.open?.length?'<section class="explain-sec"><h3>아직 모르는 것</h3>'+list(x.open,"open-q")+'</section>':"")+
   (x.method?'<p class="explain-method"><b>취재 방식</b> '+esc(x.method)+'</p>':"")+
   '<section class="explain-sec"><h3>출처 '+src.length+'</h3><ol class="xsources">'+srcs+'</ol></section>';
  activateDrawer(x.title);
 }
 function relatedExplainers(code){
  const L=(state.explainers||[]).filter(x=>(x.countries||[]).includes(code));
  return L.length?'<div class="related-explain"><span>판도 해설</span>'+L.map(x=>'<button type="button" data-explain="'+esc(x.id)+'">'+esc(x.title)+' →</button>').join("")+'</div>':"";
 }
 function renderWatch(){
  const el=$("#watch-list");if(!el)return;
  // One story often names several countries (e.g. China and Taiwan). Show it once
  // with every country as a chip instead of repeating the identical card.
  const groups=[];
  for(const w of state.watch){
   const same=groups.find(g=>g.title===w.title&&g.detail===w.detail);
   if(same){if(!same.codes.includes(w.code))same.codes.push(w.code)}else groups.push({...w,codes:[w.code]});
  }
  const limited=!state.watchAll&&groups.length>WATCH_PREVIEW;
  const visible=limited?groups.slice(0,WATCH_PREVIEW):groups;
  el.innerHTML=groups.length?visible.map(w=>
   '<article class="watch-card"><div class="watch-meta"><span>'+esc(w.topic)+'</span><span>'+esc(w.dateLabel||"자료일 "+w.date)+'</span></div>'+
   '<button type="button" class="watch-open" data-country="'+esc(w.codes[0])+'"><strong>'+esc(w.title)+'</strong><span class="watch-detail">'+esc(w.detail)+'</span></button>'+
   '<div class="watch-countries">'+w.codes.map(code=>'<button type="button" class="country-chip" data-country="'+esc(code)+'">'+flag(code,"flag-watch")+esc(namedCountry(code))+'</button>').join("")+'</div>'+
   '<div class="watch-foot"><span class="watch-status">'+esc(w.status)+'</span><a href="'+safeUrl(w.url)+'" target="_blank" rel="noopener noreferrer">원문 ↗</a></div></article>').join("")+
   (limited?'<button type="button" class="more-button" data-more="watch">나머지 '+(groups.length-WATCH_PREVIEW)+'건 더 보기</button>':""):
   '<div class="empty">관찰 국가 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</div>';
 }
 function renderCountryFilters(){
  const select=$("#country-region");if(!select)return;
  const groups=[...new Set(state.countries.map(c=>c.region).filter(Boolean))].sort((a,b)=>regionLabel(a).localeCompare(regionLabel(b),"ko"));
  select.innerHTML='<option value="전체">모든 지역</option>'+groups.map(group=>'<option value="'+esc(group)+'">'+esc(regionLabel(group))+'</option>').join("");
  if(!groups.includes(state.countryRegion))state.countryRegion="전체";
  select.value=state.countryRegion;
  select.hidden=!groups.length;
 }
 function renderCountries(){
  const el=$("#country-list");if(!el)return;
  const q=state.countryQuery.trim().toLocaleLowerCase("ko");
  const filtered=state.countries.filter(c=>(state.countryRegion==="전체"||c.region===state.countryRegion)&&(!q||[countryName(c),c.name,c.code,c.capital,...(c.aliases||[])].some(s=>String(s||"").toLocaleLowerCase("ko").includes(q))));
  const browsing=state.countriesAll||q||state.countryRegion!=="전체";
  if(!browsing&&state.countries.length){
   el.innerHTML='<button type="button" class="more-button" data-more="countries">전체 '+state.countries.length+'개 국가·지역 펼치기</button>';
   const count=$("#country-count");if(count)count.textContent="이름으로 검색하거나 지역을 고르세요";
   return;
  }
  el.innerHTML=filtered.length?filtered.map(c=>
   '<button class="country-row" data-country="'+esc(c.code)+'" type="button">'+flag(c.code,"flag-row")+'<span class="country-text"><strong>'+esc(countryName(c))+'</strong><small>'+esc(c.name)+'</small></span><span class="country-arrow" aria-hidden="true">↗</span></button>').join(""):
   '<div class="empty">검색 결과가 없습니다. 영문 국명이나 국가 코드도 검색해 보세요.</div>';
  const count=$("#country-count");if(count)count.textContent=filtered.length===state.countries.length?state.countries.length+"개 국가·지역":filtered.length+" / "+state.countries.length+"개 국가·지역";
 }
 function sourceLink(url,text){
  return safeUrl(url)==="#"?"":'<a href="'+safeUrl(url)+'" target="_blank" rel="noopener noreferrer">'+esc(text||"원문 확인")+" ↗</a>";
 }
 const nowYear=()=>Number(String(state.edition?.editionDate||"").slice(0,4))||new Date().getFullYear();
 const shortProvider=s=>String(s||"").split(" · ")[0];
 // Method notes, definitions and caveats: kept for anyone who wants them, folded by default.
 function fold(summary,body,cls=""){
  return body&&String(body).trim()?'<details class="fine-print'+(cls?" "+cls:"")+'"><summary>'+esc(summary)+'</summary><div class="fine-print-body">'+body+'</div></details>':"";
 }
 function countryFacts(data){
  const demographics=data.demographics||{},population=demographics.population,capital=demographics.capital;
  const popNumber=population?.value;
  const inhabited=typeof popNumber==="number"&&Number.isFinite(popNumber)&&popNumber>=0;
  const popValue=inhabited?(popNumber>=100000000?number(popNumber/100000000,2)+"억 명":
   popNumber>=10000?number(popNumber/10000,1)+"만 명":number(popNumber,0)+"명"):
   /상주.*없|no.permanent|uninhabited|비해당|not.applicable/i.test(population?.status||"")?"상주 인구 없음":"인구 자료 확인 중";
  const capitalName=capital?.name||(/비해당|not.applicable|no.capital/i.test(capital?.status||"")?"수도 비해당":data.capital||"수도 확인 중");
  const capNote=capital?.note||"";
  const derived=population?.status==="derived_reference"||/역산|추산|추정/.test(population?.provider||"");
  const p=data.profile||{},political=data.political||{},metrics=data.metrics||{};
  const system=p.system||political.system||"";
  const gdpPc=metrics.gdpPc,gdpPcOk=gdpPc&&Number.isFinite(Number(gdpPc.value))&&gdpPc.year;
  const fact=(label,value,sub,cls="")=>'<div class="fact'+cls+'"><dt>'+esc(label)+'</dt><dd>'+esc(value)+(sub?'<small>'+sub+'</small>':"")+'</dd></div>';
  const strip='<dl class="fact-strip">'+
   fact("인구",popValue,inhabited?esc(String(population.year||""))+(derived?" · 추산":"")+ageTag(population.year):"")+
   fact("수도",capitalName,"")+
   (system?fact("정치 체제",system,""):"")+
   (gdpPcOk?fact("1인당 GDP",metricValue("gdpPc",Number(gdpPc.value)),esc(String(gdpPc.year))+ageTag(gdpPc.year)):"")+
   '</dl>';
  // Explanations stay available but folded: the reader sees the facts first.
  const notes=[
   population?.note||population?.provider?'<p><b>인구</b> '+esc(population?.provider||"")+(population?.note?" — "+esc(population.note.replace(/\s*두 지표 원문:.*$/,"")):"")+' '+sourceLink(population?.source,"원문")+'</p>':"",
   capital?.source?'<p><b>수도</b> '+esc(capital.provider||"")+' '+sourceLink(capital.source,"원문")+'</p>':"",
   system?'<p><b>정치 체제</b> '+esc(political.provider||"")+(political.asOf?" · "+esc(political.asOf)+" 조회":"")+' '+sourceLink(p.source||political.source,"원문")+'</p>':""
  ].join("");
  return strip+(capNote?'<p class="fact-note">'+esc(capNote)+'</p>':"")+fold("수치 기준·출처",notes);
 }
 // Years that are much older than today get a visible flag. This is the one
 // caveat a reader genuinely needs at a glance; the rest lives in fine print.
 function ageTag(year){
  const y=Number(String(year||"").slice(0,4));
  if(!Number.isFinite(y)||y<1900)return "";
  const gap=nowYear()-y;
  return gap>=4?' <em class="age-tag">'+gap+'년 전 자료</em>':"";
 }
 function activateDrawer(label){
  if(!$("#overlay").classList.contains("open"))state.previousFocus=document.activeElement;
  $("#overlay").classList.add("open");
  $("#overlay").setAttribute("aria-hidden","false");
  $("#overlay").setAttribute("aria-label",label);
  document.body.style.overflow="hidden";
  $(".drawer").scrollTop=0;
  $("#close").focus();
 }
 function money(value){
  if(value>=1e12)return "US$"+number(value/1e12,2)+"조";
  if(value>=1e8)return "US$"+number(value/1e8,1)+"억";
  return "US$"+number(value,0);
 }
 function metricValue(key,value){
  if(!Number.isFinite(value))return "자료 없음";
  if(key==="gdp"||key==="militaryUsd")return money(value);
  if(key==="gdpPc")return "US$"+number(value,0);
  if(key==="militaryPersonnel")return value>=1e4?number(value/1e4,1)+"만 명":number(value,0)+"명";
  if(key==="armsImports"||key==="armsExports")return number(value/1e6,0)+"백만 TIV";
  return number(value,2)+"%";
 }
 function metricEvidence(item){
  const kind=String(item?.estimateKind||"");
  if(item?.sourceFamily==="NATIONAL_STATS"||String(item?.sourceFamily||"").startsWith("NATIONAL_TERRITORY"))
   return {text:(item.sourceFamily==="NATIONAL_TERRITORY_FISCAL_ESTIMATE"?"해당 지역 공식 추정":"해당 국가·지역 공식 통계")+(kind?" · "+kind:""),type:"national"};
  if(!item?.approximate)return null;
  if(item.sourceFamily==="UN_STATISTICAL_YEARBOOK")
   return {text:"유엔 통계연감 추계"+(kind&&kind!=="유엔 통계연감 추계"?" · "+kind:""),type:"institutional"};
  if(item.sourceFamily==="UN_NATIONAL_ACCOUNTS_ESTIMATE")
   return {text:"유엔 국민계정 추계"+(kind&&kind!=="유엔 국민계정 추계"?" · "+kind:""),type:"institutional"};
  if(String(item.sourceFamily||"").startsWith("CIA_FACTBOOK_"))
   return {text:"CIA 추정"+(kind&&kind!=="CIA 추정"?" · "+kind:""),type:"unofficial"};
  if(item.sourceFamily==="THIRD_PARTY_ESTIMATE"&&/재게시|인용/.test(kind)&&!/추정|전망/.test(kind))
   return {text:"2차 출처 확인 · "+kind,type:"republished"};
  if(item.sourceFamily==="THIRD_PARTY_ESTIMATE"||/비공식|민간기관 추정/.test(kind))
   return {text:"비공식 추정"+(kind&&kind!=="비공식 추정"?" · "+kind:""),type:"unofficial"};
  if(String(item.sourceFamily||"").startsWith("IMF_"))
   return {text:kind||"IMF 추정·잠정",type:"institutional"};
  if(/추정|전망|잠정/.test(kind))
   return {text:kind,type:"institutional"};
  if(item.sourceFamily==="SIPRI_FACT_SHEET")
   return {text:kind||"SIPRI 발표 반올림 값",type:"rounded"};
  return {text:kind||"공개표 반올림 값",type:"rounded"};
 }
 function metricEvidenceBadge(item){
  const evidence=metricEvidence(item);
  return evidence?'<em class="metric-estimate metric-estimate--'+evidence.type+'">'+esc(evidence.text)+'</em>':"";
 }
 // Short badge for the card face. Rounded official figures and national
 // statistics need no badge; estimates do. Full wording is in the tooltip.
 function metricBadgeShort(item){
  const evidence=metricEvidence(item);
  if(!evidence||evidence.type==="rounded"||evidence.type==="national")return "";
  const label=evidence.type==="unofficial"?"비공식 추정":evidence.type==="republished"?"재인용":/전망/.test(evidence.text)?"전망":/잠정/.test(evidence.text)?"잠정":"추정";
  return '<em class="metric-estimate metric-estimate--'+evidence.type+'" title="'+esc(evidence.text)+'">'+label+'</em>';
 }
 function metricTrend(key,points,korea=null,name=""){
  const clean=a=>(Array.isArray(a)?a:[]).filter(p=>p&&Number.isFinite(Number(p.value))&&/^\d{4}/.test(String(p.year))).map(p=>({year:String(p.year).slice(0,4),value:Number(p.value)})).sort((a,b)=>a.year.localeCompare(b.year));
  const series=clean(points).slice(-24);
  if(series.length<2)return '<p class="trend-empty">과거 값이 하나뿐이라 추이 그래프를 그리지 않았습니다.</p>';
  const y0=series[0].year,y1=series.at(-1).year;
  const kr=clean(korea).filter(p=>p.year>=y0&&p.year<=y1);
  const showKr=kr.length>=2;
  const years=[...new Set([...series.map(p=>p.year),...(showKr?kr.map(p=>p.year):[])])].sort();
  const all=[...series.map(p=>p.value),...(showKr?kr.map(p=>p.value):[])];
  let lo=Math.min(...all),hi=Math.max(...all);
  // Rates start the axis near the data; money and counts start from zero so heights are honest.
  const fromZero=["gdp","gdpPc","militaryUsd","militaryPersonnel","armsImports","armsExports"].includes(key)&&lo>0;
  if(fromZero)lo=0;
  const pad=(hi-lo)*.12||Math.max(1,Math.abs(hi)*.1);hi+=pad*2.2;if(!fromZero)lo-=pad;
  const L=74,R=380,T=22,B=128,xi=y=>years.indexOf(y),px=y=>L+xi(y)*(R-L)/Math.max(1,years.length-1),py=v=>B-(v-lo)/(hi-lo)*(B-T);
  const ticks=[lo,(lo+hi)/2,hi];
  const grid=ticks.map(t=>'<path class="trend-grid" d="M'+L+' '+py(t).toFixed(1)+'H'+R+'"/><text class="trend-ytick" x="'+(L-6)+'" y="'+(py(t)+3.5).toFixed(1)+'" text-anchor="end">'+esc(metricValue(key,t))+'</text>').join("");
  const line=a=>a.map((p,i)=>(i?"L":"M")+px(p.year).toFixed(1)+" "+py(p.value).toFixed(1)).join(" ");
  const labelEvery=series.length<=8?1:Math.ceil(series.length/6);
  const dots=series.map((p,i)=>{
   const show=i%labelEvery===0||i===series.length-1;
   const x=px(p.year),y=py(p.value),anchor=i===0?"start":i===series.length-1?"end":"middle";
   return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(i===series.length-1?4:3)+'"><title>'+esc(p.year)+' · '+esc(metricValue(key,p.value))+'</title></circle>'+
    (show?'<text class="trend-val" x="'+x.toFixed(1)+'" y="'+(y-8).toFixed(1)+'" text-anchor="'+anchor+'">'+esc(metricValue(key,p.value))+'</text><text class="trend-x" x="'+x.toFixed(1)+'" y="'+(B+16)+'" text-anchor="'+anchor+'">'+esc(p.year)+'</text>':"");
  }).join("");
  const krLayer=showKr?'<path class="trend-line trend-line--kr" d="'+line(kr)+'"/><g class="trend-points trend-points--kr">'+kr.map(p=>'<circle cx="'+px(p.year).toFixed(1)+'" cy="'+py(p.value).toFixed(1)+'" r="2.2"><title>한국 '+esc(p.year)+' · '+esc(metricValue(key,p.value))+'</title></circle>').join("")+'</g><text class="trend-kr-end" x="'+(px(kr.at(-1).year)+4).toFixed(1)+'" y="'+(py(kr.at(-1).value)+(kr.at(-1).value>=series.at(-1).value?-14:22)).toFixed(1)+'" text-anchor="end">한국 '+esc(metricValue(key,kr.at(-1).value))+'</text>':"";
  const legend=showKr?'<span class="trend-legend"><i class="trend-key"></i>'+esc(name||"이 나라")+' <i class="trend-key trend-key--kr"></i>한국</span>':"";
  return '<div class="trend-head"><b>'+esc(y0)+' — '+esc(y1)+'</b>'+legend+'<span>'+series.length+'개 관측치</span></div><svg class="trend-chart" viewBox="0 0 400 152" role="img" aria-label="'+esc(series.map(p=>p.year+"년 "+metricValue(key,p.value)).join(", "))+'">'+grid+'<path class="trend-axis" d="M'+L+' '+B+'H'+R+'"/>'+krLayer+'<path class="trend-line" d="'+line(series)+'"/><g class="trend-points">'+dots+'</g></svg>';
 }
 function metricCard(key,label,item,korea=null,compare=false,koreaReference=null,koreaLatest=null){
  const valid=item&&item.value!==null&&Number.isFinite(Number(item.value))&&item.year;
  if(!valid)return "";
  const vintage=String(item.year);
  const unofficial=["unofficial","republished"].includes(metricEvidence(item)?.type);
  const nonRanked=item?.rankEligible===false||["THIRD_PARTY_ESTIMATE","CIA_FACTBOOK_ESTIMATE","UN_STATISTICAL_YEARBOOK"].includes(item?.sourceFamily);
  const displayValue=(observation,value)=>{
   if(key==="policyRate"&&Array.isArray(observation.range)&&observation.range.length===2)
    return number(Number(observation.range[0]),2)+"–"+number(Number(observation.range[1]),2)+"%";
   if(observation?.estimateKind?.includes("0.1%p")&&!['gdp','gdpPc','militaryUsd'].includes(key))
    return number(value,1)+"%";
   return metricValue(key,value);
  };
  const display=displayValue(item,Number(item.value));
  const family=entry=>String(entry?.sourceFamily||"WDI").startsWith("WDI")?"WDI":entry?.sourceFamily||"WDI";
  const koreanAvailable=korea&&korea.value!==null&&Number.isFinite(Number(korea.value))&&korea.year;
  const sameYear=koreanAvailable&&(key==="policyRate"||String(korea.year)===vintage&&korea.samePeriod!==false&&family(item)===family(korea)&&(!unofficial||korea.samePeriod===true&&item.provider&&item.provider===korea.provider&&(!item.indicatorId||item.indicatorId===korea.indicatorId)&&(!item.definition||item.definition===korea.definition)));
  const referenceAvailable=!sameYear&&koreaReference?.year===vintage&&koreaReference?.sourceFamily==="THIRD_PARTY_ESTIMATE"&&koreaReference.approximate===true&&Number.isFinite(koreaReference.value)&&koreaReference.source;
  // Korea is shown only when a like-for-like figure exists; otherwise nothing.
  const latestOk=koreaLatest&&koreaLatest.value!==null&&Number.isFinite(Number(koreaLatest.value))&&koreaLatest.year;
  const koreaObs=sameYear?korea:referenceAvailable?koreaReference:latestOk?koreaLatest:null;
  const loose=!sameYear&&koreaObs;
  const koreaLine=compare&&koreaObs?'<span class="metric-korea-line'+(loose?' metric-korea-line--loose':'')+'"'+(loose?' title="출처·연도·정의가 달라 같은 기준의 비교가 아닙니다. 크기를 가늠하는 참고용입니다."':'')+'>한국 <b>'+esc(displayValue(koreaObs,Number(koreaObs.value)))+'</b>'+(key==="policyRate"?"":" · "+esc(String(koreaObs.year)))+(loose?' · 참고':'')+'</span>':"";
  const rankYear=key==="policyRate"?"":vintage;
  const meta=esc(vintage)+(/^\d{4}$/.test(vintage)?"년":"")+(item.fiscalYear?" · 회계연도 "+esc(item.fiscalYear):"")+metricBadgeShort(item)+ageTag(vintage);
  const sources=[item.source?sourceLink(item.source,shortProvider(item.provider)||"출처"):"",item.originalSource&&item.originalSource!==item.source?sourceLink(item.originalSource,"기초 원자료"):"",compare&&koreaObs?.source?sourceLink(koreaObs.source,"한국 값 출처"):""].filter(Boolean).join(" · ");
  const details=(item.label?'<p class="metric-def">'+esc(item.label)+(item.provider?" · "+esc(item.provider):"")+'</p>':"")+(item.note?'<p>'+esc(item.note)+'</p>':"")+(sources?'<p class="metric-links">'+sources+'</p>':"");
  return '<div class="metric-card'+(unofficial?' metric-card--unofficial':'')+'"><button type="button" class="metric-open" data-metric="'+esc(key)+'" aria-expanded="false"><span class="metric-title">'+esc(label)+'<span class="metric-expand" aria-hidden="true">⌄</span></span><strong class="metric-value">'+esc(display)+'</strong><span class="metric-meta">'+meta+'</span>'+koreaLine+'<span class="metric-rank" data-rank-key="'+esc(key)+'" data-rank-year="'+esc(rankYear)+'" data-rank-source="'+esc(item?.sourceFamily==="SIPRI_FACT_SHEET"?"sipri":"wdi")+'"></span></button><div class="metric-expand-content" hidden>'+metricTrend(key,item?.series,compare?(koreaLatest?.series||korea?.series):null,state.trendName||"")+(compare&&koreaObs?'<p class="metric-korea-note">한국 같은 지표: <b>'+esc(displayValue(koreaObs,Number(koreaObs.value)))+'</b> ('+esc(String(koreaObs.year))+(koreaObs.provider?' · '+esc(shortProvider(koreaObs.provider)):"")+')'+(loose?' — 출처나 연도가 달라 참고용입니다.':' — 같은 연도·원자료입니다.')+'</p>':"")+details+'</div></div>';
 }
 // Grid of available figures, then one quiet line naming what has no data.
 // Missing values are not drawn as cards full of "확인 중" text.
 function metricGrid(rows,compare,reference={},koreaReferences={},koreaLatest={}){
  const cards=[],missing=[];
  for(const [key,label,item] of rows){
   const html=metricCard(key,label,item,reference[key]||null,compare,koreaReferences[key]||null,koreaLatest[key]||null);
   if(html)cards.push(html);else missing.push(label);
  }
  return (cards.length?'<div class="metric-grid">'+cards.join("")+'</div>':"")+
   (missing.length?'<p class="metric-missing"><span>공개 자료 없음</span> '+missing.map(esc).join(" · ")+'</p>':"");
 }
 let activeRankRequests=0;
 const pendingRankRequests=[];
 function runPendingRanks(){
  while(activeRankRequests<2&&pendingRankRequests.length){
   const task=pendingRankRequests.shift();
   activeRankRequests++;
   fetch(task.url,{cache:"no-store"}).then(task.resolve,task.reject).finally(()=>{activeRankRequests--;runPendingRanks()});
  }
 }
 function limitedRankFetch(url){return new Promise((resolve,reject)=>{pendingRankRequests.push({url,resolve,reject});runPendingRanks()})}
 async function loadMetricRank(code,node){
  if(!node||node.dataset.rankLoaded||!node.dataset.rankYear||!/^\d{4}$/.test(node.dataset.rankYear))return;
  node.dataset.rankLoaded="true";
  try{
   const r=await limitedRankFetch("/api/rank?"+new URLSearchParams({code,key:node.dataset.rankKey,year:node.dataset.rankYear,source:node.dataset.rankSource||"wdi"}));
   if(!r.ok)throw Error("순위 조회 실패");const body=await r.json();
   if(state.active!=="country:"+code||!node.isConnected)return;
   const rank=body.rank;
   const kr=body.korea;
   if(rank&&Number.isInteger(rank.position)){
    const sipri=/SIPRI/i.test(rank.provider||"");
    const basis=sipri?"SIPRI 순위":"세계";
    node.textContent=basis+" "+number(rank.position,0)+"위"+(!sipri&&Number.isInteger(rank.total)?" / "+number(rank.total,0):"")+(code!=="KR"&&Number.isInteger(kr?.position)?" · 한국 "+number(kr.position,0)+"위":"");
    node.title=String(rank.year)+"년 같은 연도 관측치가 있는 국가·지역 중 값이 높은 순서. 순위가 우수성을 뜻하지 않습니다.";
   }else if(body.reason==="World Bank ranking temporarily unavailable"){
    delete node.dataset.rankLoaded;
   }
  }catch{delete node.dataset.rankLoaded}
 }
 function loadTabRanks(code,key){
  if(!["economy","military","budget"].includes(key))return;
  document.querySelectorAll("#panel-"+key+" [data-rank-key]").forEach(node=>{if(node.dataset.rankKey!=="policyRate")loadMetricRank(code,node)});
 }
 const budgetColors=["#c72a34","#123f5b","#75b6d5","#eeac69","#608e91","#a38db8","#c4d7df","#8cb68d","#9a6e64","#d9a961","#527eae","#a7b8c1"];
 const budgetColor=(index,count)=>count<=budgetColors.length?budgetColors[index]:`hsl(${(index*137.508)%360} 54% ${40+(index%3)*10}%)`;
 const FXCUR=[[/포클랜드\s*파운드/,"FKP"],[/동카리브\s*달러/,"XCD"],[/호주\s*달러/,"AUD"],[/뉴질랜드\s*달러/,"NZD"],[/홍콩\s*달러/,"HKD"],[/대만\s*달러/,"TWD"],[/가이아나\s*달러/,"GYD"],[/브루나이\s*달러/,"BND"],[/케이맨\s*달러/,"KYD"],[/버뮤다\s*달러/,"BMD"],[/수리남\s*달러/,"SRD"],[/미국\s*달러/,"USD"],[/덴마크\s*크로네/,"DKK"],[/CFP\s*프랑/,"XPF"],[/카리브\s*길더/,"XCG"],[/스위스\s*프랑/,"CHF"],[/지부티\s*프랑/,"DJF"],[/튀니지\s*디나르/,"TND"],[/쿠웨이트\s*디나르/,"KWD"],[/리비아\s*디나르/,"LYD"],[/알제리\s*디나르/,"DZD"],[/파키스탄\s*루피/,"PKR"],[/세이셸\s*루피/,"SCR"],[/크로어\s*루피|루피/,"INR"],[/우기야/,"MRU"],[/쿠바\s*페소/,"CUP"],[/파타카/,"MOP"],[/도브라/,"STN"],[/남수단\s*파운드/,"SSP"],[/시리아\s*파운드/,"SYP"],[/파운드/,"GBP"],[/디르함/,"AED"],[/리온/,"SLE"],[/마나트/,"TMT"],[/볼리비아노/,"BOB"],[/플로린/,"AWG"],[/달라시/,"GMD"],[/위안/,"CNY"],[/엔/,"JPY"],[/유로/,"EUR"],[/원/,"KRW"],[/달러/,"USD"]];
 const FXMUL=u=>/라크\s*크로어/.test(u)?1e12:/^\s*조/.test(u)?1e12:/^\s*십억/.test(u)?1e9:/^\s*억/.test(u)?1e8:/^\s*백만/.test(u)?1e6:/^\s*천/.test(u)?1e3:1;
 const krUnits=v=>{const a=Math.abs(v);return a>=1e12?number(v/1e12,a>=1e14?0:a>=1e13?1:2)+"조":a>=1e8?number(v/1e8,0)+"억":a>=1e4?number(v/1e4,0)+"만":number(v,0)};
 function fxNote(value,unit){const fx=state.fx;if(!fx||!Number.isFinite(Number(value)))return "";const u=String(unit||"");if(/%/.test(u))return "";
  const hit=FXCUR.find(([re])=>re.test(u));if(!hit)return "";const cur=hit[1],rate=fx.rates?.[cur],krw=fx.rates?.KRW;if(!rate||!krw)return "";
  const local=Number(value)*FXMUL(u),usd=local/rate,won=usd*krw;
  return (cur==="USD"?"":"약 US$"+krUnits(usd)+(cur==="KRW"?"":" · "))+(cur==="KRW"?"":"약 "+krUnits(won)+"원")}
 function fxLine(value,unit){const t=fxNote(value,unit);return t?'<span class="fx-note" title="'+esc((state.fx?.provider||"")+" "+(state.fx?.asOf||"")+" 기준")+'">'+esc(t)+' <small>('+esc(state.fx?.asOf||"")+' 환율)</small></span>':""}
 const budgetMoney=(value,unit)=>unit==="십억 엔"?number(value/1000,2)+"조 엔":unit==="십억 유로"?number(value*10,1)+"억 유로":unit==="십억 디르함"?number(value*10,2)+"억 디르함":unit==="억 위안"?number(value,2)+"억 위안":unit==="조 원"?number(value,1)+"조 원":number(value,1)+" "+unit;
 function budgetComposition(b,heading,militaryGov=null){
  if(!b)return "";
  const estimatedBudget=b.sourceFamily==="THIRD_PARTY_ESTIMATE"||/비공식|민간기관 추정/.test(b.estimateKind||"");
  const items=(Array.isArray(b.categories)?b.categories:[]).filter(x=>x&&x.label&&Number.isFinite(Number(x.value))&&Number(x.value)>=0);
  const total=Number(b.total),sum=items.reduce((n,x)=>n+Number(x.value),0);
  const partition=b.kind==="partition"&&Number.isFinite(total)&&total>0&&items.length>0&&Math.abs(sum-total)<=Math.max(.2,total*(b.unit==="십억 유로"?.0005:.00001));
  const referenceOnly=b.kind==="nonadditive"&&Number.isFinite(total)&&total>0&&sum>0;
  const chartTotal=partition?total:0;
  const denominator=partition||referenceOnly?total:0;
  const pct=value=>denominator>0?100*Number(value)/denominator:0;
  const donutTotal=partition?total:referenceOnly?sum:0;
  const share=value=>donutTotal>0?100*Number(value)/donutTotal:0;
  let progress=0;
  const stops=items.map((item,i)=>{const start=progress;progress+=share(item.value);return budgetColor(i,items.length)+" "+start.toFixed(4)+"% "+Math.min(100,progress).toFixed(4)+"%"}).join(",");
  const chart=donutTotal?'<div class="budget-donut-wrap"><div class="budget-donut" role="img" aria-label="'+esc(heading+" 구성: "+items.map(x=>x.label+" "+share(x.value).toFixed(1)+"%").join(", "))+'" style="background:conic-gradient('+stops+')"><div class="budget-donut-hole"><small>'+(partition?'총액':items.length+'개 분야 합계')+'</small><strong>'+esc(budgetMoney(donutTotal,b.unit))+'</strong></div></div></div>':'<p class="budget-no-pie">'+(referenceOnly?'항목 합계가 총지출과 달라 총지출 대비 막대로 표시':'분야가 서로 겹쳐 막대로 표시')+'</p>';
  const referenceWarning=referenceOnly?'<p class="budget-approx-warning"><strong>'+(estimatedBudget?'추정':'발표')+' 총지출 기준 항목별 비율</strong> · 발표된 '+items.length+'개 항목 합계 '+esc(budgetMoney(sum,b.unit))+'와 총지출 '+esc(budgetMoney(total,b.unit))+'의 차이는 '+esc(budgetMoney(Math.abs(sum-total),b.unit))+'입니다. 항목별 막대는 총지출을 분모로 하나씩 계산했으며, 서로 더해 100% 구성으로 해석할 수 없습니다.</p>':"";
  const defence=items.find(x=>/국방|방위|군사|defen[sc]/i.test(x.label));
  const militaryValue=militaryGov&&militaryGov.value!==null&&Number.isFinite(Number(militaryGov.value))?Number(militaryGov.value):null;
  const comparison=defence&&denominator?'<p class="budget-scope-warning"><strong>국방 비중과 군사비 지표의 기준</strong> · '+(partition?'이 도넛':'이 항목')+'의 국방 금액은 '+esc(b.fiscalYear||"기준연도 확인 중")+' '+esc(b.scope||"표시 범위")+'의 총지출 중 '+pct(defence.value).toFixed(1)+'%입니다. 군사 탭의 군사비/일반정부 총지출'+(militaryValue!==null?'은 '+esc(String(militaryGov.year||"연도 미상"))+'년 '+number(militaryValue,2)+'%':'은 현재 같은 기준의 수치가 없습니다')+'. SIPRI 군사비와 예산의 국방 기능은 포함 항목이 다르고, 지출 실적과 편성안·정부 범위 및 기준연도도 확인해야 합니다. 두 비율이 일치할 필요가 없습니다.</p>':"";
  const warning=fold("이 구성표 읽는 법",referenceWarning+comparison+(b.note?'<p>'+esc(b.note)+'</p>':""));
  const list=items.map((item,i)=>'<li><span class="budget-category-name"><i style="background:'+budgetColor(i,items.length)+'"></i>'+esc(item.label)+'</span><span class="budget-category-value">'+esc(budgetMoney(Number(item.value),b.unit))+'</span><b>'+(donutTotal?share(item.value):pct(item.value)).toFixed(1)+'%</b>'+(donutTotal?"":'<span class="budget-bar"><i style="width:'+Math.min(100,pct(item.value)).toFixed(2)+'%;background:'+budgetColor(i,items.length)+'"></i></span>')+'</li>').join("");
  const sub=b.details?.categories?.length?'<details class="budget-details"><summary>'+esc(b.details.label||"기타 세부 내역")+'</summary><ul>'+b.details.categories.map(x=>'<li><span>'+esc(x.label)+'</span><strong>'+esc(budgetMoney(Number(x.value),b.unit))+'</strong><small>'+pct(x.value).toFixed(2)+'%</small></li>').join("")+'</ul><p>'+esc(b.details.note||"")+'</p></details>':"";
  return '<article class="budget-visual"><header><h4>'+esc(heading)+'</h4><p>'+esc(b.fiscalYear||"")+" · "+esc(b.status||"")+(estimatedBudget?' · 비공식 추정':'')+'</p><p>'+esc(b.scope||"")+'</p>'+(Number.isFinite(total)&&total>0?'<p class="budget-total"><b>총액 '+esc(budgetMoney(total,b.unit))+'</b> '+fxLine(total,b.unit)+'</p>':"")+'</header>'+chart+'<ul class="budget-legend">'+list+'</ul>'+sub+warning+'<p class="budget-source">'+(estimatedBudget?'추정 자료':'자료 기준')+' '+esc(b.asOf||"확인 필요")+' · '+sourceLink(b.source,b.provider||"원문")+'</p></article>';
 }
 function budgetAlternativeEstimates(estimate){
  if(!estimate?.metrics)return "";
  const labels={governmentRevenue:"보고서의 정부 세입 / GDP",governmentExpenditure:"보고서의 정부 지출 / GDP",cashBalance:"보고서의 재정수지 / GDP",debt:"보고서의 정부 부채 / GDP"};
  const keys=Object.keys(labels).filter(key=>estimate.metrics[key]?.value!==null&&Number.isFinite(Number(estimate.metrics[key]?.value))&&estimate.metrics[key]?.year);
  if(!keys.length)return "";
  const fiscalYear=String(estimate.year||"");
  const cards=keys.map(key=>metricCard(key,labels[key],estimate.metrics[key],null,false)).join("");
  const source=estimate.source?sourceLink(estimate.source,estimate.provider||"IMF 보고서 원문"):"";
  return '<section class="section budget-alternative"><h3>IMF 재정 추정·집계 · '+esc(estimate.scope||"정부 범위 확인 필요")+'</h3><details class="fine-print"><summary>기준·출처</summary><div class="fine-print-body"><p>'+(fiscalYear?esc(fiscalYear)+' · ':"")+esc(estimate.estimateKind||"IMF 집계")+' · 각 카드의 자료 연도와 정부 범위를 확인하세요. 세계은행 중앙정부 지표와 회계 범위가 다를 수 있습니다.</p></div></details><div class="metric-grid">'+cards+'</div><details class="fine-print"><summary>기준·출처</summary><div class="fine-print-body"><p>'+(estimate.asOf?'자료 확인일 '+esc(estimate.asOf)+' · ':"")+source+'</p></div></details></section>';
 }
 function budgetReferenceShares(shares){
  const rows=(Array.isArray(shares)?shares:[]).filter(item=>item?.value!==null&&Number.isFinite(Number(item?.value))&&Number(item.value)>=0&&Number(item.value)<=100&&item.year&&item.source&&item.label);
  if(!rows.length)return "";
  return '<section class="section budget-reference"><h3>예산 범위별 참고 수치</h3><details class="fine-print"><summary>기준·출처</summary><div class="fine-print-body"><p>발표기관별 국방·안보 예산 비중입니다. 계획과 집행, 분모의 정부 범위가 다르므로 군사 탭의 SIPRI 군사비/일반정부 총지출 수치에 대입하거나 한국 값과 직접 비교하지 않습니다.</p></div></details><div class="budget-reference-grid">'+rows.map(item=>'<article class="budget-reference-card"><span class="budget-reference-heading">'+esc(item.label)+'</span><strong>'+number(Number(item.value),1)+'%</strong>'+(item.estimateKind?'<em class="metric-estimate metric-estimate--'+(item.sourceFamily==="THIRD_PARTY_ESTIMATE"||/비공식|민간/.test(item.estimateKind)?'unofficial':'institutional')+'">'+esc(item.estimateKind)+'</em>':"")+'<p>'+esc(String(item.year))+(item.status?' · '+esc(item.status):"")+'</p>'+(item.scope?'<p>범위: '+esc(item.scope)+'</p>':"")+(item.note?'<p>'+esc(item.note)+'</p>':"")+'<small>'+sourceLink(item.source,item.provider||"원문 확인")+'</small></article>').join("")+'</div></section>';
 }
 function economyAlternativeEstimates(items){
  const rows=(Array.isArray(items)?items:[]).filter(item=>item&&item.value!==null&&Number.isFinite(Number(item.value))&&item.value>=0&&item.year&&item.unit&&item.label&&item.source);
  if(!rows.length)return "";
  const money=item=>{
   const value=Number(item.value),unit=item.unit==="KRW"?"원":item.unit==="NZD"?"뉴질랜드 달러":item.unit==="USD"?"미 달러":item.unit==="GBP"?"영국 파운드":item.unit==="EUR"?"유로":item.unit;
   return value>=1e12?number(value/1e12,2)+"조 "+unit:value>=1e8?number(value/1e8,3)+"억 "+unit:number(value,0)+" "+unit;
  };
  return '<section class="section budget-reference economy-reference"><h3>별도 기준의 경제 참고 수치</h3><details class="fine-print"><summary>기준·출처</summary><div class="fine-print-body"><p>통화·회계 연도·환율 산출법은 항목마다 다릅니다. 위의 국제 비교 GDP, 한국 값, 세계 순위에는 합산하지 않습니다.</p></div></details><div class="budget-reference-grid">'+rows.map(item=>'<article class="budget-reference-card"><span class="budget-reference-heading">'+esc(item.label)+'</span><strong>'+esc(money(item))+'</strong>'+(item.estimateKind?'<em class="metric-estimate metric-estimate--institutional">'+esc(item.estimateKind)+'</em>':"")+'<p>'+esc(String(item.year))+(String(item.year).includes('/')?' 회계연도':'년')+(item.fiscalYear?' · 회계연도 '+esc(item.fiscalYear):'')+' · '+esc(item.unit)+'</p>'+(item.note?'<p>'+esc(item.note)+'</p>':"")+'<small>'+sourceLink(item.source,item.provider||"원문 확인")+'</small></article>').join("")+'</div></section>';
 }
 // Party disputes: which parties are fighting over what, shown under the seat charts.
 // Corruption Perceptions Index (Transparency International): score, rank, Korea, 2020–2025 trend.
 // Free and fair elections (V-Dem): separate from CPI, which measures perceived administrative corruption.
 function electionBlock(data){
  const E=data.elections;if(!E)return "";const e=E.entry,k=E.korea,meta=E.meta||{};
  if(!e)return '<section class="section cpi elect"><h3>선거의 공정성</h3><p class="metric-missing"><span>평가 대상 아님</span> V-Dem 자료에 없는 국가·지역입니다.</p>'+casesFold(data.cases?.elections,"elections")+'</section>';
  const s=e.score,band=s>=.8?["대체로 자유·공정","#1f7a5a"]:s>=.5?["문제 있음","#5f9a3c"]:s>=.2?["심각한 문제","#d08a1e"]:["공정한 경쟁 선거 없음","#c62b33"];
  const f2=v=>(Math.round(v*100)/100).toFixed(2);
  const yrs=Object.keys(e.history||{}).sort();const pts=yrs.map(y=>e.history[y]);const kv=k?yrs.map(y=>k.history?.[y]??null):[];
  const W=360,H=70,pad=10,x=i=>pad+i*(W-2*pad)/Math.max(1,yrs.length-1),y=v=>H-pad-v*(H-2*pad);
  const line=vals=>vals.map((v,i)=>v==null?"":(i&&vals[i-1]!=null?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)).join(" ");
  const spark=yrs.length>1?'<svg class="cpi-spark" viewBox="0 0 '+W+' '+(H+14)+'" role="img" aria-label="'+esc(yrs[0]+"–"+yrs.at(-1)+" 추이")+'">'+(k?'<path d="'+line(kv)+'" class="cpi-kline"/>':"")+'<path d="'+line(pts)+'" class="cpi-line" style="stroke:'+band[1]+'"/>'+[0,pts.length-1].map(i=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(pts[i]).toFixed(1)+'" r="2.6" style="fill:'+band[1]+'"/><text x="'+x(i).toFixed(1)+'" y="'+(y(pts[i])-6).toFixed(1)+'" text-anchor="'+(i?"end":"start")+'">'+f2(pts[i])+'</text>').join("")+'<text x="'+pad+'" y="'+(H+12)+'" class="cpi-yr">'+yrs[0]+'</text><text x="'+(W-pad)+'" y="'+(H+12)+'" text-anchor="end" class="cpi-yr">'+yrs.at(-1)+'</text></svg>':"";
  const prev=e.history?.[String(Number(e.year)-1)],delta=prev!=null?Math.round((s-prev)*100)/100:null;
  const scale='<div class="cpi-scale"><span class="cpi-track"></span>'+(k?'<i class="cpi-k" style="left:'+(k.score*100)+'%"><b>한국 '+f2(k.score)+'</b></i>':"")+'<i class="cpi-me" style="left:'+(s*100)+'%;background:'+band[1]+'"></i><span class="cpi-ends"><em>0 공정 선거 없음</em><em>1 자유·공정</em></span></div>';
  const cp=data.cpi?.entry;
  const both=cp?'<div class="elect-vs"><p><span>행정 부패 인식</span><span class="ev-track"><i class="ev-cpi" style="width:'+cp.score+'%"></i></span><b>부패인식지수 '+cp.score+'/100</b></p><p><span>선거 과정</span><span class="ev-track"><i style="width:'+(s*100)+'%;background:'+band[1]+'"></i></span><b>선거 공정성 '+f2(s)+'/1</b></p></div>':"";
  return '<section class="section cpi elect"><h3>선거의 공정성 <small>'+esc(meta.edition||"V-Dem")+'</small></h3>'+
   '<div class="cpi-card"><div class="cpi-main"><div class="cpi-score"><strong style="color:'+band[1]+'">'+f2(s)+'</strong><span>/ 1</span></div><div class="cpi-meta"><b style="background:'+band[1]+'">'+band[0]+'</b><span>'+e.rank+'위 / '+(meta.total||174)+'개국 · '+esc(e.year)+'년</span>'+(delta!=null&&delta!==0?'<span class="cpi-delta">전년 대비 '+(delta>0?"▲":"▼")+Math.abs(delta).toFixed(2)+'</span>':"")+(k?'<span class="cpi-korea">한국 '+f2(k.score)+'</span>':"")+'</div></div>'+scale+spark+
   (k&&spark?'<p class="cpi-legend"><i style="background:'+band[1]+'"></i>'+esc(namedCountry(data.code))+' <i class="cpi-legend-k"></i>한국</p>':"")+both+
   '<p class="cpi-note">선거 폭력, 정부의 야당 위협, 부정·대규모 부정행위, 표 매수가 얼마나 없는지와 선거관리기구가 독립적인지를 V-Dem 전문가 평가로 0~1로 매긴 지수로, 높을수록 깨끗합니다. 경쟁 선거가 없거나 열리지 않으면 0에 가깝습니다. 선거로 뽑는 자리가 적어도(예: 의회 일부만 간접 선출) 치러진 선거 자체가 깨끗하면 점수가 높게 나올 수 있습니다. 위의 부패인식지수(행정·공직 부패)와는 따로 재는 지표입니다. 색 구분은 판도가 읽기 쉽게 나눈 것입니다. '+sourceLink(meta.source,"Our World in Data")+' · '+sourceLink(meta.vdem,"V-Dem 원자료")+'</p></div>'+casesFold(data.cases?.elections,"elections")+'</section>';
 }
 function cpiBlock(data){
  const c=data.cpi;if(!c)return "";
  const e=c.entry,k=c.korea;
  if(!e)return '<section class="section cpi"><h3>부패인식지수</h3><p class="metric-missing"><span>평가 대상 아님</span> '+esc(c.edition||"CPI")+'에 포함되지 않은 국가·지역입니다.</p>'+casesFold(data.cases?.corruption,"corruption")+'</section>';
  const band=e.score>=70?["매우 청렴","#1f7a5a"]:e.score>=50?["대체로 청렴","#5f9a3c"]:e.score>=30?["부패 심각","#d08a1e"]:["부패 매우 심각","#c62b33"];
  const yrs=Object.keys(e.history||{}).sort();const pts=yrs.map(y=>e.history[y]);
  const W=360,H=70,pad=10,min=Math.min(...pts,...(k?yrs.map(y=>k.history?.[y]).filter(v=>v!=null):[]))-4,max=Math.max(...pts,...(k?yrs.map(y=>k.history?.[y]).filter(v=>v!=null):[]))+4;
  const x=i=>pad+i*(W-2*pad)/Math.max(1,yrs.length-1),y=v=>H-pad-(v-min)/(max-min||1)*(H-2*pad);
  const line=vals=>vals.map((v,i)=>v==null?"":(i&&vals[i-1]!=null?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)).join(" ");
  const kv=k?yrs.map(y2=>k.history?.[y2]??null):[];
  const spark=yrs.length>1?'<svg class="cpi-spark" viewBox="0 0 '+W+' '+(H+14)+'" role="img" aria-label="'+esc(yrs[0]+"–"+yrs.at(-1)+" 점수 추이")+'">'+(k?'<path d="'+line(kv)+'" class="cpi-kline"/>':"")+'<path d="'+line(pts)+'" class="cpi-line" style="stroke:'+band[1]+'"/>'+pts.map((v,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="2.6" style="fill:'+band[1]+'"/>'+((i===0||i===pts.length-1)?'<text x="'+x(i).toFixed(1)+'" y="'+(y(v)-6).toFixed(1)+'" text-anchor="'+(i?"end":"start")+'">'+v+'</text>':"")).join("")+'<text x="'+pad+'" y="'+(H+12)+'" class="cpi-yr">'+yrs[0]+'</text><text x="'+(W-pad)+'" y="'+(H+12)+'" text-anchor="end" class="cpi-yr">'+yrs.at(-1)+'</text></svg>':"";
  const prev=e.history?.[String(Number(yrs.at(-1))-1)],delta=prev!=null?e.score-prev:null;
  const scale='<div class="cpi-scale"><span class="cpi-track"></span>'+(k?'<i class="cpi-k" style="left:'+k.score+'%" title="한국 '+k.score+'"><b>한국 '+k.score+'</b></i>':"")+'<i class="cpi-me" style="left:'+e.score+'%;background:'+band[1]+'"></i><span class="cpi-ends"><em>0 부패 심각</em><em>100 매우 청렴</em></span></div>';
  return '<section class="section cpi"><h3>부패인식지수 <small>'+esc(c.edition||"CPI")+'</small></h3>'+
   '<div class="cpi-card"><div class="cpi-main"><div class="cpi-score"><strong style="color:'+band[1]+'">'+e.score+'</strong><span>/ 100</span></div><div class="cpi-meta"><b style="background:'+band[1]+'">'+band[0]+'</b><span>'+e.rank+'위 / '+(c.total||182)+'개국</span>'+(delta!=null?'<span class="cpi-delta">전년 대비 '+(delta>0?"▲"+delta:delta<0?"▼"+(-delta):"변화 없음")+'</span>':"")+(k?'<span class="cpi-korea">한국 '+k.score+'점 · '+k.rank+'위</span>':"")+'</div></div>'+scale+spark+
   (k&&spark?'<p class="cpi-legend"><i style="background:'+band[1]+'"></i>'+esc(namedCountry(data.code))+' <i class="cpi-legend-k"></i>한국</p>':"")+
   '<p class="cpi-note">공공부문 부패에 대해 전문가·기업인이 어떻게 느끼는지를 0~100으로 매긴 지수로, 높을수록 청렴합니다. 실제 부패 사건 수를 센 값은 아닙니다. '+sourceLink(c.source,"국제투명성기구")+' · '+sourceLink(c.wiki,"연도별 표")+'</p></div>'+casesFold(data.cases?.corruption,"corruption")+'</section>';
 }
 // Party → regions, drawn on the country's own state/province map (never on the world map).
 // Views: "__win" = 1st party in every region; a party = shaded by its vote/seat share; income layer on top.
 const admin1Cache={};
 const getAdmin1=cc=>admin1Cache[cc]||(admin1Cache[cc]=fetch("data/admin1/"+cc+".json").then(r=>r.json()));
 function partyColor(label){let col=state.partyMap?.colors?.[label]||"#9ca7a3";(state.civicsChambers||[]).forEach(c=>(c.groups||[]).forEach(g=>{if(g[0]===label&&/^#[\da-f]{6}$/i.test(g[2]))col=g[2]}));return col}
 const isEn=()=>document.documentElement.lang==='en';
 const pct=v=>(Math.round(v*10)/10)+"%";
 const rv=(obj,u,g)=>!obj?null:obj[u]!=null?obj[u]:(g&&obj[g]!=null?obj[g]:null);
 function mixHex(a,b,t){const h=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));const A=h(a),B=h(b);return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("")}
 const SHARE_MAX=60,shareFill=(col,v)=>v<=0?"#f4f6f7":mixHex("#eef1f3",col,.1+.9*Math.min(1,v/SHARE_MAX));
 function unitLabel(box,u,g){const x=box._units?.[u];const prim=x?(isEn()?x.n:(x.ko||x.n)):u;const loc=x&&x.l&&x.l!==prim?x.l:"";return {prim,loc,g:g&&g!==u?g:""}}
 function pmapTip(box,u,g){
  const L=unitLabel(box,u,g);let h='<b>'+esc(L.prim)+'</b>'+(L.loc?'<span class="pmap-tip-l">'+esc(L.loc)+'</span>':"")+(L.g?'<span class="pmap-tip-g">'+esc(L.g)+'</span>':"");
  const cl=(box._units?.[u]?.c||[]);if(cl.length)h+='<span class="pmap-tip-c"><span>주요 도시</span>: '+cl.map(c=>esc(isEn()?c[1]:c[0])+(c[5]===2?' <i class="pmap-tip-star">★</i>':c[5]===1?' <small>(주도)</small>':"")).join(", ")+'</span>';
  const mode=box.dataset.mode==="income"?"income":box.dataset.pmapParty||"";const vote=state.partyMap?.vote;
  if(mode==="income"){const inc=state.income;const v=rv(inc?.values,u,g);const us=v==null||inc.currency==="USD"?null:incUsd(inc,v);h+='<em>'+(v==null?'<span>자료 없음</span>':esc(incFmt(v))+' <span>'+esc(inc.unit||"")+'</span>'+(us!=null?' <small class="pmap-usd">≈ '+usdFmt(us)+'</small>':""))+'</em>'}
  else if(mode==="__win"){const w=rv(vote?.winners,u,g);h+='<em>'+(w?'<i style="background:'+partyColor(w)+'"></i><span>1위</span> <span>'+esc(w)+'</span>':'<span>자료 없음</span>')+'</em>';
   const rows=Object.entries(vote?.shares||{}).map(([pn,o])=>[pn,rv(o,u,g)]).filter(x=>x[1]!=null).sort((x,y)=>y[1]-x[1]).slice(0,4);
   if(rows.length)h+='<ul>'+rows.map(([pn,v])=>'<li><i style="background:'+partyColor(pn)+'"></i><span>'+esc(pn)+'</span><strong>'+pct(v)+'</strong></li>').join("")+'</ul>'}
  else if(mode){const v=rv(vote?.shares?.[mode],u,g);const strong=new Set(state.partyMap?.parties?.[mode]?.regions||[]);
   h+='<em><i style="background:'+partyColor(mode)+'"></i><span>'+esc(mode)+'</span> '+(v!=null?'<strong>'+pct(v)+'</strong>':(strong.has(u)||strong.has(g))?'<span>강세 지역</span>':'<span>자료 없음</span>')+'</em>'}
  return h;
 }
 async function drawPartyMap(box){
  if(!box||box.dataset.drawn)return;box.dataset.drawn="1";
  const cc=box.dataset.pmapCc;let data;try{data=await getAdmin1(cc)}catch(e){box.textContent="지도를 불러오지 못했습니다.";return}
  const units=(data.units||[]).filter(u=>u.n);let pts=[];
  const fix=lon=>cc==="RU"&&lon<0?lon+360:cc==="US"&&lon>0?lon-360:lon;
  units.forEach(u=>u.r.forEach(r=>r.forEach(p=>pts.push([fix(p[0]),p[1]]))));
  if(cc==="US")pts=pts.filter(p=>p[0]>-170);
  const lat0=pts.reduce((a,p)=>a+p[1],0)/pts.length,kx=Math.cos(lat0*Math.PI/180);
  const xs=pts.map(p=>p[0]*kx),ys=pts.map(p=>-p[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const W=600,H=Math.max(220,Math.min(420,W*(y1-y0)/(x1-x0||1)));const sc=Math.min((W-20)/(x1-x0||1),(H-20)/(y1-y0||1));
  const ox=(W-(x1-x0)*sc)/2,oy=(H-(y1-y0)*sc)/2;
  const P=p=>[(fix(p[0])*kx-x0)*sc+ox,(-p[1]-y0)*sc+oy];
  const paths=units.map(u=>'<path data-unit="'+esc(u.n)+'" data-group="'+esc(u.g||"")+'" d="'+u.r.map(r=>"M"+r.map(p=>{const q=P(p);return q[0].toFixed(1)+" "+q[1].toFixed(1)}).join("L")+"Z").join("")+'"></path>').join("");
  box._ko={};units.forEach(u=>{if(u.ko)box._ko[u.n]=u.ko;if(u.g)box._ko[u.g]=box._ko[u.g]||u.g});
  box._units={};units.forEach(u=>box._units[u.n]=u);
  // Major cities: a dot for each listed city; labels only for the biggest ones that don't collide.
  const en=isEn(),mini=box.classList.contains("pmap--mini");const cs=[];units.forEach(u=>(u.c||[]).forEach(c=>cs.push(c)));
  const dots=cs.map(c=>{const q=P([c[2],c[3]]);return c[5]===2?'<path class="pmap-cap" data-ax="'+q[0].toFixed(1)+'" data-ay="'+q[1].toFixed(1)+'" d="M'+q[0].toFixed(1)+' '+(q[1]-4).toFixed(1)+'l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z"/>':'<circle class="pmap-city'+(c[5]===1?' pmap-city--adm':"")+'" data-ax="'+q[0].toFixed(1)+'" data-ay="'+q[1].toFixed(1)+'" cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="'+(c[5]===1?1.9:1.4)+'"/>'}).join("");
  let labels="";if(!mini){const taken=[];const order=[...cs].sort((a,b)=>(b[5]===2)-(a[5]===2)||b[4]-a[4]);let n=0;
   for(const c of order){if(n>=12)break;const q=P([c[2],c[3]]);const t=en?c[1]:c[0];const w=t.length*(en?5.2:8.6)+4,h=11;const box1={l:q[0]+3,r:q[0]+3+w,t:q[1]-h/2-1,b:q[1]+h/2-1};
    if(box1.r>W-2)continue;if(taken.some(o=>box1.l<o.r&&box1.r>o.l&&box1.t<o.b&&box1.b>o.t))continue;taken.push(box1);n++;
    labels+='<text class="pmap-label'+(c[5]===2?' pmap-label--cap':"")+'" data-ax="'+q[0].toFixed(1)+'" data-ay="'+q[1].toFixed(1)+'" x="'+(q[0]+4).toFixed(1)+'" y="'+(q[1]+3).toFixed(1)+'">'+esc(t)+'</text>'}}
  box.innerHTML='<svg class="pmap-svg" viewBox="0 0 '+W+' '+H.toFixed(0)+'" role="img" aria-label="주·도 지도">'+paths+'<g class="pmap-cities">'+dots+labels+'</g></svg><div class="pmap-tip" hidden></div>'+(mini?"":'<div class="pmap-zoom"><button type="button" data-pz="in" aria-label="확대">+</button><button type="button" data-pz="out" aria-label="축소">−</button><button type="button" data-pz="reset" aria-label="전체 보기">⟲</button></div>');
  if(!mini)pmapZoom(box,W,H);
  const tip=box.querySelector(".pmap-tip");let cur=null;
  box.addEventListener("mousemove",e=>{const p=e.target.closest?.("path[data-unit]");if(!p){tip.hidden=true;cur=null;return}
   if(cur!==p){cur=p;tip.innerHTML=pmapTip(box,p.dataset.unit,p.dataset.group);tip.hidden=false}
   const r=box.getBoundingClientRect();let x=e.clientX-r.left+14,y=e.clientY-r.top+14;if(x+tip.offsetWidth>r.width-4)x=e.clientX-r.left-tip.offsetWidth-14;if(y+tip.offsetHeight>r.height-4)y=e.clientY-r.top-tip.offsetHeight-14;tip.style.left=Math.max(4,x)+"px";tip.style.top=Math.max(4,y)+"px"});
  box.addEventListener("mouseleave",()=>{tip.hidden=true;cur=null});
  box._refreshTip=()=>{cur=null};
  if(box.dataset.mode==="income")paintIncome(box);else if(box.dataset.pmapParty)paintPartyMap(box,box.dataset.pmapParty);
 }

 // Party/income map zoom: wheel or +/− to zoom, drag to pan, two-finger pinch. City marks keep their size.
 function pmapZoom(box,W,H){
  const svg=box.querySelector(".pmap-svg");if(!svg)return;const home={x:0,y:0,w:W,h:H};let v={...home};
  const marks=[...svg.querySelectorAll("[data-ax]")];
  const set=n=>{const w=Math.min(W,Math.max(W/12,n.w)),h=w*H/W;const x=Math.min(W-w*.25,Math.max(-w*.75,n.x)),y=Math.min(H-h*.25,Math.max(-h*.75,n.y));v={x,y,w,h};
   svg.setAttribute("viewBox",[x,y,w,h].map(t=>t.toFixed(2)).join(" "));const k=w/W;
   marks.forEach(m=>{const ax=m.dataset.ax,ay=m.dataset.ay;m.setAttribute("transform",k>.999?"":"translate("+ax+" "+ay+") scale("+k.toFixed(4)+") translate("+(-ax)+" "+(-ay)+")")});
   box.classList.toggle("pmap-zoomed",k<.999)};
  const at=(f,cx,cy)=>set({x:cx-(cx-v.x)*f,y:cy-(cy-v.y)*f,w:v.w*f,h:v.h*f});
  const toSvg=(X,Y)=>{const r=svg.getBoundingClientRect();return [v.x+(X-r.left)/r.width*v.w,v.y+(Y-r.top)/r.height*v.h]};
  svg.addEventListener("wheel",e=>{e.preventDefault();const [cx,cy]=toSvg(e.clientX,e.clientY);at(e.deltaY>0?1.25:1/1.25,cx,cy)},{passive:false});
  const pts=new Map();let drag=null,pinch=null;
  svg.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pts.size===1)drag={x:e.clientX,y:e.clientY,v:{...v},moved:false};if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),v:{...v},c:toSvg((a.x+b.x)/2,(a.y+b.y)/2)};drag=null}});
  svg.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const r=svg.getBoundingClientRect();
   if(pinch&&pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>0){v={...pinch.v};at(pinch.d/d,pinch.c[0],pinch.c[1])}return}
   if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.abs(dx)+Math.abs(dy)>4&&v.w<W-.01){drag.moved=true;svg.setPointerCapture?.(e.pointerId);box.classList.add("pmap-dragging")}
    if(drag.moved)set({...drag.v,x:drag.v.x-dx/r.width*drag.v.w,y:drag.v.y-dy/r.height*drag.v.h})}});
  const end=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(!pts.size){drag=null;box.classList.remove("pmap-dragging")}};
  svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
  box.querySelector(".pmap-zoom")?.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const cx=v.x+v.w/2,cy=v.y+v.h/2;if(b.dataset.pz==="in")at(1/1.6,cx,cy);else if(b.dataset.pz==="out")at(1.6,cx,cy);else set(home)});
 }
 // Regional income layer: quantile classes (≤5) so wide gaps (e.g. 10x) still show every step.
 const INC_COL=["#dbe7f2","#b9d2e7","#7eaed3","#3f80b6","#124f86"];
 const incFmt=v=>{const a=Math.abs(v);return a<10?String(Math.round(v*100)/100):a<1000&&v%1?String(Math.round(v*10)/10):Math.round(v).toLocaleString("ko-KR")};
 function incomeScale(vals){
  const s=[...new Set(vals)].sort((a,b)=>a-b);const n=Math.min(5,s.length);const br=[];
  for(let i=1;i<n;i++)br.push(s[Math.floor(i*s.length/n)]);
  const k=v=>br.filter(b=>v>=b).length;const idx=i=>n<2?4:Math.round(i*4/(n-1));
  return {n,br,min:s[0],max:s.at(-1),col:v=>INC_COL[idx(k(v))],colAt:i=>INC_COL[idx(i)]};
 }
 const pmapParts=box=>{const blk=box.closest(".pmap-block")||box.parentElement;return {blk,leg:blk?.querySelector(".pmap-legend"),note:blk?.querySelector(".pmap-note"),basis:blk?.querySelector(".pmap-basis")}};
 const srcLine=(label,src)=>Array.isArray(src)&&src[2]?' · '+sourceLink(src[2],src[1]&&src[1].length<70?src[1]:(src[0]||"출처")):"";
 function incUsd(inc,v){const r=inc?.fxRate||state.fx?.rates?.[inc?.currency];if(!r||!Number.isFinite(v))return null;return v*(inc.mult||1)/r}
 const usdFmt=u=>u==null?"":"$"+(u>=1e4?Math.round(u/1000)+"k":u>=1000?(Math.round(u/100)/10)+"k":Math.round(u));
 function paintIncome(box){
  const inc=state.income;if(!inc)return;const vals=inc.values||{};box._refreshTip?.();
  const sc=incomeScale(Object.values(vals).filter(Number.isFinite));let missing=0;
  box.querySelectorAll("path[data-unit]").forEach(p=>{const v=rv(vals,p.dataset.unit,p.dataset.group);
   p.classList.remove("on");p.classList.toggle("nodata",v==null);p.style.fill=v==null?"":sc.col(v);if(v==null)missing++});
  const {leg,note,basis}=pmapParts(box);
  if(leg){const items=[];for(let i=0;i<sc.n;i++){const lo=i?sc.br[i-1]:sc.min,hi=i<sc.n-1?sc.br[i]:sc.max;const ul=inc.currency&&inc.currency!=="USD"?incUsd(inc,lo):null,uh=ul!=null?incUsd(inc,hi):null;items.push('<span><i style="background:'+sc.colAt(i)+'"></i>'+incFmt(lo)+(hi!==lo?"–"+incFmt(hi):"")+(ul!=null?'<small class="pmap-usd">'+usdFmt(ul)+(hi!==lo?"–"+usdFmt(uh):"")+'</small>':"")+'</span>')}
   if(missing)items.push('<span><i class="nodata"></i>자료 없음</span>');
   leg.innerHTML='<b>'+esc(inc.metric||"")+'</b><em>'+esc(String(inc.year||""))+'</em><em>'+esc(inc.unit||"")+'</em><div>'+items.join("")+'</div>';leg.hidden=false}
  if(note){const src=Array.isArray(inc.source)?inc.source:[];note.innerHTML=(inc.note?esc(inc.note)+'<br>':"")+(inc.currency&&inc.currency!=="USD"&&(inc.fxRate||state.fx)?'<small class="fight-source pmap-fxnote"><span>달러 환산</span>: '+(inc.fxRate?'<span>'+esc(inc.fxYear||inc.year||"")+'년 연평균 환율</span>(1달러 = '+esc(incFmt(inc.fxRate))+' '+esc(inc.currency)+', '+sourceLink(inc.fxSource,"세계은행")+')':'<span>'+esc(state.fx.asOf||"")+' 환율</span>(1달러 = '+esc(String(state.fx.rates?.[inc.currency]))+' '+esc(inc.currency)+') · <span>자료 연도의 환율과 다를 수 있음</span>')+(inc.fxNote?' · <span>'+esc(inc.fxNote)+'</span>':"")+'</small><br>':"")+'<small class="fight-source"><span>자료</span>: <span>'+esc(inc.provider||src[0]||"")+'</span>'+(src[2]?' · '+sourceLink(src[2],src[1]||src[0]||"출처"):"")+'</small>'}
  if(basis)basis.hidden=true;
 }
 function unpaintIncome(box){
  box.querySelectorAll("path[data-unit]").forEach(p=>{p.classList.remove("nodata");p.style.fill=""});
  const {leg,basis}=pmapParts(box);if(leg){leg.hidden=true;leg.innerHTML=""}if(basis)basis.hidden=false;
 }
 function paintPartyMap(box,label){
  const pmAll=state.partyMap||{},vote=pmAll.vote||null,pm=pmAll.parties?.[label];box._refreshTip?.();
  const paths=[...box.querySelectorAll("path[data-unit]")];const {leg,note,basis}=pmapParts(box);
  const voteBasis=vote?'<span>집계 기준</span> <span>'+esc(vote.election||"")+'</span> · <span>'+esc(vote.metric||"")+'</span>'+srcLine("",vote.source):"";
  if(label==="__win"&&vote){
   const count={};paths.forEach(p=>{const w=rv(vote.winners,p.dataset.unit,p.dataset.group);p.classList.remove("on");p.classList.toggle("nodata",!w);p.style.fill=w?partyColor(w):"";if(w)count[w]=(count[w]||0)+1});
   const uniq={};Object.entries(vote.winners||{}).forEach(([r,w])=>{uniq[w]=(uniq[w]||0)+1});
   if(leg){leg.innerHTML='<b>지역별 1위</b><div>'+Object.entries(uniq).sort((a,b)=>b[1]-a[1]).map(([w,n])=>'<span><i style="background:'+partyColor(w)+'"></i>'+esc(w)+' <em>'+n+'곳</em></span>').join("")+(paths.some(p=>p.classList.contains("nodata"))?'<span><i class="nodata"></i>자료 없음</span>':"")+'</div>';leg.hidden=false}
   if(note)note.innerHTML=vote.note?esc(vote.note):"";
   if(basis){basis.innerHTML=voteBasis;basis.hidden=false}
   return;
  }
  const col=partyColor(label),sh=vote?.shares?.[label];const hasSh=sh&&Object.keys(sh).length&&(Object.keys(sh).length>=0.5*Object.keys(vote.winners||{}).length||!pm);
  if(hasSh){
   paths.forEach(p=>{const v=rv(sh,p.dataset.unit,p.dataset.group);p.classList.remove("on");p.classList.toggle("nodata",v==null);p.style.fill=v==null?"":shareFill(col,v)});
   if(leg){leg.innerHTML='<b>'+esc(label)+'</b><em>'+esc(vote.metric||"")+'</em><div><span class="pmap-grad" style="background:linear-gradient(90deg,'+shareFill(col,0.01)+','+shareFill(col,SHARE_MAX/2)+','+col+')"></span><span>0%</span><span>'+(SHARE_MAX/2)+'%</span><span>'+SHARE_MAX+'%+</span>'+(paths.some(p=>p.classList.contains("nodata"))?'<span><i class="nodata"></i>자료 없음</span>':"")+'</div>';leg.hidden=false}
   const top=Object.entries(sh).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([r,v])=>(isEn()?r:(box._ko||{})[r]||r)+" "+pct(v));
   if(note)note.innerHTML='<b style="color:'+col+'">'+esc(label)+'</b> · <span>가장 높은 곳</span>: '+esc(top.join(", "))+(pm?.note?'<br>'+esc(pm.note):"");
   if(basis){basis.innerHTML=voteBasis;basis.hidden=false}
   return;
  }
  // No share data for this party: fall back to its listed strongholds, drawn lighter so a 1-seat party doesn't look dominant.
  const set=new Set(pm?.regions||[]);
  paths.forEach(p=>{const on=set.has(p.dataset.unit)||set.has(p.dataset.group);p.classList.remove("nodata");p.style.fill=on?mixHex("#eef1f3",col,.55):"";p.classList.toggle("on",on)});
  if(leg){leg.innerHTML=pm?'<b>'+esc(label)+'</b><div><span><i style="background:'+mixHex("#eef1f3",col,.55)+'"></i>의석·득표가 눈에 띄는 지역</span><span>주별 득표율 자료 없음</span></div>':"";leg.hidden=!pm}
  if(note)note.innerHTML=pm?'<b style="color:'+col+'">'+esc(label)+'</b> · '+esc((pm.regions||[]).map(r=>(isEn()?r:(box._ko||{})[r]||r)).join(", "))+(pm.note?'<br>'+esc(pm.note):""):"";
  if(basis){basis.innerHTML='<span>집계 기준</span> '+esc(pmAll.basis||"")+(Array.isArray(pmAll.source)&&pmAll.source[2]?' · '+sourceLink(pmAll.source[2],pmAll.source[0]||"출처"):"");basis.hidden=false}
 }
 // Countries without a state/province map: the country on a small locator map with its capital(s).
 let worldP2=null,capP=null;const getWorld2=()=>worldP2||(worldP2=fetch("data/world.json").then(r=>r.json()));const getCaps=()=>capP||(capP=fetch("data/capitals.json").then(r=>r.json()).catch(()=>({})));
 function capitalBlock(data){return '<section class="pmap-block cap-block"><div class="fights-head"><h4>수도와 위치</h4><span>주·도 지도는 준비 중이에요</span></div><div class="capmap" data-cap-cc="'+esc(data.code)+'"><p class="board-loading">지도를 그리는 중…</p></div><p class="pmap-note cap-note"></p></section>'}
 async function drawCapital(box){if(!box||box.dataset.drawn)return;box.dataset.drawn="1";const cc=box.dataset.capCc;
  let world,caps;try{[world,caps]=await Promise.all([getWorld2(),getCaps()])}catch(e){box.textContent="지도를 불러오지 못했습니다.";return}
  const mine=world.countries.filter(c=>c.c===cc);if(!mine.length){box.closest(".cap-block")?.remove();return}
  // world.json is pre-projected (Natural Earth I, centred on lon0); invert to lon/lat and redraw with a local projection so far-off countries aren't sheared.
  const fx=p=>{const p2=p*p,p4=p2*p2;return 0.8707-0.131979*p2+p4*(-0.013791+p4*(0.003971*p2-0.001529*p4))},fy=p=>{const p2=p*p,p4=p2*p2;return p*(1.007226+p2*(0.015085+p4*(-0.044475+0.028874*p2-0.005916*p4)))};
  const inv=(x,y)=>{const X=(x-world.w/2)/world.k,Y=world.top-y/world.k;let p=Y;for(let i=0;i<8;i++){const h=1e-5;p-=(fy(p)-Y)/((fy(p+h)-fy(p-h))/(2*h))}return [X/fx(p)*180/Math.PI+(world.lon0||0),p*180/Math.PI]};
  const rings=d=>(d.match(/M[^M]+/g)||[]).map(sub=>{const n=sub.match(/-?\d+(?:\.\d+)?/g)||[];const r=[];for(let i=0;i+1<n.length;i+=2)r.push([+n[i],+n[i+1]]);return r});
  const bb=c=>{const n=(c.d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);let a=1e9,b=-1e9,e=1e9,f=-1e9;for(let i=0;i+1<n.length;i+=2){a=Math.min(a,n[i]);b=Math.max(b,n[i]);e=Math.min(e,n[i+1]);f=Math.max(f,n[i+1])}return [a,b,e,f]};
  // main body of the country: the largest ring (by projected bbox area) and others near it
  const myR=mine.flatMap(c=>rings(c.d));const area=r=>{let A=0;for(let i=0;i<r.length;i++){const j=(i+1)%r.length;A+=r[i][0]*r[j][1]-r[j][0]*r[i][1]}return Math.abs(A)/2};
  myR.sort((a,b)=>area(b)-area(a));const big=myR[0];const bbx=r=>[Math.min(...r.map(p=>p[0])),Math.max(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[1]))];
  let [x0,x1,y0,y1]=bbx(big);const span=Math.max(x1-x0,y1-y0,4);myR.forEach(r=>{const [a,b,e,f]=bbx(r);if(a>x0-span*.6&&b<x1+span*.6&&e>y0-span*.6&&f<y1+span*.6){x0=Math.min(x0,a);x1=Math.max(x1,b);y0=Math.min(y0,e);y1=Math.max(y1,f)}});
  const pad=Math.max(x1-x0,y1-y0)*.5+3;const near=[x0-pad*2,x1+pad*2,y0-pad*2,y1+pad*2];
  const [cl,ct]=inv((x0+x1)/2,(y0+y1)/2);const kx=Math.cos(ct*Math.PI/180);
  const fixLon=lon=>{let v=lon-cl;v=((v+540)%360)-180;return v};
  const loc=([lon,lat])=>[fixLon(lon)*kx,-lat];
  const capList=caps[cc]||[];
  const shapes=world.countries.filter(c=>{const [a,b,e,f]=bb(c);return !(b<near[0]||a>near[1]||f<near[2]||e>near[3])}).map(c=>({c:c.c,rs:rings(c.d).map(r=>r.map(p=>loc(inv(p[0],p[1]))))}));
  const meL=shapes.filter(s=>s.c===cc).flatMap(s=>s.rs);let X0=1e9,X1=-1e9,Y0=1e9,Y1=-1e9;
  const mainBox=bbx(myR[0].map(p=>loc(inv(p[0],p[1]))));[X0,X1,Y0,Y1]=mainBox;const sp=Math.max(X1-X0,Y1-Y0,1);
  meL.forEach(r=>{const [a,b,e,f]=bbx(r);if(a>X0-sp*.6&&b<X1+sp*.6&&e>Y0-sp*.6&&f<Y1+sp*.6){X0=Math.min(X0,a);X1=Math.max(X1,b);Y0=Math.min(Y0,e);Y1=Math.max(Y1,f)}});
  capList.forEach(c=>{const [x,y]=loc([c[2],c[3]]);X0=Math.min(X0,x);X1=Math.max(X1,x);Y0=Math.min(Y0,y);Y1=Math.max(Y1,y)});
  const cw=Math.max(X1-X0,.6),ch=Math.max(Y1-Y0,.4),pd=Math.max(cw,ch)*.35+.3;let vx=X0-pd,vy=Y0-pd,vw=cw+pd*2,vh=ch+pd*2;
  const ar=2;if(vw/vh<ar){const nw=vh*ar;vx-=(nw-vw)/2;vw=nw}else{const nh=vw/ar;vy-=(nh-vh)/2;vh=nh}
  const u=vw/600;const ds=s=>s.rs.map(r=>"M"+r.map(p=>p[0].toFixed(3)+" "+p[1].toFixed(3)).join("L")+"Z").join("");
  const paths=shapes.map(s=>'<path class="cap-land'+(s.c===cc?' cap-land--on':"")+'" d="'+ds(s)+'"/>').join("");
  const en=isEn();const marks=capList.map(c=>{const [x,y]=loc([c[2],c[3]]);const r=6*u;
   const pts=[];for(let k=0;k<10;k++){const ang=-Math.PI/2+k*Math.PI/5,rr=k%2?r*.42:r;pts.push((x+rr*Math.cos(ang)).toFixed(3)+" "+(y+rr*Math.sin(ang)).toFixed(3))}
   return '<path class="cap-star" d="M'+pts.join("L")+'Z" style="stroke-width:'+(.8*u).toFixed(4)+'"/><text class="cap-label" x="'+(x+r*1.25).toFixed(3)+'" y="'+(y+r*.45).toFixed(3)+'" style="font-size:'+(12*u).toFixed(4)+'px;stroke-width:'+(3*u).toFixed(4)+'px">'+esc(en?c[1]:c[0])+'</text>'}).join("");
  box.innerHTML='<svg class="cap-svg" viewBox="'+[vx,vy,vw,vh].map(n=>n.toFixed(3)).join(" ")+'" role="img" aria-label="'+esc(namedCountry(cc))+' 위치와 수도"><g style="stroke-width:'+(.6*u).toFixed(4)+'">'+paths+'</g>'+marks+'</svg>';
  const note=box.parentElement?.querySelector(".cap-note");if(note)note.innerHTML=capList.length?'<span>수도</span>: '+capList.map(c=>'<b>'+esc(en?c[1]:c[0])+'</b>'+(c[4]?' <span>('+esc(c[4])+')</span>':"")).join(", "):"";
 }
 function pmapChipList(pm){
  if(!pm)return [];const vote=pm.vote,out=[];const seen=new Set();
  if(vote&&Object.keys(vote.winners||{}).length)out.push("__win");
  const wins={};Object.values(vote?.winners||{}).forEach(w=>wins[w]=(wins[w]||0)+1);
  const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
  Object.keys(vote?.shares||{}).sort((a,b)=>(wins[b]||0)-(wins[a]||0)||sum(vote.shares[b])-sum(vote.shares[a])).forEach(l=>{if(!seen.has(l)){seen.add(l);out.push(l)}});
  Object.keys(pm.parties||{}).forEach(l=>{if(!seen.has(l)){seen.add(l);out.push(l)}});
  return out;
 }
 function partyMapBlock(data){
  const pm=data.partymap,inc=data.income&&Object.keys(data.income.values||{}).length?data.income:null;
  const list=pmapChipList(pm);const hasPm=list.length>0;if(!hasPm&&!inc)return "";
  const first=hasPm?list[0]:"";
  const chips=list.map(l=>l==="__win"?'<button type="button" class="fight-party pmap-win'+(l===first?' on':'')+'" data-pmap-party="__win"><i class="pmap-win-i"></i>지역별 1위</button>':'<button type="button" class="fight-party'+(l===first?' on':'')+'" data-pmap-party="'+esc(l)+'"><i style="background:'+partyColor(l)+'"></i>'+esc(l)+'</button>').join("");
  const tog=inc?'<button type="button" class="pmap-toggle" data-pmap-income aria-pressed="'+(hasPm?"false":"true")+'"'+(hasPm?"":" disabled")+'><span class="pmap-switch"></span>지역별 소득 수준</button>':"";
  const hint=pm?.vote?"1위 정당을 보거나, 정당을 눌러 지역별 득표율을 진하기로 봐요":"정당을 누르면 강한 주·도가 칠해져요";
  return '<section class="pmap-block'+(hasPm?"":" pmap-block--income")+'"><div class="fights-head"><h4>'+(hasPm?"정당별 지역 지지":"지역별 소득 수준")+'</h4><span>'+(hasPm?hint:"")+'</span></div><div class="pmap-bar"><div class="pmap-chips">'+chips+'</div>'+tog+'</div><div class="pmap" data-pmap-cc="'+esc(data.code)+'"'+(hasPm?' data-pmap-party="'+esc(first)+'"':' data-mode="income"')+'><p class="board-loading">지도를 그리는 중…</p></div><div class="pmap-legend" hidden></div><p class="pmap-note"></p>'+(hasPm?'<small class="fight-source pmap-basis"></small>':"")+'</section>';
 }
 function partyRegions(data){
  const r=data.regions;if(!r||(!r.summary&&!Object.keys(r.parties||{}).length))return "";
  const groups={};(data.civics?.parliament?.chambers||[]).forEach(c=>(c.groups||[]).forEach(g=>{if(!groups[g[0]])groups[g[0]]=g}));
  const chip=label=>{const g=groups[label],col=g&&/^#[\da-f]{6}$/i.test(g[2])?g[2]:"#9ca7a3";return '<button type="button" class="fight-party" data-party-open="'+esc(label)+'"><i style="background:'+col+'"></i>'+esc(label)+(g?'<small>'+number(g[1],0)+'석</small>':"")+'</button>'};
  const parties=Object.entries(r.parties||{}).map(([label,p])=>'<li class="region-party"><div class="region-party-head">'+chip(label)+'<span class="region-where">'+esc(p.region||"")+'</span>'+(p.kind?'<span class="region-kind">'+esc(p.kind)+'</span>':"")+'</div>'+(p.note?'<p>'+esc(p.note)+(Array.isArray(p.source)&&p.source[2]?' '+sourceLink(p.source[2],p.source[0]||"출처"):"")+'</p>':"")+'</li>').join("");
  const holds=(r.strongholds||[]).map(h=>'<li><b>'+esc(h.party)+'</b> · '+esc(h.region||"")+(h.note?' — '+esc(h.note):"")+(Array.isArray(h.source)&&h.source[2]?' '+sourceLink(h.source[2],h.source[0]||"출처"):"")+'</li>').join("");
  return '<section class="regions"><div class="fights-head"><h4>지역과 정당</h4><span>지역 기반 정당 '+Object.keys(r.parties||{}).length+'곳</span></div>'+(r.summary?'<p class="fights-note">'+esc(r.summary)+'</p>':"")+(parties?'<ul class="region-parties">'+parties+'</ul>':"")+(holds?'<h5 class="region-sub">전국 정당의 지역 기반</h5><ul class="region-holds">'+holds+'</ul>':"")+(Array.isArray(r.source)&&r.source[2]?'<small class="fight-source">출처 '+sourceLink(r.source[2],(r.source[0]||"")+(r.source[1]?" · "+r.source[1]:""))+'</small>':"")+'</section>';
 }
 function partyFights(data){
  const f=data.fights;if(!f||(!Array.isArray(f.items)||!f.items.length)&&!f.note)return "";
  const groups={};(data.civics?.parliament?.chambers||[]).forEach(c=>(c.groups||[]).forEach(g=>{if(!groups[g[0]])groups[g[0]]=g}));
  const names=data.partyNames||{};
  const chip=label=>{const g=groups[label],col=g&&/^#[\da-f]{6}$/i.test(g[2])?g[2]:"#9ca7a3",n=names[label];
   return '<button type="button" class="fight-party" data-party-open="'+esc(label)+'"'+(n&&n.orig&&n.orig!==label?' title="'+esc(n.orig)+'"':"")+'><i style="background:'+col+'"></i>'+esc(label)+(g?'<small>'+number(g[1],0)+'석</small>':"")+'</button>'};
  const chambers=data.civics?.parliament?.chambers||[];
  // Seat tally per side: sum the seats of each side's parties in the chamber that holds most of them.
  const tally=it=>{const labels=it.sides.flatMap(sd=>sd.parties||[]);if(!labels.length)return null;
   const ch=chambers.map(c=>({c,hit:labels.filter(l=>(c.groups||[]).some(g=>g[0]===l)).length})).sort((x,y)=>y.hit-x.hit)[0];if(!ch||!ch.hit)return null;
   const seat=l=>{const g=(ch.c.groups||[]).find(g=>g[0]===l);return g&&Number.isFinite(+g[1])?+g[1]:0};
   const total=(ch.c.groups||[]).reduce((n,g)=>n+(Number.isFinite(+g[1])?+g[1]:0),0);
   const sums=it.sides.map(sd=>(sd.parties||[]).reduce((n,l)=>n+seat(l),0));if(sums.filter(Boolean).length<2||!total)return null;
   const cols=it.sides.map(sd=>{const g=groups[(sd.parties||[])[0]];return g&&/^#[\da-f]{6}$/i.test(g[2])?g[2]:"#9ca7a3"});
   return {sums,total,maj:Math.floor(total/2)+1,name:ch.c.name||"",cols}};
  const tallyBar=t=>'<div class="fight-tally"><p>'+t.sums.map((n,i)=>'<b style="color:'+t.cols[i]+'">'+n+'석</b>').join('<span>vs</span>')+'<small>'+(t.name?'<span>'+esc(t.name)+'</span> ':"")+'<span>'+t.total+'석 중</span> · <span>과반 '+t.maj+'석</span></small></p><div class="fight-tally-bar'+(t.sums.length===2?' fight-tally-bar--2':'')+'">'+t.sums.map((n,i)=>'<span style="width:'+(100*n/t.total).toFixed(2)+'%;background:'+t.cols[i]+'"></span>').join("")+'<i style="left:'+(100*t.maj/t.total).toFixed(2)+'%" title="과반"></i></div></div>';
  const items=(f.items||[]).filter(it=>it&&it.topic&&Array.isArray(it.sides)&&it.sides.length).map(it=>{const t=tally(it);return ''+
   '<article class="fight"><header>'+(it.kind?'<span class="fight-kind">'+esc(it.kind)+'</span>':"")+'<h5>'+esc(it.topic)+'</h5></header>'+
   (it.summary?'<p class="fight-summary">'+esc(it.summary)+'</p>':"")+(t?tallyBar(t):"")+
   '<div class="fight-sides'+(it.sides.length>2?" fight-sides--multi":"")+'">'+it.sides.map((sd,i)=>(i?'<span class="fight-vs" aria-hidden="true">VS</span>':"")+'<div class="fight-side">'+(t&&t.sums[i]?'<span class="fight-total">합계 <b>'+t.sums[i]+'석</b></span>':"")+'<div class="fight-parties">'+(sd.parties||[]).map(chip).join("")+(sd.label&&!(sd.parties||[]).length?'<b class="fight-camp">'+esc(sd.label)+'</b>':"")+'</div>'+(sd.stance?'<p>'+esc(sd.stance)+'</p>':"")+'</div>').join("")+'</div>'+
   (it.status?'<p class="fight-status"><b>지금</b>'+esc(it.status)+'</p>':"")+
   (Array.isArray(it.sources)&&it.sources.length?'<small class="fight-source">출처 '+it.sources.map(s=>sourceLink(s[2],(s[0]||"")+(s[1]?" · "+s[1]:""))).join(" · ")+'</small>':"")+'</article>'}).join("");
  return '<section class="fights"><div class="fights-head"><h4>정당 간 쟁점</h4>'+(f.asOf?'<span>'+esc(f.asOf)+' 기준</span>':"")+'</div>'+(f.note?'<p class="fights-note">'+esc(f.note)+'</p>':"")+items+'</section>';
 }
 function hemicycle(chamber){
  if(!chamber||!Array.isArray(chamber.groups))return "";
  const groups=chamber.groups.filter(g=>Array.isArray(g)&&Number.isInteger(g[1])&&g[1]>=0);
  const total=groups.reduce((n,g)=>n+g[1],0);
  if(!total||total>1000)return "";
  // Small chambers: fewer, wider-spaced rows with bigger seats so the arc stays readable.
  let rows,radii,dotR;
  if(total<120){
   const R=188,pick=[1,2,3,4,5,6].map(n=>{const d=n===1?0:Math.min(Math.PI*n*R/(total+Math.PI*n*(n-1)/2),(R-40)/(n-1));return {n,d,inner:R-(n-1)*d}}).filter(o=>o.n===1?total<=8:true);
   const best=pick.sort((a,b)=>Math.abs(a.inner-(total<=8?188:92))-Math.abs(b.inner-(total<=8?188:92)))[0];
   rows=best.n;radii=Array.from({length:rows},(_,i)=>R-(rows-1-i)*best.d);
   const arc=Math.PI*R/Math.max(1,Math.ceil(total*R/radii.reduce((a,b)=>a+b,0)));
   dotR=Math.max(3.5,Math.min(10,(rows>1?Math.min(best.d,arc):arc)*0.34));
  }else{
   rows=Math.max(6,Math.min(16,Math.round(Math.sqrt(total)/1.7)));
   radii=Array.from({length:rows},(_,i)=>48+i*140/(rows-1));
   dotR=total>300?2.35:3.5;
  }
  const weightSum=radii.reduce((a,b)=>a+b,0);
  const counts=radii.map(r=>Math.floor(total*r/weightSum));
  const fractional=radii.map((r,i)=>({index:i,part:total*r/weightSum-counts[i]})).sort((a,b)=>b.part-a.part);
  const remainder=total-counts.reduce((a,b)=>a+b,0);
  for(let i=0;i<remainder;i++)counts[fractional[i].index]++;
  const dots=[];
  radii.forEach((r,row)=>{const count=counts[row];for(let n=0;n<count;n++)dots.push({r,row,angle:Math.PI*(n+.5)/count})});
  dots.sort((a,b)=>b.angle-a.angle||a.r-b.r);
  const color=g=>/^#[\da-f]{6}$/i.test(g[2])?g[2]:"#9ca7a3";
  // Give each group a clean wedge: in every row, a group takes the share of seats its
  // total implies (largest remainder), so boundaries run close to radial lines.
  const assignWedges=()=>{
   let cum=0;const bounds=[];
   for(const g of groups){
    cum+=g[1];
    const ideal=counts.map(c=>c*cum/total),base=ideal.map(Math.floor);
    let deficit=cum-base.reduce((a,b)=>a+b,0);
    ideal.map((v,i)=>({i,f:v-base[i]})).sort((a,b)=>b.f-a.f).forEach(({i})=>{if(deficit>0&&base[i]<counts[i]){base[i]++;deficit--}});
    bounds.push(base);
   }
   for(let k=1;k<bounds.length;k++)for(let r=0;r<rows;r++)if(bounds[k][r]<bounds[k-1][r])return null;
   const rowDots=radii.map((_,row)=>dots.filter(d=>d.row===row).sort((a,b)=>b.angle-a.angle));
   rowDots.forEach((list,row)=>list.forEach((d,n)=>{d.g=bounds.findIndex(b=>n<b[row])}));
   const tally=groups.map(()=>0);dots.forEach(d=>tally[d.g]++);
   return tally.every((t,i)=>t===groups[i][1]);
  };
  if(!assignWedges()){const owner=groups.flatMap((g,gi)=>Array(g[1]).fill(gi));dots.forEach((d,i)=>d.g=owner[i])}
  const circles=dots.map(p=>'<circle data-g="'+p.g+'" cx="'+(215+p.r*Math.cos(p.angle)).toFixed(1)+'" cy="'+(213-p.r*Math.sin(p.angle)).toFixed(1)+'" r="'+dotR+'" fill="'+color(groups[p.g])+'"/>').join("");
  // Party boundaries: in every row, a point midway between the last seat of one group and the first of the next.
  const xy=(r,a)=>(215+r*Math.cos(a)).toFixed(1)+" "+(213-r*Math.sin(a)).toFixed(1);
  const byRow=radii.map((r,row)=>dots.filter(d=>d.row===row).sort((a,b)=>b.angle-a.angle));
  const seps=[];
  for(let k=0;k<(total<40||rows<3?0:groups.length-1);k++){
   // Lines around 1–2 seat groups only add clutter; their colour and the legend identify them.
   if(!groups[k][1]||groups[k][1]<3&&groups[k+1][1]<3||groups[k][1]<3&&k>0&&groups[k-1][1]<3)continue;
   const pts=[];
   byRow.forEach((list,row)=>{
    const r=radii[row];let left=null,right=null;
    for(const d of list){if(d.g<=k)left=d;else{right=d;break}}
    const a=left&&right?(left.angle+right.angle)/2:left?0:right?Math.PI:null;
    if(a!==null)pts.push([r,a]);
   });
   if(pts.length<2)continue;
   const step=(radii[1]-radii[0])/2;
   const path="M"+xy(pts[0][0]-step,pts[0][1])+pts.map(p=>" L"+xy(p[0],p[1])).join("")+" L"+xy(pts.at(-1)[0]+step,pts.at(-1)[1]);
   seps.push('<path class="seat-sep" d="'+path+'"/>');
  }
  // A proportional strip below the arc: every group gets its own boxed segment.
  let acc=0;
  const strip=groups.filter(g=>g[1]>0).map(g=>{const gi=groups.indexOf(g),w=g[1]/total*100,html='<span class="seat-strip-seg" data-g="'+gi+'" style="width:'+w.toFixed(3)+'%;background:'+color(g)+'" title="'+esc(g[0])+' '+g[1]+'석"></span>';acc+=w;return html}).join("");
  const majority=Math.floor(total/2)+1;
  // Party name: original-language name first, then Korean translation and pronunciation.
  const names=chamber.partyNames||{};
  const partyLabel=g=>{
   const n=names[g[0]];
   if(!n||!n.orig||n.orig===g[0])return '<strong>'+esc(g[0])+'</strong>';
   const sub=[n.ko||g[0],n.pron].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
   return '<strong dir="auto" lang="und">'+esc(n.orig)+(n.abbr&&n.abbr!==n.orig?'<em class="party-abbr">'+esc(n.abbr)+'</em>':"")+'</strong><span class="party-ko">'+sub.map((v,i)=>i===1?'<span class="party-pron">['+esc(v)+']</span>':esc(v)).join(" ")+'</span>';
  };
  const legend=groups.map((g,gi)=>'<li data-g="'+gi+'" data-party="'+esc(g[0])+'" tabindex="0"><i style="background:'+color(g)+'"></i><span>'+partyLabel(g)+'<small>'+esc(g[3]||"성향 자료 없음")+'</small></span><b>'+number(g[1],0)+'석</b></li>').join("");
  return '<div class="chamber-chart"><div class="chamber-heading"><b>'+esc(chamber.name||"의회")+'</b><span>'+esc(chamber.label||"의석 자료")+'</span></div><svg viewBox="0 0 430 232" aria-hidden="true" class="seat-svg"><path d="M16 214H414" stroke="#dce3de" stroke-width="1"/>'+circles+seps.join("")+'</svg><div class="seat-strip" aria-hidden="true">'+strip+'<em class="seat-majority" style="left:'+(majority/total*100).toFixed(2)+'%" title="과반 '+majority+'석"></em></div><p class="chart-count">'+number(total,0)+'석 · 과반 '+number(majority,0)+'석 · '+esc(chamber.entity||"분류별 의석")+' · 정당을 누르면 대표자와 주장이 열립니다</p><ul class="seat-legend">'+legend+'</ul><div class="party-detail" hidden></div></div>';
 }
 // Party card: leader, ideology, positions and latest stance. Opens under the legend.
 function partyCard(label){
  const prof=(state.partyProfiles||{})[label],name=(state.partyNames||{})[label]||{};
  if(!prof)return '<p class="party-empty">이 그룹의 대표자·주장 자료는 아직 없습니다.</p>';
  const L=prof.leader||{};
  const photo=L.name&&state.partyPhotos?.[label];
  const lead=L.name?'<div class="party-leader">'+portrait({name:L.name,photo:photo?{url:photo.d}:null},"party-leader-photo")+'<div><span class="party-leader-title">'+esc(L.title||"대표")+(L.since?' · '+esc(String(L.since))+'년부터':"")+'</span><strong>'+esc(L.nameKo||L.name)+'</strong>'+(L.nameKo&&L.nameKo!==L.name?'<small>'+esc(L.name)+'</small>':"")+(L.office?'<small>'+esc(L.office)+'</small>':"")+
   (Array.isArray(prof.coLeaders)&&prof.coLeaders.length?'<small class="party-co">'+prof.coLeaders.map(c=>esc((c.title?c.title+' ':"")+(c.nameKo||c.name))).join(" · ")+'</small>':"")+
   (photo?'<small class="party-photo-credit">사진 '+sourceLink(photo.source,photo.license||"원본")+'</small>':"")+'</div></div>':"";
  const pmp=state.partyMap?.parties?.[label],pmsh=state.partyMap?.vote?.shares?.[label];const pmini=(pmp&&pmp.regions?.length)||(pmsh&&Object.keys(pmsh).length)?'<h5>'+(pmsh&&Object.keys(pmsh).length?"지역별 득표":"강세 지역")+'</h5><div class="pmap pmap--mini" data-pmap-cc="'+esc(state.activeCode||"")+'" data-pmap-party="'+esc(label)+'"></div><p class="pmap-note"></p>':"";
  const rg=state.regions?.parties?.[label];const region=rg?'<p class="party-region"><b>'+esc(rg.kind||"지역 정당")+'</b> · '+esc(rg.region||"")+'</p>':"";
  const ideology=Array.isArray(prof.ideology)&&prof.ideology.length?'<div class="party-tags">'+prof.ideology.map(t=>'<span>'+esc(t)+'</span>').join("")+'</div>':"";
  const positions=Array.isArray(prof.positions)&&prof.positions.length?'<h5>주요 주장</h5><ul class="party-positions">'+prof.positions.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>':"";
  const now=prof.now?'<h5>지금 목소리</h5><p class="party-now">'+esc(prof.now)+'</p>':"";
  const src=Array.isArray(prof.sources)&&prof.sources.length?'<p class="party-sources">출처 '+prof.sources.slice(0,3).map(x=>sourceLink(x[2],x[0]||"원문")).join(" · ")+'</p>':"";
  return '<header><strong dir="auto">'+esc(name.orig||label)+'</strong>'+(name.orig&&name.orig!==label?'<span>'+esc(name.ko||label)+'</span>':"")+'<button type="button" class="party-close" aria-label="닫기">×</button></header>'+lead+region+ideology+positions+now+pmini+src;
 }
 function chamberHeadcounts(legislature){
  const chambers=Array.isArray(legislature?.chambers)?legislature.chambers:[];
  if(!chambers.length)return "";
  const reason={suspended:"운영 중지",not_applicable:"비적용",not_reported:"미보고",zero_reported:"0명 보고"};
  const rows=chambers.map(c=>{
   const count=Number.isInteger(c.currentMembers)&&c.currentMembers>0;
   return '<li><strong>'+esc(c.name||"의회")+'</strong><span>'+(count?number(c.currentMembers,0)+"명":
    esc(c.suspended?reason.suspended:reason[c.availability]||"미확인"))+(count&&c.estimated?'<em class="headcount-estimate"'+(c.estimateKind?' title="'+esc(c.estimateKind)+'"':"")+'>추산</em>':"")+'</span></li>';
  }).join("");
  return '<div class="chamber-headcounts"><div><strong>의원 수'+(legislature.asOf?' · '+esc(legislature.asOf):"")+'</strong>'+sourceLink(legislature.source,shortProvider(legislature.provider)||"원문")+'</div><ul>'+rows+'</ul></div>';
 }
 // "지금 상황": curated situation summary (who holds what), then this
 // edition's stories for the country. This is what a reader opens a dossier for.
 function countryNow(data){
  const c=data.context;
  const stories=(state.edition?.stories||[]).filter(s=>mainCodes(s).includes(data.code));
  const watch=(data.watch||[]).filter(w=>!stories.some(s=>s.headline===w.title));
  let html="";
  if(c&&c.summary){
   const control=Array.isArray(c.control)&&c.control.length?'<ul class="control-list">'+c.control.map(r=>'<li><div><b>'+esc(r.actor)+'</b>'+(r.backers?'<small>'+(c.kind==="politics"?"":"후원·연계 ")+esc(r.backers)+'</small>':"")+'</div><span>'+esc(r.holds)+'</span></li>').join("")+'</ul>':"";
   const points=Array.isArray(c.points)&&c.points.length?'<ul class="now-points">'+c.points.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>':"";
   const sources=Array.isArray(c.sources)?c.sources.map(s=>'<li>'+sourceLink(s[2],s[0]+(s[1]?" — "+s[1]:""))+'</li>').join(""):"";
   html+='<section class="now" aria-label="지금 상황"><div class="now-head"><span>지금 상황</span>'+(c.asOf?'<time>'+esc(c.asOf)+' 기준</time>':"")+'</div>'+
    (c.headline?'<h3>'+esc(c.headline)+'</h3>':"")+'<p class="now-summary">'+esc(c.summary)+'</p>'+
    (control?'<h4>'+(c.kind==="politics"?"권력 구도":"누가 무엇을 쥐고 있나")+'</h4>'+control:"")+(points?'<h4>지켜볼 점</h4>'+points:"")+
    fold("출처 "+(Array.isArray(c.sources)?c.sources.length:0)+"건",sources?'<ul class="now-sources">'+sources+'</ul>'+(c.note?'<p>'+esc(c.note)+'</p>':""):"")+'</section>';
  }
  if(stories.length||watch.length){
   html+='<section class="recent" aria-label="최근 변화"><h3 class="recent-title">최근 변화 <small>'+esc(state.edition?.editionDate||"")+' 판</small></h3>'+
    stories.map(s=>'<button type="button" class="recent-card" data-open="'+esc(s.id)+'"><span class="recent-meta"><b>'+esc(s.level)+'</b> · '+esc(s.changeDate||s.eventDate)+'</span><strong>'+esc(s.headline)+'</strong><span class="recent-summary">'+esc(s.summary)+'</span><span class="recent-more">자세히 ↗</span></button>').join("")+
    watch.map(w=>'<article class="recent-card"><span class="recent-meta"><b>'+esc(w.status)+'</b> · '+esc(w.dateLabel||w.date)+'</span><strong>'+esc(w.title)+'</strong><span class="recent-summary">'+esc(w.detail)+'</span>'+sourceLink(w.url,"원문")+'</article>').join("")+'</section>';
  }
  return html;
 }

 // ── 국제기구(블록) ──
 const BLOC_ORDER=["NATO","EU","BRICS","SCO","BRI","G7","G20","OECD","CSTO","OPEC","OPEC+","ASEAN","AU","GCC","ArabLeague","EAEU","AES","ECOWAS","Mercosur","CPTPP","RCEP","USMCA","Quad","AUKUS","Five Eyes","Commonwealth"];
 const blocName=(k,b)=>b?.short||({ArabLeague:"아랍연맹",Commonwealth:"영연방",BRI:"일대일로",AU:"아프리카연합",AES:"사헬국가동맹",EAEU:"유라시아경제연합",Mercosur:"메르코수르"}[k])||k;
 async function loadBlocs(){if(state.blocs)return state.blocs;try{const r=await api("/api/blocs");state.blocs=await r.json()}catch{state.blocs={}}return state.blocs}
 async function renderBlocBar(){const bar=$("#bloc-bar");if(!bar)return;const B=await loadBlocs();const keys=BLOC_ORDER.filter(k=>B[k]);if(!keys.length)return;
  bar.innerHTML='<div class="bloc-head"><strong>국제기구로 보기</strong><span>누르면 회원국을 지도에 칠합니다</span></div><div class="bloc-chips"><button type="button" class="bloc-chip" data-bloc="" aria-pressed="true">끄기</button>'+keys.map(k=>'<button type="button" class="bloc-chip" data-bloc="'+esc(k)+'" aria-pressed="false">'+esc(blocName(k,B[k]))+'</button>').join("")+'</div><div class="bloc-info" id="bloc-info" aria-live="polite"></div>'}
 function selectBloc(k){const B=state.blocs||{},b=B[k];document.querySelectorAll("#bloc-bar [data-bloc]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.bloc===(k||""))));
  const info=$("#bloc-info");if(!b){atlas.setBloc&&atlas.setBloc(null);if(info)info.innerHTML="";return}
  const m={};for(const c of Object.keys(b.members||{}))m[c]="member";for(const c of Object.keys(b.partners||{}))if(!m[c])m[c]="partner";atlas.setBloc&&atlas.setBloc(m);
  const pc=Object.keys(b.partners||{}).length;
  if(info)info.innerHTML='<p><b>'+esc(b.ko||k)+'</b> '+(b.kind?'<span class="bloc-kind">'+esc(b.kind)+'</span> ':"")+'· 회원 '+Object.keys(b.members||{}).length+'개국'+(pc?' · 파트너·옵서버 '+pc+'곳(옅은 색)':"")+(b.founded?' · '+esc(String(b.founded).slice(0,4))+'년 출범':"")+'</p>'+(b.about?'<p>'+esc(b.about)+'</p>':"")+(b.notes?'<p class="bloc-notes">'+esc(b.notes)+'</p>':"")+'<p class="bloc-src">'+sourceLink(b.source,"회원국 원문")+'</p>'}
 function countryBlocs(code){const B=state.blocs||{};const rows=[];for(const k of BLOC_ORDER){const b=B[k];if(!b)continue;const since=b.members?.[code];const p=b.partners?.[code];
   if(since!==undefined)rows.push({k,b,since:String(since||""),role:"회원"+((/정지/.test(b.notes||"")&&new RegExp(namedCountry(code)).test(b.notes||""))?"(자격 정지 언급)":"")});else if(p)rows.push({k,b,since:String(p.since||""),role:p.label||"파트너"})}
  if(!rows.length)return "";rows.sort((x,y)=>(x.since||"9999").localeCompare(y.since||"9999"));
  return '<section class="section country-blocs"><h3>가입한 국제기구</h3><ul class="bloc-list">'+rows.map(r=>'<li><button type="button" class="bloc-li" data-bloc-open="'+esc(r.k)+'"><b>'+esc(blocName(r.k,r.b))+'</b><span>'+esc(r.b.ko||"")+'</span></button><span class="bloc-role'+(r.role==="회원"?"":" bloc-role--partner")+'">'+esc(r.role)+'</span><time>'+(r.since?esc(r.since.length===4?r.since+"년":r.since):"가입일 미확인")+'</time></li>').join("")+'</ul><p class="bloc-foot">기구 이름을 누르면 첫 화면 지도에서 회원국을 볼 수 있습니다. 가입일은 각 기구 공식 회원국 목록·위키백과 회원국 표 기준(2026-10-11 확인).</p></section>'}

 // ── 피드백 ──
 const FEEDBACK_TO="andy9741@naver.com";
 function feedbackSheet(){let d=$("#feedback-dialog");if(d){d.hidden=false;d.querySelector("textarea")?.focus();return}
  d=document.createElement("div");d.id="feedback-dialog";d.className="feedback-dialog";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-labelledby","feedback-title");
  d.innerHTML='<form class="feedback-box" id="feedback-form"><div class="feedback-top"><h2 id="feedback-title">피드백 보내기</h2><button type="button" class="feedback-x" data-feedback-close aria-label="닫기">×</button></div><p class="feedback-lede">틀린 정보, 원하는 기능, 아무 의견이나 적어 주세요. 판도 운영자에게 바로 전달됩니다.</p><label for="feedback-msg">내용</label><textarea id="feedback-msg" name="message" rows="6" required maxlength="5000" placeholder="예: 일본 예산을 원화로도 보고 싶어요"></textarea><label for="feedback-email">답장 받을 이메일 <small>(선택)</small></label><input id="feedback-email" name="email" type="email" autocomplete="email" placeholder="you@example.com"><div class="feedback-actions"><button type="submit" class="feedback-send">보내기</button><span class="feedback-status" id="feedback-status" aria-live="polite"></span></div></form>';
  document.body.appendChild(d);d.querySelector("textarea").focus();
  d.addEventListener("click",e=>{if(e.target===d||e.target.closest("[data-feedback-close]"))d.hidden=true});
  d.addEventListener("keydown",e=>{if(e.key==="Escape")d.hidden=true});
  d.querySelector("form").addEventListener("submit",async e=>{e.preventDefault();const f=e.target,st=$("#feedback-status"),btn=f.querySelector(".feedback-send");const msg=f.message.value.trim();if(!msg){st.textContent="내용을 적어 주세요.";return}
   btn.disabled=true;st.textContent="보내는 중…";
   try{const r=await fetch("https://formsubmit.co/ajax/"+FEEDBACK_TO,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(Object.assign({_subject:"[판도 피드백] "+msg.slice(0,40),message:msg,page:location.href,_template:"table",_captcha:"false"},f.email.value.trim()?{email:f.email.value.trim(),_replyto:f.email.value.trim()}:{}))});
    const j=await r.json().catch(()=>({}));if(!r.ok||String(j.success)==="false")throw Error(j.message||r.status);
    st.textContent="보냈습니다. 고맙습니다!";f.reset();setTimeout(()=>{d.hidden=true;st.textContent=""},1800)}
   catch(err){const m=String(err&&err.message||"");st.innerHTML=/activat/i.test(m)?"처음 한 번 인증이 필요합니다. 운영자 메일함("+esc(FEEDBACK_TO)+")에 온 FormSubmit 메일에서 <b>Activate Form</b>을 누르면 그다음부터 바로 전달됩니다.":"보내지 못했습니다"+(m?" ("+esc(m.slice(0,80))+")":"")+". 이메일로 직접 보내 주세요: <b>"+esc(FEEDBACK_TO)+"</b>"}
   finally{btn.disabled=false}})}
 async function drawBoard(slot,i){
  const ctx=state.conflictCtx;if(!ctx||!global_PB())return;const c=ctx.list[i];if(!c)return;
  let boards={},civics={};try{[boards,civics]=await Promise.all([api("/api/boards").then(r=>r.json()),api("/api/civics").then(r=>r.json())])}catch{}
  const key=c.with||c.withName;
  const board=Object.values(boards||{}).find(b=>(b.pairs||[]).some(p=>p[0]===ctx.code&&p[1]===key))||window.PandoBoard.autoBoard(ctx.code,c,civics,code=>namedCountry(code));
  window.PandoBoard.render(slot,board,{uid:ctx.code+"-"+i,onCountry:code=>openCountry(code)});
 }
 const global_PB=()=>!!window.PandoBoard;
 const conflictLevel={high:"무력 충돌",medium:"긴장·제재",low:"외교·무역 마찰"};
 const allyTie={"동맹":"alliance","전략적 동반자":"strategic","우호·협력":"friendly","후원":"patron"};
 function countryAllies(data){
  const list=Array.isArray(data.allies)?data.allies.filter(a=>a&&a.withName&&a.brief):[];
  if(!list.length)return "";
  const fl=c=>c&&/^[A-Z]{2}$/.test(c)&&c!=="EU"?flag(c,"flag-chip"):'<span class="conflict-nonstate" aria-hidden="true">'+(c==="EU"?"EU":"◆")+'</span>';
  const interests=a=>(a.interests||[]).map(x=>'<li><b>'+esc(x.area||"")+'</b>'+esc(x.text||"")+'</li>').join("");
  const chips=list.map((a,i)=>'<button type="button" class="ally-chip ally-chip--'+(allyTie[a.tie]||"friendly")+'" data-ally="'+i+'" aria-expanded="false" aria-describedby="ally-tip-'+i+'">'+fl(a.with)+'<span>'+esc(a.withName)+'</span>'+
   '<span class="conflict-tip ally-tip" role="tooltip" id="ally-tip-'+i+'"><b>'+esc(a.tie||"우방")+(a.basis?' · '+esc(a.basis):"")+'</b>'+esc(a.brief)+(a.interests?.length?'<ul>'+interests(a)+'</ul>':"")+'</span></button>').join("");
  const details=list.map((a,i)=>'<article class="conflict-detail ally-detail" data-ally-detail="'+i+'" hidden><header><span class="ally-tie ally-tie--'+(allyTie[a.tie]||"friendly")+'">'+esc(a.tie||"우방")+'</span><h4>'+esc(namedCountry(data.code))+' ↔ '+esc(a.withName)+'</h4><small>'+(a.basis?esc(a.basis):"")+(a.since?(a.basis?" · ":"")+esc(String(a.since))+'년부터':"")+'</small></header><p class="conflict-brief">'+esc(a.brief)+'</p>'+
   (a.interests?.length?'<h5 class="ally-sub">겹치는 이해관계</h5><ul class="ally-interests">'+interests(a)+'</ul>':"")+(a.detail?'<p>'+esc(a.detail)+'</p>':"")+
   (Array.isArray(a.sources)&&a.sources.length?'<ul class="conflict-sources">'+a.sources.map(s=>'<li>'+sourceLink(s[2],(s[0]||"")+(s[1]?" — "+s[1]:""))+'</li>').join("")+'</ul>':"")+
   (a.with&&/^[A-Z]{2}$/.test(a.with)&&a.with!=="EU"?'<button type="button" class="conflict-open" data-country="'+esc(a.with)+'">'+esc(a.withName)+' 국가 정보 보기 →</button>':"")+'</article>').join("");
  return '<section class="conflicts allies" aria-label="우방 관계"><div class="conflicts-head"><h3>우방 관계</h3><span>마우스를 올리면 겹치는 이해관계, 누르면 자세히</span></div><div class="conflict-chips">'+chips+'</div>'+details+'</section>';
 }
 const flowNames={law:"법률",budget:"예산",war:"전쟁·파병·조약"};
 function decisionBlock(d){
  if(!d||!d.summary)return "";
  const power=(d.power||[]).map(x=>'<li class="dm-power"><b>'+esc(x.who||"")+'</b>'+(x.how?'<small>'+esc(x.how)+'</small>':"")+(x.holds?'<span>'+esc(x.holds)+'</span>':"")+'</li>').join("");
  const flows=Object.keys(flowNames).filter(k=>Array.isArray(d.flows?.[k])&&d.flows[k].length);
  const tabs=flows.length>1?'<div class="dm-tabs" role="tablist">'+flows.map((k,i)=>'<button type="button" role="tab" data-dm-tab="'+k+'" aria-selected="'+(i===0)+'">'+flowNames[k]+'</button>').join("")+'</div>':"";
  const panes=flows.map((k,i)=>'<ol class="dm-flow" data-dm-pane="'+k+'"'+(i?' hidden':"")+'>'+d.flows[k].map((t,j)=>'<li><i>'+(j+1)+'</i><span>'+esc(t)+'</span></li>').join("")+'</ol>').join("");
  const checks=(d.checks||[]).length?'<h5 class="dm-sub">견제 장치</h5><ul class="dm-checks">'+d.checks.map(c=>'<li>'+esc(c)+'</li>').join("")+'</ul>':"";
  const informal=d.informal?'<div class="dm-informal"><b>공식 절차 밖의 힘</b><p>'+esc(d.informal)+'</p></div>':"";
  const src=(d.sources||[]).length?'<p class="dm-src">출처 '+d.sources.map(s=>sourceLink(s[2],(s[0]||"")+(s[1]?" · "+s[1]:""))).join(" · ")+'</p>':"";
  return '<section class="section decision-map"><h3>결정은 어떻게 내려지나</h3><p class="dm-summary">'+esc(d.summary)+'</p>'+(power?'<h5 class="dm-sub">누가 쥐고 있나</h5><ul class="dm-powers">'+power+'</ul>':"")+(flows.length?'<h5 class="dm-sub">거치는 단계</h5>'+tabs+panes:"")+checks+informal+src+'</section>';
 }
 // "한눈에 보는 문제": traffic-light signals computed from existing data + researched problem cards.
 const SIG_LV={g:"양호",y:"주의",r:"위험"};
 function sigLatest(m){if(!m)return null;const ser=(m.series||[]).filter(p=>Number.isFinite(+p.value));const last=ser.at(-1);const v=last?+last.value:Number.isFinite(+m.value)?+m.value:null;if(v==null)return null;
  return {v,year:last?.year||m.year,prev:ser.length>1?+ser.at(-2).value:null,prevYear:ser.length>1?ser.at(-2).year:null}}
 function problemSignals(data){
  const M=data.metrics||{},K=data.koreaLatest||{},out=[];const r1=v=>Math.abs(v)>=100?Math.round(v):Math.round(v*10)/10;
  const add=(key,label,unit,lv,higherBad=true,kr=null)=>{const x=sigLatest(M[key]);if(!x){out.push({label,miss:true});return}
   const k=sigLatest(K[key]);let tr="";if(x.prev!=null&&Math.abs(x.v-x.prev)>=0.05){const worse=higherBad?x.v>x.prev:x.v<x.prev;tr='<em class="'+(worse?"ix-bad":"ix-good")+'">'+(x.v>x.prev?"▲":"▼")+' '+r1(x.prev)+'</em>'}
   out.push({label,lv:lv(x.v),val:r1(x.v)+unit,tr,tip:label+" "+r1(x.v)+unit+" ("+x.year+")"+(x.prev!=null?" · 전년 "+r1(x.prev)+unit:"")+(k&&data.code!=="KR"?" · 한국 "+r1(k.v)+unit:"")})};
  add("inflation","물가","%",v=>v<=4?"g":v<=10?"y":"r");
  add("unemployment","실업률","%",v=>v<=5?"g":v<=10?"y":"r");
  add("debt","정부부채","%",v=>v<=60?"g":v<=90?"y":"r");
  const e=data.cpi?.entry;if(e&&Number.isFinite(+e.score)){const ys=Object.keys(e.history||{}).sort();const prev=ys.length>1?e.history[ys.at(-2)]:null;
   out.push({label:"부패인식",lv:e.score>=60?"g":e.score>=40?"y":"r",val:e.score+"점",tr:prev!=null&&prev!==e.score?'<em class="'+(e.score<prev?"ix-bad":"ix-good")+'">'+(e.score>prev?"▲":"▼")+' '+prev+'</em>':"",tip:"부패인식지수 "+e.score+"/100 · "+e.rank+"위"+(data.cpi.korea?" · 한국 "+data.cpi.korea.score+"점":"")})}
  else out.push({label:"부패인식",miss:true});
  const cf=(data.civics?.conflicts||[]),occ=(state.occupied||[]).filter(o=>o.owner===data.code||o.holderCode===data.code);
  const lvl=cf.some(c=>c.level==="high")||occ.some(o=>o.owner===data.code)?"r":cf.some(c=>c.level==="medium")||occ.length?"y":"g";
  const sub=occ.some(o=>o.owner===data.code)?"영토 일부 점령·통제":occ.length?"타국 지역 통제":cf.slice(0,2).map(c=>c.withName||namedCountry(c.with)||"").filter(Boolean).join("·");
  out.push({label:"분쟁·갈등",lv:lvl,val:cf.length?cf.length+"건":"없음",tr:sub?'<em class="ix-sub">'+esc(sub)+'</em>':"",tip:"갈등 관계 "+cf.length+"곳"+(occ.length?" · 점령·통제 지역 "+occ.length+"곳":""),raw:true});
  return out;
 }
 function dday(d){const t=new Date(d+"T00:00:00");if(isNaN(t))return "";const n=Math.round((t-new Date(new Date().toDateString()))/864e5);return n>0?"D-"+n:n===0?"D-day":""}
 function problemsBlock(data){
  const sig=problemSignals(data),pb=data.problems;
  const tiles=sig.map(x=>x.miss?'<div class="ix-tile ix-miss"><small><i></i>'+esc(x.label)+'</small><b>자료 없음</b></div>':'<div class="ix-tile" title="'+esc(x.tip)+'"><small><i class="ix-'+x.lv+'"></i>'+esc(x.label)+'</small><b>'+esc(x.val)+'</b>'+x.tr+'</div>').join("");
  const tabName={economy:"경제 탭",politics:"정치·의회 탭",military:"군사 탭",conflict:"갈등 관계",decisions:"의사결정 구조"};
  const cards=(pb?.items||[]).map((it,i)=>'<article class="ix-card ix-card--'+(it.severity==="high"?"high":"mid")+'" data-ix="'+i+'" tabindex="0" role="button" aria-expanded="false"><span class="ix-tag">'+esc(it.area||"")+(it.topic?' · '+esc(it.topic):"")+'</span><h5>'+esc(it.title)+'</h5><p>'+esc(it.fact||"")+'</p><span class="ix-more">왜? ›</span></article>').join("");
  const whys=(pb?.items||[]).map((it,i)=>{const w=it.why||{};return '<div class="ix-why" data-ix-why="'+i+'" hidden><ol><li><b>구조</b>'+esc(w.structure||"")+'</li><span class="ix-ar" aria-hidden="true">→</span><li><b>직접 원인</b>'+esc(w.cause||"")+'</li><span class="ix-ar" aria-hidden="true">→</span><li><b>결과</b>'+esc(w.result||"")+'</li></ol><p class="ix-src">'+(it.link&&tabName[it.link]?'<button type="button" class="ix-go" data-ix-go="'+esc(it.link)+'">'+tabName[it.link]+'에서 더 보기 →</button> ':"")+(it.since?'<span>'+esc(String(it.since))+'년부터 · </span>':"")+'<span>출처</span> '+(it.sources||[]).map(s=>sourceLink(s[2],(s[0]||"")+(s[1]?" · "+s[1]:""))).join(" · ")+'</p></div>'}).join("");
  const next=(pb?.next||[]).filter(n=>n&&n.date&&n.date>=new Date().toISOString().slice(0,10)).slice(0,2).map(n=>'<span><time>'+esc(n.date)+'</time> '+esc(n.text||"")+(dday(n.date)?' <em>'+dday(n.date)+'</em>':"")+'</span>').join("");
  return '<section class="ix"><div class="ix-head"><h4>한눈에 보는 문제</h4><span class="ix-legend"><i class="ix-g"></i>양호 <i class="ix-y"></i>주의 <i class="ix-r"></i>위험'+(pb?.asOf?' · '+esc(pb.asOf)+' 기준':"")+'</span></div>'+
   '<div class="ix-sig">'+tiles+'</div>'+(cards?'<div class="ix-cards">'+cards+'</div>'+whys:"")+(next?'<p class="ix-next"><b>다음</b>'+next+'</p>':"")+'</section>';
 }
 function countryConflicts(data){
  const list=Array.isArray(data.civics?.conflicts)?data.civics.conflicts.filter(c=>c&&c.withName&&c.brief):[];
  if(!list.length)return "";
  state.conflictCtx={code:data.code,list};
  const chips=list.map((c,i)=>'<button type="button" class="conflict-chip conflict-chip--'+esc(c.level||"low")+'" data-conflict="'+i+'" aria-expanded="false" aria-describedby="conflict-tip-'+i+'">'+
   (c.with?flag(c.with,"flag-chip"):'<span class="conflict-nonstate" aria-hidden="true">◆</span>')+'<span>'+esc(c.withName)+'</span>'+
   '<span class="conflict-tip" role="tooltip" id="conflict-tip-'+i+'"><b>'+esc(c.kind||"갈등")+' · '+esc(conflictLevel[c.level]||"")+'</b>'+esc(c.brief)+'</span></button>').join("");
  const details=list.map((c,i)=>'<article class="conflict-detail" data-conflict-detail="'+i+'" hidden><header><span class="conflict-level conflict-level--'+esc(c.level||"low")+'">'+esc(conflictLevel[c.level]||"")+'</span><h4>'+esc(namedCountry(data.code))+' ↔ '+esc(c.withName)+'</h4><small>'+esc(c.kind||"")+(c.since?' · '+esc(String(c.since))+'년부터':"")+'</small></header><p class="conflict-brief">'+esc(c.brief)+'</p><div class="board-slot" data-board-idx="'+i+'"></div><p>'+esc(c.detail||"")+'</p>'+
   (Array.isArray(c.sources)&&c.sources.length?'<ul class="conflict-sources">'+c.sources.map(s=>'<li>'+sourceLink(s[2],(s[0]||"")+(s[1]?" — "+s[1]:""))+'</li>').join("")+'</ul>':"")+
   (c.with?'<button type="button" class="conflict-open" data-country="'+esc(c.with)+'">'+esc(c.withName)+' 국가 정보 보기 →</button>':"")+'</article>').join("");
  return '<section class="conflicts" aria-label="갈등 관계"><div class="conflicts-head"><h3>갈등 관계</h3><span>마우스를 올리면 이유, 누르면 자세히</span></div><div class="conflict-chips">'+chips+'</div>'+details+'</section>';
 }
 function budgetOverviewCard(row){
  if(!row)return "";
  const hasValue=typeof row.value==="number"&&Number.isFinite(row.value);
  if(!hasValue&&!row.status)return "";
  const unit=String(row.unit||"");
  const label=hasValue?(/%\s*$/.test(unit)?unit.replace(/%\s*$/,"").trim()+" "+number(row.value,2)+"%":number(row.value,2)+" "+unit).trim():row.kind==="not_applicable"?"단일 독립 예산 없음":"예산액 미공개";
  const fine=(row.scope?'<p><b>집계 범위</b> '+esc(row.scope)+'</p>':"")+(row.note?'<p>'+esc(row.note)+'</p>':"")+
   '<p>'+esc(row.provider||"")+' '+sourceLink(row.source,"예산·재정 근거")+(row.secondarySource?' · '+sourceLink(row.secondarySource,"동년 GDP 원문"):"")+(Array.isArray(row.secondarySources)?row.secondarySources.map(item=>' · '+sourceLink(item.url,item.label||"추가 원문")).join(""):"")+'</p>';
  return '<article class="budget-overview"><div class="budget-overview-heading"><span>'+esc(row.label||"예산·재정")+'</span><small>'+esc(row.fiscalYear||"")+'</small></div><strong>'+esc(label)+'</strong>'+(hasValue?fxLine(row.value,unit):"")+
   '<p class="budget-overview-status">'+esc(row.status||"")+'</p>'+
   (Number.isFinite(row.referenceGrowthPercent)&&Number.isFinite(row.referenceDefenseSharePercent)?'<div class="budget-reference-chips"><span>2026년 세출 증가 계획 <b>+'+number(row.referenceGrowthPercent,1)+'%</b></span><span>전체 예산 중 국방 비중 <b>'+number(row.referenceDefenseSharePercent,1)+'%</b></span><small>총지출 금액은 미공개</small></div>':"")+
   (row.administeringName?'<p><b>연계 관할</b> '+esc(row.administeringName)+'</p>':"")+fold("기준·출처",fine)+'</article>';
 }
 function countryPanels(data){
  const p=data.profile||{},metrics=data.metrics||{},links=data.links||{},political=data.political||{},legislature=data.legislature||{},budget=data.budget||{};
  const compare=data.code!=="KR",reference=data.comparison?.metrics||{},koreaReferences=data.comparison?.references||{};
  const grid=rows=>metricGrid(rows,compare,reference,koreaReferences,data.koreaLatest||{});
  const system=p.system||political.system||"";
  const activeChambers=Array.isArray(legislature.chambers)?legislature.chambers.filter(c=>!c.suspended&&c.availability!=="not_applicable"):[];
  const institution=p.parliament||(activeChambers.length?activeChambers.map(c=>c.name).filter(Boolean).join(" · "):legislature.chambers?.length?"의회 활동 중지 또는 구성 미확인":"");
  const chambers=Array.isArray(p.chambers)&&p.chambers.length?p.chambers:p.chamber?[p.chamber]:[];
  const headcounts=chamberHeadcounts(legislature);
  const parliamentNote=data.context?.parliamentNote?'<p class="context-note">'+esc(data.context.parliamentNote)+'</p>':"";
  const civ=data.civics?.parliament;
  const civChambers=Array.isArray(civ?.chambers)?civ.chambers:[];
  const civHasSeats=civChambers.some(c=>Array.isArray(c.groups)&&c.groups.length);
  const dateText=d=>{if(!d)return "";const m=String(d).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);return m?m[1]+"년"+(m[2]?" "+Number(m[2])+"월":"")+(m[3]?" "+Number(m[3])+"일":""):String(d)};
  const upcoming=d=>{const t=Date.parse(String(d||"").length===7?d+"-28":d);return Number.isFinite(t)&&t>Date.now()};
  const electionCards=civChambers.length?'<div class="chamber-cards">'+civChambers.map(c=>'<article class="chamber-card"><header><h4>'+esc(c.name||"의회")+'</h4>'+(c.seats?'<span>'+number(c.seats,0)+'석</span>':"")+'</header>'+
    (c.method?'<p class="chamber-method">'+esc(c.method)+'</p>':"")+
    '<dl class="chamber-dates">'+(c.term?'<div><dt>임기</dt><dd>'+esc(c.term)+'</dd></div>':"")+(c.lastElection?'<div><dt>지난 선거</dt><dd>'+esc(dateText(c.lastElection))+'</dd></div>':"")+
    '<div><dt>다음 선거</dt><dd'+(upcoming(c.nextElection)?' class="next-soon"':"")+'>'+(c.nextElection?esc(dateText(c.nextElection)):"미정")+(c.nextNote?'<small>'+esc(c.nextNote)+'</small>':"")+'</dd></div></dl></article>').join("")+'</div>'+
    (civ.source?'<p class="chamber-source">의회 자료 '+(civ.asOf?esc(civ.asOf)+' 기준 · ':"")+sourceLink(civ.source[2],civ.source[0]||"원문")+'</p>':""):"";
  const civSeats=civHasSeats?civChambers.filter(c=>Array.isArray(c.groups)&&c.groups.length).map(c=>hemicycle({name:c.name,label:(civ.asOf?civ.asOf+" 기준":"현재 의석"),entity:"정당·교섭단체",groups:c.groups,partyNames:data.partyNames})).join(""):"";
  const seats=civSeats?civSeats:chambers.length?chambers.map(c=>hemicycle({...c,partyNames:data.partyNames})).join("")+(data.code==="US"?'<p class="data-caption">하원·상원 공식 의석은 '+sourceLink(p.source,"2026년 10월 1일 명부")+' · 무소속의 상원 코커스 소속은 '+sourceLink(p.caucusSource,"상원 취재단 현황")+'</p>':""):"";
  const orientation=chambers.some(chamber=>/정당|정치그룹/.test(chamber.entity||"")&&!/아님/.test(chamber.entity||""))&&data.code!=="US"?'<p>정당 성향은 해당 시기의 강령·정책과 의회 분류를 바탕으로 한 간략한 설명이며, 이념 범위의 확정적 판정이 아닙니다. '+sourceLink(p.orientationSource||p.source||links.ipu,"정당 성향 근거")+'</p>':"";
  const decisions=data.decisions?decisionBlock(data.decisions):Array.isArray(p.decision)&&p.decision.length?'<section class="section"><h3>의사결정의 흐름</h3><ol class="decision-steps">'+p.decision.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ol></section>':"";
  const politicsFine=(political.note?'<p>'+esc(political.note)+'</p>':"")+(legislature.note?'<p>'+esc(legislature.note)+'</p>':"")+(!chambers.length&&headcounts?'<p>위 숫자는 의원 현원이며 정당별 의석이 아닙니다. 정당별 현재 의석은 검증된 자료가 없어 표시하지 않습니다.</p>':"")+orientation+(p.note?'<p>'+esc(p.note)+'</p>':"")+
   '<p>'+(political.provider?esc(political.provider)+' ':"")+(political.asOf?esc(political.asOf)+' 조회 ':"")+sourceLink(p.source||political.source||links.ipu,"제도 출처")+'</p>';
  const chinaFiscal=data.code==="CN"?'<div class="budget-scope-warning"><strong>별도 범위의 공식 자료로 계산 · 2025년</strong><p>중국 국가통계국의 전국 일반공공예산 세입 21.6045조 위안, 세출 28.7395조 위안을 2025년 명목 GDP 140.1879조 위안으로 나누면 각각 GDP의 약 15.41%, 20.50%입니다. 단순 세입·세출 차액은 GDP의 약 −5.09%입니다.</p><p>중앙정부만의 세계은행 재정 지표와 집계 범위가 달라 위 카드의 값이나 국제 순위에 대입하지 않았습니다. '+sourceLink("https://www.stats.gov.cn/english/PressRelease/202602/t20260228_1962661.html","중국 국가통계국 2026-02-28 발표")+'</p></div>':"";
  const ownBreakdown=budgetComposition(budget.breakdown,namedCountry(data.code)+" 예산·지출 구성",metrics.militaryGovPct);
  const koreaBreakdown=compare?budgetComposition(budget.koreaBreakdown,"한국 예산·지출 구성",data.comparison?.metrics?.militaryGovPct):"";
  const doc=budget.document?'<article class="budget-document"><span>예산 문서 · '+esc(budget.document.fiscalYear||"")+'</span><h3>'+esc(budget.document.title||"예산 자료")+'</h3><p>'+esc(budget.document.status||"")+' · '+esc(budget.document.provider||"")+'</p>'+sourceLink(budget.document.source,"공식 예산 문서")+'</article>':"";
  return {
   politics:'<section class="section"><h3>의회</h3>'+(institution?'<p class="country-parliament">'+esc(institution)+(legislature.structure?" · "+esc(legislature.structure):"")+'</p>':"")+parliamentNote+electionCards+seats+(partyMapBlock(data)||capitalBlock(data))+partyRegions(data)+partyFights(data)+(seats||electionCards?"":headcounts)+(!headcounts&&!seats&&!electionCards?'<p class="metric-missing"><span>공개 자료 없음</span> 의회 구성·의석</p>':"")+'</section>'+
    cpiBlock(data)+electionBlock(data)+decisions+fold("정치 자료 기준·출처",politicsFine),
   economy:grid([["gdp","명목 GDP",metrics.gdp],["gdpPc","1인당 GDP",metrics.gdpPc],["growth","실질 성장률",metrics.growth],["inflation","물가 상승률",metrics.inflation],["debt","중앙정부 부채 / GDP",metrics.debt],["unemployment","실업률",metrics.unemployment],["policyRate","정책금리",metrics.policyRate]])+
    economyAlternativeEstimates(data.economyAlternatives)+
    fold("경제 지표 읽는 법",'<p>카드를 누르면 과거 추이와 정의·출처가 열립니다. 순위는 같은 연도에 관측치가 있는 국가끼리 값이 높은 순서이며 우수성을 뜻하지 않습니다. 한국 값은 같은 원자료·같은 연도일 때만 나란히 표시합니다. IMF·민간 추정은 ‘추정’으로 표시하고 순위에서 뺍니다.</p>'+(data.monetaryNote?'<p>'+esc(data.monetaryNote)+' '+sourceLink(data.monetarySource,"통화제도 근거")+'</p>':"")+'<p>'+sourceLink(links.worldBank,"세계은행 국가 자료")+'</p>'),
   budget:budgetOverviewCard(budget.overview)+doc+
    (ownBreakdown?'<section class="section"><h3>분야별 구성</h3>'+ownBreakdown+'</section>':"")+
    '<section class="section"><h3>재정 지표</h3>'+grid([["governmentRevenue","중앙정부 세입 / GDP",budget.metrics?.governmentRevenue||metrics.governmentRevenue],["governmentExpenditure","중앙정부 지출 / GDP",budget.metrics?.governmentExpenditure||metrics.governmentExpenditure],["cashBalance","재정수지 / GDP",budget.metrics?.cashBalance||metrics.cashBalance]])+chinaFiscal+'</section>'+
    budgetAlternativeEstimates(budget.alternativeEstimates)+budgetReferenceShares(budget.referenceShares)+
    (koreaBreakdown?'<details class="compare-fold"><summary>한국 예산 구성과 비교하기</summary>'+koreaBreakdown+'<p class="data-caption">두 나라 예산은 회계연도, 정부 범위, 정부안·의결 상태가 다를 수 있어 비중을 그대로 비교하지 마세요.</p></details>':"")+
    fold("예산 자료 읽는 법",'<p>정부안·의회 통과안·IMF 전망·과거 실적을 서로 다른 상태로 표시합니다. 재정 지표는 세계은행의 중앙정부 범위 과거 관측치로, 지금 제출된 예산안 합계가 아닙니다.</p><p>'+sourceLink(links.worldBank,"세계은행 재정 데이터")+'</p>'),
   military:grid([["militaryUsd","연간 군사비",metrics.militaryUsd],["militaryPct","군사비 / GDP",metrics.militaryPct],["militaryGovPct","군사비 / 정부 총지출",metrics.militaryGovPct],["militaryPersonnel","군 병력",metrics.militaryPersonnel],["militaryLaborPct","군 병력 / 노동력",metrics.militaryLaborPct],["armsImports","무기 수입(SIPRI TIV)",metrics.armsImports],["armsExports","무기 수출(SIPRI TIV)",metrics.armsExports]])+
    budgetReferenceShares(budget.referenceShares)+
    fold("군사 지표 읽는 법",'<p>SIPRI 원자료를 인용한 세계은행 WDI 관측치가 기본입니다. 지출액은 병력이나 전력 규모를 뜻하지 않습니다. 군사비/GDP는 달력연도, 군사비/정부 총지출은 회계연도 기준입니다. 분쟁국은 공식 집계가 끊긴 경우가 많아 오래된 연도가 표시될 수 있습니다.</p><p>'+sourceLink(links.worldBank,"세계은행 국가 자료")+' · '+sourceLink("https://www.sipri.org/databases/milex","SIPRI")+'</p>')
  };
 }
 const leaderRoleLabels={state:"국가원수",government:"정부 수반",finance:"경제·재정",defense:"국방",foreign:"외교",centralBank:"중앙은행",parliament:"의회",opposition:"야권",deputy:"부수반"};
 const leaderNamesKo={"Mohamed bin Zayed Al Nahyan":"무함마드 빈 자이드 알나흐얀","Mohammed bin Rashid Al Maktoum":"무함마드 빈 라시드 알막툼","Mansour bin Zayed Al Nahyan":"만수르 빈 자이드 알나흐얀","Saqr Ghobash":"사크르 고바시","Maktoum bin Mohammed bin Rashid Al Maktoum":"막툼 빈 무함마드 알막툼","Hamdan bin Mohammed bin Rashid Al Maktoum":"함단 빈 무함마드 알막툼","Abdullah bin Zayed Al Nahyan":"압둘라 빈 자이드 알나흐얀","Xi Jinping":"시진핑","Li Qiang":"리창","Emmanuel Macron":"에마뉘엘 마크롱","Sébastien Lecornu":"세바스티앵 르코르뉘","Roland Lescure":"롤랑 레스퀴르","Catherine Vautrin":"카트린 보트랭","Jean-Noël Barrot":"장노엘 바로","Donald J. Trump":"도널드 트럼프","JD Vance":"J. D. 밴스","Lee Jae-myung":"이재명","Han Seongsook":"한성숙","Sanae Takaichi":"다카이치 사나에","Satsuki Katayama":"가타야마 사쓰키","Toshimitsu Motegi":"모테기 도시미쓰","Shinjiro Koizumi":"고이즈미 신지로","Ryosei Akazawa":"아카자와 료세이","Frank-Walter Steinmeier":"프랑크발터 슈타인마이어","Friedrich Merz":"프리드리히 메르츠","Lars Klingbeil":"라르스 클링바일","Boris Pistorius":"보리스 피스토리우스","Johann Wadephul":"요한 바데풀","Katherina Reiche":"카테리나 라이헤"};
 const leaderDisplayName=person=>leaderNamesKo[person.name]||person.name;
 function portrait(person,kind=""){
  const photo=person?.photo,initials=String(person?.name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  return '<div class="person-portrait '+esc(kind)+'"><span aria-hidden="true">'+esc(initials)+'</span>'+(photo?.url?'<img loading="lazy" src="'+safeUrl(photo.url)+'" alt="'+esc(person.name)+' 인물 사진" referrerpolicy="no-referrer" onerror="this.hidden=true">':"")+'</div>';
 }
 function leaderCard(person,roster=false){
  // UN-roster entries carry a generic "listed as X" sentence; it adds nothing, so skip it.
  const why=!roster&&person.whyMatters&&!/명단에 .*등재/.test(person.whyMatters)?'<p class="leader-description">'+esc(person.whyMatters)+'</p>':"";
  return '<article class="leader-card"><div class="leader-card-image">'+portrait(person)+'</div><div class="leader-card-body"><span class="leader-role">'+esc(leaderRoleLabels[person.role]||"공직자")+'</span><h4>'+esc(leaderDisplayName(person))+'</h4>'+(leaderNamesKo[person.name]?'<span class="leader-original-name">'+esc(person.name)+'</span>':"")+(person.ordinal&&(person.ordinal.label||person.ordinal.since)?'<p class="leader-ordinal">'+(person.ordinal.label?'<b>'+esc(person.ordinal.label)+'</b>':"")+(person.ordinal.since?(person.ordinal.label?' · ':"")+esc(person.ordinal.since)+' 취임':"")+'</p>':"")+(person.office&&person.office!==leaderRoleLabels[person.role]?'<p class="leader-office">'+esc(person.office)+'</p>':"")+(person.regime?.note?'<p class="leader-regime"><b class="leader-regime-tag leader-regime-tag--'+(person.regime.label==="독재"?"dict":"auth")+'">'+esc(person.regime.label||"")+'</b>'+esc(person.regime.note)+' '+sourceLink(person.regime.source,person.regime.basis||"근거")+'</p>':"")+why+(person.photo?'<div class="leader-photo-credit">사진 '+sourceLink(person.photo.source,esc(person.photo.license||"라이선스"))+(person.photo.credit?' · '+esc(person.photo.credit):"")+'</div>':"")+'</div></article>';
 }
 function relationshipSources(rel){return sourceLink(rel.source,"인물·관계 원문")+(rel.contextSource?' · '+sourceLink(rel.contextSource,"정책·제도 근거"):"")+(rel.contextSource2?' · '+sourceLink(rel.contextSource2,"추가 근거"):"")}
 function relationshipRow(rel,persons){
  const left=persons.find(p=>p.id===rel.fromId),right=persons.find(p=>p.id===rel.toId);
  if(!left||!right||!rel.source)return "";
  const directed=rel.directed===true,line=rel.line==="dashed"?"dashed":"solid";
  return '<article class="relationship-row"><div class="relationship-visual"><div class="relationship-person">'+portrait(left,"person-portrait-mini")+'<b>'+esc(leaderDisplayName(left))+'</b></div><div class="relationship-path '+line+'"><span>'+esc(rel.label||"관계")+'</span><i aria-hidden="true">'+(directed?"➜":"◆")+'</i></div><div class="relationship-person">'+portrait(right,"person-portrait-mini")+'<b>'+esc(leaderDisplayName(right))+'</b></div></div><p>'+esc(rel.description||"")+'</p><small>관계 확인 '+esc(rel.asOf||"기준일 미기재")+' · '+relationshipSources(rel)+'</small></article>';
 }
 function cabinetRelationshipMap(links,persons){
  if(!links.length)return "";
  const hub=persons.find(p=>p.id===links[0].fromId);
  if(!hub)return "";
  const branches=links.map(rel=>{
   const minister=persons.find(p=>p.id===rel.toId);
   if(!minister||!rel.source)return "";
   return '<li class="relationship-branch"><div class="relationship-branch-title">'+portrait(minister,"person-portrait-mini")+'<div><span>'+esc(rel.label||"소관 업무")+'</span><strong>'+esc(leaderDisplayName(minister))+'</strong><small>'+esc(minister.office||"")+'</small></div></div><p>'+esc(rel.description||"")+'</p><div class="relationship-branch-source">관계 확인 '+esc(rel.asOf||"기준일 미기재")+' · '+relationshipSources(rel)+'</div></li>';
  }).filter(Boolean);
  if(!branches.length)return "";
  return '<article class="relationship-map" aria-label="'+esc(leaderDisplayName(hub))+'와 장관들의 역할"><div class="relationship-hub">'+portrait(hub,"person-portrait-mini")+'<div><span>정부 수반 · 정책 방향과 부처 간 조정</span><strong>'+esc(leaderDisplayName(hub))+'</strong><small>'+esc(hub.office||"")+'</small></div></div><ol class="relationship-branches">'+branches.join("")+'</ol><p class="relationship-map-note">점선은 직책상 정책 조정과 각 부처의 분업을 나타냅니다. 친분·개인적 충성이나 단독 지휘권을 뜻하지 않습니다.</p></article>';
 }
 // 부패·선거 사례: CPI·선거 공정성 점수 옆에 접어 두는 실제 사건 목록.
 const caseTone=s=>/무죄|취소|사면/.test(s)?"soft":/의혹|수사|기소|주장/.test(s)?"open":"hard";
 function casesFold(list,kind){
  if(!Array.isArray(list)||!list.length)return "";
  const items=list.slice().sort((a,b)=>String(b.year).localeCompare(String(a.year))).map(c=>'<li class="case"><div class="case-top"><time>'+esc(c.year)+'</time><b>'+esc(c.title)+'</b><span class="case-st case-st--'+caseTone(c.status||"")+'">'+esc(c.status||"")+'</span></div>'+(c.who?'<p class="case-who">'+esc(c.who)+'</p>':"")+'<p class="case-text">'+esc(c.text)+'</p>'+(Array.isArray(c.sources)&&c.sources.length?'<small class="case-src">'+c.sources.map(s=>sourceLink(s[2],s[0]+(s[1]?" — "+s[1]:""))).join(" · ")+'</small>':"")+'</li>').join("");
  return '<details class="cases-fold"><summary>'+(kind==="elections"?"선거 관련 사례":"부패 사례")+' '+list.length+'건 보기</summary><ul class="case-list">'+items+'</ul><p class="case-note">‘의혹’·‘수사 중’·‘기소’는 확정된 사실이 아닙니다. 당사자 반박은 본문에 함께 적었습니다. 점수는 인식·전문가 평가라 사건 수와 바로 비례하지 않습니다.</p></details>';
 }
 // 인물 간 개인적 관계(학연·지연·혈연·사업·경력·군·정보·계파).
 const TIE_KINDS=["학연","지연","혈연","사업","경력","군·정보","계파"];
 function tiesBlock(data){
  const T=data.ties;if(!T||!(T.ties||[]).length&&!(T.groups||[]).length)return "";
  const ties=T.ties||[],groups=T.groups||[];
  const cnt={};ties.forEach(t=>cnt[t.kind]=(cnt[t.kind]||0)+1);
  const kinds=TIE_KINDS.filter(k=>cnt[k]).concat(Object.keys(cnt).filter(k=>!TIE_KINDS.includes(k)));
  const kc=k=>"tie-k"+Math.max(0,TIE_KINDS.indexOf(k));
  const p=x=>'<span class="tie-p"><b>'+esc(x?.ko||x?.name||"")+'</b>'+(x?.role?'<small>'+esc(x.role)+'</small>':"")+'</span>';
  const src=list=>Array.isArray(list)&&list.length?'<small class="case-src">'+list.map(s=>sourceLink(s[2],s[0]+(s[1]?" — "+s[1]:""))).join(" · ")+'</small>':"";
  const chips='<div class="tie-chips"><button type="button" data-tie-k="" aria-pressed="true">전체 '+ties.length+'</button>'+kinds.map(k=>'<button type="button" data-tie-k="'+esc(k)+'" aria-pressed="false"><i class="'+kc(k)+'"></i>'+esc(k)+' '+cnt[k]+'</button>').join("")+'</div>';
  const list='<ul class="tie-list">'+ties.map(t=>'<li data-k="'+esc(t.kind)+'"><div class="tie-pair">'+p(t.a)+'<i class="tie-kind '+kc(t.kind)+'">'+esc(t.kind)+'</i>'+p(t.b)+'</div><p>'+(t.claim?'<em class="tie-claim">주장·의혹</em>':"")+esc(t.text)+'</p><div class="tie-foot">'+(t.since?'<span>'+esc(t.since)+'~</span>':"")+src(t.sources)+'</div></li>').join("")+'</ul>';
  const gs=groups.length?'<h5 class="tie-sub">함께 묶이는 집단</h5><div class="tie-groups">'+groups.map(g=>'<article class="tie-group"><div><b>'+esc(g.name)+'</b><i class="tie-kind '+kc(g.kind)+'">'+esc(g.kind)+'</i></div><p class="tie-members">'+(g.members||[]).map(m=>'<span>'+esc(m)+'</span>').join("")+'</p>'+(g.note?'<p>'+esc(g.note)+'</p>':"")+src(g.sources)+'</article>').join("")+'</div>':"";
  return '<details class="ties-fold"><summary>인물 간 개인적 관계 <span>'+kinds.join("·")+' '+ties.length+'건'+(groups.length?' · 집단 '+groups.length:"")+'</span></summary>'+chips+list+gs+'<p class="case-note">공식 경력·가족 관계는 출처에서 확인한 것만 실었습니다. ‘주장·의혹’ 표시는 한쪽 주장이며 반박을 함께 적었습니다.'+(T.asOf?' '+esc(T.asOf)+' 기준.':"")+'</p></details>';
 }
 // 접고 펴기: 각 덩어리의 머리글을 누르면 내용이 접힌다. 접은 상태는 이 브라우저에 기억.
 const FOLDS=[
  ["ix",".ix",".ix-head",1],["conflicts","section.conflicts:not(.allies)",".conflicts-head",1],["allies","section.allies",".conflicts-head",0],
  ["blocs",".country-blocs","h3",0],["now",".now",".now-head",1],["recent",".recent","h3",1],["leaders",".leaders-section",".leaders-heading",1],
  ["pmap",".pmap-block",".fights-head",1],["regions",".regions",".fights-head",0],["fights",".fights",".fights-head",1],
  ["decision",".decision-map","h3",0],["elect",".elect","h3",1],["cpi",".cpi","h3",1],["sec",".country-panel > .section","h3",1]
 ];
 const foldGet=k=>{try{return localStorage.getItem("pando.fold."+k)}catch{return null}};
 const foldSet=(k,v)=>{try{localStorage.setItem("pando.fold."+k,v?"1":"0")}catch{}};
 function foldHint(sec,key){
  const n=sel=>sec.querySelectorAll(sel).length;
  if(key==="conflicts"||key==="allies")return n(".conflict-chips > *")+"곳";
  if(key==="blocs")return n(".bloc-list > li")+"개";
  if(key==="fights")return n(".fight")+"개 쟁점";
  if(key==="regions")return n(".region-party")+"곳";
  if(key==="cpi"||key==="elect"){const s=sec.querySelector(".cpi-score strong")?.textContent,r=sec.querySelector(".cpi-meta span")?.textContent;return s?(s+(r?" · "+r.split(" / ")[0]:"")):"";}
  return "";
 }
 function setFold(sec,on){
  sec.classList.toggle("is-folded",on);
  const h=sec.querySelector(":scope > .fold-head");if(h)h.setAttribute("aria-expanded",String(!on));
 }
 function foldSections(){
  const root=$("#detail");if(!root)return;
  for(const [key,sel,head,open] of FOLDS){
   root.querySelectorAll(sel).forEach(sec=>{
    if(sec.dataset.fold)return;
    const h=sec.querySelector(":scope > "+head);if(!h)return;
    const id=key==="sec"?"sec:"+(h.firstChild?.textContent||h.textContent||"").split(" · ")[0].replace(/\s+/g," ").trim().slice(0,24):key;
    sec.dataset.fold=id;h.classList.add("fold-head");h.setAttribute("role","button");h.tabIndex=0;
    const hint=foldHint(sec,key);
    h.insertAdjacentHTML("beforeend",(hint?'<span class="fold-hint">'+esc(hint)+'</span>':"")+'<span class="fold-chev" aria-hidden="true"></span>');
    const saved=foldGet(id);setFold(sec,saved==null?!open:saved==="1");
   });
  }
 }
 document.addEventListener("click",ev=>{
  const all=ev.target.closest("[data-fold-all]");
  if(all){const on=all.dataset.foldAll==="1";document.querySelectorAll("#detail [data-fold]").forEach(sec=>{setFold(sec,on);foldSet(sec.dataset.fold,on)});return}
  const tk=ev.target.closest("[data-tie-k]");
  if(tk){const box=tk.closest(".ties-fold"),k=tk.dataset.tieK;box.querySelectorAll("[data-tie-k]").forEach(b=>b.setAttribute("aria-pressed",String(b===tk)));box.querySelectorAll(".tie-list > li").forEach(li=>li.hidden=!!k&&li.dataset.k!==k);return}
  const h=ev.target.closest(".fold-head");
  if(!h||ev.target.closest("a,button:not(.fold-head)"))return;
  const sec=h.parentElement;if(!sec?.dataset.fold)return;
  const on=!sec.classList.contains("is-folded");setFold(sec,on);foldSet(sec.dataset.fold,on);
 });
 document.addEventListener("keydown",ev=>{if((ev.key==="Enter"||ev.key===" ")&&ev.target.classList?.contains("fold-head")){ev.preventDefault();ev.target.click()}});
 function renderLeaders(data){
  const people=Array.isArray(data.people)?data.people:[],relations=Array.isArray(data.relationships)?data.relationships:[];
  const standalone=relations.filter(rel=>rel.kind!=="cabinet").map(rel=>relationshipRow(rel,people)).filter(Boolean);
  const cabinetGroups=new Map();for(const rel of relations.filter(rel=>rel.kind==="cabinet")){const group=cabinetGroups.get(rel.fromId)||[];group.push(rel);cabinetGroups.set(rel.fromId,group)}
  const cabinet=[...cabinetGroups.values()].map(group=>cabinetRelationshipMap(group,people)).filter(Boolean);
  const node=$("#country-leaders");if(!node)return;
  if(!people.length){
   const title=data.status==="not_applicable"?"이 지역에는 단일 국가수반이 없습니다":data.status==="area_office_unverified"?"현지 직책·관리 관계":"현직 핵심 인물 확인 중";
   node.innerHTML='<div class="leaders-empty"><strong>'+esc(title)+'</strong><p>'+esc(data.note||"공식 자료에서 최근 명단을 확인하지 못했습니다.")+'</p>'+sourceLink(data.source,"관할·인물 원문")+'</div>';return;
  }
  const roster=data.status==="dated_roster"||data.status==="historical_snapshot";
  const card=person=>leaderCard(person,roster);
  const first=people.slice(0,4).map(card).join(""),extra=people.length>4?'<details class="leaders-extra"><summary>'+(people.length-4)+'명 더 보기</summary><div class="leader-grid">'+people.slice(4).map(card).join("")+'</div></details>':"";
  const basis='<p class="leaders-source">'+(data.status==="historical_snapshot"?'<b>과거 명단</b> · 현직 여부 미확인 · ':"")+esc(data.asOf||"")+' '+esc(shortProvider(data.provider)||"명단")+' 기준 '+sourceLink(data.source,"원문")+'</p>';
  // Relationships inferred only from a roster ("A is head of state, B is PM") say nothing new; show curated ones only.
  const relationHtml=roster?"":(standalone.length||cabinet.length?(standalone.length?'<div class="relationship-grid">'+standalone.join("")+'</div>':"")+cabinet.join(""):"");
  node.innerHTML='<div class="leader-grid">'+first+'</div>'+extra+basis+
   (relationHtml?'<details class="relationships-fold"><summary>인물 관계도 보기</summary><section class="relationships"><p class="relationships-legend">실선은 공식 임명·지명, 점선은 부처 간 분업 또는 확인된 협업입니다.</p>'+relationHtml+'</section></details>':"");
 }
 async function loadCountryLeaders(code,request){
  try{
   const response=await fetch("/api/leaders?code="+encodeURIComponent(code),{cache:"no-store"});
   if(!response.ok)throw Error("인물 명단 조회 실패");
   const data=await response.json();
   if(request!==state.countryRequest||state.active!=="country:"+code)return;
   renderLeaders(data);
  }catch{
   if(request!==state.countryRequest||state.active!=="country:"+code)return;
   const node=$("#country-leaders");if(node)node.innerHTML='<p class="leaders-no-relation">인물 명단 원문에 연결하지 못했습니다. 국가의 경제·정치 자료는 아래에서 계속 볼 수 있습니다.</p>';
  }
 }
 function showCountry(data){
  const name=namedCountry(data.code);
  const previousTab=$("#detail [data-country-tab][aria-selected=true]")?.dataset.countryTab;
  const previousLeaders=$("#country-leaders")?.innerHTML;
  const scrollTop=$(".drawer")?.scrollTop||0;
  state.trendName=name;state.activeCode=data.code;state.partyMap=data.partymap||null;state.income=data.income||null;state.civicsChambers=data.civics?.parliament?.chambers||[];state.partyProfiles=data.partyProfiles||{};state.regions=data.regions||null;state.partyNames=data.partyNames||{};state.partyPhotos=data.partyPhotos||{};
  const panels=countryPanels(data);
  $("#detail").innerHTML='<div class="detail-kicker">COUNTRY DOSSIER / '+esc(data.code)+'</div><div class="country-title">'+flag(data.code,"flag-hero")+'<div><h2>'+esc(name)+'</h2>'+(data.name&&data.name!==name?'<p class="country-english">'+esc(data.name)+'</p>':"")+'</div></div>'+countryFacts(data)+'<div class="fold-all"><span>머리글을 누르면 접고 펼 수 있어요</span><button type="button" data-fold-all="0">모두 펼치기</button><button type="button" data-fold-all="1">모두 접기</button></div>'+
   (data.partial?'<p class="load-status" role="status">일부 자료를 불러오지 못해 저장된 값만 보입니다. <button class="retry-country" type="button" data-country="'+esc(data.code)+'">다시 조회</button></p>':data.refreshPending?'<p class="load-status" role="status">최신 관측치 확인 중…</p>':"")+
   problemsBlock(data)+countryConflicts(data)+countryAllies(data)+relatedExplainers(data.code)+countryBlocs(data.code)+countryNow(data)+
   '<section class="leaders-section"><div class="leaders-heading"><h3>핵심 인물</h3></div><div id="country-leaders" aria-live="polite"><p class="leaders-loading">명단을 불러오는 중…</p></div>'+tiesBlock(data)+'</section>'+
   '<div class="country-tabs" role="tablist" aria-label="'+esc(name)+' 자료 분류">'+
    [["politics","정치·의회"],["economy","경제"],["budget","예산"],["military","군사"]].map((a,i)=>'<button type="button" role="tab" id="tab-'+a[0]+'" aria-controls="panel-'+a[0]+'" aria-selected="'+(i===0)+'" data-country-tab="'+a[0]+'">'+a[1]+'</button>').join("")+'</div>'+
   Object.entries(panels).map(([key,content],i)=>'<section role="tabpanel" id="panel-'+key+'" aria-labelledby="tab-'+key+'" class="country-panel"'+(i?" hidden":"")+'>'+content+'</section>').join("")+
   '<div class="detail-nav"><button id="back-to-countries" type="button">← 국가 목록</button><button id="copy-country-link" type="button">링크 복사 ↗</button></div>'+
   '<p class="dossier-sources">기관 자료 '+sourceLink((data.profile||{}).source||(data.links||{}).ipu,"의회·정치 구조")+' · '+sourceLink((data.links||{}).worldBank,"세계은행 국가 통계")+'</p>';
  $("#back-to-countries").addEventListener("click",close);
  document.querySelectorAll("#detail .pmap-block .pmap").forEach(b=>drawPartyMap(b));
  document.querySelectorAll("#detail .capmap").forEach(b=>drawCapital(b));
  foldSections();
  $("#copy-country-link").addEventListener("click",async e=>{const url=location.origin+location.pathname+"?country="+encodeURIComponent(data.code);try{await navigator.clipboard.writeText(url);e.target.textContent="복사 완료 ✓"}catch{e.target.textContent="주소: "+url}});
  if(previousLeaders)$("#country-leaders").innerHTML=previousLeaders;
  if(previousTab&&panels[previousTab]){
   $("#detail").querySelectorAll("[data-country-tab]").forEach(tab=>tab.setAttribute("aria-selected",String(tab.dataset.countryTab===previousTab)));
   $("#detail").querySelectorAll("[role=tabpanel]").forEach(panel=>panel.hidden=panel.id!=="panel-"+previousTab);
   loadTabRanks(data.code,previousTab);
  }
  $(".drawer").scrollTop=scrollTop;
 }
 async function openCountry(code){
  if(!/^[A-Z]{2}$/.test(code))return;
  const request=++state.countryRequest;
  state.active="country:"+code;
  $("#detail").innerHTML='<div class="detail-kicker">COUNTRY DOSSIER / '+esc(code)+'</div><div class="country-title">'+flag(code,"flag-hero")+'<h2>'+esc(namedCountry(code))+'</h2></div><div class="country-loading" role="status">국가 자료를 불러오는 중입니다…</div>';
  activateDrawer("국가 정보: "+namedCountry(code));
  history.replaceState({}, "", "?country="+encodeURIComponent(code));
  const base="/api/country?code="+encodeURIComponent(code);
  const load=async suffix=>{const r=await fetch(base+suffix,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);return r.json()};
  let shown=false;
  try{
   const fast=await load("&fast=1");
   if(request!==state.countryRequest||state.active!=="country:"+code)return;
   showCountry(fast);shown=true;
   loadCountryLeaders(code,request);
  }catch{}
  try{
   const complete=await load("");
   if(request!==state.countryRequest||state.active!=="country:"+code)return;
   showCountry(complete);
   if(!shown)loadCountryLeaders(code,request);
  }catch{
   if(request!==state.countryRequest||state.active!=="country:"+code)return;
   if(!shown)$("#detail").innerHTML='<div class="detail-kicker">COUNTRY DOSSIER</div><div class="country-title">'+flag(code,"flag-hero")+'<h2>'+esc(namedCountry(code))+'</h2></div><p class="lead">국가 자료를 불러오지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.</p><button class="retry-country" type="button" data-country="'+esc(code)+'">다시 시도 ↗</button>';
  }
 }
 // Story detail: a close-up map around the event, with nearby stories of the same conflict for context.
 function mountStoryMap(s){
  const box=$("#detail .story-atlas");if(!box)return;
  const all=(state.edition?.stories||[]).filter(a=>Number.isFinite(a.lon)&&Number.isFinite(a.lat));
  const codes=new Set(mainCodes(s));
  const near=all.filter(a=>a.id!==s.id&&a.lon!==s.lon&&mainCodes(a).some(c=>codes.has(c))&&Math.abs(a.lon-s.lon)<14&&Math.abs(a.lat-s.lat)<9);
  const items=all.map(a=>({type:"story",id:a.id,lon:a.lon,lat:a.lat,label:a.label||a.place,subtitle:a.headline,main:a.id===s.id}));
  const m=window.FrontlineAtlas.mount(box,{items,focus:{points:[[s.lon,s.lat],...near.map(a=>[a.lon,a.lat])],span:12},nameOf:code=>namedCountry(code),altPoint:code=>{const c=state.countries.find(x=>x.code===code);return Number.isFinite(c?.capitalLon)&&Number.isFinite(c?.capitalLat)?[c.capitalLon,c.capitalLat]:null},onSelect:item=>item.type==="story"&&item.id!==s.id?openStory(item.id):item.type==="occupied"?null:item.type==="country"?openCountry(item.id):null});
  loadOcc().then(list=>m.setOccupied&&m.setOccupied(list,true));
 }
 function openStory(id){
  const s=state.edition?.stories.find(a=>a.id===id);if(!s)return;state.active=id;state.countryRequest++;
  $("#detail").innerHTML='<div class="detail-kicker">'+esc(s.region)+" · "+esc(s.place)+" / "+esc(s.level)+'</div><div class="story-flags">'+(s.countryCodes||[]).slice(0,6).map(code=>flag(code,"flag-story")).join("")+'</div><h2>'+esc(s.headline)+'</h2><p class="lead">'+esc(s.summary)+'</p><div class="detail-meta">사건 '+esc(s.eventDate)+" · 위치 "+esc(s.locations)+' · 기사별 발행일은 아래 원문 참조</div>'+(Number.isFinite(s.lon)&&Number.isFinite(s.lat)?'<div class="section story-map"><h3>현장 지도</h3><div class="story-atlas"></div><p class="story-map-note">빨간 큰 점이 이 사건의 위치예요. 작은 점은 이번 판의 다른 사건이고, 빗금은 점령·무장세력 통제 지역입니다. 끌어서 옮기고 휠·+/−로 확대해요.</p></div>':"")+'<div class="section"><h3>01 / 무슨 일이 바뀌었나</h3><div class="change">'+esc(s.changed)+'</div></div><div class="section"><h3>02 / 관련 주체와 역할</h3>'+entries(s.actors,s)+'</div><div class="section"><h3>03 / 이권과 전략 자산</h3>'+entries(s.interests,s)+'</div><div class="section"><h3>04 / 기업·경제주체</h3>'+entries(s.economy,s)+'</div>'+(Array.isArray(s.outlook)&&s.outlook.length?'<div class="section outlook"><h3>05 / 전문가 평가·전망</h3>'+entries(s.outlook,s)+'</div>':"")+'<div class="section"><h3>확인되지 않은 점</h3><div class="caveat">'+esc(s.uncertainty)+'</div></div><div class="section"><h3>근거 기사</h3>'+s.sources.map((src,i)=>'<a class="source" href="'+safeUrl(src[3])+'" target="_blank" rel="noopener noreferrer"><span><strong>['+(i+1)+"] "+esc(src[0])+"</strong>"+esc(src[1])+'</span><i>'+esc(src[2])+" ↗</i></a>").join("")+'</div><div class="detail-nav"><button id="back-to-feed" type="button">← 목록으로</button><button id="copy-link" type="button">링크 복사 ↗</button></div>';
  mountStoryMap(s);
  activateDrawer("기사 상세 정보: "+s.headline);
  $("#back-to-feed").addEventListener("click",close);
  $("#copy-link").addEventListener("click",async e=>{const u=location.origin+location.pathname+"?story="+encodeURIComponent(id);try{await navigator.clipboard.writeText(u);e.target.textContent="복사 완료 ✓"}catch{e.target.textContent="주소: "+u}});
  history.replaceState({}, "", "?story="+encodeURIComponent(id));
 }
 function close(){
  $("#overlay").classList.remove("open");$("#overlay").setAttribute("aria-hidden","true");document.body.style.overflow="";state.active=null;state.countryRequest++;history.replaceState({}, "", location.pathname);
  if(state.previousFocus?.isConnected)state.previousFocus.focus();
  state.previousFocus=null;
 }
 function about(){
  state.active="about";state.countryRequest++;
  const names={
   "ofac.treasury.gov":"미국 재무부 OFAC","apnews.com":"AP 통신","arabnews.com":"Arab News · AFP 기사 전재",
   "radiotamazuj.org":"Radio Tamazuj","ukmto.org":"영국 해상무역기구 UKMTO",
   "boereport.com":"BOE Report · Reuters 기사 전재","president.go.kr":"대한민국 청와대",
   "aljazeera.com":"Al Jazeera","thestar.com.my":"The Star · Reuters 기사 전재",
   "criticalthreats.org":"Critical Threats Project","amnesty.org":"Amnesty International",
   "ispmyanmar.com":"ISP-Myanmar","moi.gov.mm":"미얀마 정보부",
   "budget.gouv.fr":"프랑스 예산부","assemblee-nationale.fr":"프랑스 국민의회",
   "bundestag.de":"독일 연방의회","dati.cvk.lv":"라트비아 중앙선거관리위원회"
  };
  const official=new Set(["ofac.treasury.gov","ukmto.org","president.go.kr","moi.gov.mm","budget.gouv.fr","assemblee-nationale.fr","bundestag.de","dati.cvk.lv"]);
  const sites=new Map();
  for(const story of state.edition?.stories||[])for(const src of story.sources||[]){
   try{
    const url=new URL(src?.[3]);if(url.protocol!=="https:")continue;
    const host=url.hostname.toLowerCase().replace(/^www\./,"");
    if(!sites.has(host))sites.set(host,{host,urls:new Set()});
    sites.get(host).urls.add(url.href);
   }catch{}
  }
  const siteList=kind=>[...sites.values()].filter(item=>official.has(item.host)===kind).sort((a,b)=>a.host.localeCompare(b.host))
   .map(item=>'<a class="source" href="'+safeUrl('https://'+item.host+'/')+'" target="_blank" rel="noopener noreferrer"><span><strong>'+esc(names[item.host]||item.host)+'</strong>'+esc(item.host)+' · 원문 '+item.urls.size+'건</span><i>사이트 ↗</i></a>').join("");
  const sources=sites.size?'<div class="section"><h3>이번 호에 인용한 사이트 · '+sites.size+'곳</h3><p>현재 브리핑의 기사 원문에 실제 연결된 사이트입니다. 매시간 모든 사이트를 자동 수집한다는 뜻은 아닙니다. 개별 원문과 발행일은 기사에서 확인할 수 있습니다.</p><h3>보도·현지 취재·조사</h3>'+siteList(false)+'<h3 style="margin-top:24px">정부·의회·공식 발표</h3>'+siteList(true)+'<p>공식 발표는 해당 기관의 입장을 확인하는 자료이며, 분쟁 책임 등은 독립 확인 여부를 기사에 별도로 표시합니다.</p></div>':'';
  $("#detail").innerHTML='<div class="detail-kicker">EDITORIAL METHOD</div><h2>편집 원칙</h2><p class="lead">나라별 제도와 지표, 세계의 중요한 변화를 출처와 시점에 맞춰 읽습니다.</p><div class="section"><h3>사실과 주장의 경계</h3><p>독립적으로 확인된 사건, 당국 발표, 당사자 주장, 분석가의 해석을 각각 표시합니다. 지원 의혹은 입증된 교전 참여와 다르게 다룹니다.</p></div><div class="section"><h3>기업과 돈의 연결</h3><p>기업은 직접 피해, 운항·물류 영향, 투자·사업, 전략적 이해관계로 구분합니다. 자원과 산업에 관계가 있다는 이유로 특정 기업을 무장세력의 거래 상대라고 쓰지 않습니다.</p></div><div class="section"><h3>자료의 기준 시점</h3><p>매시간 새로운 발표와 변화를 확인합니다. GDP, 물가, 국방비, 의석수는 각각의 기관이 발표한 자료의 연도나 날짜를 따릅니다. 공식 관측치가 없는 곳은 유엔·IMF·현지 통계·공개 추정 자료를 확인해 출처와 연도가 있는 수치를 표시합니다. 추정 표기를 붙이고 동일 기준이 아니면 한국 값이나 순위와 합치지 않습니다.</p></div><div class="section"><h3>수집 범위와 지도</h3><p>국가 검색은 국가·지역을 폭넓게 다루지만 모든 국가에 독립된 정책금리나 공개된 예산안이 있는 것은 아닙니다. 사건 점은 전선이나 점령 경계를, 국가 점은 사건 위치를 뜻하지 않습니다. 지도 경계는 제3자 지도 제공자의 표시로 영토 분쟁에 대한 정치적 입장을 뜻하지 않습니다.</p></div>'+sources;
  activateDrawer("편집 원칙");
 }
 function installGuide(){
  state.active="install";state.countryRequest++;
  $("#detail").innerHTML='<div class="detail-kicker">THE FRONT / MOBILE</div><h2>휴대폰에 전선 설치</h2><p class="lead">홈 화면의 전선 아이콘을 누르면 브리핑이 독립된 화면에서 열립니다. 비공개 사이트에 접근할 수 있는 계정이 필요하며 설치 후 로그인을 다시 해야 할 수 있습니다.</p><div class="section"><h3>안드로이드 · Chrome</h3><p>이 사이트를 Chrome으로 연 뒤 오른쪽 위 ⋮ → ‘앱 설치’ 또는 ‘설치 및 바로가기 만들기’ → ‘설치’를 누르세요.</p></div><div class="section"><h3>아이폰 · Safari</h3><p>Safari에서 이 사이트를 열고 공유 → ‘홈 화면에 추가’ → ‘웹 앱으로 열기’를 켠 다음 ‘추가’를 누르세요.</p></div><div class="section"><h3>새 소식 확인</h3><p>앱을 열거나 다시 돌아오면 새로 발행된 브리핑을 확인합니다. 중요한 변화의 휴대폰 알림은 아직 제공하지 않습니다. 인터넷 연결과 사이트 접근 권한이 필요합니다.</p></div>';
  activateDrawer("전선 앱 설치 방법");
 }
 function guideSheet(){
  const card=(n,t,d)=>'<li class="guide-card"><b>'+n+'</b><h4>'+t+'</h4><p>'+d+'</p></li>';
  $("#detail").innerHTML='<div class="detail-kicker">PANDO / GUIDE</div><h2>판도 사용법</h2>'+
   '<p class="lead">판도는 세계의 정치·경제·군사 판도와 분쟁을 한국어로 읽는 국제 브리핑입니다. 모든 숫자와 사건에 기준 날짜와 원문 출처를 붙이고, 확인된 사실과 각국의 주장을 구분해 보여줍니다.</p>'+
   '<section class="guide-sec"><h3>첫 화면</h3><ol class="guide-grid">'+
    card("1","오늘의 초점","지금 가장 중요한 변화 한 건을 맨 위에 올립니다. ‘자세히 보기’를 누르면 관련 행위자, 이해관계, 아직 불확실한 점까지 열립니다.")+
    card("2","세계 변화 지도","빨간 점은 사건 현장, 마름모는 주목 국가입니다. 빗금은 무력 점령·무장세력 통제 지역(진한 빗금 = 대부분 장악, 옅은 빗금 = 일부)이고, 누르면 누가 언제부터 쥐고 있는지와 양쪽 공식 입장이 나옵니다. 손가락이나 휠로 확대·이동하세요.")+
    card("3","국제기구로 보기","지도 아래 NATO·EU·BRICS·SCO·일대일로 등을 누르면 회원국이 칠해지고, 파트너·옵서버는 옅게 표시됩니다.")+
    card("4","지금 주목할 국가","최근 바뀐 일을 카드로 모았습니다. ‘발표·잠정·확정’ 표시로 사실이 어디까지 굳었는지 알려주고, ‘원문’ 링크로 출처를 바로 확인할 수 있습니다.")+
    card("5","나라 바로 찾기","맨 위 검색창에 한국어나 영어 이름을 몇 글자 치면 바로 그 나라 화면이 열립니다. 아래 ‘국가 탐색’에서는 250개 국가·지역을 지역별로 훑어볼 수 있습니다.")+
    card("6","판도 해설","청문회·정상회담 같은 큰 장면을 ‘왜?’에서 출발해 질의응답·숨은 맥락·용어·아직 모르는 것까지 풀어 씁니다.")+'</ol></section>'+
   '<section class="guide-sec"><h3>국가 상세 · 위에서부터</h3><ol class="guide-grid">'+
    card("A","한눈에 보는 문제","맨 위 경고등 5칸(물가·실업률·정부부채·부패인식·분쟁)이 양호·주의·위험을 색으로 보여주고, ▲▼로 작년보다 나빠졌는지 알려줍니다. 마우스를 올리면 한국 값이 나옵니다. 주요국은 지금 가장 큰 문제 카드 3장이 있고, ‘왜?’를 누르면 구조 → 직접 원인 → 결과 순서로 원인을 따라가며, 금리 결정·선거 같은 다음 일정은 D-day로 보여줍니다.")+
    card("B","갈등 관계 · 갈등도","갈등 칩에 마우스를 올리면 이유가, 누르면 지도 위 갈등도가 펼쳐집니다. 누가 어느 쪽인지, 적대(빨강)·지원(초록)·중재(회색 점선) 관계를 선으로 보여주고, 선이나 나라를 누르면 사건과 출처(당사자 공식·상대측 공식·언론)가 나옵니다.")+
    card("C","우방 관계 · 국제기구","우방국 칩에 마우스를 올리면 왜 가까운지(겹치는 안보·경제 이해관계)가 보입니다. 아래에는 가입한 국제기구와 가입일이 있습니다.")+
    card("D","지금 상황 · 핵심 인물","누가 권력을 쥐고 있는지와 지켜볼 점을 정리합니다. 국가원수·정부수반·주요 장관은 사진과 ‘제○대’, 독재·권위주의 평가 근거와 함께 나옵니다. ‘인물 간 개인적 관계’를 펼치면 학연·지연·혈연·사업·경력·군·정보·계파로 얽힌 사이와 함께 묶이는 집단이 보입니다.")+'</ol></section>'+
   '<section class="guide-sec"><h3>정치·의회 탭</h3><ol class="guide-grid">'+
    card("E","의석과 정당","반원 그림으로 정당별 의석을 보여줍니다. 정당을 누르면 대표자·주장·지역별 득표 지도가 담긴 카드가 열립니다.")+
    card("F","정당별 지역 지지 지도","주·도 지도를 ‘지역별 1위’ 정당 색으로 칠합니다. 정당을 누르면 득표율만큼 진하게 칠해 어디서 강하고 약한지 보입니다. 마우스를 올리면 지역 이름(한국어·현지어), 주요 도시, 상위 정당 득표율이 나옵니다.")+
    card("G","지역별 소득 수준","지도 오른쪽 위 스위치를 켜면 주·도별 1인당 소득·생산을 진하기로 보여줍니다. 현지 통화와 함께 자료 연도 환율로 바꾼 달러 값을 같이 적습니다. 주·도 지도가 아직 없는 나라는 ‘수도와 위치’ 지도가 나옵니다.")+
    card("H","정당 간 쟁점","누가 무엇으로 맞서는지 양쪽 주장과 함께 보여주고, 진영별 의석 합계(몇 석 vs 몇 석)와 과반선을 막대로 그립니다.")+
    card("I","결정은 어떻게 내려지나","법률·예산·전쟁(파병·조약)이 어떤 단계를 거쳐 정해지는지, 누가 최종 결정권을 쥐고 누가 견제하는지, 공식 제도 밖의 비공식 권력까지 정리합니다.")+
    card("J","지역과 정당 · 부패 · 선거의 공정성","큰 나라의 지역 기반 정당과 지역 갈등, 국제투명성기구 부패인식지수와 V-Dem 선거 공정성 점수의 순위·추이를 한국과 비교합니다. 각 점수 아래 ‘사례 보기’를 펼치면 실제 부패·선거 사건과 진행 상황(의혹·기소·유죄 등)이 나옵니다.")+'</ol></section>'+
   '<section class="guide-sec"><h3>경제 · 예산 · 군사 탭</h3><ol class="guide-grid">'+
    card("K","지표 카드와 그래프","카드를 누르면 연도별 그래프가 펼쳐지고, 같은 지표의 한국 추이가 회색 점선으로 겹쳐 그려집니다. 세계 순위와 한국 순위도 함께 나옵니다.")+
    card("L","경제","명목 GDP·1인당 GDP·성장률·물가·정부부채·실업률·정책금리를 봅니다. 오래된 값에는 ‘○년 전 자료’ 표시가 붙습니다.")+
    card("M","예산","세입·지출·재정수지와 분야별 예산을 보고, 현지 통화 금액은 원화·달러 환산을 함께 적습니다.")+
    card("N","군사","군사비와 GDP·정부지출 대비 비중, 병력, 무기 수입·수출(SIPRI)을 한국과 비교합니다.")+'</ol></section>'+
   '<section class="guide-sec"><h3>읽는 법</h3><ul class="guide-list">'+
    '<li><b>기준일</b> 모든 수치와 요약에는 ‘○○ 기준’ 날짜가 붙습니다. 날짜가 오래됐으면 그 사이 바뀌었을 수 있습니다.</li>'+
    '<li><b>사실과 주장</b> 정부·정당의 발표는 ‘주장’, 여러 출처로 확인된 것은 ‘사실’로 구분해 씁니다. 비난받는 쪽의 공식 반박도 함께 싣습니다.</li>'+
    '<li><b>출처 등급</b> 당사자 공식 > 상대측 공식 > 언론 > 연구기관 순으로 무게를 둡니다. 밑줄 친 링크는 모두 원문으로 이어집니다.</li>'+
    '<li><b>접고 펼치기</b> 국가 화면의 각 덩어리 머리글을 누르면 접히고, 접어 둔 상태는 다음에도 기억됩니다. 맨 위 ‘모두 접기·모두 펼치기’로 한 번에 바꿀 수 있습니다.</li>'+
    '<li><b>영어로 보기</b> 오른쪽 위 KO | EN 버튼으로 화면 전체를 영어로 바꿀 수 있습니다.</li>'+
    '<li><b>바로가기</b> 주소 끝에 <code>?country=KR</code>처럼 국가 코드를 붙이면 그 나라 화면이 바로 열려 공유하기 좋습니다.</li>'+
    '<li><b>피드백</b> 오른쪽 위 ‘피드백 보내기’로 틀린 내용이나 바라는 기능을 바로 보낼 수 있습니다.</li></ul></section>'+
   '<p class="guide-foot">휴대폰에서는 브라우저 메뉴의 ‘홈 화면에 추가’로 앱처럼 쓸 수 있습니다.</p>';
  activateDrawer("판도 사용법");
 }
 $("#guide-open")?.addEventListener("click",guideSheet);
 document.addEventListener("click",e=>{if(e.target.closest("[data-guide-open]")){e.preventDefault();guideSheet()}});
 document.addEventListener("click",e=>{const b=e.target.closest("[data-explain]");if(b){e.preventDefault();openExplainer(b.dataset.explain);return}const c=e.target.closest("[data-cite]");if(c){e.preventDefault();document.getElementById("xs-"+c.dataset.cite)?.scrollIntoView({behavior:"smooth",block:"center"})}});
 if(/^#explain=/.test(location.hash)){const id=decodeURIComponent(location.hash.slice(9));const t=setInterval(()=>{if(state.explainers){clearInterval(t);openExplainer(id)}},200)}
 if(location.hash==="#guide")setTimeout(guideSheet,300);
 window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event});
 window.addEventListener("appinstalled",()=>{installPrompt=null;$("#install-open")?.remove()});
 if(window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone)$("#install-open")?.remove();
 $("#install-open")?.addEventListener("click",async()=>{
  if(installPrompt){const choice=installPrompt;installPrompt=null;try{await choice.prompt();await choice.userChoice;return}catch{}}
  installGuide();
 });
 document.addEventListener("click",e=>{
  if(e.target.closest("#feedback-open")){feedbackSheet();return}
  const bc=e.target.closest("#bloc-bar [data-bloc]");if(bc){selectBloc(bc.dataset.bloc);return}
  const ixc=e.target.closest(".ix-card[data-ix]");if(ixc){const blk=ixc.closest(".ix"),i=ixc.dataset.ix,w=blk.querySelector('[data-ix-why="'+i+'"]');const open=w&&w.hidden;
   blk.querySelectorAll("[data-ix-why]").forEach(x=>x.hidden=true);blk.querySelectorAll(".ix-card").forEach(x=>x.setAttribute("aria-expanded","false"));
   if(w&&open){w.hidden=false;ixc.setAttribute("aria-expanded","true");w.style.order=0}return}
  const ixg=e.target.closest("[data-ix-go]");if(ixg){const t=ixg.dataset.ixGo;if(t==="conflict"){$("#detail .conflicts")?.scrollIntoView({behavior:"smooth",block:"start"});return}
   const tabKey=t==="decisions"?"politics":t;$('#detail [data-country-tab="'+tabKey+'"]')?.click();setTimeout(()=>{const target=t==="decisions"?$("#detail .decision-map"):$("#detail .country-tabs");target?.scrollIntoView({behavior:"smooth",block:"start"})},80);return}
  const ot=e.target.closest("[data-occ-toggle]");if(ot){const on=ot.getAttribute("aria-pressed")!=="true";ot.setAttribute("aria-pressed",String(on));atlas.setOccupied&&atlas.setOccupied(null,on);return}
  const oo=e.target.closest("[data-occ-country]");if(oo){openCountry(oo.dataset.occCountry);return}
  const bo=e.target.closest("[data-bloc-open]");if(bo){const k=bo.dataset.blocOpen;close();setTimeout(()=>{selectBloc(k);document.getElementById("map")?.scrollIntoView({behavior:"smooth",block:"center"})},60);return}
  const pclose=e.target.closest(".party-close");if(pclose){const chart=pclose.closest(".chamber-chart");delete chart.dataset.focus;chart.querySelectorAll("[data-g]").forEach(n=>n.classList.remove("seat-dim"));pclose.closest(".party-detail").hidden=true;return}
  const pmi=e.target.closest("[data-pmap-income]");if(pmi&&!pmi.disabled){const blk=pmi.closest(".pmap-block"),box=blk.querySelector(".pmap");const on=pmi.getAttribute("aria-pressed")!=="true";pmi.setAttribute("aria-pressed",String(on));blk.classList.toggle("pmap-block--inc",on);
   if(on){box.dataset.mode="income";if(box.dataset.drawn)paintIncome(box);else drawPartyMap(box)}else{delete box.dataset.mode;unpaintIncome(box);if(box.dataset.pmapParty)paintPartyMap(box,box.dataset.pmapParty)}return}
  const pmc=e.target.closest("[data-pmap-party]");if(pmc&&pmc.closest(".pmap-block")){const blk=pmc.closest(".pmap-block"),box=blk.querySelector(".pmap");blk.querySelectorAll("[data-pmap-party]").forEach(b=>b.classList.toggle("on",b===pmc));box.dataset.pmapParty=pmc.dataset.pmapParty;
   if(box.dataset.mode==="income"){delete box.dataset.mode;unpaintIncome(box);blk.classList.remove("pmap-block--inc");blk.querySelector("[data-pmap-income]")?.setAttribute("aria-pressed","false")}
   if(box.dataset.drawn)paintPartyMap(box,pmc.dataset.pmapParty);else drawPartyMap(box);return}
  const dmt=e.target.closest("[data-dm-tab]");if(dmt){const box=dmt.closest(".decision-map");box.querySelectorAll("[data-dm-tab]").forEach(b=>b.setAttribute("aria-selected",String(b===dmt)));box.querySelectorAll("[data-dm-pane]").forEach(p=>p.hidden=p.dataset.dmPane!==dmt.dataset.dmTab);return}
  const ally=e.target.closest("[data-ally]");if(ally){
   const box=ally.closest(".allies"),i=ally.dataset.ally,open=ally.getAttribute("aria-expanded")!=="true";
   box.querySelectorAll("[data-ally]").forEach(b=>b.setAttribute("aria-expanded",String(open&&b===ally)));
   box.querySelectorAll("[data-ally-detail]").forEach(d=>d.hidden=!(open&&d.dataset.allyDetail===i));
   return;
  }
  const chip=e.target.closest("[data-conflict]");if(chip){
   const box=chip.closest(".conflicts"),i=chip.dataset.conflict,open=chip.getAttribute("aria-expanded")!=="true";
   box.querySelectorAll("[data-conflict]").forEach(b=>b.setAttribute("aria-expanded",String(open&&b===chip)));
   box.querySelectorAll("[data-conflict-detail]").forEach(d=>d.hidden=!(open&&d.dataset.conflictDetail===i));
   if(open){const slot=box.querySelector('[data-conflict-detail="'+i+'"] .board-slot');if(slot&&!slot.dataset.drawn){slot.dataset.drawn="1";drawBoard(slot,+i)}}
   return;
  }
  const fp=e.target.closest("[data-party-open]");if(fp){
   const root=fp.closest("section,[role=tabpanel]")?.parentElement||document,label=fp.dataset.partyOpen;
   const li=[...root.querySelectorAll(".seat-legend li[data-party]")].find(x=>x.dataset.party===label);
   if(li){const chart=li.closest(".chamber-chart");if(chart.dataset.focus!==li.dataset.g)li.click();else chart.querySelector(".party-detail")?.scrollIntoView({block:"nearest",behavior:"smooth"})}
   return;
  }
  const seatItem=e.target.closest(".seat-legend li[data-g], .seat-strip-seg[data-g]");if(seatItem){
   const chart=seatItem.closest(".chamber-chart"),g=seatItem.dataset.g,on=chart.dataset.focus!==g;
   if(on)chart.dataset.focus=g;else delete chart.dataset.focus;
   chart.querySelectorAll("[data-g]").forEach(n=>n.classList.toggle("seat-dim",on&&n.dataset.g!==g));
   const card=chart.querySelector(".party-detail"),li=chart.querySelector('.seat-legend li[data-g="'+g+'"]');
   if(card){card.hidden=!on;if(on&&li){card.innerHTML=partyCard(li.dataset.party);drawPartyMap(card.querySelector('.pmap'));card.scrollIntoView({block:"nearest",behavior:"smooth"})}}
   return;
  }
  const more=e.target.closest("[data-more]");if(more){
   const kind=more.dataset.more;
   if(kind==="feed"){state.feedAll=true;drawFeed()}
   else if(kind==="watch"){state.watchAll=true;renderWatch()}
   else if(kind==="countries"){state.countriesAll=true;renderCountries()}
   return;
  }
  const metric=e.target.closest("[data-metric]");if(metric){const chart=metric.closest(".metric-card")?.querySelector(".metric-expand-content");if(chart){chart.hidden=!chart.hidden;metric.setAttribute("aria-expanded",String(!chart.hidden))}return}
  const country=e.target.closest("[data-country]");if(country){openCountry(country.dataset.country);return}
  const story=e.target.closest("[data-open]");if(story){openStory(story.dataset.open);return}
  const tab=e.target.closest("[data-country-tab]");if(tab){
   const group=tab.parentElement;
   group.querySelectorAll("[role=tab]").forEach(b=>b.setAttribute("aria-selected",String(b===tab)));
   $("#detail").querySelectorAll("[role=tabpanel]").forEach(panel=>panel.hidden=panel.id!=="panel-"+tab.dataset.countryTab);
   if(state.active?.startsWith("country:"))loadTabRanks(state.active.slice(8),tab.dataset.countryTab);
   return;
  }
  const f=e.target.closest("[data-filter]");if(f){state.filter=f.dataset.filter;drawFilters();drawFeed()}
 });
 $("#close").addEventListener("click",close);$("#overlay").addEventListener("click",e=>{if(e.target.id==="overlay")close()});
 document.addEventListener("keydown",e=>{
  if(!$("#overlay").classList.contains("open"))return;
  if(e.key==="Escape"){close();return}
  if((e.key==="Enter"||e.key===" ")&&document.activeElement?.matches(".seat-legend li[data-g]")){e.preventDefault();document.activeElement.click();return}
  if(e.key==="Tab"){
   const focusable=[...$(".drawer").querySelectorAll("button:not([disabled]),a[href],input,select")].filter(node=>node.offsetParent!==null);
   if(!focusable.length)return;
   if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus()}
   else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus()}
  }
  if((e.key==="ArrowRight"||e.key==="ArrowLeft")&&document.activeElement?.matches("[data-country-tab]")){
   const tabs=[...$("#detail").querySelectorAll("[data-country-tab]")];
   const index=tabs.indexOf(document.activeElement);
   if(index<0)return;
   e.preventDefault();const next=tabs[(index+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length];
   next.focus();next.click();
  }
 });
 $("#about-open").addEventListener("click",e=>{e.preventDefault();about()});
 $("#country-search")?.addEventListener("input",e=>{state.countryQuery=e.target.value;renderCountries()});
 // Quick country finder in the hero: type → up to 6 matches → open the dossier.
 (function(){const inp=$("#quick-country"),ul=$("#quick-results");if(!inp||!ul)return;let hits=[],sel=0;
  const draw=()=>{if(!hits.length){ul.hidden=true;ul.innerHTML="";return}ul.innerHTML=hits.map((c,i)=>'<li role="option" aria-selected="'+(i===sel)+'" data-qs="'+esc(c.code)+'">'+flag(c.code,"flag-mini")+'<b>'+esc(countryName(c))+'</b><span>'+esc(c.name||"")+'</span></li>').join("");ul.hidden=false};
  inp.addEventListener("input",()=>{const q=inp.value.trim().toLocaleLowerCase("ko");sel=0;if(!q){hits=[];draw();return}
   const score=c=>{const ns=[countryName(c),c.name,c.code,...(c.aliases||[])].map(s=>String(s||"").toLocaleLowerCase("ko"));return ns.some(s=>s===q)?0:ns.some(s=>s.startsWith(q))?1:ns.some(s=>s.includes(q))?2:9};
   hits=state.countries.map(c=>[score(c),c]).filter(x=>x[0]<9).sort((a,b)=>a[0]-b[0]||Math.min(...[countryName(a[1]),a[1].name,...(a[1].aliases||[])].map(x=>String(x||'').length))-Math.min(...[countryName(b[1]),b[1].name,...(b[1].aliases||[])].map(x=>String(x||'').length))).slice(0,6).map(x=>x[1]);draw()});
  inp.addEventListener("keydown",e=>{if(!hits.length)return;if(e.key==="ArrowDown"){sel=(sel+1)%hits.length;draw();e.preventDefault()}else if(e.key==="ArrowUp"){sel=(sel-1+hits.length)%hits.length;draw();e.preventDefault()}else if(e.key==="Enter"){e.preventDefault();const c=hits[sel];hits=[];draw();inp.value="";inp.blur();openCountry(c.code)}else if(e.key==="Escape"){hits=[];draw()}});
  ul.addEventListener("mousedown",e=>{const li=e.target.closest("[data-qs]");if(!li)return;e.preventDefault();hits=[];draw();inp.value="";inp.blur();openCountry(li.dataset.qs)});
  inp.addEventListener("blur",()=>setTimeout(()=>{hits=[];draw()},150));
 })();
 $("#country-region")?.addEventListener("change",e=>{state.countryRegion=e.target.value;renderCountries()});
 async function loadEdition(silent=false){
  try{
   const r=await fetch("/api/edition",{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
   const incoming=await r.json();
   if(silent&&state.edition?.updatedAt===incoming.updatedAt&&state.edition?.editionDate===incoming.editionDate)return false;
   state.edition=incoming;
   const ed=state.edition;$("#mastdate").textContent=day(ed.editionDate)+" · KST";$("#edition-title").textContent=day(ed.editionDate)+" 브리핑";$("#edition-note").textContent=ed.editionNote||"출처와 확인 수준을 함께 표기합니다.";$("#edition-time").textContent="뉴스 자료 마지막 확인 "+time(ed.updatedAt)+" KST";$("#map-count").textContent=ed.stories.length+"개 변화";
   const lead=ed.stories[0];$("#lead-title").textContent=lead.headline;$("#lead-copy").textContent=lead.summary;$("#lead-open").onclick=()=>openStory(lead.id);
   drawMap();drawFilters();drawFeed();if(!silent){const id=new URLSearchParams(location.search).get("story");if(id)openStory(id)}
   return true;
  }catch{if(!silent){$("#edition-title").textContent="자료를 가져오지 못했습니다";$("#edition-note").textContent="잠시 후 새로고침해 주세요.";$("#feed").innerHTML='<div class="empty">브리핑을 불러오지 못했습니다.</div>'}return false}
 }
 async function loadCountries(silent=false){
  try{
   const r=await fetch("/api/countries",{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
   const result=await r.json();state.countries=Array.isArray(result.countries)?result.countries:[];state.watch=Array.isArray(result.watch)?result.watch:[];
   state.countries.sort((a,b)=>countryName(a).localeCompare(countryName(b),"ko"));
   renderCountryFilters();renderCountries();renderWatch();if(state.edition)drawMap();
   if(!silent){const code=new URLSearchParams(location.search).get("country");if(code)openCountry(code.toUpperCase())}
  }catch{
   if(!silent){$("#country-list").innerHTML='<div class="empty">국가 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</div>';renderWatch()}
  }
 }
 loadEdition();loadCountries();loadExplainers();
 async function refreshEdition(){
  if(document.visibilityState!=="visible"||!state.edition||editionBusy||Date.now()-lastEditionCheck<30000)return;
  editionBusy=true;lastEditionCheck=Date.now();
  try{if(await loadEdition(true))await loadCountries(true)}finally{editionBusy=false}
 }
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refreshEdition()});
 window.addEventListener("focus",refreshEdition);
 setInterval(refreshEdition,5*60*1000);
})();
