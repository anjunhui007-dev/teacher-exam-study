# Teacher Exam Study

초등교사 임용시험 대비 교육과정 학습용 PC·태블릿 웹앱입니다.

## 현재 구현 기능

- 상단 과목 바
- 과목별 세부 영역 이동
- 총론 아래 `총론 / 창의적 체험활동` 구조
- `통합교과` 포함
- 설정에서 표시할 과목 선택
- JSON 교육과정 자료 업로드 및 병합
- 원문 그대로 보존
- 어절을 직접 터치하여 가리기 범위 설정
- 가려진 어절을 하나씩 터치해 공개
- 타이핑 학습
- 타이핑 채점 방식 선택
  - 유연 채점
  - 엄격 채점
  - 직접 확인
- 브라우저 localStorage에 설정/학습 정보 저장
- OpenAI / Gemini API 제공자 설정 자리만 준비 (실제 API 호출 비활성)

## 실행

GitHub Pages로 배포하거나 저장소를 내려받아 정적 웹 서버에서 실행할 수 있습니다.

> ES module을 사용하므로 `file://`로 직접 여는 것보다 GitHub Pages 또는 간단한 로컬 웹 서버 사용을 권장합니다.

## 교육과정 업로드 형식

`data/sample.json` 참고.

```json
{
  "schemaVersion": 1,
  "contentType": "curriculum",
  "subjects": [
    {
      "id": "korean",
      "name": "국어",
      "sections": [
        {
          "id": "teaching",
          "name": "교수·학습",
          "items": [
            {
              "id": "kor-teaching-001",
              "title": "교수·학습의 방향",
              "originalText": "교육과정 원문 그대로"
            }
          ]
        }
      ]
    }
  ]
}
```

`originalText`는 원문 보존 영역입니다. 가리기 위치와 학습 기록은 별도의 사용자 데이터로 저장하므로 원문 자체는 수정하지 않습니다.

## 다음 확장 예정

- 과목/영역 순서 드래그 변경
- 학습 범위와 표시 범위 분리
- 복습 알고리즘 및 오답노트
- 부분 타이핑 채점 개선
- 맥락형 문제 슬롯
- AI 문제 생성/서술형 채점
- 백업/복원
- 다크 모드

## 보안

API 키를 프론트엔드 코드나 localStorage에 직접 저장하지 않습니다. 실제 AI 기능 연결 시 Cloudflare Workers 등 서버 측 프록시에서 키를 보관하는 구조를 권장합니다.
