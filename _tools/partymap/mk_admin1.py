"""Build data/admin1/<CC>.json from Natural Earth admin-1 (simplified, rounded).
Usage: python3 _tools/partymap/mk_admin1.py NE_ADMIN1.geojson CC '{"extra":[["RU","Crimea"]],"rename":{"NE name":["n","ko","l"]}}'"""
import json,sys
ne=json.load(open(sys.argv[1]));cc=sys.argv[2];opt=json.loads(sys.argv[3]) if len(sys.argv)>3 else {}
def dp(pts,tol):
  if len(pts)<3: return pts
  a,b=pts[0],pts[-1];dx,dy=b[0]-a[0],b[1]-a[1];L=(dx*dx+dy*dy)**.5;best,bi=0,0
  for i in range(1,len(pts)-1):
    p=pts[i];d=abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L if L else ((p[0]-a[0])**2+(p[1]-a[1])**2)**.5
    if d>best:best,bi=d,i
  return dp(pts[:bi+1],tol)[:-1]+dp(pts[bi:],tol) if best>tol else [a,b]
def ring(r,tol):
  h=len(r)//2;s=dp(r[:h+1],tol)[:-1]+dp(r[h:],tol);out=[]
  for p in s:
    q=[round(p[0],2),round(p[1],2)]
    if not out or out[-1]!=q: out.append(q)
  return out
def area(r): return abs(sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r))))/2
tol=opt.get('tol',0.012);extra={tuple(x) for x in opt.get('extra',[])};ren=opt.get('rename',{})
units=[]
for f in ne['features']:
  p=f['properties']
  if p['iso_a2']!=cc and (p['iso_a2'],p['name']) not in extra: continue
  g=f['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
  rs=[r for r in (ring(pl[0],tol) for pl in polys) if len(r)>=4 and area(r)>0.004] or [ring(max((pl[0] for pl in polys),key=area),tol)]
  n,ko,l=ren.get(p['name'],[p.get('name_en') or p['name'],p.get('name_ko') or '',None])
  units.append({'n':n,'ko':ko,'g':'','l':l or p.get(opt.get('local','name_local')) or n,'r':rs})
json.dump({'units':units},open(f'data/admin1/{cc}.json','w'),ensure_ascii=False,separators=(',',':'))
print(cc,len(units),[u['n'] for u in units])
