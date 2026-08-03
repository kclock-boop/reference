# (주)태화기업 AI 컨설팅 사전 수준진단지 & 컨설팅 가이드

태화기업 대상 AI 컨설팅 사전 수준진단 문서를 웹에서 바로 열람할 수 있도록 정리한 단일 HTML 문서입니다.

## 바로 열기

- 실행형 웹페이지: [https://kclock-boop.github.io/reference/taehwa_ai_diagnostic_guide.html](https://kclock-boop.github.io/reference/taehwa_ai_diagnostic_guide.html)
- 기본 진입 주소: [https://kclock-boop.github.io/reference/](https://kclock-boop.github.io/reference/)
- 저장소 화면: [https://github.com/kclock-boop/reference](https://github.com/kclock-boop/reference)

주의: `github.com` 저장소 화면은 파일 보기용이며, 실제 웹페이지처럼 사용하려면 반드시 `github.io` 주소로 접속해야 합니다.

## 파일 구성

- `index.html`: GitHub Pages 기본 진입 파일
- `taehwa_ai_diagnostic_guide.html`: 설문, 결과 보기, 출력, 응답 저장 페이지
- `admin_dashboard.html`: 관리자용 응답 통합 보기 페이지
- `sheet_config.js`: 저장 방식 설정 파일
- `google_apps_script_template.gs`: Google Sheets 연동용 Apps Script 템플릿

## Google Sheets 연동형 사용 방법

GitHub Pages만으로는 응답을 중앙 저장할 수 없습니다.  
설문 응답을 여러 사람이 공통으로 저장하고 관리자 대시보드에서 함께 보려면 Google Sheets + Apps Script를 연결해야 합니다.

추가로, 현재 템플릿은 응답이 저장될 때마다 `기업별 Google Docs 결과분석 보고서`를 자동 생성/갱신하도록 확장되어 있습니다.  
이 문서를 NotebookLM에 소스로 연결하면 이후에는 문서가 자동 갱신되어 반자동 운영이 가능합니다.

### 1. Google Spreadsheet 만들기

1. 새 Google 스프레드시트를 생성합니다.
2. 파일 이름은 자유롭게 정해도 됩니다.
3. 시트 이름은 비워 두어도 되며, 스크립트가 `responses` 시트를 자동 생성합니다.

### 2. Apps Script 붙여넣기

1. 스프레드시트에서 `확장 프로그램 > Apps Script`로 이동합니다.
2. 기본으로 열린 `Code.gs` 내용을 모두 삭제합니다.
3. 이 저장소의 `google_apps_script_template.gs` 내용을 그대로 붙여넣습니다.
4. 저장합니다.

주의:
- 스크립트는 `responses` 시트에 응답을 저장합니다.
- 동시에 Google Drive에 `AI훈련코치_기업별_결과보고서` 폴더를 만들고, 기업명 기준으로 Google Docs 보고서를 자동 생성하거나 기존 문서를 갱신합니다.

### 3. 웹 앱으로 배포

1. Apps Script 우측 상단 `배포 > 새 배포`를 선택합니다.
2. 유형은 `웹 앱`을 선택합니다.
3. 실행 사용자는 `나`로 둡니다.
4. 액세스 권한은 `링크가 있는 모든 사용자`로 설정합니다.
5. 배포 후 발급되는 `웹 앱 URL`을 복사합니다.

### 4. 웹 앱 URL 연결

1. 이 저장소의 `sheet_config.js` 파일을 엽니다.
2. 아래 항목에 복사한 URL을 넣습니다.

```js
window.TAEHWA_CONFIG = {
  storageMode: "google-sheets",
  googleSheetsWebAppUrl: "여기에_웹앱_URL_입력",
  saveFallbackToLocal: true
};
```

3. 저장 후 GitHub에 커밋/푸시합니다.
4. GitHub Pages가 다시 배포되면 설문 응답이 Google Sheets로 저장됩니다.

### 5. 기업별 Google Docs 자동 생성 구조

응답 저장이 성공하면 Apps Script가 아래 작업을 함께 수행합니다.

1. `responses` 시트에 응답 한 줄 저장
2. Google Drive에 `AI훈련코치_기업별_결과보고서` 폴더 확인
3. `기업명_AI훈련코치_결과분석보고서` 형식의 Google Docs 생성 또는 갱신
4. 문서 안에 아래 내용을 자동 정리
   - 기본 정보
   - 핵심 경영 이슈
   - 우선 검토 조직
   - 컨설팅 목표
   - A1~B7 세부 점수
   - 항목별 개선책
   - 자동 총평
   - 강사회 메모
5. 생성된 문서 ID/URL을 시트의 `reportDocId`, `reportDocUrl` 컬럼에 기록

즉, 같은 기업이 다시 저장되면 문서가 새로 늘어나기보다 기존 기업 문서를 최신 상태로 갱신하는 방식입니다.

### 6. NotebookLM 연결 방법

가장 추천하는 방법은 `기업별 Google Docs`를 NotebookLM 소스로 연결하는 것입니다.

1. NotebookLM에서 새 노트북을 생성합니다.
2. `소스 추가`에서 Google Drive를 선택합니다.
3. `AI훈련코치_기업별_결과보고서` 폴더 안의 해당 기업 Google Docs를 선택합니다.
4. 한 번 연결해 두면, 문서가 Apps Script에 의해 갱신될 때 NotebookLM에서 동기화해 최신 내용을 반영할 수 있습니다.

추천 운영:

1. 기업이 설문 작성 후 `응답 저장`
2. Apps Script가 Google Sheets 저장 + Google Docs 갱신
3. 강사회는 NotebookLM에서 해당 Google Docs를 열어 질의
4. 필요 시 관리자 대시보드에서 PDF/PPT도 별도 생성

### 7. NotebookLM 질문 예시

- `이 기업의 가장 시급한 개선 과제 3가지를 근거와 함께 정리해줘`
- `A1 시스템 점수가 낮은 이유와 실행 가능한 개선 단계를 3단계로 설명해줘`
- `강사회 회의용 1분 브리핑 문안으로 다시 써줘`
- `이 기업에 맞는 AI 컨설팅 우선 로드맵을 표로 정리해줘`
- `현장 실무자 교육과 관리자 교육을 분리해서 제안해줘`

## 저장 방식 설명

- `storageMode: "google-sheets"` + URL 입력 완료
  - 설문 응답을 Google Sheets로 저장합니다.
  - 관리자 페이지에서도 중앙 응답 목록을 불러옵니다.
- URL 미입력
  - 테스트용으로 브라우저 `localStorage`에 임시 저장됩니다.
  - 같은 브라우저, 같은 PC에서만 확인됩니다.
- `saveFallbackToLocal: true`
  - Google Sheets 저장에 실패할 때 임시로 로컬 저장을 허용합니다.

## 관리자 대시보드

- 로컬 확인용: `admin_dashboard.html`
- Google Sheets 연동 완료 후:
  - 설문 응답을 중앙에서 모아 볼 수 있습니다.
  - 검색, 점수 요약, 항목별 상세 확인이 가능합니다.
  - PDF/PPT 저장이 가능합니다.

## 사용 흐름

1. 설문자가 문항을 체크합니다.
2. `결과 보기` 버튼으로 종합 결과를 확인합니다.
3. `응답 저장` 버튼으로 결과를 저장합니다.
4. 관리자는 관리자 대시보드에서 누적 결과를 확인합니다.

## 비고

- GitHub Pages는 정적 웹 호스팅이라서 자체적으로 DB 저장 기능이 없습니다.
- 그래서 중앙 저장이 필요할 때는 Google Sheets, Airtable, Firebase 같은 외부 저장소 연동이 필요합니다.
- 현재 버전은 Google Sheets 연동형으로 확장 가능한 구조로 정리되어 있습니다.
