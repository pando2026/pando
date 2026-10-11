# 갈등도(boards) 조사 지침

판도(https://pando2026.github.io/pando/) 국가 화면의 "갈등 관계"에서 갈등 하나를 누르면, 그 갈등에 얽힌 **주체들(국가·무장세력·기업·인물)과 그들 사이의 관계(공격·병력·무기·자금·제재·중재)**가 지도 위 그림으로 펼쳐진다. 날리지식 유튜브 영상의 지도 그래픽처럼: 원형 국기 배지 + 이름표, 국가 영역 색칠, 주체 사이를 잇는 선, 선마다 짧은 이름표, 화면 구석에 출처.

당신은 맡은 갈등도(board) 몇 개의 **데이터**를 조사해 JSON으로 쓴다. 그림은 프로그램이 그린다.

먼저 읽을 것: `/home/claude/pando/CLAUDE.md`의 '취재 원칙'. 현재 사이트 내용은 `/home/claude/pando/data/civics.json`의 각 국가 `conflicts`(갈등 설명·출처)와 `/home/claude/pando/data/contexts.json`(국가별 지금 상황). 오늘은 **2026-10-11**. 학습 지식(2026년 6월까지)은 최근 사건의 근거가 될 수 없다 — 2026년 사실은 반드시 웹에서 확인.

## 출력
`/home/claude/pando/_tools/boards/out/<board-id>.json` — 보드 하나당 파일 하나:
```json
{
 "id": "ukraine-war",
 "title": "러시아-우크라이나 전쟁",
 "hook": "독자가 '왜?'라고 묻게 하는 한 문장(물음표). 날짜·숫자 하나가 박힌 어긋남이면 좋다",
 "summary": "2~3문장. 지금 판의 구도. 누가 누구 편이고 무엇이 걸렸나",
 "asOf": "2026-10-11",
 "pairs": [["UA","RU"],["RU","UA"]],
 "actors": [
  {"id":"UA","code":"UA","label":"우크라이나","side":"a"},
  {"id":"RU","code":"RU","label":"러시아","side":"b"},
  {"id":"KP","code":"KP","label":"북한","side":"b2"},
  {"id":"africa-corps","label":"아프리카군단","icon":"armed","lat":12.6,"lon":-8.0,"side":"b2","note":"러시아 국방부 산하, 옛 바그너"}
 ],
 "links": [
  {"from":"RU","to":"UA","type":"attack","label":"전면 침공·점령","since":"2022-02",
   "detail":"한두 문장. 날짜·숫자 정확히, 누가 그렇게 말했는지",
   "tier":"official","source":["발행 기관","원제 (한국어 제목) · YYYY-MM-DD","https://..."],
   "dispute":"(선택) 당사자의 반박·부인 한 문장 + 그 출처 요약"}
 ]
}
```

### 필드 규칙
- `pairs`: 이 보드가 붙을 civics 갈등 항목들. `[국가코드, 상대 국가코드 또는 null이면 withName 문자열]` — 예: `["SD","신속지원군(RSF)"]`. 아래 '맡은 보드' 목록에 준 그대로 쓴다.
- `actors` 6~14개. `id`는 국가면 ISO 2자리 코드(= `code`), 비국가 주체는 영문 소문자-하이픈. `label`은 한국어 통용명, 10자 이내(이름표에 들어감).
  - 국가 아닌 주체는 `icon`: `armed`(무장세력·군대) `org`(국제기구·연합체) `company`(기업·선박) `person`(인물) `item`(무기·자원·시설) 중 하나, 그리고 **근거지·본부의 대략 좌표 `lat`,`lon` 필수**(도시 수준이면 충분).
  - 인물은 꼭 필요할 때만(협상 대표 등). 국가 지도자는 국가 배지로 충분.
  - `side`: `a`(보드 제목 앞쪽 주체) `b`(맞서는 쪽) `a2`(a를 돕는 쪽) `b2`(b를 돕는 쪽) `n`(중재·중립·제3자). 
- `links` 8~16개. `from`→`to` 방향이 의미를 가진다(누가 누구에게).
  - `type`: `attack`(공격·교전·점령) `troops`(병력 파견·주둔) `arms`(무기·부품 공급) `finance`(자금·차관·원조) `trade`(석유·자원 거래, 우회 수출) `sanction`(제재·단교·추방) `mediate`(중재·협상 주선) `talks`(직접 협상·합의) `claim`(영유권·혐의 주장, 확인 안 된 지원 의혹 포함) `support`(정치·외교 지지).
  - `label` 12자 이내(선 위 이름표). 예: "병력 1만여 명", "샤헤드 드론", "OFAC 제재", "도하 협상".
  - `since`: YYYY 또는 YYYY-MM.
  - 지원 '의혹'처럼 확인 안 된 것은 `type:"claim"`으로 두고 `label`에 "의혹"을 넣고, `dispute`에 상대의 부인을 적는다.
- **모든 link에 출처 1개 필수**(실제로 연 페이지, URL 포함). `tier`: official(행위 당사자 정부·기관 공식) / counter(상대국·제3국 정부 공식: 예 북한-러시아 관계에 대한 미 재무부·한국 국정원) / press / research(싱크탱크·학계·유엔 전문가패널 등). 공식 자료를 먼저 찾고, 없으면 통신사(Reuters·AP·AFP·연합), 그다음 연구기관. 같은 주장이 여러 곳에서 나오는지 교차 확인.
- **객관적 ≠ 중립적**: 한쪽 정부의 제재 발표는 '그 정부가 그렇게 판단했다'는 객관적 증거지만 중립적이지 않다. 비난받는 쪽의 공식 반박이 있으면 `dispute`에 넣는다.
- 날짜·숫자·이름은 연 페이지에 있는 그대로. 추측 금지. 확인 못 한 관계는 빼라. 현재(2026-10) 유효한 관계 중심, 끝난 관계는 그 사실을 detail에 쓰거나 뺀다.
- 의견·이념적 수식어는 빼고 사실만.

## 날리지식 노트를 단서로 쓰기
`plan.json`의 각 보드 `videos`는 관련 가능성이 있는 날리지식 영상 노트 id 목록이다(노트: `/home/claude/naljisik/notes/<id>.json` — 요약·날짜별 주장·설명란 출처(url 포함)·취재 방식). 이 노트는 **단서**다:
- 노트의 `sources`에 있는 원문(제재 발표, 백서, 의회 보고서, 기사)을 **직접 열어** 확인한 내용만 links·background에 쓴다. 노트의 문장이나 영상 자막을 옮기지 말고 자기 말로 쓴다.
- 노트의 주장이 2026-10 현재와 달라졌으면 최신 사실을 따른다.
- 보드에 정말 관련 있는 영상만 골라 `videos`에 넣는다(최대 5개): `{"id":"<노트 id>","why":"이 영상이 이 판의 어떤 배경을 다루는지 한 문장(우리 말로)"}`. 관련 없으면 빈 배열.

추가 필드:
- `background`: 이 판이 지금 모양이 된 경위 4~8개, 오래된 것부터. `{"date":"YYYY 또는 YYYY-MM(-DD)","text":"한 문장","source":["기관","제목 · 날짜","url"]}`. 날리지식 영상의 "모든 것의 시작은 ○○년" 방식처럼, 지금 갈등의 원인을 따라 올라간다. 출처 필수.
- `videos`: 위 설명대로.

## 끝나면
`node -e 'for(const f of process.argv.slice(1)){const b=JSON.parse(require("fs").readFileSync(f));const ids=new Set(b.actors.map(a=>a.id));const bad=b.links.filter(l=>!ids.has(l.from)||!ids.has(l.to)||!l.source||!l.source[2]);console.log(f,b.actors.length,b.links.length,bad.length)}' out/*.json` 로 확인(bad 0). 최종 답변은 보드별 actors/links 수와, 확인이 안 돼 뺀 중요한 관계만 짧게.
