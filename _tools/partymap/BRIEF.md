# 정당별 지지 지역(주·도) 조사

판도 국가 화면에서 정당을 누르면, 그 나라 지도에 **그 정당이 강한 주·도(1급 행정구역)**를 칠해 보여준다. 오늘은 2026-10-12. `/home/claude/pando/CLAUDE.md` 취재 원칙을 따른다(지어내기 금지).

입력 `in-<n>.json`: {국가코드: {"level":"unit"|"group", "names":[지도에 쓸 지역 이름 — 반드시 이 철자 그대로], "parties":[사이트 정당 이름(한국어) — 이 철자 그대로]}}
- level이 "group"이면 names는 묶음 지역(예: 영국 England/Scotland/Wales/Northern Ireland, 프랑스·이탈리아·스페인·필리핀 광역 지역).

출력 `out/partymap-<n>.json`:
```json
{"CA":{"basis":"2025년 4월 연방 총선 주별 결과","source":["Wikipedia","2025 Canadian federal election","https://en.wikipedia.org/wiki/2025_Canadian_federal_election"],
 "parties":{
  "블록 케베쿠아":{"regions":["Quebec"],"note":"퀘벡에서만 후보를 내며 퀘벡 의석 22석"},
  "보수당":{"regions":["Alberta","Saskatchewan","Manitoba"],"note":"세 주에서 의석 과반"},
  "자유당":{"regions":["Ontario","Quebec","Nova Scotia","New Brunswick","Prince Edward Island","Newfoundland and Labrador"],"note":"동부·대서양 주에서 1위"}}}}
```
규칙
- 가장 최근 전국 선거(하원·총선)의 **주·도별 결과**(지역별 1위 정당, 또는 득표율·의석이 뚜렷이 높은 곳)를 기준으로. `basis`에 어떤 선거·기준인지 쓴다.
- `regions`의 이름은 입력 `names`에 있는 철자 그대로만(맞는 게 없으면 빼라). 정당 키는 입력 `parties` 철자 그대로.
- 정당마다 '강한 곳'만 (1위를 하거나 의석·득표가 전국 평균보다 뚜렷이 높은 곳). 어디서나 비슷하면 그 정당은 빼라. 주요 정당 2~6개 + 지역 정당 전부.
- `note`는 한 문장(숫자가 있으면 좋다).
- 출처: 영어 위키백과 선거 문서(주별 결과 표·지도 설명)를 WebFetch로 직접 연다. **WebSearch 금지.** 429면 1분 쉬고 재시도. 확인 못 하면 빼라.
끝나면 JSON 문법 확인 후 나라별 정당 수만 짧게 보고.
