"""Build data/occupied.json: occupied / armed-group-controlled areas as pre-projected SVG paths
(same Mercator projection and lon0 as data/world.json).
Usage: python3 _tools/occupied/build.py NE_ADMIN1.geojson DEEPSTATE.geojson _tools/occupied/items.json
(items.json = the researched list without geometry; Ukraine comes from the DeepState file, its date is read from the file name)"""
import json,math,sys,os
ne_path,ds_path,items_path=sys.argv[1:4]
world=json.load(open('data/world.json'));W,K,TOP,LON0=world['w'],world['k'],world['top'],world.get('lon0',0)
def fy(p):p=max(math.radians(-56),min(math.radians(82),p));return math.log(math.tan(math.pi/4+p/2))
def fx(p):return 1.0
def fwd(lon,lat):
  lon=((lon-LON0)%360+540)%360-180;l=math.radians(lon);p=math.radians(lat);return (W/2+l*fx(p)*K,(TOP-fy(p))*K)
def dp(pts,tol):
  if len(pts)<3: return pts
  a,b=pts[0],pts[-1];dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy);best,bi=0,0
  for i in range(1,len(pts)-1):
    p=pts[i];d=abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L if L else math.hypot(p[0]-a[0],p[1]-a[1])
    if d>best:best,bi=d,i
  return dp(pts[:bi+1],tol)[:-1]+dp(pts[bi:],tol) if best>tol else [a,b]
def ring_path(r,tol=0.02):
  h=len(r)//2;s=dp(r[:h+1],tol)[:-1]+dp(r[h:],tol)
  pts=[fwd(x,y) for x,y,*_ in s];out=[]
  for x,y in pts:
    q=(round(x,1),round(y,1))
    if not out or out[-1]!=q: out.append(q)
  return "M"+"L".join(f"{x},{y}" for x,y in out)+"Z" if len(out)>=3 else ""
def polys(g): return g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
def geom_path(g,tol=0.02): return "".join(ring_path(r,tol) for pl in polys(g) for r in pl[:1])
def centroid(g):
  best=max((pl[0] for pl in polys(g)),key=lambda r:abs(sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r)))))
  return sum(p[0] for p in best)/len(best),sum(p[1] for p in best)/len(best)
ne=json.load(open(ne_path))
idx={(f['properties']['iso_a2'],f['properties']['name']):f['geometry'] for f in ne['features']}
GOLAN={"type":"Polygon","coordinates":[[[35.63,33.25],[35.82,33.33],[35.85,33.2],[35.94,32.96],[35.86,32.71],[35.63,32.69],[35.6,32.85],[35.65,33.05],[35.63,33.25]]]}
items=json.load(open(items_path));out=[]
ds=json.load(open(ds_path))['features'][0]['geometry']
import re as _re
_m=_re.search(r'(\d{4})(\d{2})(\d{2})',ds_path);DSDATE=f'{_m.group(1)}-{_m.group(2)}-{_m.group(3)}' if _m else '2026-10-11'
out.append({"id":"ua-russia","name":"우크라이나 동·남부(크림반도 포함)","owner":"UA","holder":"러시아","holderCode":"RU","holderType":"state","kind":"점령","extent":"full","since":"2014",
 "note":"러시아는 2014년 크림반도를, 2022년 침공 뒤 도네츠크·루한스크·자포리자·헤르손 일부를 점령하고 자국 영토로 합병했다고 선언했다. 우크라이나는 불법 점령으로 보고 전 영토 회복을 요구한다. 유엔 총회는 2022년 10월 이 합병 시도를 143개국 찬성으로 무효라고 결의했다(러시아 반대). 지도 경계는 우크라이나 민간 분석단 DeepStateMap의 "+DSDATE+" 점령지 자료다.",
 "sources":[["DeepStateMap (via cyterat/deepstate-map-data)",os.path.basename(ds_path)+" (점령지 경계 자료) · "+DSDATE,"https://github.com/cyterat/deepstate-map-data"],["UN General Assembly","Territorial integrity of Ukraine: defending the principles of the Charter of the United Nations (우크라이나 영토 보전 결의, GA/12458) · 2022-10-12","https://press.un.org/en/2022/ga12458.doc.htm"]],
 "d":geom_path(ds,0.015),"lonlat":[36.5,47.6]})
for it in items:
  gs=[]
  if it['id']=='sy-golan': gs=[GOLAN];it['note']=it.get('note','')+" 지도의 골란 경계는 대략적이다."
  else:
    for cc,nm in it['units']:
      g=idx.get((cc,nm))
      if g: gs.append(g)
      else: print('missing',it['id'],cc,nm)
  if not gs: continue
  d="".join(geom_path(g) for g in gs)
  cx=[centroid(g) for g in gs];lon=sum(c[0] for c in cx)/len(cx);lat=sum(c[1] for c in cx)/len(cx)
  o={k:v for k,v in it.items() if k not in('units','unitNote','country')};o['d']=d;o['lonlat']=[round(lon,2),round(lat,2)]
  out.append(o)
json.dump({"asOf":"2026-10-12","items":out},open('data/occupied.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(out),'items',sum(len(o['d']) for o in out),'bytes of path')
