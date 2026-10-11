// Assemble the single-page artifact from the site source plus artifact adapters.
import fs from "node:fs";
import path from "node:path";import {fileURLToPath} from "node:url";
const HERE=path.dirname(fileURLToPath(import.meta.url))+"/", ROOT=path.resolve(HERE,"..")+"/";
const SRC=HERE, A=HERE;
const read=p=>fs.readFileSync(p,"utf8");
const replaceOnce=(s,a,b,label)=>{if(s.split(a).length!==2)throw Error("patch failed: "+label);return s.replace(a,b)};

let client=read(SRC+"client.js");
client=replaceOnce(client,' const $=s=>document.querySelector(s);',' const $=s=>document.querySelector(s);\n const api=window.FrontlineData.api;',"api");
client=replaceOnce(client,'fetch(task.url,{cache:"no-store"})','api(task.url)',"rank");
client=replaceOnce(client,'await fetch("/api/leaders?code="+encodeURIComponent(code),{cache:"no-store"})','await api("/api/leaders?code="+encodeURIComponent(code))',"leaders");
client=replaceOnce(client,'const r=await fetch(base+suffix,{cache:"no-store"})','const r=await api(base+suffix)',"country");
client=replaceOnce(client,'const r=await fetch("/api/edition",{cache:"no-store"})','const r=await api("/api/edition")',"edition");
client=replaceOnce(client,'const r=await fetch("/api/countries",{cache:"no-store"})','const r=await api("/api/countries")',"countries");
// Static data: one load is enough; skip the old "fast then full" second request.
client=replaceOnce(client,'   showCountry(fast);shown=true;\n   loadCountryLeaders(code,request);\n  }catch{}','   showCountry(fast);shown=true;\n   loadCountryLeaders(code,request);\n   return;\n  }catch{}',"single-load");
// Emoji flags only (image hosts are blocked in the artifact frame).
client=replaceOnce(client,`'<span class="flag '+esc(kind)+'"><img loading="lazy" src="https://flagcdn.com/w80/'+code.toLowerCase()+'.png" alt="'+esc(code)+' 국기" onerror="this.style.display=\\'none\\'"/><span aria-hidden="true">'+flagEmoji(code)+'</span></span>'`,
 `'<span class="flag '+esc(kind)+'" role="img" aria-label="'+esc(code)+' 국기">'+(window.__FLAGS&&/^data:image\\/webp;base64,[A-Za-z0-9+\\/=]+$/.test(window.__FLAGS[code]||"")?'<img src="'+window.__FLAGS[code]+'" alt="">':'<b class="flag-code">'+esc(code)+'</b>')+'</span>'`,"flag");
client=replaceOnce(client,`(photo?.url?'<img loading="lazy" src="'+safeUrl(photo.url)+'"`,`(photo?.url?'<img loading="lazy" src="'+(/^data:image\\/(webp|jpeg|png);base64,[A-Za-z0-9+\\/=]+$/.test(photo.url)?photo.url:safeUrl(photo.url))+'"`,"portrait");
// Live updates from the shared database re-render the briefing and watch list.
client=replaceOnce(client,' loadEdition();loadCountries();',' loadEdition();loadCountries();\n window.FrontlineData.onChange(async()=>{lastEditionCheck=0;if(await loadEdition(true))await loadCountries(true)});',"live");

let body=read(HERE+"body.html");
body=body.slice(body.indexOf("<body>")+6,body.lastIndexOf("<script"));
body=replaceOnce(body,'<button id="install-open" class="install-link" type="button">앱 설치 ↗</button>','<button id="guide-open" class="guide-link" type="button">판도 사용법</button>',"install");
body=replaceOnce(body,'<span>표식은 사건의 위치 또는 국가 수도를 가리키며, 전선·영토 주장과는 다릅니다</span>','<span>나라를 누르면 상세 정보가 열립니다. 표식은 대표 위치이며 전선이나 영토 경계가 아닙니다.</span>',"legend");
body=replaceOnce(body,'<span class="map-legend"><i class="dot-key"></i>현장 <i class="dot-key country-key"></i>주목 국가</span>','<span class="map-legend"><i class="dot-key"></i>현장 <i class="dot-key country-key"></i>주목 국가</span>',"legend2");
body=replaceOnce(body,'· 국기 <a href="https://flagcdn.com/" target="_blank" rel="noopener noreferrer">FlagCDN</a> · 지도 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap 기여자</a>',
 '· 지도 경계 <a href="https://github.com/johan/world.geo.json" target="_blank" rel="noopener noreferrer">world.geo.json</a>(Natural Earth 기반, 퍼블릭 도메인)',"footer");
