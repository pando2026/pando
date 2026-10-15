# 주간 점검: '지금 상황'(contexts)과 '정당 간 쟁점'(fights) 갱신

오늘은 2026-10-16. `/home/claude/pando/CLAUDE.md`의 취재 원칙(특히 1·10·14·15·17·18번)을 따른다. 지어내기 금지, 숫자·날짜·인용은 연 페이지에서 확인한 것만, 학습 지식(2026년 6월까지)은 최근 사건의 근거가 될 수 없다. 검색은 끝까지(18번) — 횟수 제한 없음, 막히면 다른 출처·언어(현지어)·경로를 써라.

입력 `in-<n>.json`: {"CC": ["context","fights"]} — 나라마다 갱신할 항목.
현재 값: `/home/claude/pando/data/contexts.json`[CC], `/home/claude/pando/data/fights.json`[CC], 의회 정당 이름 `/home/claude/pando/data/civics.json`[CC].parliament.chambers[].groups[i][0].

출력 `out/weekly-<n>.json`:
```json
{"AU":{"context":{...contexts.json 항목과 같은 형식: kind, asOf:"2026-10-16", headline, summary, control[{actor,holds,backers}], points[], sources[[기관,"원제(한국어 번역) · YYYY-MM-DD",url]]},
       "fights":{"asOf":"2026-10-16","note"?:"...","items":[{topic,kind,summary,sides:[{parties:[...],stance}],status,sources}]}}}
```
context 규칙
- 지금(2026년 10월 둘째·셋째 주) 그 나라 권력 구도와 가장 중요한 최근 1~2주 변화를 반영해 **새로 쓴다**. 기존 내용 중 여전히 맞는 것은 유지하되 숫자(지지율·금리·물가·전황 등)는 최신 값으로 다시 확인한다.
- summary 4~6문장, 한 문장에 사실 하나. points 4~6개(숫자·날짜 포함). control은 실제 권력 주체 3~5개.
- 발언은 이름+직함으로(17번). 비난받는 쪽 반박 함께(10번).
- sources 3~5개: 당사자 공식 1개 이상 + 통신사/지역 대표 매체(15번). 위키백과는 보조로만.
fights 규칙
- 정당 간 실제로 맞서는 쟁점 2~4개. 기존 쟁점은 status를 최신으로 고치고, 끝났거나 3개월 넘게 움직임이 없으면 빼고 새 쟁점을 넣는다.
- sides[].parties의 정당 이름은 civics groups 이름과 **글자까지 같게**. 의회 밖 세력이면 그 이름을 그대로 쓰되 note에 밝힌다.
- 경쟁 정당이 없거나 의회가 정지된 나라(군정 등)는 items를 비우고 note에 이유 1문장.
- sources 1~3개, 실제로 연 페이지.
끝나면 JSON 문법 확인 후 나라별 "headline · 쟁점 수"만 한 줄씩 보고.
