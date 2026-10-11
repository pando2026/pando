/* Frontline data layer for the artifact.
   Replaces the old Worker API (/api/*) with files published next to the page,
   and takes the briefing and country situation summaries from the artifact's
   shared database when it has them (that is where scheduled updates write). */
(function(global){
 "use strict";
 const json=url=>fetch(url).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()});
 const memo={};const once=(key,make)=>memo[key]||(memo[key]=make().catch(e=>{delete memo[key];throw e}));
 const SHARDS=16;const shardOf=c=>(c.charCodeAt(0)*31+c.charCodeAt(1))%SHARDS;
 const shard=code=>once("s"+shardOf(code),()=>json("data/s"+String(shardOf(code)).padStart(2,"0")+".json"));
 const photoStore=()=>once("photos",()=>json("data/photos.json")).catch(()=>({}));
 const cpiStore=()=>once("cpi",()=>json("data/cpi.json")).catch(()=>null);
 const fightStore=()=>once("fights",()=>json("data/fights.json")).catch(()=>({}));
 const regionStore=()=>once("regions",()=>json("data/regions.json")).catch(()=>({}));
 const partyPhotoStore=()=>once("partyPhotos",()=>json("data/party-photos.json")).catch(()=>({}));
 const photoIndex=()=>once("photoIndex",()=>json("data/photo-index.json")).catch(()=>({}));
 const base=()=>once("base",()=>Promise.all([json("data/countries.json"),json("data/edition.json"),json("data/contexts.json"),json("data/changewatch.json"),
   json("data/flags.json").catch(()=>({})),json("data/civics.json").catch(()=>({})),json("data/ranks.json").catch(()=>({})),json("data/party-names.json").catch(()=>({})),json("data/party-profiles.json").catch(()=>({}))])
  .then(([countries,edition,contexts,changeWatch,flags,civics,ranks,partyNames,partyProfiles])=>{global.__FLAGS=flags;return {countries,edition,contexts,changeWatch,civics,ranks,partyNames,partyProfiles}}));

 let liveEdition=null,liveContexts=null;const listeners=new Set();
 const notify=()=>listeners.forEach(fn=>{try{fn()}catch(e){console.error(e)}});

 async function currentEdition(){const b=await base();return liveEdition||b.edition}
 async function contextFor(code){const b=await base();return (liveContexts&&liveContexts[code])||b.contexts[code]||null}

 // Same rules as the former server: the newest dated change per country.
 function editionWatch(edition,changeWatch,codes){
  const watch=new Map(changeWatch.map(item=>[item.code,{...item,sourceKind:"curated_snapshot",dateBasis:"editorial",dateLabel:"편집 확인일 "+item.date}]));
  for(const story of edition.stories||[]){
   const list=Array.isArray(story.watchCodes)?story.watchCodes:Array.isArray(story.countryCodes)?story.countryCodes.slice(0,1):[];
   const sourceDates=(story.sources||[]).map(s=>s?.[2]).filter(v=>/^20\d\d-\d\d-\d\d$/.test(v)).sort();
   const explicit=/^20\d\d-\d\d-\d\d$/.test(story.changeDate||"");
   const date=explicit?story.changeDate:sourceDates.at(-1)||edition.editionDate;
   const basis=explicit?"change":sourceDates.length?"source":"edition";
   const dateLabel=(basis==="change"?"변화일":basis==="source"?"자료 발행일":"판 반영일")+" "+date;
   for(const code of list){
    if(!codes.has(code))continue;
    const old=watch.get(code);if(old&&old.date>date)continue;
    watch.set(code,{code,topic:story.topic||"국제 변화",status:story.level||"보도",title:story.headline,detail:story.changed||story.summary,date,
     url:story.sources?.[0]?.[3]||"",sourceKind:"edition",storyId:story.id,eventDate:story.eventDate||null,dateBasis:basis,dateLabel});
   }
  }
  return [...watch.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.code.localeCompare(b.code));
 }

 const ok=data=>({ok:true,status:200,json:async()=>data});
 const fail=status=>({ok:false,status,json:async()=>({error:"unavailable"})});
 async function api(url){
  try{
   const u=new URL(url,"https://x.invalid"),path=u.pathname,code=(u.searchParams.get("code")||"").toUpperCase();
   const b=await base();const codes=new Set(b.countries.countries.map(c=>c.code));
   if(path==="/api/edition")return ok(await currentEdition());
   if(path==="/api/boards")return ok(await once("boards",()=>json("data/boards.json")).catch(()=>({})));
   if(path==="/api/blocs")return ok(await once("blocs",()=>json("data/blocs.json")).catch(()=>({})));
   if(path==="/api/civics")return ok((await base()).civics);
   if(path==="/api/explainers")return ok(await once("explainers",()=>json("data/explainers.json")).catch(()=>[]));
   if(path==="/api/countries"){
    const edition=await currentEdition();
    const all=editionWatch(edition,b.changeWatch,codes),latest=Date.parse(all[0]?.date||"1970-01-01");
    const diverse=all.filter(i=>/재정|통화|예산|선거|경제|정치|금리/i.test(i.topic||"")&&latest-Date.parse(i.date)<=14*86400000).slice(0,4);
    const top=[...diverse,...all.filter(i=>!diverse.some(k=>k.code===i.code))].slice(0,18);
    return ok({...b.countries,watch:top,watchEditionDate:edition.editionDate});
   }
   if(!codes.has(code))return fail(404);
   if(path==="/api/country"){
    const entry=(await shard(code))[code];if(!entry)return fail(404);
    const edition=await currentEdition();
    const kr=code==="KR"?null:(await shard("KR")).KR;
    const [pidx,pstore]=await Promise.all([partyPhotoStore(),photoStore()]);const pphotos={};for(const [cc,m] of Object.entries(pidx))pphotos[cc]=Object.fromEntries(Object.entries(m).map(([l,f])=>[l,pstore[f]]).filter(([,v])=>v));
    return ok({...entry.dossier,partyNames:b.partyNames[code]||null,partyProfiles:b.partyProfiles[code]||null,partyPhotos:pphotos[code]||null,civics:b.civics[code]||null,fights:(await fightStore())[code]||null,regions:(await regionStore())[code]||null,cpi:await (async()=>{const c=await cpiStore();if(!c)return null;const e=c.countries[code];return {edition:c.edition,published:c.published,total:c.total,source:c.source,wiki:c.wiki,entry:e||null,korea:code==="KR"?null:c.countries.KR||null}})(),koreaLatest:kr?kr.dossier.metrics:null,context:await contextFor(code),watch:editionWatch(edition,b.changeWatch,codes).filter(i=>i.code===code)});
   }
   if(path==="/api/leaders"){
    const entry=(await shard(code))[code];if(!entry)return fail(404);
    // Portraits ship with the page (the artifact frame cannot load Wikimedia directly).
    const leaders=entry.leaders;
    const [photos,index,autocrats]=await Promise.all([photoStore(),photoIndex(),once("autocrats",()=>json("data/autocrats.json")).catch(()=>({}))]);
    return ok({...leaders,people:(leaders.people||[]).map(p=>{
     const f=index[code+":"+p.id],ph=f&&photos[f];
     return {...p,regime:autocrats[code+":"+p.id]||null,photo:ph?{url:ph.d,source:ph.source,license:ph.license,licenseUrl:ph.licenseUrl,credit:ph.credit}:null};
    })});
   }
   if(path==="/api/rank"){
    // Ranks precomputed from the bundled observations (latest year and the year before).
    const key=u.searchParams.get("key")||"",table=b.ranks[key];
    const pos=table?.pos?.[code];
    if(!pos)return ok({rank:null,reason:"No comparable observation"});
    const years=table.years||[];
    return ok({rank:{position:pos,total:table.total,year:years.length>1?years[0]+"–"+years.at(-1):String(years[0]||""),provider:"WDI"},korea:{position:table.pos.KR||null}});
   }
   return fail(404);
  }catch(e){return fail(503)}
 }

 // Live layer: the shared database. Signed-out or public viewers keep the bundled snapshot.
 (async()=>{
  try{
   if(!global.claude?.use)return;
   const db=await global.claude.use("db");if(!db)return;
   const note=document.getElementById("live-note");if(note)note.textContent="새 판이 올라오면 이 화면이 자동으로 바뀝니다.";
   db.doc("briefing/current").onSnapshot(snap=>{
    const body=snap.exists?snap.data():null;
    const ed=body&&body.edition&&Array.isArray(body.edition.stories)&&body.edition.stories.length?body.edition:null;
    if(ed!==liveEdition){liveEdition=ed;notify()}
   },()=>{});
   db.collection("contexts").onSnapshot(q=>{
    const map={};q.docs.forEach(d=>{const v=d.data();if(v&&v.summary)map[d.id]=v});
    liveContexts=Object.keys(map).length?map:null;notify();
   },()=>{});
  }catch(e){/* keep the bundled snapshot */}
 })();

 global.FrontlineData={api,onChange:fn=>listeners.add(fn)};
})(window);
