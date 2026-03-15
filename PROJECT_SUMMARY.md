# 프로젝트 대화 요약 (ledgerapptest)

이 문서는 다른 법인용으로 프로젝트를 복사해 진행할 때 참고할 수 있도록, 지금까지의 주요 변경/의도를 정리한 요약입니다.

## 핵심 목표
- 캘린더/월간 집계는 **수입/경비** 기준으로 표시(현금유입/현금유출은 제외).
- 캘린더 상세 거래내역은 **수입/경비/현금유입/현금유출** 모두 표시.
- ChartView는 거래내역이 아니라 **복식부기장부(ledger)** 기준으로 집계/다운로드.
- CSV 다운로드는 **한글 깨짐 방지(BOM 포함)**.

## App.js 변경 요약
- 캘린더 탭과 차트 탭 전환 시, **캘린더 월이 초기화되지 않도록** 현재 월 상태를 유지.
  - `currentCalendarDate` 상태 추가, `initialDate`와 `datesSet`에서 동기화.
- 차트 탭에서는 우측 하단 `+` 버튼 숨김(캘린더에서만 표시).
- 차트 상단에 **"기간별 장부 CSV 내보내기"** 버튼을 계정관리 버튼 옆에 배치.
- ChartView에 기본 날짜 범위를 전달:
  - **현재 캘린더에서 보고 있는 월의 1일~말일**로 초기값 설정.

## ChartView 변경 요약
### 데이터 원천
- 거래내역(`getTransactions`)이 아니라 **복식부기장부(`getLedger`)**를 사용.
- 장부 데이터 포맷을 파싱/정규화하는 `normalizeLedgerEntries` 추가.

### 필터/체크리스트
- 차변/대변 **다중 선택 체크리스트**로 변경.
- **검색 기능** 추가.
- **빠른 선택 버튼**:
  - `전체`(토글로 전체 선택/해제)
  - `수입`, `경비`, `부가세`, `자본`
- 기본 선택값:
  - **차변 = 경비**, **대변 = 수입** 자동 선택.

### 합계 테이블
- 차변 합계 / 대변 합계 외에 **"대변-차변"** 열 추가.
- 합계 행에도 동일하게 표시.

### CSV 내보내기
- CSV에 **UTF-8 BOM** 포함해서 한글 깨짐 방지.
- 컬럼 순서:
  - `id, quarter, month, date, description, note, account, debit, credit`

## 스타일/레이아웃
- ChartView 필터 영역을 2열 2행으로 재구성, 간격 여유 확보.
- 모바일에서는 **세로 스택**으로 쌓이도록 `.chart-filter-grid` 적용.
- 빠른 선택 버튼에 애니메이션/활성 스타일 추가 (`.quick-btn`).

## 모달 스타일 통일
- `TransactionModal`을 `EditTransactionModal` 스타일로 통일.
- 공통 CSS는 `EditTransactionModal.css` 사용.
- 저장/수정/삭제 버튼에 **이중 클릭 방지** 및 진행 상태 표시.

## Apps Script(apptest.gs) 관련
- 복식부기장부를 프론트에서 받으려면 **`getLedger`** 액션이 필요.
- 기존 코드에 `getLedger` 함수 및 `doGet` 분기 추가 필요.

## 참고: 자주 확인한 위치
- `src/App.js`
- `src/components/ChartView.js`
- `src/components/TransactionModal.js`
- `src/components/EditTransactionModal.js`
- `src/components/EditTransactionModal.css`
- `src/styles.css`

## 향후 복사/이관 시 체크리스트
1. Apps Script에 `getLedger` 포함 여부 확인.
2. `WEB_APP_URL`을 새 법인 웹앱 URL로 교체.
3. `SPREADSHEET_ID`, 시트명(`거래내역`, `복식부기장부`, `계정명`) 확인.
4. Netlify 빌드에서 ESLint 경고=에러 처리됨 → unused 변수 주의.
