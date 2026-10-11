# Translation brief: 판도 (PANDO) Korean → English

You translate UI and content strings of 판도 (PANDO), a Korean-language international news briefing site (politics, conflicts, parliaments, economy), into natural, concise **news-English** (Reuters/Economist register). Readers: international students.

Input: `/home/claude/pando/_tools/tr/in-<n>.json` — a JSON array of Korean strings.
Output: `/home/claude/pando/_tools/tr/out-<n>.json` — a JSON object `{ "<exact Korean string>": "<English>" }` covering **every** input string, keys copied byte-for-byte.

Rules
1. **Placeholders**: `{0}`, `{1}`… stand for numbers. Keep every placeholder exactly once, reorder as English needs. For a month number use `{n:mon}` (renders Jan…Dec). Examples:
   - `{0}년 {1}월 {2}일` → `{1:mon} {2}, {0}`; `{0}월 {1}일` → `{0:mon} {1}`; `{0}년 {1}월` → `{1:mon} {0}`; `{0}년` → `{0}`
   - `{0}석` → `{0} seats`; `{0}위` → `#{0}`; `{0}위 / {1}개국` → `#{0} of {1}`
   - Korean large-number units: write the modifier and the site converts the number for you. `{0}만` → `{0:man}` (×10,000), `{0}억` → `{0:eok}` (×100,000,000), `{0}조` → `{0:jo}` (×10¹²). They render as e.g. "51.7 million", "1.2 billion". Examples: `{0}만 명` → `{0:man} people`; `US${0}억` → `US${0:eok}`; `{0}억 유로` → `€{0:eok}`; `{0}조 원` → `₩{0:jo}`.
   - Ordinals: write `{n:ord}` (renders 1st, 2nd, 3rd, 4th, 21st…). Never hard-code a suffix like `{0}th`. Examples: `제{0}대 국회` → `{0:ord} National Assembly`; `{0}선` → `{0:ord} term`; `{0}차 당대회` → `{0:ord} Party Congress`; a bare day `{0}일` → `the {0:ord}`.
   - If English idiom has no slot for a number that is always fixed (e.g. `{0}인당 GDP` → GDP per capita), append `{n:hide}` (renders nothing): `GDP per capita{0:hide}`.
   - Never drop or invent numbers.
2. **Proper nouns**: Korean transliterations of foreign people, parties and places must be restored to their standard English/Latin spelling (e.g. 라르스 클링바일 → Lars Klingbeil; 독일대안당(AfD) → Alternative for Germany (AfD); 국민의힘 → People Power Party; 더불어민주당 → Democratic Party of Korea). A string that is only a Korean pronunciation guide in square brackets, like `[파르티도 리베랄 콜롬비아노]`, translates to an empty string `""` (English readers already see the original name). If unsure of a spelling, romanize sensibly.
3. Country and place names: standard English short names (대한민국 → South Korea, 북한 → North Korea, 콩고민주공화국 → DR Congo).
4. Keep strings short like the Korean. Headlines: headline case not needed; sentence case. No added explanations, no quotes that aren't in the source.
5. Fixed glossary: 판도 → PANDO · 지금 상황 → Situation now · 갈등 관계 → Conflicts · 정당 간 쟁점 → Party disputes · 부패인식지수 → Corruption Perceptions Index · 해설 → Explained · 핵심 인물 → Key people · 국가원수 → Head of state · 정부 수반 → Head of government · 튀르키예/터키 → Türkiye (공식 국호, 원문 기사 제목 속 Turkey는 그대로) · 의회 → Parliament · 국회 → National Assembly · 자료 분류 → Sources by type · 의석 → seats · 과반 → majority · 기준 → as of · 출처 → Sources · 원문 → Source · 원문 확인 → View source · 자세히 → More · 지금 → Now · 숨은 맥락 → Hidden context · 근거 → Basis · 질의 → Question · 답변 → Answer · 오늘의 초점 → Today's focus · 변화 관찰 → Countries in motion · 국가 탐색 → Explore countries · 판도 사용법 → How to use PANDO · 공식 문서 → Official · 상대국 공식 → Counterpart official · 언론 → Press · 연구기관 → Research · 독재 → Dictatorship · 권위주의 → Authoritarian · 무소속 → Independent · 공석 → Vacant · 여권 → Pro-government · 야권 → Opposition · 확정 → Confirmed · 잠정 → Provisional · 발표 → Announced · 미확인 → Unverified.
6. Output must be valid JSON (escape quotes). Write the file with a script (e.g. node) rather than by hand if large, then verify: `node -e 'const i=require("/home/claude/pando/_tools/tr/in-<n>.json"),o=require("/home/claude/pando/_tools/tr/out-<n>.json");const miss=i.filter(k=>!(k in o));const bad=i.filter(k=>k in o&&(k.match(/\{\d+/g)||[]).length!==(o[k].match(/\{\d+/g)||[]).length);console.log(i.length,Object.keys(o).length,miss.length,bad.length)'` — miss and bad must be 0.
Final answer: just the four numbers from the check.
