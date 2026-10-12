# 분기 점검: 지표·연례 자료 다시 받기

## 1. 국가 지표 시계열 (data/s00~s15.json → 각 나라 dossier.metrics[key].series)
series 항목 형식: {"year":"2025","value":숫자,"source":"원문 URL","provider":"세계은행 WDI"}. 새 연도만 덧붙이고, value·year(최신)도 함께 고친다.

| key | 세계은행 지표 | 비고 |
|---|---|---|
| gdp | NY.GDP.MKTP.CD | |
| gdpPc | NY.GDP.PCAP.CD | |
| growth | NY.GDP.MKTP.KD.ZG | |
| inflation | FP.CPI.TOTL.ZG | 없으면 IMF WEO PCPIPCH |
| debt | GC.DOD.TOTL.GD.ZS | |
| governmentRevenue | GC.REV.XGRT.GD.ZS | |
| governmentExpenditure | GC.XPN.TOTL.GD.ZS | |
| cashBalance | GC.NLD.TOTL.GD.ZS | |
| unemployment | SL.UEM.TOTL.ZS | 없으면 IMF WEO LUR |
| militaryUsd | MS.MIL.XPND.CD | SIPRI 원자료 |
| militaryPct | MS.MIL.XPND.GD.ZS | |
| militaryGovPct | MS.MIL.XPND.ZS | |
| militaryPersonnel | MS.MIL.TOTL.P1 | |
| militaryLaborPct | MS.MIL.TOTL.TF.ZS | |
| armsImports | MS.MIL.MPRT.KD | SIPRI TIV |
| armsExports | MS.MIL.XPRT.KD | SIPRI TIV |
| policyRate | BIS CBPOL | data.bis.org |

받는 법: 클라우드 셸은 api.worldbank.org에 못 닿는다. 사용자 컴퓨터가 연결돼 있으면 Claude 데스크톱 앱 내장 브라우저(mcp__remote-devices__Claude_Browser__*)에서 `https://api.worldbank.org/v2/country/all/indicator/<지표>?format=json&date=2022:2026&per_page=20000`를 연 뒤 javascript로 fetch(결과는 window 변수에 담고 45초 안에 끝나게 나눠서) 해 JSON으로 받아 병합한다. 연결이 없으면 WebSearch로 세계은행 지표 페이지를 찾아 WebFetch로 주요국만 확인하거나, 이번 분기는 건너뛰고 보고한다.

## 2. 부패인식지수 (data/cpi.json) — 매년 2월 국제투명성기구 발표 후. edition·published·countries[CC]{score,rank,history}.
## 3. 주·도별 소득 (data/regional-income.json) — 나라별 통계청 새 연도가 나왔는지 확인(지침 `_tools/income/BRIEF.md`). 연도가 바뀌면 fxRate(그 해 연평균 환율, 세계은행 PA.NUS.FCRF)도 같이.
## 4. 환율 (data/fx.json) — 월간 점검과 같음.
지어내기 금지: 연 페이지에서 확인한 숫자만.
