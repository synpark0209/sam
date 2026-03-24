# 시스템 구현 문서

## 1. 아키텍처

### 1.1 전체 구조
```
client/          → Phaser 3 + React + TypeScript (Vite)
server/          → NestJS + TypeORM + PostgreSQL
shared/          → 클라이언트/서버 공유 타입 및 데이터
```

### 1.2 클라이언트 아키텍처
- **Phaser** = 게임 렌더링 (타일맵, 유닛, 애니메이션)
- **React** = 오버레이 UI (인증 모달, 유닛 정보 패널)
- **EventBus** = Phaser ↔ React 통신

### 1.3 씬 흐름
```
TitleScene → LobbyScene → WorldMapScene → DialogueScene → BattleScene → DialogueScene → WorldMapScene → LobbyScene
                        → BattleScene (자유전투)
                        → RankingScene
                        → 가챠 (LobbyScene 내)
                        → 장수관리 (LobbyScene 내)
```

### 1.4 BattleScene FSM
```
IDLE → UNIT_SELECTED → MOVING → AWAITING_ACTION → [ATTACK|SKILL|WAIT] → ANIMATING → IDLE
```

### 1.5 카메라 시스템
- **메인 카메라**: 줌/드래그 스크롤 (전투 맵 렌더링)
- **UI 카메라**: 줌 1x, 스크롤 0 (턴 정보, 버튼, 메뉴, 유닛 정보 패널 고정 표시)
- 줌 레벨: 화면 너비 기준 가로 ~7칸 보이도록 자동 계산

## 2. 서버 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/auth/register` | POST | 회원가입 |
| `/auth/login` | POST | 로그인 |
| `/auth/telegram` | POST | 텔레그램 자동 로그인 (initData 검증) |
| `/save` | GET | 게임 저장 로드 |
| `/save` | POST | 게임 저장 |
| `/save/ranking` | GET | 랭킹 조회 |
| `/pvp/match` | POST | PvP 매칭 |
| `/pvp/result` | POST | PvP 결과 기록 |
| `/pvp/ranking` | GET | PvP 랭킹 |

## 3. 주요 시스템 클래스

| 클래스 | 파일 | 역할 |
|--------|------|------|
| GridSystem | `client/src/game/systems/GridSystem.ts` | 그리드 이동/경로/범위/ZOC 계산 |
| CombatSystem | `client/src/game/systems/CombatSystem.ts` | 데미지/반격/상성/협공 계산 |
| TurnSystem | `client/src/game/systems/TurnSystem.ts` | 턴 관리, 승리 조건 |
| AISystem | `client/src/game/systems/AISystem.ts` | 적 AI 행동 계획 |
| SkillSystem | `client/src/game/systems/SkillSystem.ts` | 4슬롯 스킬 통합/실행/타겟팅 |
| ExperienceSystem | `client/src/game/systems/ExperienceSystem.ts` | 경험치/레벨업/승급/고유스킬해금 |
| CampaignManager | `client/src/game/systems/CampaignManager.ts` | 캠페인 진행/세이브 |
| AudioManager | `client/src/game/systems/AudioManager.ts` | Web Audio API 프로시저럴 BGM/SFX |
| SpriteGenerator | `client/src/game/systems/SpriteGenerator.ts` | 96x96 프로시저럴 유닛/타일 스프라이트 |
| UnitSpriteManager | `client/src/game/systems/UnitSpriteManager.ts` | 외부 PNG 유닛 이미지 로딩/폴백 |

## 4. 현재 구현 상태

### 4.1 완료된 기능
- [x] 타일맵 전투 (가변 크기 그리드)
- [x] 6병종 (보병/기병/궁병/책사/도적/무도가)
- [x] 반격 시스템 (50% 데미지)
- [x] 상성 시스템 (기병→보병→궁병→기병, 무도가→책사)
- [x] 협공 시스템 (인접 아군 시 20% 추가)
- [x] ZOC 시스템 (적 인접 칸 진입 시 이동 정지)
- [x] 보병 8방향 공격 (체비셰프 거리)
- [x] 공격 이펙트 (검궤적/화살투사체/마법진)
- [x] 스프라이트 방향 전환 (이동/공격 방향)
- [x] 4슬롯 스킬 시스템 (병종기본/고유/장착x2)
- [x] 병종 기본 스킬 3단계 진화 (6병종 x 3 = 18종)
- [x] 장수 고유 스킬 (시나리오 5종 + 가챠 14종)
- [x] 고유 스킬 Lv.20 해금
- [x] 승급(전직) 시스템 (Lv.15, Lv.30)
- [x] 경험치/레벨업
- [x] 장비 3슬롯 (무기/방어구/악세서리)
- [x] 캠페인 (프롤로그 + 2챕터, "방구석 여포뎐")
- [x] 현대인 시점 4차원 벽 깨기 대사
- [x] 온라인 서버 (인증/세이브/랭킹/PvP)
- [x] 텔레그램 미니앱 배포
- [x] AI 유닛 이미지 (6병종 x 2진영)
- [x] 카메라 줌/드래그 스크롤
- [x] UI 카메라 분리
- [x] 프로시저럴 BGM 4종 + SFX 11종
- [x] 음소거 토글 (모든 씬)
- [x] 로비 화면 (LobbyScene)
- [x] 장수 관리 (목록/상세)
- [x] 전투 유닛 정보 패널
- [x] 가챠 시스템 (UR/SSR/SR, 22명, 천장 90)
- [x] 등급 체계 (N/R/SR/SSR/UR)

