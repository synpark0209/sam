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
TitleScene → WorldMapScene → DialogueScene → BattleScene → DialogueScene → WorldMapScene
```

### 1.4 BattleScene FSM
```
IDLE → UNIT_SELECTED → MOVING → AWAITING_ACTION → [ATTACK|SKILL|WAIT] → ANIMATING → IDLE
```

### 1.5 카메라 시스템
- **메인 카메라**: 줌/드래그 스크롤 (전투 맵 렌더링)
- **UI 카메라**: 줌 1x, 스크롤 0 (턴 정보, 버튼, 메뉴 고정 표시)
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
| GridSystem | `client/src/game/systems/GridSystem.ts` | 그리드 이동/경로/범위 계산 |
| CombatSystem | `client/src/game/systems/CombatSystem.ts` | 전투 데미지/반격 계산 |
| TurnSystem | `client/src/game/systems/TurnSystem.ts` | 턴 관리, 승리 조건 |
| AISystem | `client/src/game/systems/AISystem.ts` | 적 AI 행동 계획 |
| SkillSystem | `client/src/game/systems/SkillSystem.ts` | 스킬 실행/타겟팅 |
| ExperienceSystem | `client/src/game/systems/ExperienceSystem.ts` | 경험치/레벨업 |
| CampaignManager | `client/src/game/systems/CampaignManager.ts` | 캠페인 진행/세이브 |
| AudioManager | `client/src/game/systems/AudioManager.ts` | Web Audio API 프로시저럴 BGM/SFX |
| SpriteGenerator | `client/src/game/systems/SpriteGenerator.ts` | 96x96 프로시저럴 유닛/타일 스프라이트 |
| UnitSpriteManager | `client/src/game/systems/UnitSpriteManager.ts` | 외부 PNG 유닛 이미지 로딩/폴백 |

## 4. 현재 구현 상태

### 4.1 완료된 기능
- [x] 타일맵 전투 (12x10 그리드)
- [x] 6병종 (보병/기병/궁병/책사/도적/무도가)
- [x] 반격 시스템 (50% 데미지)
- [x] 계략 9종 (화계/수계/회복/독계/혼란/격려/방어강화/화살비/돌격)
- [x] 경험치/레벨업
- [x] 장비 3슬롯 (무기/방어구/악세서리)
- [x] 캠페인 3챕터 (대화/월드맵)
- [x] 온라인 서버 (인증/세이브/랭킹/PvP)
- [x] 텔레그램 미니앱 배포
- [x] AI 유닛 이미지 (6병종 x 2진영)
- [x] 카메라 줌/드래그 스크롤
- [x] UI 카메라 분리
- [x] 프로시저럴 BGM 4종 + SFX 11종

### 4.2 미구현 (GDD 기준)
- [ ] "방구석 여포뎐" 시나리오 10챕터
- [ ] 분기 시스템 (의리/야망 게이지)
- [ ] 승급(전직) 시스템
- [ ] 보물 시스템 (Lv.1~9 성장)
- [ ] 고유 스킬 + 장착 스킬 구조
- [ ] 협공/ZOC 시스템
- [ ] 지형 다양화 (11종)
- [ ] 미니게임 (원문사격)
- [ ] 일일 던전/무한의 탑
- [ ] 가챠 시스템
- [ ] 길드/레이드
- [ ] 시즌 패스
- [ ] 데일리 미션
- [ ] 스태미나 시스템
- [ ] 자동 전투 AI
- [ ] 배속 (2x/3x)

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
| `types/unit.ts` | Faction, UnitStats, UnitData |
| `types/battle.ts` | TurnPhase, BattleState |
| `types/campaign.ts` | Stage, BattleConfig, Chapter |
| `types/skill.ts` | SkillDef, SkillEffect |
| `types/equipment.ts` | Equipment, EquipmentSlot |
| `types/grid.ts` | Position, TileData, TileType |
| `types/dialogue.ts` | DialogueEvent |

### 6.2 데이터 파일
| 파일 | 내용 |
|------|------|
| `data/skillDefs.ts` | 스킬 정의 (추가만으로 새 스킬 생성) |
| `data/unitClassDefs.ts` | 병종별 지형 이동비용/특성 |
| `data/equipmentDefs.ts` | 장비 정의 |
| `data/campaign/chapters.ts` | 챕터 목록 |
| `data/campaign/chapter1.ts` | 챕터 1 상세 (대화/맵/적 유닛) |

## 7. 개발 우선순위

1. **시나리오 리빌드**: "방구석 여포뎐" 시나리오로 교체 (챕터 1~3 우선)
2. **전투 시스템 고도화**: 협공, ZOC, 상성, 지형 다양화
3. **스킬 시스템 재설계**: 고유 스킬 + 장착 스킬 구조
4. **성장 시스템**: 승급, 보물, 각성
5. **모바일 UI/UX**: 메인 화면, 장수 관리, 장비 관리
6. **일반 모드**: 일일 던전, 무한의 탑
7. **소셜**: PvP 개선, 길드
8. **수익화**: 가챠, 시즌패스, 스태미나
