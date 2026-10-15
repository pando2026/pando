# 최신 예산의 나랏빚 이자 조사

판도 예산 탭의 '나랏빚 이자'는 세계은행 결산치(1~3년 늦음)다. 여기에 **가장 최근 예산(확정 본예산 또는 의회에 낸 정부안)의 이자 지출액**을 나라마다 붙인다. 오늘은 2026-10-16. `/home/claude/pando/CLAUDE.md` 취재 원칙을 따른다(지어내기 금지, 연 페이지에서 확인한 숫자만, 당사자 공식 자료 우선).

입력 `in-<n>.json`: 국가코드 목록. 출력 `out/interest-<n>.json`:
```json
{"KR":{"fiscalYear":"2027","status":"정부안|확정 예산|추경 반영|집행 실적|추정",
  "scope":"중앙정부 일반회계|연방정부|중앙정부 총지출 등 (문서 표현대로 짧게)",
  "interest":{"value":35.0,"unit":"조 원","label":"국고채 이자"},
  "principalIncluded":false,
  "total":{"value":820.9,"unit":"조 원","label":"총지출"},
  "share":4.3,
  "prev":{"fiscalYear":"2026","value":29.2,"unit":"조 원"},
  "note":"1~2문장: 범위·특이사항(예: 원금 상환 포함 여부, 국내/대외 채무 이자 구분, 예산 미공개).",
  "sources":[["기관","원제(한국어 번역) · YYYY-MM-DD","https://..."]],
  "tier":"official|press|research"}}
```
규칙
- **출처 순서**: 재무부·예산청·의회 예산 문서(예산서, 예산 연설, 시민예산, 재정 전망 보고서) > IMF 국가보고서(Article IV·프로그램 리뷰)의 해당 연도 이자 지출 > 통신사·현지 주요 매체(15번 원칙: 지역 대표 매체). 위키백과는 쓰지 않는다.
- 금액은 **문서에 적힌 통화·단위 그대로**(조 원, 십억 달러, 억 위안, 십억 루피 등). `share`는 문서에 비율이 있으면 그 값, 없으면 interest/total을 계산해 소수 1자리(같은 문서·같은 범위일 때만). 범위가 다르면 share는 null.
- '국채비/debt service'처럼 **원금 상환이 섞인 금액**만 있으면 `principalIncluded:true`로 적고 note에 밝힌다. 이자만 따로 있으면 이자를 쓴다.
- 예산이 공개되지 않거나(북한·에리트레아 등), 내전으로 통합 예산이 없으면 `{"status":"자료 없음","note":"이유 1문장","sources":[근거 1개]}`만 쓴다. 근거가 없으면 note만.
- `prev`는 같은 문서·보도에 전년 값이 있을 때만.
- **WebSearch는 나라당 최대 2번**(공유 한도). 429면 1분 쉬고 재시도. WebFetch는 검색 결과에 나온 URL만 열린다. 확인 못 하면 그 나라는 '자료 없음'으로 두고 억지로 채우지 않는다.
- KR는 이미 확인된 값(2027 정부안 국고채 이자 35.0조 원, 2026 29.2조, 총지출 820.9조, 뉴스1/파이낸셜뉴스 2026-09-06 https://www.fnnews.com/news/202609060615486420)을 그대로 써도 된다.
끝나면 JSON 문법 확인 후 나라별 "회계연도 · 이자 금액 · share"만 한 줄씩 짧게 보고.

## 2차 조사(1차에서 '자료 없음'인 나라)
- 1차 결과는 `/home/claude/pando/data/interest-budget.json`에 있다. 그 나라 항목의 note·sources를 먼저 읽고 이미 확인한 것은 다시 찾지 마라.
- **WebSearch는 나라당 최대 4번.** 영어·현지어(아랍어·스페인어·프랑스어·중국어·페르시아어·한국어 등)로 각각 찾아라. 예: 영국 OBR Economic and fiscal outlook 'debt interest', 스페인 'intereses de la deuda presupuesto 2026', 대만 '債務付息 總預算', 사우디 'financing costs budget statement', 이란 'بهره بدهی بودجه 1405', 프랑스어권 아프리카 'charges financières de la dette / intérêts de la dette loi de finances 2026'.
- 최신 예산에 없으면 순서대로 내려가라: (1) 최신 예산안·확정 예산 → (2) 직전 연도 예산 또는 집행 실적(재무부 분기·연간 재정 보고) → (3) IMF Article IV·프로그램 리뷰 표의 'interest payments/interest expenditure'(그 나라 회계연도, 예상치면 status '추정'). 어느 단계 값인지 status·note에 정확히.
- 그래도 없으면 '자료 없음'을 유지하되 note에 무엇을 찾아봤는지 한 문장.
- 출력은 `out/interest-<n>.json`(입력 번호와 같은 n), 형식은 위와 같다.
