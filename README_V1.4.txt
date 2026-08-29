영업관리 시스템 사용자 웹용 WEB V1.4

수정 내용
1. 백업 JSON 확인 후 브라우저 기본 confirm()을 사용하지 않습니다.
2. 프로그램 안에 '전체 백업 복원' 전용 중앙 팝업을 표시합니다.
3. 접수내역 건수 / 매니저 수를 중앙 팝업에서 확인 후 '복원하기'를 누릅니다.
4. 백업 데이터 적용 → Google Drive 저장 → Google Drive 재검증 순으로 진행합니다.
5. 우측 하단에 뜨던 안내문구(showToast)를 화면 중앙으로 변경했습니다.
6. app.js 캐시 버전을 갱신했습니다.

교체 파일
- app.js
- index.html

GitHub에서 두 파일 교체 → Commit changes → 1~2분 뒤 Ctrl+F5
