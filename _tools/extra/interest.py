"""세계은행 WDI 이자 지출 지표 2개(GC.XPN.INTP.ZS 총지출 대비, GC.XPN.INTP.RV.ZS 세입 대비)를 data/interest.json으로 만든다.
사용: 저장소 루트에서 python3 _tools/extra/interest.py <zip 압축을 푼 폴더/>
zip 받는 곳: https://api.worldbank.org/v2/en/indicator/GC.XPN.INTP.ZS?downloadformat=csv , ...GC.XPN.INTP.RV.ZS?downloadformat=csv
(클라우드 셸은 세계은행에 못 닿는다. 사용자 노트북 다운로드 폴더로 받게 한 뒤 device_stage_files로 가져온다.)
asOf는 실행일로 바꿔 쓴다."""
import json,glob,csv,sys
W=sys.argv[1]
import re
m={}
for f in glob.glob('data/s*.json'):
    for k,v in json.load(open(f)).items():
        x=re.findall(r'@WEO/([A-Z]{3})',json.dumps(v))
        if x:m[x[0]]=k
m.update(dict(ASM='AS',BMU='BM',CUB='CU',CUW='CW',CYM='KY',FRO='FO',GIB='GI',GRL='GL',GUM='GU',IMN='IM',MAF='MF',MCO='MC',MNP='MP',NCL='NC',PRK='KP',PSE='PS',PYF='PF',SXM='SX',TCA='TC',VGB='VG',VIR='VI',XKX='XK'))
def load(pat):
    f=glob.glob(W+pat)[0];lines=open(f,encoding='utf-8-sig').read().splitlines()
    upd=[l for l in lines[:4] if 'Last Updated' in l][0].split('","')[1].strip('",')
    rows=list(csv.reader(lines[4:]));hdr=rows[0];out={}
    meta=list(csv.DictReader(open(glob.glob(W+'Metadata_Country_'+pat)[0],encoding='utf-8-sig')))
    real={r['Country Code'] for r in meta if r['Region']}
    for r in rows[1:]:
        if len(r)<5 or r[1] not in real or r[1] not in m:continue
        h={hdr[i]:round(float(r[i]),2) for i in range(4,min(len(r),len(hdr))) if hdr[i].isdigit() and int(hdr[i])>=2000 and r[i].strip()}
        if h:out[m[r[1]]]=h
    return out,upd
exp,u1=load('API_GC.XPN.INTP.ZS_DS2*.csv');rev,u2=load('API_GC.XPN.INTP.RV.ZS_DS2*.csv')
C={}
for cc in set(exp)|set(rev):
    e=exp.get(cc,{});r=rev.get(cc,{});o={}
    if e:y=max(e);o['exp']={'year':y,'value':e[y]};o['expH']=e
    if r:y=max(r);o['rev']={'year':y,'value':r[y]};o['revH']=r
    C[cc]=o
tot={}
for key in ('exp','rev'):
    L=sorted([(v[key]['value'],cc) for cc,v in C.items() if key in v and int(v[key]['year'])>=2019],reverse=True)
    for i,(val,cc) in enumerate(L):C[cc][key]['rank']=i+1
    tot[key]=len(L)
out={"meta":{"updated":u1,"provider":"세계은행 WDI","source":{"exp":"https://data.worldbank.org/indicator/GC.XPN.INTP.ZS","rev":"https://data.worldbank.org/indicator/GC.XPN.INTP.RV.ZS"},"total":tot,"asOf":__import__("datetime").date.today().isoformat()},"countries":dict(sorted(C.items()))}
json.dump(out,open('data/interest.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(C),tot,u1,u2)
for cc in ['KR','JP','US','DE','FR','CN','EG','PK','LB','NG','IT','GB','IN','TR','AR']:
    print(cc,C.get(cc,{}).get('exp'),C.get(cc,{}).get('rev'))
