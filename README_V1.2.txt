영업관리 시스템 사용자 웹용 WEB V1.2

교체 파일:
- app.js
- index.html

핵심 수정:
- 전체 백업 불러오기를 브라우저 native label → file input 방식으로 변경
- FileReader로 JSON 읽기
- attachEvents와 독립적으로 onchange에서 직접 복원 실행
- 파일 선택 후 접수내역/매니저 건수 확인창 표시
- Google Drive 저장 후 다시 읽어서 실제 저장 건수 검증
- 성공/실패 alert 표시
- app.js 캐시 버전 갱신

GitHub의 app.js, index.html 두 파일을 교체하고 Commit changes 후 Ctrl+F5.
