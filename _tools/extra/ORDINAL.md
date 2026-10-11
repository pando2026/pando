# 국가수반 '몇 대' 조사

입력 `heads-<n>.json`: [{code, country, role(state=국가원수|government=정부 수반), name, office}].
출력 `out/order-<n>.json`: 
```json
{"KR":{"state":{"n":21,"label":"제21대 대통령","since":"2025-06-04","source":"https://en.wikipedia.org/wiki/List_of_presidents_of_South_Korea"}},
 "US":{"state":{"n":47,"label":"제47대 대통령","since":"2025-01-20","source":"..."}},
 "GB":{"state":{"n":null,"label":"","since":"2022-09-08","source":"..."},"government":{"n":null,"label":"","since":"2024-07-05","source":"..."}}}
```
규칙
- 오늘은 2026-10-11. 입력의 인물이 지금도 그 자리인지 확인하고, **바뀌었으면** `"current":"새 인물 영어 이름"`과 `"note"`를 넣는다(사이트 명단 갱신용).
- `n`은 그 나라 공식 또는 통용 번호(예: 미국 47대, 한국 21대, 필리핀 17대, 프랑스 제5공화국이 아니라 '프랑스 대통령' 통산 번호가 영어 위키백과 목록에 있으면 그 번호). 같은 사람이 비연속 재임하면 그 나라 관례를 따른다(미국 트럼프=47대).
- 번호를 매기지 않는 자리(군주, 영국 총리처럼 번호 관례가 없는 경우 포함)는 `n:null`, `label:""`. 군주는 `label`에 "국왕"처럼 쓰지 말고 비워 둔다. 단 영국 총리처럼 위키백과 목록에 번호가 일관되게 매겨져 있으면 넣어도 된다.
- `label`은 한국어: "제N대 대통령", "제N대 총리", "제N대 국무총리"(한국), "제N대 총통"(대만) 등 그 직함대로. 
- `since`: 현 임기(현 재임) 시작일 YYYY-MM-DD.
- 출처: **WebSearch는 쓰지 말고**(검색 한도가 다른 작업과 공유됨) WebFetch로 영어 위키백과 목록 페이지를 직접 연다: `https://en.wikipedia.org/wiki/List_of_presidents_of_<Country>`, `List_of_prime_ministers_of_<Country>`, `List_of_heads_of_state_of_<Country>`, 또는 인물 문서(infobox에 "47th President of the United States"처럼 나옴). 한 페이지에서 여러 나라 확인이 가능하면 활용(예: `https://en.wikipedia.org/wiki/List_of_current_heads_of_state_and_government` 로 현직 확인).
- 확인 못 하면 그 항목은 빼라. 추측 금지.
끝나면 JSON 문법 확인 후, 처리 수와 '인물이 바뀐 나라'만 짧게 보고.
