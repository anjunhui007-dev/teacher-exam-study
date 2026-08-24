# Teacher Exam Study

초등교사 임용시험 대비 교육과정 학습용 PC·태블릿 웹앱입니다.

## 현재 구현 기능

- 상단 과목 바
- 과목별 실제 세부 영역을 동적으로 표시
- 총론 / 창의적 체험활동 / 통합교과 포함
- 설정에서 상단에 표시할 과목 선택
- 설정에서 과목별 영역의 `표시` / `회독·학습` 여부를 각각 선택
- 과목별 회독 수와 현재 회독 진행률 표시
- 과목 화면 안에서만 해당 과목 JSON 업로드
- 기존 자료를 유지하면서 같은 과목 자료 병합
- 원문 그대로 보존
- 문단 / 제목 / 각주 / 표 블록 렌더링
- 원문 강조 표시 보존
- 어절을 직접 터치하여 가리기 범위 설정
- 가려진 어절을 하나씩 터치해 공개
- 타이핑 빈칸에 들어갈 말만 입력하여 자동 채점
- 타이핑 채점 방식 선택: 유연 / 엄격 / 직접 확인
- 틀린 어절 자동 저장 및 약점 보충 페이지 재학습
- PDF 변환 시 애매한 자료를 `검수함`에 보존
- 검수함에서 나중에 기존 영역 또는 새 영역에 직접 포함 / 제외 처리
- OpenAI / Gemini API 제공자 설정 자리만 준비 (실제 API 호출 비활성)
- 브라우저 localStorage에 원문, 설정, 회독, 가리기, 오답 기록 저장

## 실행

GitHub Pages로 배포하거나 저장소를 내려받아 정적 웹 서버에서 실행할 수 있습니다.

> ES module을 사용하므로 `file://` 직접 실행보다 GitHub Pages 또는 로컬 웹 서버 사용을 권장합니다.

## 권장 교육과정 JSON 형식 (schemaVersion 5)

앞으로 PDF에서 과목별로 분리할 때 이 형식을 기준으로 생성합니다. 과목마다 영역 이름과 개수는 고정하지 않습니다. PDF의 실제 구조를 그대로 `sections`에 넣으면 앱이 자동으로 탭과 설정 항목을 생성합니다.

```json
{
  "schemaVersion": 5,
  "contentType": "curriculum",
  "subject": {
    "id": "korean",
    "name": "국어",
    "sections": [
      {
        "id": "reading",
        "name": "읽기",
        "group": "성취기준",
        "items": [
          {
            "id": "kor-reading-001",
            "title": "읽기 영역 원문",
            "originalText": "교육과정 원문 그대로",
            "source": {
              "page": 123,
              "document": "원본 PDF 파일명"
            },
            "highlightWords": [],
            "blocks": [
              {
                "type": "paragraph",
                "segments": [
                  { "text": "원문 그대로", "highlight": false }
                ]
              }
            ]
          }
        ]
      }
    ],
    "reviewItems": [
      {
        "id": "review-kor-001",
        "status": "pending",
        "title": "검토가 필요한 자료",
        "reason": "교육과정과 관련은 있으나 앱의 공식 학습 본문인지 불명확",
        "suggestedSectionId": "reading",
        "suggestedSectionName": "읽기",
        "originalText": "원문 그대로 보존",
        "source": { "page": 124 }
      }
    ]
  }
}
```

### 표 블록

```json
{
  "type": "table",
  "rows": 2,
  "cols": 3,
  "cells": [
    {
      "row": 0,
      "col": 0,
      "rowspan": 1,
      "colspan": 1,
      "segments": [{ "text": "영역", "highlight": false }]
    }
  ]
}
```

## 데이터 원칙

- `originalText`는 교육과정 원문 보존 영역이며 학습 기능이 수정하지 않습니다.
- 표와 강조 등 시각 구조는 `blocks`로 별도 보존합니다.
- 가리기 위치, 회독, 오답, 타이핑 기록은 사용자 데이터로 분리합니다.
- PDF에서 분류가 확실하지 않은 내용은 임의 삭제하지 않고 `reviewItems`로 보냅니다.
- `reviewItems`는 앱의 검수함에서 나중에 사용자가 직접 포함 또는 제외할 수 있습니다.
- 과목별 영역은 하드코딩하지 않습니다. PDF에 새로운 영역이 있어도 JSON의 `sections`에 넣으면 앱이 자동으로 표시합니다.

## 향후 확장

- 맥락형 문제
- 임용형 서술 문항
- AI 문제 생성 / 답안 피드백
- 전체 데이터 백업 / 복원 고도화
- 복습 간격 알고리즘
- 과목 / 영역 순서 드래그 변경
- 다크 모드

## 보안

API 키를 프론트엔드 코드나 localStorage에 직접 저장하지 않습니다. 실제 AI 기능 연결 시 Cloudflare Workers 등 서버 측 프록시에서 키를 보관하는 구조를 권장합니다.
