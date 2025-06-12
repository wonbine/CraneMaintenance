# 크레인 관리 대시보드 - 구글 스프레드시트 연동 가이드

3개의 구글 스프레드시트 파일이 필요합니다:

## 1. 크레인 목록 시트 구조
| crane_id | status | location | model | last_maintenance_date | next_maintenance_date | is_urgent |
|----------|--------|----------|--------|----------------------|----------------------|-----------|
| CR-001 | operating | 창고 A | Liebherr LTM 1030 | 2024-05-15 | 2024-06-15 | false |
| CR-002 | maintenance | 부두 B | Manitowoc 18000 | 2024-05-20 | 2024-06-10 | false |
| CR-003 | operating | 야드 C | Terex RT780 | 2024-05-10 | 2024-06-05 | true |
| CR-004 | urgent | 저장소 D | Liebherr LTM 1055 | 2024-04-30 | 2024-05-30 | true |
| CR-005 | operating | 항구 E | Grove GMK4100L | 2024-05-18 | 2024-06-18 | false |

## 2. 고장 이력 시트 구조
| crane_id | date | failure_type | description | severity | downtime | cause | reported_by |
|----------|------|--------------|-------------|----------|----------|-------|-------------|
| CR-002 | 2024-05-19 | hydraulic | 유압 펌프 고장으로 인한 리프팅 능력 상실 | high | 24 | 씰 마모 및 오염 | 운영팀 |
| CR-004 | 2024-04-29 | electrical | 메인 제어 회로 차단기 반복 작동 | critical | 48 | 모터 베어링 마모로 인한 과부하 | 현장 감독관 |
| CR-003 | 2024-04-24 | mechanical | 와이어 로프의 마모 및 해어짐 징후 | medium | 12 | 교체 주기 초과로 인한 정상 마모 | 안전 검사관 |

## 3. 수리 이력 시트 구조
| crane_id | date | type | technician | status | notes | duration | cost | related_failure_id |
|----------|------|------|------------|--------|-------|----------|------|-------------------|
| CR-001 | 2024-05-15 | routine | 김철수 | completed | 정기 점검 및 윤활 | 4 | 25000 | |
| CR-002 | 2024-05-20 | repair | 이영희 | in_progress | 유압 시스템 수리 | 8 | 75000 | 1 |
| CR-003 | 2024-05-10 | preventive | 박민수 | completed | 브레이크 시스템 점검 | 2 | 15000 | |
| CR-004 | 2024-04-30 | emergency | 최정우 | completed | 비상 케이블 교체 | 12 | 120000 | 2 |
| CR-005 | 2024-05-18 | inspection | 정미경 | completed | 안전 점검 | 3 | 18000 | |

## 구글 스프레드시트 설정 방법

1. **스프레드시트 생성**: 각각의 시트를 별도 파일로 생성하거나, 하나의 파일에 3개 탭으로 생성
2. **공개 설정**: 파일을 "링크가 있는 모든 사용자"로 공유 설정
3. **CSV URL 생성**: 
   - 단일 파일인 경우: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=SHEET_GID`
   - 별도 파일인 경우: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv`

## 대시보드 설정
1. 대시보드에서 "Configure" 버튼 클릭
2. 3개의 CSV URL 입력:
   - 크레인 목록 시트 URL
   - 고장 이력 시트 URL  
   - 수리 이력 시트 URL
3. "Sync Data" 버튼으로 데이터 동기화

## 예시 URL 형식
```
크레인 목록: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/export?format=csv&gid=0
고장 이력: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/export?format=csv&gid=123456789
수리 이력: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/export?format=csv&gid=987654321
```