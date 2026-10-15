"""One-off: convert data/world.json and data/occupied.json from Natural Earth I to Mercator
(same lon0), clipped to 82°N–56°S (Antarctica dropped). Also rewrites data/anchors.json.
Usage: python3 _tools/to_mercator.py"""
import json,re,math
NOTE=None
w=json.load(open('data/world.json'))
assert w.get('proj')!='merc','already Mercator'
W,K0,TOP0=w['w'],w['k'],w['top']
def fx(p):p2=p*p;p4=p2*p2;return 0.8707-0.131979*p2+p4*(-0.013791+p4*(0.003971*p2-0.001529*p4))
def fy(p):p2=p*p;p4=p2*p2;return p*(1.007226+p2*(0.015085+p4*(-0.044475+0.028874*p2-0.005916*p4)))
def inv(X,Y):
    x=(X-W/2)/K0; y=TOP0-Y/K0; p=max(-1.5,min(1.5,y))
    for _ in range(30):
        h=1e-7; f=fy(p)-y; d=(fy(p+h)-fy(p-h))/(2*h); p-=f/d
    return x/fx(p),p  # radians, longitude relative to lon0
N,S=math.radians(82),math.radians(-56)
my=lambda p:math.log(math.tan(math.pi/4+max(S,min(N,p))/2))
K=W/(2*math.pi); TOP=my(N); H=(TOP-my(S))*K
def conv_d(d):
    out=[]
    for sub in re.findall(r'M[^M]+',d):
        pts=[tuple(map(float,xy)) for xy in re.findall(r'(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)',sub)]
        ll=[inv(x,y) for x,y in pts]
        if not ll or max(p for _,p in ll)<S: continue
        q=[(W/2+l*K,(TOP-my(p))*K) for l,p in ll]
        out.append('M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in q)+'Z')
    return ''.join(out)
def area(r):return sum(r[i][0]*r[(i+1)%len(r)][1]-r[(i+1)%len(r)][0]*r[i][1] for i in range(len(r)))/2
cs=[];anchors={}
for c in w['countries']:
    d=conv_d(c['d'])
    if not d: continue
    c=dict(c);c['d']=d;cs.append(c)
    if c.get('c'):
        rs=[[tuple(map(float,xy.split(','))) for xy in re.findall(r'-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?',s)] for s in re.findall(r'M[^M]+',d)]
        big=max(rs,key=lambda r:abs(area(r)));A=area(big)
        if abs(A)>1e-6:
            cx=sum((big[i][0]+big[(i+1)%len(big)][0])*(big[i][0]*big[(i+1)%len(big)][1]-big[(i+1)%len(big)][0]*big[i][1]) for i in range(len(big)))/(6*A)
            cy=sum((big[i][1]+big[(i+1)%len(big)][1])*(big[i][0]*big[(i+1)%len(big)][1]-big[(i+1)%len(big)][0]*big[i][1]) for i in range(len(big)))/(6*A)
            anchors[c['c']]=[round(cx,1),round(cy,1)]
w.update(countries=cs,k=K,top=TOP,h=round(H),proj='merc')
json.dump(w,open('data/world.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(anchors,open('data/anchors.json','w'),separators=(',',':'))
o=json.load(open('data/occupied.json'))
for it in o['items']:
    if it.get('d'):it['d']=conv_d(it['d'])
json.dump(o,open('data/occupied.json','w'),ensure_ascii=False,separators=(',',':'))
print('countries',len(cs),'h',round(H))
