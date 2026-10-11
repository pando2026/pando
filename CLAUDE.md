# 판도 · PANDO — 운영 지침

판도는 세계의 정치·경제·군사 판도와 분쟁을 한국어(+영어)로 읽는 국제 브리핑이다.
- 공개 주소: https://pando2026.github.io/pando/ (GitHub Pages, `main` 브랜치 루트)
- 독자: 한국 대학생. 짧고 구체적으로. 면책 문구·잡설 금지.
- 이 저장소를 고치는 모든 세션(정기 갱신 포함)은 이 문서를 따른다.

## 구조
- `index.html` — **빌드 산출물. 직접 고치지 않는다.** `node _src/build.mjs`로 만든다(같은 명령이 `_src/out/artifact.html`도 만든다).
- `_src/` — 화면 소스: `client.js`(렌더링), `data.js`(데이터 로딩·/api 흉내), `map.js`(벡터 지도), `style.css`·`refine.css`·`artifact.css`, `body.html`(기본 마크업), `build.mjs`(조립·패치).
- `data/` — 내용. 대부분의 갱신은 여기 JSON만 고치면 된다(빌드 불필요).
  - `edition.json` 첫 화면(오늘의 초점=stories[0], 지도 점, 변화 카드). `editionDate`, `updatedAt`, `editionNote` 함께 갱신.
  - `contexts.json` 국가별 '지금 상황' {kind, asOf, headline, summary, control[], points[], sources[]}.
  - `changewatch.json` 국가별 최근 변화 카드.
  - `civics.json` 의회 구성(parliament.chambers[].groups=[이름, 의석, 색, 성향]) + 갈등 관계(conflicts[]).
  - `party-names.json`, `party-profiles.json`, `party-photos.json` 정당 이름·카드·대표 사진. 키는 civics groups 이름과 글자까지 같아야 한다.
  - `fights.json` 정당 간 쟁점. `cpi.json` 부패인식지수. `autocrats.json` 독재·권위주의 표시.
  - `explainers.json` 판도 해설. `s00~s15.json` 국가 기본 자료·인물(국가코드 c0*31+c1 mod 16 분할).
  - `photos.json`/`photo-index.json` 인물 사진(위키미디어 공용 자유 라이선스만, 출처·라이선스 필수).
  - `boards.json` **갈등도**(분쟁을 누르면 펼쳐지는 지도 그림). 보드마다 actors(국가·무장세력·기업, side a/b/a2/b2/n), links(from→to, type: attack·troops·arms·finance·trade·sanction·mediate·talks·claim·support, 출처 필수), background(경위 타임라인), videos(관련 날리지식 영상 id). `pairs`로 civics 갈등 항목에 붙는다. 보드가 없는 갈등은 civics 자료로 자동 그림을 그린다. 조사 지침 `_tools/boards/BRIEF.md`. 렌더러 `_src/board.js`, 국가 배지 좌표 `anchors.json`.
  - `blocs.json` 국제기구·블록 회원국과 가입일(NATO·EU·BRICS·SCO·일대일로 등 26개). 지도 아래 토글과 국가 정보에 쓰인다. 조사 지침 `_tools/extra/BLOCS.md`.
  - `allies.json` 우방 관계(나라별 4~6곳: tie 동맹/전략적 동반자/우호·협력/후원, basis 근거 조약, interests 겹치는 이해관계, 출처). 지침 `_tools/allies/BRIEF.md`. 갈등 관계 보강 지침 `_tools/conflicts/BRIEF.md`.
  - 지도는 태평양 중심(`world.json`의 `lon0`=150). 다시 그릴 때 `_tools/reproject.py`. 좌표를 그릴 때는 경도에서 lon0를 빼고 투영한다.
  - `decisions.json` 나라별 의사결정 구조(summary, power, flows.law/budget/war, checks, informal, sources). 지침 `_tools/decisions/BRIEF.md`. 체제 변화(쿠데타·개헌·의회 해산)가 생기면 같은 커밋에서 고친다.
  - `partymap.json` + `admin1/<CC>.json` 정당별 강세 주·도(나라 자체 지도에만 그림, 세계 지도는 건드리지 않음). 지침 `_tools/partymap/BRIEF.md`. 선거 뒤 갱신.
  - `regions.json` 큰 나라의 지역 기반 정당·전국 정당의 지역 기반(의회 탭 '지역과 정당'). 키는 civics groups 이름과 같아야 한다. 지침 `_tools/regions/BRIEF.md`.
  - `regional-income.json` 주·도별 소득 수준(정당 강세 지도의 '지역별 소득 수준' 토글). {CC:{metric,unit,year,provider,source,values:{admin1 이름 또는 그룹명:값},note}}. 키는 `admin1/CC.json`의 units `n`(또는 `g`)과 같아야 한다. 해마다 통계청 새 자료가 나오면 갱신. 지침 `_tools/income/BRIEF.md`.
  - `fx.json` 예산 금액의 원화·달러 환산용 환율(USD 기준). 국가수반의 '제○대'는 s*.json 인물의 `ordinal`(지침 `_tools/extra/ORDINAL.md`).
  - `en/strings.json` 영어 번역 사전(아래 '영어판').