### 4.2 미구현 (GDD 기준)
- [ ] 시나리오 챕터 3~10
- [ ] 분기 시스템 (의리/야망 게이지)
- [ ] 각성(한계돌파) 시스템 (★1~5)
- [ ] 장착 스킬 3단계 진화 (스킬서)
- [ ] 스킬 포인트 상점
- [ ] 장비 관리 UI (장착/해제)
- [ ] 보물 시스템 (Lv.1~9 성장)
- [ ] 일반 가챠 (금화)
- [ ] PvP 아레나 (자동 배치 대전)
- [ ] 일일 던전 (웨이브 자동전투)
- [ ] 무한의 탑 (로그라이크)
- [ ] 길드/레이드
- [ ] 시즌 패스
- [ ] 데일리 미션
- [ ] 스태미나 시스템
- [ ] 자동 전투 AI / 배속
- [ ] 미니게임 (원문사격)

## 5. 배포 정보

| 항목 | 값 |
|------|-----|
| GitHub | https://github.com/synpark0209/sam.git |
| Vercel (프론트) | sam-git-main-synpark0209s-projects.vercel.app |
| Railway (백엔드) | sam-production-5e94.up.railway.app |
| 텔레그램 봇 | @three_nations_bot |
| 텔레그램 앱 | t.me/three_nations_bot/newsam |

## 6. 데이터 구조 (shared/)

### 6.1 타입 파일
| 파일 | 내용 |
|------|------|
| `types/unit.ts` | Faction, UnitStats, UnitData (4슬롯 스킬, 각성, 승급) |
| `types/battle.ts` | TurnPhase, BattleState |
| `types/campaign.ts` | Stage, BattleConfig, Chapter |
| `types/skill.ts` | SkillDef, SkillEffect |
| `types/equipment.ts` | Equipment, EquipmentSlot |
| `types/grid.ts` | Position, TileData, TileType |
| `types/unitClass.ts` | UnitClass, UnitClassDef (diagonalAttack 포함) |
| `types/dialogue.ts` | DialogueEvent |
| `types/experience.ts` | LevelUpResult (승급 정보 포함) |

### 6.2 데이터 파일
| 파일 | 내용 |
|------|------|
| `data/skillDefs.ts` | 공용 스킬 + 병종 기본 스킬 18종 + 고유 스킬 19종 |
| `data/classSkillDefs.ts` | 병종별 기본 스킬 3단계 진화 경로 |
| `data/unitClassDefs.ts` | 병종별 지형 이동비용/8방향 공격 |
| `data/promotionDefs.ts` | 승급 경로 (6병종 x 2단계) |
| `data/gachaDefs.ts` | 가챠 장수 풀 22명, 확률, 로직 |
| `data/equipmentDefs.ts` | 장비 정의 |
| `data/campaign/prologue.ts` | 프롤로그 시나리오 |
| `data/campaign/chapter1.ts` | 챕터 1: 낙양의 야망 |
| `data/campaign/chapter2.ts` | 챕터 2: 봉의정의 달빛 |

## 7. 개발 우선순위

1. **일반 가챠 UI** - 금화 뽑기 추가
2. **일일 던전 / 무한의 탑** - 반복 콘텐츠
3. **장비 관리 UI** - 장착/해제
4. **자동 전투 / 배속** - 모바일 편의
5. **시나리오 추가** - 챕터 3~5
6. **PvP 아레나** - 자동 배치 대전
7. **각성 시스템** - 장수 한계돌파
8. **스킬 진화** - 장착 스킬 3단계
