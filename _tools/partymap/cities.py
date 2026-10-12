"""Attach major cities (Natural Earth populated places) to data/admin1/<CC>.json units as `c`:
[[ko, en, lon, lat, pop, kind]] kind 2=national capital, 1=state/province capital, 0=other. Up to 3 per unit.
Cities are placed with full-resolution Natural Earth admin-1 polygons, then mapped to the site's (simplified) units.
Usage: python3 _tools/partymap/cities.py ne_10m_populated_places.geojson ne_10m_admin_1_states_provinces.geojson"""
import json,glob,os,sys
pp=json.load(open(sys.argv[1]))['features'];ne=json.load(open(sys.argv[2]))['features']
def pip(x,y,r):
  c=False;j=len(r)-1
  for i in range(len(r)):
    xi,yi=r[i][:2];xj,yj=r[j][:2]
    if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi+1e-15)+xi: c=not c
    j=i
  return c
def polys(g): return g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
def inside(x,y,g): return any(pip(x,y,pl[0]) and not any(pip(x,y,h) for h in pl[1:]) for pl in polys(g))
def cen(r): return sum(p[0] for p in r)/len(r),sum(p[1] for p in r)/len(r)
def area(r): return abs(sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r))))
for fn in sorted(glob.glob('data/admin1/*.json')):
  cc=os.path.basename(fn)[:2];d=json.load(open(fn));units=[u for u in d['units'] if u.get('n')]
  feats=[f for f in ne if f['properties']['iso_a2']==cc or (cc=='CY' and f['properties']['iso_a2']=='-1')]
  fix=lambda x:x+360 if cc=='RU' and x<0 else x
  def unit_of_point(x,y):
    for u in units:
      if any(pip(fix(x),y,[[fix(a),b] for a,b in r]) for r in u['r']): return u
    best=None;bd=1e9
    for u in units:
      for r in u['r']:
        cx,cy=cen([[fix(a),b] for a,b in r]);dd=(cx-fix(x))**2+(cy-y)**2
        if dd<bd:bd,best=dd,u
    return best
  # NE feature -> site unit: by name, else by the NE feature's largest-ring centroid
  names={}
  for u in units: names[u['n']]=u
  fmap={}
  for i,f in enumerate(feats):
    p=f['properties'];u=names.get(p.get('name_en')) or names.get(p.get('name'))
    if not u:
      big=max((pl[0] for pl in polys(f['geometry'])),key=area);u=unit_of_point(*cen(big))
    fmap[i]=u
  per={}
  for c in pp:
    p=c['properties']
    if p['ISO_A2']!=cc: continue
    x,y=p['LONGITUDE'],p['LATITUDE'];u=None
    for i,f in enumerate(feats):
      if inside(x,y,f['geometry']): u=fmap[i];break
    if not u: u=unit_of_point(x,y)
    if u: per.setdefault(u['n'],[]).append(p)
  kind=lambda p:2 if p['ADM0CAP']==1 else 1 if p['FEATURECLA']=='Admin-1 capital' else 0
  n=0
  for u in units:
    L=sorted(per.get(u['n'],[]),key=lambda p:(-kind(p),-(p['POP_MAX'] or 0)))
    top=L[:1]+sorted(L[1:],key=lambda p:-(p['POP_MAX'] or 0))[:2]
    if top: u['c']=[[p.get('NAME_KO') or p['NAME'],p.get('NAME_EN') or p['NAME'],round(p['LONGITUDE'],2),round(p['LATITUDE'],2),int(p['POP_MAX'] or 0),kind(p)] for p in top];n+=1
    else: u.pop('c',None)
  json.dump(d,open(fn,'w'),ensure_ascii=False,separators=(',',':'))
  print(cc,n,'/',len(units))