- `_tools/harvest.py` — 화면에 실제로 보이는 한국어 문자열을 모두 모은다(번역 누락 확인용).

## 취재 원칙 (날리지식 방식)
1. **출발점은 당사자의 공식 자료**: 정부 보고서·백서, 부처 보도자료, 공식 브리핑·인터뷰·영상, 의회 청문회 기록·회의록. "그 시점에 그 정부를 대표하는 입장"이기 때문이다.
2. **당사자가 말하지 않는 부분은 상대측 공식 자료로 대조**한다. 예: 중국 국방백서 ↔ 미 국방부 중국 군사력 보고서, 북·러 밀착 → 미 재무부(OFAC) 제재 발표. 투명성이 낮은 국가일수록 자기 자료가 빈약하다는 사실도 기록한다.
3. 그다음 **통신사·주요 언론**(Reuters, AP, AFP, 연합뉴스 등)으로 사실을 확인하고, **싱크탱크·학계**는 해석을 비교하는 '가지치기'로만 쓴다.
4. 출처마다 등급을 붙인다: `official`(당사자 공식), `counter`(상대측 공식), `press`(언론), `research`(연구기관).
5. 외국어 자료는 **원제 + 한국어 번역 제목**을 함께 적는다.
6. **용어를 정리**한다: 공식 용어와 비공식 용어를 구분하고, 언제 누가 쓰기 시작했는지 시간순으로(예: A2/AD ↔ 반개입·구역거부 ↔ 적극적 방어, 9단선/10단선/11단선).
7. **결론을 강요하지 않는다.** 사실과 주장(누가 말했나)을 구분하고 독자가 판단할 재료를 준다.
8. 유튜브·블로그 등 2차 콘텐츠는 **단서(lead)일 뿐 출처가 아니다.** 주장 하나하나를 1차 자료로 확인한 것만 싣는다. 과장·미확인은 싣지 않거나 '미확인'으로 표시.
9. **주제는 두 나라 이상 언론이 다루는 것부터** 고르고, '정답'에 끼워 맞추지 말고 **결과(제재·충돌·선언)의 원인을 계속 '왜?'로 따라간다**: 사건 → 관련 개인·단체 → 국가 → 지정학 순으로 넓힌다.
10. **객관적 ≠ 중립적**: 한 정부의 제재 발표·보도자료는 '그 정부가 그렇게 판단하고 행동했다'는 객관적 증거지만 중립적이지 않다. 비난받는 쪽 정부의 공식 입장(부인·반박·자체 단속 노력)을 반드시 함께 싣는다(갈등도의 `dispute`).
11. 제재·기소 문서는 보통 앞부분에 요약과 '계기가 된 사건'을 적는다. 그 사건을 키워드로 과거 기록을 찾아 현재와 이어 서술의 시작점으로 쓴다. 조직도·표가 첨부되면 활용한다.
12. 언론·싱크탱크는 국가 문서보다 한 단계 아래 자료다. **같은 주장이 서로 다른 여러 곳에서 나오는지 교차 확인**하고, 자료 속 의견·이념적 수식은 빼고 사실만 쓴다.
13. 날리지식 노트(132편 분석)에서 본 약점을 판도는 채운다: 당사자 자체 공식 자료와 비(非)미국 공식 문서를 빠뜨리지 않는다.
14. 지어내기 금지. 숫자·날짜·인용은 연 페이지에서 확인한 것만. 학습 지식(2026년 6월까지)은 최근 사건의 근거가 될 수 없다.

