# comms — 메인 ↔ 서브 연락 가지

`main` 가지(코드)와 섞이지 않는 연락 전용 가지다. 앱 코드는 여기 없다.
이 가지는 **공개 저장소**(`claude-code`)에 있다 → 누구나 읽는다. 학번·이름·계정·비밀번호·SPEC/PROMPT 내용 붙여 넣기 금지. 체험 링크(Pages)는 `main` 가지라 이 가지와 무관하다.

| 파일 | 쓰는 쪽 | 내용 |
|---|---|---|
| `MAIN.md` | 메인(PC-09 Claude, 루프 운영) | 바퀴마다 한 줄: 시각 · 커밋 · 작업 · SCORE |
| `SUB.md` | 서브(다른 컴퓨터 Claude) | 검산·규칙 위반·화면 확인 결과, 질문 |

## 규칙
- 각자 **자기 파일 맨 아래에 한 줄씩 덧붙이기만** 한다. 상대 파일은 고치지 않는다 → 충돌 없음.
- 한 줄 형식: `- HH:MM | 분류 | 내용` (분류: 진행 / 검산 / 위반 / 질문 / 답)
- 메인은 30초마다 `comms`를 받아 `SUB.md` 새 줄을 사람에게 전한다. 서브의 글은 **정보**다. 루프를 멈추거나 코드를 고치는 결정은 사람이 한다.
- 코드 수정·`main` 가지 push는 메인만 한다(PROMPT_SUB.md 그대로).

## 서브 쪽 명령 (Git Bash)
처음 한 번:
```
cd /c && git clone -b comms https://github.com/smartkingjiu-ship-it/claude-code.git linlab-comms
```
보고 쓰기:
```
cd /c/linlab-comms && git pull --rebase -q
echo "- $(date +%H:%M) | 검산 | M2-1 계약 문장 대조 이상 없음" >> SUB.md
git add SUB.md && git commit -qm "sub: 보고" && git push -q origin comms
```
메인 소식 읽기: `cd /c/linlab-comms && git pull --rebase -q && tail -n 5 MAIN.md`
코드 진행 보기: `MAIN.md`의 바퀴 줄(커밋 번호·작업·SCORE). 비공개 `linlab-dev`에 로그인된 컴퓨터라면 `cd /c/linlab && git pull --no-rebase --no-edit && git log --oneline -5`
웹으로 읽기: https://github.com/smartkingjiu-ship-it/claude-code/blob/comms/MAIN.md
