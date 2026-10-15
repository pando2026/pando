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
    - 스토리 분류: `region`은 하나만(동아시아·동남아시아·남아시아·중앙아시아·중동·유럽·아프리카·미주·오세아니아). `watchCodes`는 사건의 **주 당사국**만(국가 화면·지도 색칠·지역 필터가 이것을 쓴다), `countryCodes`는 언급된 나라 전체. 예: 팔레스타인 선거 연기 서한을 프랑스에 보냈다면 region=중동, watchCodes=[PS], countryCodes=[PS,FR].
    - `sides`(선택): 맞선 두 쪽의 이름 [A쪽, B쪽]. 있으면 actors 각 항목 6번째 칸에 "a"·"b"·"n"(중재·제3자)을 적고, 상세 화면 '02 / 관련 주체와 역할'이 왼쪽·오른쪽으로 나뉜다. 분쟁·대립 사건에만 쓰고, 편이 분명하지 않은 주체는 "n".
    - `placeCode`(선택): 사건이 일어난 곳의 나라 코드. 지도 바로가기 칩에 국기·나라 이름으로 나온다. 없으면 지도 모양으로 자동 판정하고, 바다·작은 나라처럼 판정이 틀릴 때만 적는다.
    - `outlook`(선택): 전문가 평가·전망 [[이름(소속), 평가|전망|권고, 요지, 근거 성격("연구기관 분석"·"언론 인용(매체)"), [출처 번호]]]. 상세 화면 '05 / 전문가 평가·전망'에 나온다.
  - `contexts.json` 국가별 '지금 상황' {kind, asOf, headline, summary, control[], points[], sources[]}.
  - `changewatch.json` 국가별 최근 변화 카드.
  - `civics.json` 의회 구성(parliament.chambers[].groups=[이름, 의석, 색, 성향]) + 갈등 관계(conflicts[]).
  - `party-names.json`, `party-profiles.json`, `party-photos.json` 정당 이름·카드·대표 사진. 키는 civics groups 이름과 글자까지 같아야 한다.
  - `fights.json` 정당 간 쟁점. `cpi.json` 부패인식지수. `elections.json` 선거의 공정성(V-Dem 자유·공정 선거 지수 0~1, Our World in Data 경유, 매년 3월 새 판). `autocrats.json` 독재·권위주의 표시.
  - `explainers.json` 판도 해설. `s00~s15.json` 국가 기본 자료·인물(국가코드 c0*31+c1 mod 16 분할).
  - `photos.json`/`photo-index.json` 인물 사진(위키미디어 공용 자유 라이선스만, 출처·라이선스 필수).
  - `boards.json` **갈등도**(분쟁을 누르면 펼쳐지는 지도 그림). 보드마다 actors(국가·무장세력·기업, side a/b/a2/b2/n), links(from→to, type: attack·troops·arms·finance·trade·sanction·mediate·talks·claim·support, 출처 필수), background(경위 타임라인), videos(관련 날리지식 영상 id). `pairs`로 civics 갈등 항목에 붙는다. 보드가 없는 갈등은 civics 자료로 자동 그림을 그린다. 조사 지침 `_tools/boards/BRIEF.md`. 렌더러 `_src/board.js`, 국가 배지 좌표 `anchors.json`.
  - `blocs.json` 국제기구·블록 회원국과 가입일(NATO·EU·BRICS·SCO·일대일로 등 26개). 지도 아래 토글과 국가 정보에 쓰인다. 조사 지침 `_tools/extra/BLOCS.md`.
  - `allies.json` 우방 관계(나라별 4~6곳: tie 동맹/전략적 동반자/우호·협력/후원, basis 근거 조약, interests 겹치는 이해관계, 출처). 지침 `_tools/allies/BRIEF.md`. 갈등 관계 보강 지침 `_tools/conflicts/BRIEF.md`.
  - 지도는 태평양 중심(`world.json`의 `lon0`=150) **메르카토르 도법**(`proj`="merc", 북위 82°~남위 56°, 남극 제외). `occupied.json`·`anchors.json`도 같은 도법으로 미리 투영돼 있다. 다시 그릴 때 `_tools/reproject.py`. 좌표를 그릴 때는 경도에서 lon0를 빼고 투영한다.
  - `decisions.json` 나라별 의사결정 구조(summary, power, flows.law/budget/war, checks, informal, sources). 지침 `_tools/decisions/BRIEF.md`. 체제 변화(쿠데타·개헌·의회 해산)가 생기면 같은 커밋에서 고친다.
  - `partymap.json` + `admin1/<CC>.json` 정당별 지역 지지(나라 자체 지도에만 그림, 세계 지도는 건드리지 않음). `parties`=정당별 강세 지역(지침 `_tools/partymap/BRIEF.md`), `vote`={metric, election, winners{지역:1위 정당}, shares{정당:{지역:%}}}=지역별 1위 보기와 득표율 진하기(지침 `_tools/partymap/SHARES.md`). 득표율이 없는 정당은 강세 지역을 연하게 칠한다. 의회에 없는 정당(예: 금지된 정당)의 색은 `colors`{정당:#hex}로 준다. 새 나라 지도는 `_tools/partymap/mk_admin1.py`로 만든다. admin1 units의 `l`은 현지어 지역명(툴팁: 한국어/영어 · 현지어). `c`는 주요 도시 [한국어, 영어, 경도, 위도, 인구, 2=수도·1=주도·0=기타](최대 3개, `_tools/partymap/cities.py`로 Natural Earth 인구 밀집지에서 생성). 선거 뒤 갱신.
  - `regions.json` 큰 나라의 지역 기반 정당·전국 정당의 지역 기반(의회 탭 '지역과 정당'). 키는 civics groups 이름과 같아야 한다. 지침 `_tools/regions/BRIEF.md`.
  - `regional-income.json` 주·도별 소득 수준(정당 강세 지도의 '지역별 소득 수준' 토글). {CC:{metric,unit,year,provider,source,values:{admin1 이름 또는 그룹명:값},note}}. 키는 `admin1/CC.json`의 units `n`(또는 `g`)과 같아야 한다. 해마다 통계청 새 자료가 나오면 갱신. 지침 `_tools/income/BRIEF.md`.
  - `problems.json` 국가 화면 맨 위 '한눈에 보는 문제'의 핵심 문제 카드 3장(+왜? 원인 사슬, 다음 일정). 지침 `_tools/problems/BRIEF.md`. 경고등(물가·실업·부채·부패·갈등)은 기존 자료로 자동 계산. 주간 점검 때 asOf가 7일 넘은 나라부터 갱신.
  - `interest.json` 나랏빚 이자(세계은행 WDI 중앙정부 이자 지출: 총지출 대비 GC.XPN.INTP.ZS, 세입 대비 GC.XPN.INTP.RV.ZS, 2000년 이후·순위). 예산 탭 '나랏빚 이자'. `_tools/extra/interest.py`로 만든다(분기 점검). 예산 구성표에 이자 칸이 없는 나라는 breakdown `memo`[{label,value,prev,note,source,provider}]로 이자 금액을 따로 적는다(예: 한국 국고채 이자).
  - `interest-budget.json` 주요 52개국 최신 예산(정부안·확정)의 이자 지출 {asOf, countries:{CC:{fiscalYear,status,scope,interest{value,unit,label},principalIncluded,total,share,prev,note,sources,tier}}}. '나랏빚 이자' 맨 위 카드. 지침 `_tools/interest/BRIEF.md`. 각국 새 예산안이 나오면 갱신.
  - `ties.json` 핵심 인물 간 개인적 관계 {CC:{asOf, ties[{a,b:{name,ko,role}, kind(학연·지연·혈연·사업·경력·군·정보·계파), text, since, claim, sources}], groups[{name,kind,members,note,sources}]}}. claim=true는 한쪽 주장(반박 함께). 지침 `_tools/ties/BRIEF.md`. 개각·지도자 교체 때 갱신.
  - `cases.json` 부패·선거 사례 {CC:{asOf, corruption[], elections[]}} 각 {title, year, who, status(의혹·수사 중·기소·1심 유죄·항소심 유죄·유죄 확정·무죄·사면·공식 확인 등), text, sources}. CPI·선거의 공정성 아래 '사례 보기'. 지침 `_tools/cases/BRIEF.md`. 판결·기소가 나오면 status를 고친다.
  - `occupied.json` 무력 점령·무장세력 통제 지역(메인 지도·갈등도 빗금). `_tools/occupied/build.py`(조사 목록 `_tools/occupied/items.json`)로 Natural Earth 1급 행정구역 + DeepStateMap(우크라이나) 경계를 투영해 만든다. 지침 `_tools/occupied/BRIEF.md`. 변화 점검 때 점령·탈환이 있으면 갱신.
  - `capitals.json` 나라별 수도 [한국어, 영어, 경도, 위도, 비고](Natural Earth 인구 밀집지 ADM0CAP). 주·도 지도가 없는 나라는 정치 탭에 '수도와 위치' 지도로 보여준다.
  - `fx.json` 예산 금액의 원화·달러 환산용 환율(USD 기준). 국가수반의 '제○대'는 s*.json 인물의 `ordinal`(지침 `_tools/extra/ORDINAL.md`).
  - `en/strings.json` 영어 번역 사전(아래 '영어판').
- 국가 화면의 각 덩어리는 머리글을 눌러 접고 편다(`client.js`의 `FOLDS` 목록: 키·선택자·머리글·기본 펼침). 새 덩어리를 만들면 머리글을 직속 자식으로 두고 `FOLDS`에 추가한다.
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
15. **언론 출처는 지역에 맞게 고른다**: 국제 통신사(Reuters·AP·AFP·연합뉴스)를 먼저, 그다음 그 나라·지역의 대표 매체를 쓴다. 매체가 많은 선진국은 현지 매체를 우선한다(독일 → dpa·Tagesschau·Der Spiegel·FAZ, 프랑스 → AFP·Le Monde, 영국 → BBC·FT, 일본 → NHK·교도·닛케이, 미국 → AP·NYT·WSJ·WaPo, 중동 → Reuters·AP·현지 국영통신(SPA·WAM·IRNA 등은 당사자 공식으로 표시)·The National, 남아시아 → Dawn·The Hindu 등). 알자지라 같은 제3지역 매체는 현지·통신사 출처를 못 찾을 때만 쓴다.
16. **전문가 평가·전망(`outlook`)**: 큰 사건에는 공개된 싱크탱크·연구기관·학계·전직 관료의 평가와 전망을 2~4개 붙인다(International Crisis Group·CrisisWatch, Chatham House, IISS, CSIS, Carnegie, ECFR, Brookings, 현지 연구기관, 국립외교원·아산정책연구원·KIEP 등, 또는 통신사·주요 매체가 인용한 전문가). 서로 다른 시각을 함께 싣고, 누가(소속) 무엇을 전망했는지 따옴표 인용은 짧게. 유료 구독 DB(Oxford Analytica 등)의 내용은 싣지 않는다. 독자가 알려준 단서는 공개 자료로 다시 확인해 쓴다.
17. **성명·발언은 말한 사람을 반드시 적는다**: "사우디는 ~라고 밝혔다", "정부 당국은", "연합군은"처럼 나라·기관만 쓰지 말고 **누가(이름 + 직함)** 말했는지 쓴다. 예: "사우디" → "연합군 대변인 투르키 알말리키", "이란 외교부" → "이스마일 바가이 이란 외교부 대변인". 출처가 이름을 밝히지 않았으면 그 사실을 그대로 적는다("익명의 역내 관리 2명은 AP에", "BP는 대변인 이름 없이 성명에서", "누가 지시했는지는 알려지지 않았다"). 출처에 없는 이름을 추측해 넣지 않는다. 기관 명의 공식 문서(보도자료·성명서)는 기관명을 쓰되, 서명자·발표자가 있으면 함께 적는다.
18. **끝까지 찾는다**: 한 경로가 막히면(접속 차단·봇 확인·검색 결과 없음) 멈추거나 "다음 점검 때"로 미루지 않는다. 다른 출처(정부 원문 ↔ 통신사 ↔ IMF·국제기구 보고서), 다른 언어(현지어 검색), 다른 경로(검색 결과에 나온 다른 URL, 정부 문서 사본 사이트, 연결된 노트북의 앱 내장 브라우저로 원문 열기, 이미지 표는 화면으로 읽기)를 모두 써 본 뒤에만 '자료 없음'으로 둔다. '자료 없음'에는 무엇을 찾아봤는지 적는다. 하위 에이전트 지침에 검색 횟수를 낮게 묶지 않는다(서버 과부하만 피할 것). 봇 확인(CAPTCHA)은 우회하지 않고 다른 경로를 찾는다.

## 해설(explainers.json) 쓰는 법
- 구성: `hook`(독자가 '왜?'라고 묻게 하는 한 문장) → `summary` → `purpose`(무슨 자리·왜 열렸나·걸린 것) → `actors` → `exchanges`(질의 요지, 답변 요지, 짧은 직접 인용, **숨은 맥락**, **근거**) → `timeline` → `terms` → `background` → `takeaways` → `open`(아직 모르는 것) → `method`(취재 방식) → `sources`(tier 포함).
- 문장은 짧게, 한 문장에 사실 하나, 날짜·숫자를 정확히, 문장마다 누가 그렇게 말했는지.
- 청문회·국정감사는 회의록·위원회 자료가 1순위, 없으면 여러 매체 교차 보도.
- 새 해설의 `id`는 영문 소문자-하이픈. 주소 `#explain=<id>`로 바로 열린다.

## 정기 갱신
작업 후 반드시: JSON 문법 확인 → (화면 소스를 고쳤다면) `node _src/build.mjs` → 커밋(작성자 `Claude <noreply@anthropic.com>`) → `git push origin HEAD:main`.
- **변화 점검(하루 2회)**: 최근 12~24시간 국제 정치·안보·경제 주요 사건을 확인해 `edition.json`(가장 중요한 사건을 stories[0]으로, 지도 좌표 포함, 새 큰 사건엔 `outlook` 2개 이상), 관련 국가 `contexts.json`·`changewatch.json`·`civics.json` conflicts를 갱신. 이미 있는 스토리는 고쳐 쓰고 오래된(2주 이상) 스토리는 뺀다. 최대 20개.
- **주간 점검(월요일)**: `contexts.json` 52개국의 asOf가 7일 넘은 것부터 다시 확인, `fights.json` 보강.
- **주간 점검**에서 우방·갈등 관계의 큰 변화(단교·조약·전쟁)를 `allies.json`·`civics.json`에 반영.
- **월간 점검(1일)**: 의회 구성 변화(선거·탈당), 지도자 교체(+`ordinal` 갱신), `party-profiles.json` 대표 교체, `blocs.json` 가입·탈퇴·정지, `fx.json` 환율 확인.
- **분기 점검(1·4·7·10월 15일)**: 국가 지표 시계열(세계은행·IMF·SIPRI·BIS), 부패인식지수, 주·도별 소득의 새 연도를 받아 넣는다. 지침 `_tools/extra/DATA-REFRESH.md`.
- **갈등도**: 변화 점검 때 큰 사건이 생긴 분쟁은 `boards.json`의 links·background를 고친다(출처 필수, `asOf` 갱신).
- 번역: 새로 쓴 한국어 문장은 같은 커밋에서 `data/en/strings.json`에 영어를 추가한다.

## 영어판
- 화면 오른쪽 위 `KO | EN` 토글. 영어 모드는 `data/en/strings.json`(한국어 → 영어) 사전으로 화면의 모든 글자를 바꿔 보여준다.
- 사전 키는 화면에 보이는 한국어 문장에서 숫자를 `{0}`, `{1}`…로 바꾼 템플릿이다. 값도 같은 자리표시자를 쓴다. `{n:mon}`은 그 숫자를 영어 월 이름(Jan…Dec)으로, `{n:ord}`는 서수(1st, 2nd…)로, `{n:man|eok|jo}`는 만·억·조 단위를 영어 수(51.7 million)로 바꾸고, `{n:hide}`는 숫자를 숨긴다. 서수 접미사(`{0}th`)를 직접 쓰지 말 것. 번역 지침 전체는 `_tools/tr/BRIEF.md`.
- 누락 확인: 저장소 루트에서 `python3 -m http.server 8902 &` 후 `python3 _tools/harvest.py 8902 /tmp/h.json --countries KR,US`(전체는 옵션 생략) → `/tmp/h.json`의 키 중 사전에 없는 것을 번역해 추가.
- 고유명사는 영어 표준 표기(정당은 공식 영어명, 인물은 영어 위키백과 표기).