## 해설(explainers.json) 쓰는 법
- 구성: `hook`(독자가 '왜?'라고 묻게 하는 한 문장) → `summary` → `purpose`(무슨 자리·왜 열렸나·걸린 것) → `actors` → `exchanges`(질의 요지, 답변 요지, 짧은 직접 인용, **숨은 맥락**, **근거**) → `timeline` → `terms` → `background` → `takeaways` → `open`(아직 모르는 것) → `method`(취재 방식) → `sources`(tier 포함).
- 문장은 짧게, 한 문장에 사실 하나, 날짜·숫자를 정확히, 문장마다 누가 그렇게 말했는지.
- 청문회·국정감사는 회의록·위원회 자료가 1순위, 없으면 여러 매체 교차 보도.
- 새 해설의 `id`는 영문 소문자-하이픈. 주소 `#explain=<id>`로 바로 열린다.

## 정기 갱신
작업 후 반드시: JSON 문법 확인 → (화면 소스를 고쳤다면) `node _src/build.mjs` → 커밋(작성자 `Claude <noreply@anthropic.com>`) → `git push origin HEAD:main`.
- **변화 점검(하루 2회)**: 최근 12~24시간 국제 정치·안보·경제 주요 사건을 확인해 `edition.json`(가장 중요한 사건을 stories[0]으로, 지도 좌표 포함), 관련 국가 `contexts.json`·`changewatch.json`·`civics.json` conflicts를 갱신. 이미 있는 스토리는 고쳐 쓰고 오래된(2주 이상) 스토리는 뺀다. 최대 20개.
- **주간 점검(월요일)**: `contexts.json` 52개국의 asOf가 7일 넘은 것부터 다시 확인, `fights.json` 보강.
- **주간 점검**에서 우방·갈등 관계의 큰 변화(단교·조약·전쟁)를 `allies.json`·`civics.json`에 반영.
- **월간 점검(1일)**: 의회 구성 변화(선거·탈당), 지도자 교체(+`ordinal` 갱신), `party-profiles.json` 대표 교체, `blocs.json` 가입·탈퇴·정지, `fx.json` 환율 확인.
- **갈등도**: 변화 점검 때 큰 사건이 생긴 분쟁은 `boards.json`의 links·background를 고친다(출처 필수, `asOf` 갱신).
- 번역: 새로 쓴 한국어 문장은 같은 커밋에서 `data/en/strings.json`에 영어를 추가한다.

## 영어판
- 화면 오른쪽 위 `KO | EN` 토글. 영어 모드는 `data/en/strings.json`(한국어 → 영어) 사전으로 화면의 모든 글자를 바꿔 보여준다.
- 사전 키는 화면에 보이는 한국어 문장에서 숫자를 `{0}`, `{1}`…로 바꾼 템플릿이다. 값도 같은 자리표시자를 쓴다. `{n:mon}`은 그 숫자를 영어 월 이름(Jan…Dec)으로, `{n:ord}`는 서수(1st, 2nd…)로, `{n:man|eok|jo}`는 만·억·조 단위를 영어 수(51.7 million)로 바꾸고, `{n:hide}`는 숫자를 숨긴다. 서수 접미사(`{0}th`)를 직접 쓰지 말 것. 번역 지침 전체는 `_tools/tr/BRIEF.md`.
- 누락 확인: 저장소 루트에서 `python3 -m http.server 8902 &` 후 `python3 _tools/harvest.py 8902 /tmp/h.json --countries KR,US`(전체는 옵션 생략) → `/tmp/h.json`의 키 중 사전에 없는 것을 번역해 추가.
- 고유명사는 영어 표준 표기(정당은 공식 영어명, 인물은 영어 위키백과 표기).
