# 국제기구·블록 회원국과 가입일 조사

판도 사이트에서 지도 토글(예: "NATO 보기")로 회원국을 칠하고, 국가 정보 화면에 "가입한 기구 · 가입일"을 보여준다. 오늘은 2026-10-11.

출력 `out/blocs-<n>.json`:
```json
{"NATO":{"ko":"북대서양조약기구","short":"NATO","kind":"군사동맹","founded":"1949-04-04",
  "about":"한 문장: 무엇을 하는 기구인지",
  "source":"https://www.nato.int/cps/en/natohq/topics_52044.htm",
  "members":{"US":"1949-08-24","FI":"2023-04-04","SE":"2024-03-07"},
  "partners":{"UA":{"since":"","label":"파트너"}},
  "notes":"(선택) 정지·탈퇴 등"}}
```
- 회원국 키는 ISO 3166-1 alpha-2. 가입일은 YYYY-MM-DD(알 수 없으면 YYYY 또는 YYYY-MM). 창립 회원국은 창립(발효)일.
- **공식 홈페이지의 회원국 목록**을 1순위로 쓰고(예: nato.int, european-union.europa.eu, asean.org, opec.org, sectsco.org, au.int, gcc-sg.org), 가입일이 없으면 영어 위키백과의 회원국 표(Member states of …)로 보완한다. `source`에는 실제 연 페이지(대표 하나).
- 2026년 변화(신규 가입·탈퇴·정지)를 반영. 예: 회원 자격 정지 국가는 members에 넣되 notes에 "정지" 표기. 탈퇴한 나라는 넣지 않고 notes에 적는다.
- **WebSearch는 꼭 필요할 때만 최대 10번**(검색 한도가 다른 작업과 공유됨). 주로 WebFetch로 공식·위키백과 페이지를 직접 연다.
- 추측 금지. 확인 못 한 기구는 빼고 보고.

끝나면 JSON 문법 확인 후, 기구별 회원 수만 짧게 보고.
