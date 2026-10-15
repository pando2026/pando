# 주·도별 소득 수준 조사

판도 국가 화면의 주·도 지도에 '소득 수준' 토글을 켜면 지역별 1인당 소득을 색 농도로 보여준다. 오늘은 2026-10-12. 지어내기 금지.

입력 `in-<n>.json`: {국가코드: {"level":"unit"|"group","names":[지도 지역 이름 — 이 철자 그대로]}}
출력 `out/income-<n>.json`:
```json
{"US":{"metric":"1인당 개인소득","unit":"달러","year":"2024","provider":"미 상무부 경제분석국(BEA)",
  "source":["BEA","Personal Income by State, 2024 · 2025-03-28","https://www.bea.gov/..."],
  "values":{"California":85518,"Mississippi":52017},
  "note":"(선택) 한 문장: 가장 높은 곳과 낮은 곳의 격차 등"}}
```
규칙
- 지표 우선순위: ① 그 나라 통계청·중앙은행의 **지역별 1인당 GDP(GRDP·GSDP)** 또는 1인당 소득 ② OECD 지역통계(TL2) 1인당 GDP ③ 영어 위키백과 "List of <country> states/provinces/regions by GDP per capita" 표(그 표의 원출처를 provider에). 한 나라 안에서는 **한 출처·한 연도·한 단위**로 통일.
- `values` 키는 입력 `names` 철자 그대로. 매칭이 안 되는 지역은 빼라(빈칸이 생겨도 된다). 가능한 한 전부 채운다.
- 숫자는 원표 그대로(단위는 `unit`에: "달러", "유로", "루피", "천 위안", "국제달러(PPP)" 등). 반올림 정도는 상관없다.
- 출처: WebFetch로 직접 연다. **검색은 끝까지**(CLAUDE.md 18번: 막히면 다른 출처·언어·경로를 모두 시도한 뒤에만 '자료 없음'). 429면 1분 쉬고 재시도.
끝나면 JSON 문법 확인 후 나라별 채운 지역 수/전체 수만 짧게 보고.
