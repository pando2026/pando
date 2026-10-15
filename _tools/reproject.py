"""Re-centre data/world.json (pre-projected Mercator paths) on a new central meridian.
Usage: python3 _tools/reproject.py ORIG_WORLD.json LON0  -> writes data/world.json and data/anchors.json"""
import json,re,math,sys
src=json.load(open(sys.argv[1])); LON0=float(sys.argv[2])
W,K,TOP=src['w'],src['k'],src['top']
def fy(p):p=max(math.radians(-56),min(math.radians(82),p));return math.log(math.tan(math.pi/4+p/2))
def fx(p):return 1.0
def inv(X,Y):
    x=(X-W/2)/K; y=TOP-Y/K
    p=y
    for _ in range(25):
        h=1e-6; f=fy(p)-y; d=(fy(p+h)-fy(p-h))/(2*h); p-=f/d
    l=x/fx(p); return math.degrees(l),math.degrees(p)
def fwd(lon,lat):
    l=math.radians(lon);p=math.radians(lat);return (W/2+l*fx(p)*K,(TOP-fy(p))*K)
def rings(d):
    out=[]
    for sub in re.findall(r'M[^M]+',d):
        pts=[tuple(map(float,xy.split(','))) for xy in re.findall(r'-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?',sub)]
        if len(pts)>=3: out.append(pts)
    return out
def shift(lon):
    v=(lon-LON0+540)%360-180; return v
def clip(poly,keep_left,X):
    # Sutherland-Hodgman against vertical line lon=X
    res=[]
    n=len(poly)
    for i in range(n):
        A=poly[i];B=poly[(i+1)%n]
        inA=(A[0]<=X) if keep_left else (A[0]>=X); inB=(B[0]<=X) if keep_left else (B[0]>=X)
        if inA: res.append(A)
        if inA!=inB:
            t=(X-A[0])/(B[0]-A[0]); res.append((X,A[1]+t*(B[1]-A[1])))
    return res
def area(poly):
    return abs(sum(poly[i][0]*poly[(i+1)%len(poly)][1]-poly[(i+1)%len(poly)][0]*poly[i][1] for i in range(len(poly))))/2
countries=[];anchors={}
for c in src['countries']:
    pieces=[]
    for r in rings(c['d']):
        ll=[inv(x,y) for x,y in r]
        s=[(shift(lo),la) for lo,la in ll]
        # unwrap
        u=[s[0]]
        for lo,la in s[1:]:
            prev=u[-1][0]
            while lo-prev>180: lo-=360
            while lo-prev<-180: lo+=360
            u.append((lo,la))
        lo_min=min(p[0] for p in u);lo_max=max(p[0] for p in u)
        if lo_max-lo_min>350: continue  # full-wrap ring (none expected in this extent)
        if lo_min>=-180 and lo_max<=180: pieces.append(u);continue
        # crosses the seam: split into the part inside [-180,180] and the wrapped part
        if lo_max>180:
            a=clip(u,True,180);b=[(lo-360,la) for lo,la in clip(u,False,180)]
        else:
            a=clip(u,False,-180);b=[(lo+360,la) for lo,la in clip(u,True,-180)]
        for q in (a,b):
            if len(q)>=3: pieces.append(q)
    proj=[[fwd(lo,la) for lo,la in q] for q in pieces]
    d=''.join('M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in q)+'Z' for q in proj if len(q)>=3)
    cc=dict(c);cc['d']=d;countries.append(cc)
    if c.get('c') and proj:
        big=max(proj,key=area)
        # polygon centroid
        A=0;cx=0;cy=0
        for i in range(len(big)):
            x0,y0=big[i];x1,y1=big[(i+1)%len(big)];cr=x0*y1-x1*y0;A+=cr;cx+=(x0+x1)*cr;cy+=(y0+y1)*cr
        if abs(A)>1e-6: anchors[c['c']]=[round(cx/(3*A),1),round(cy/(3*A),1)]
        else: anchors[c['c']]=[round(big[0][0],1),round(big[0][1],1)]
out=dict(src);out['countries']=countries;out['lon0']=LON0
json.dump(out,open('data/world.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(anchors,open('data/anchors.json','w'),separators=(',',':'))
print('countries',len(countries),'anchors',len(anchors))