body=replaceOnce(body,'<div class="small" id="edition-time"></div>','<div class="small" id="edition-time"></div><span class="live-note" id="live-note"></span>',"live-note");

body=replaceOnce(body,'확인된 사실과 주장을 구분해 보여드립니다.</p>','확인된 사실과 주장을 구분해 보여드립니다.</p><a class="hero-guide" href="#guide" data-guide-open>처음이라면 · 판도 사용법 보기 →</a>',"hero-guide");
body=replaceOnce(body,'Global intelligence · Hourly review','Global intelligence · Daily brief',"eyebrow");
body=replaceOnce(body,'<div class="watch-list" id="watch-list" aria-live="polite"></div></section>','<div class="watch-list" id="watch-list" aria-live="polite"></div></section><section id="explain" aria-labelledby="explain-title"><div class="section-head"><div><div class="eyebrow">Explained / 판도 해설</div><h2 id="explain-title">해설</h2></div><p>무슨 자리였나, 무슨 말이 오갔나, 그 뒤의 맥락과 근거</p></div><div class="explain-list" id="explain-list"></div></section>',"explain-section");
body=replaceOnce(body,'<a href="#countries">국가 탐색</a>','<a href="#countries">국가 탐색</a><a href="#explain">해설</a>',"explain-nav");
// Brand: 판도 / PANDO
body=replaceOnce(body,'aria-label="전선 첫 화면"','aria-label="판도 첫 화면"',"brand-aria");
body=replaceOnce(body,'전선<small>THE FRONT / GLOBAL</small>','판도<small>PANDO · 세계의 판도를 읽다</small>',"brand-text");
body=replaceOnce(body,'<footer class="foot">전선 / THE FRONT','<footer class="foot">판도 / PANDO',"brand-foot");
body=replaceOnce(body,'<span>THE FRONT / DOSSIER</span>','<span>PANDO / DOSSIER</span>',"brand-drawer");
client=replaceOnce(client,'THE FRONT / MOBILE','PANDO / MOBILE',"brand-mobile");
client=client.split('휴대폰에 전선 설치').join('휴대폰에 판도 설치').split('홈 화면의 전선 아이콘').join('홈 화면의 판도 아이콘');
const css=read(SRC+"style.css")+"\n"+read(SRC+"refine.css")+"\n"+read(A+"artifact.css");
const html=`<title>판도 · 세계 브리핑</title>
<meta name="description" content="판도(PANDO) — 세계의 정치·경제·군사 판도와 분쟁을 출처와 기준 시점과 함께 읽는 한국어 국제 브리핑">
<style>
${css}
</style>
${body.trim()}
<script>
${read(A+"i18n.js")}
</script>
<script>
${read(A+"map.js")}
</script>
<script>
${read(A+"data.js")}
</script>
<script>
${client}
</script>
`;
// Public site page (GitHub Pages): full document with favicon and share metadata.
const FAV='<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%274%27 fill=%27%23d52832%27/%3E%3Cpath d=%27M0 18 L32 10%27 stroke=%27white%27 stroke-width=%272.4%27/%3E%3Cpath d=%27M11 0 L15 32%27 stroke=%27white%27 stroke-width=%272.4%27/%3E%3C/svg%3E">';
const head='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff">'+FAV+'<meta property="og:title" content="판도 · 세계 브리핑"><meta property="og:description" content="세계의 정치·경제·군사 판도와 분쟁을 한국어로 읽는 국제 브리핑">\n';
fs.writeFileSync(ROOT+"index.html",head+html+"</html>\n");
// Claude artifact version (body fragment; the artifact host adds the document shell).
fs.mkdirSync(HERE+"out",{recursive:true});fs.writeFileSync(HERE+"out/artifact.html",html);
console.log("index.html",(html.length/1024).toFixed(0)+"KB");
