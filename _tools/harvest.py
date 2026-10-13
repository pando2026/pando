"""Render every page of the site headlessly and collect every Korean text string shown,
so the English dictionary (data/en/strings.json) can be completed. Usage:
  python3 _tools/harvest.py [port] [out.json] [--countries KR,US]   (serve the repo root on the port first)
Writes {template: count} where digits are replaced by {0},{1},..."""
import asyncio,json,re,sys
from playwright.async_api import async_playwright
PORT=sys.argv[1] if len(sys.argv)>1 else "8902"
OUT=sys.argv[2] if len(sys.argv)>2 else "/tmp/harvest.json"
ONLY=None
if "--countries" in sys.argv: ONLY=sys.argv[sys.argv.index("--countries")+1].split(",")
HANGUL=re.compile(r"[가-힣]")
JS=r"""()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('script,style'))continue;const t=n.nodeValue.trim();if(t&&/[가-힣]/.test(t))out.push(t)}
for(const el of document.querySelectorAll('[title],[aria-label],[placeholder],[alt]'))for(const a of ['title','aria-label','placeholder','alt']){const v=el.getAttribute(a);if(v&&/[가-힣]/.test(v))out.push(v.trim())}
return out}"""
def template(s):
    i=[0]
    def rep(m):
        k="{%d}"%i[0];i[0]+=1;return k
    return re.sub(r"\d[\d,.]*\d|\d",rep,s)
async def main():
    found={}
    def add(lst):
        for s in lst:
            t=template(s);found[t]=found.get(t,0)+1
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={"width":1200,"height":900})
        await pg.goto(f"http://localhost:{PORT}/");await pg.wait_for_timeout(2500)
        for sel in ["#watch-more","[data-watch-more]",".watch-more","#country-toggle"]:
            try: await pg.click(sel,timeout=500)
            except: pass
        add(await pg.evaluate(JS))
        try:
            await pg.click("#guide-open");await pg.wait_for_timeout(400);add(await pg.evaluate(JS))
        except: pass
        ex=await pg.evaluate("Array.from(document.querySelectorAll('[data-explain]')).map(b=>b.dataset.explain)")
        for e in set(ex):
            await pg.goto(f"http://localhost:{PORT}/?r={e}#explain={e}");await pg.wait_for_timeout(5000)
            await pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)");await pg.wait_for_timeout(500);add(await pg.evaluate(JS))
        codes=ONLY or json.load(open("data/countries.json"))["countries"]
        codes=[c if isinstance(c,str) else c["code"] for c in codes]
        for i,cc in enumerate(codes):
            try:
                await pg.goto(f"http://localhost:{PORT}/?country={cc}");await pg.wait_for_timeout(1600)
                await pg.evaluate("document.querySelectorAll('#detail .is-folded').forEach(s=>s.classList.remove('is-folded'))")
                tabs=await pg.query_selector_all("#detail .country-tabs [role=tab]")
                for t in tabs or [None]:
                    if t: await t.click();await pg.wait_for_timeout(250)
                    for m in await pg.query_selector_all("#detail [data-more]"):
                        try: await m.click(timeout=300)
                        except: pass
                    add(await pg.evaluate(JS))
                items=await pg.query_selector_all(".seat-legend li[data-party]")
                if tabs: await tabs[0].click();await pg.wait_for_timeout(200)
                for li in await pg.query_selector_all(".seat-legend li[data-party]"):
                    try:
                        await li.click(timeout=500);await pg.wait_for_timeout(60)
                        add(await pg.evaluate("()=>Array.from(document.querySelectorAll('.party-detail:not([hidden])')).flatMap(d=>{const o=[];const w=document.createTreeWalker(d,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.nodeValue.trim();if(t&&/[\\uac00-\\ud7a3]/.test(t))o.push(t)}return o})"))
                    except: pass
            except Exception as e: print("err",cc,e)
            if i%25==0: print(i,cc,len(found),flush=True); json.dump(found,open(OUT,"w"),ensure_ascii=False)
        await b.close()
    json.dump(found,open(OUT,"w"),ensure_ascii=False)
    print("done",len(found))
asyncio.run(main())
