# JOJO 프로젝트 - 삼국지 조조전 웹 게임

## 프로젝트 개요
1998년 KOEI 삼국지 조조전(SRPG)을 웹/텔레그램 미니앱으로 재현하는 프로젝트.
원작을 충실히 구현한 후, 추가 콘텐츠와 온라인 요소를 확장하는 방식.

## 현재 상태
- Phase 1 완료 (기본 전투 프로토타입)
- Phase 2 완료 (병종, 반격, 계략, 경험치, 장비)
- Phase 3 완료 (스토리 캠페인: 대화/월드맵/타이틀/세이브)
- Phase 4 완료 (온라인 서버: NestJS/PostgreSQL/JWT/서버세이브/랭킹)
- 다음: Phase 5 (텔레그램 미니앱)

## 기술 스택
- **게임 엔진**: Phaser.js 3 (2D)
- **UI 레이어**: React + TypeScript
- **빌드**: Vite 5
- **백엔드**: NestJS + TypeORM + PostgreSQL
- **인증**: JWT (passport-jwt, bcrypt)
- **플랫폼**: 웹 브라우저 + Telegram Mini App (Phase 5 예정)

## 개발 로드맵
1. ~~Phase 1 - 프로토타입 (핵심 전투 시스템)~~ ✓
2. ~~Phase 2 - 게임 시스템 확장 (병종, 지형, 계략, 레벨업, 장비)~~ ✓
3. ~~Phase 3 - 스토리 & 콘텐츠 (대화, 챕터, 캠페인)~~ ✓
4. ~~Phase 4 - 온라인 & 서버 (인증, 서버 세이브, 랭킹)~~ ✓
5. Phase 5 - 텔레그램 미니앱 통합
6. Phase 6 - 확장 콘텐츠 (신규 시나리오, 길드, 시즌)

## 아키텍처
- Phaser = 게임 렌더링, React = 오버레이 UI, EventBus로 통신
- 게임 로직 시스템들은 Phaser 의존성 없는 순수 TS 클래스
- BattleScene FSM: IDLE→UNIT_SELECTED→MOVING→AWAITING_ACTION→[ATTACK|SKILL|WAIT]→ANIMATING→IDLE
- 씬 흐름: TitleScene → WorldMapScene → DialogueScene → BattleScene → DialogueScene → WorldMapScene
- CampaignManager: 서버 전용 세이브/로드 (localStorage 제거), 유닛 영속
- 서버 API: POST /auth/register, POST /auth/login, GET /save, POST /save, GET /save/ranking

## 핵심 시스템 (Phase 2)
- **병종**: 보병/기병/궁병/책사/도적/무도가 (클래스별 지형 이동비용 차등)
- **반격**: 방어자 생존 시 50% 데미지 반격
- **계략**: 화계/수계/회복/독계/혼란/격려/방어강화/화살비/돌격
- **경험치**: 공격/킬/힐/스킬로 EXP 획득, 100 EXP당 레벨업
- **장비**: 무기/방어구/악세서리 슬롯, 스탯 보정

## 규칙 및 컨벤션
- TypeScript strict mode (erasableSyntaxOnly: false)
- 서버 권위적 구조 (미래 서버 이식 대비)
- 클라이언트/서버 공유 로직은 `shared/`에 배치
- 에셋은 직접 제작 또는 오픈소스 사용 (원작 에셋 사용 금지)
- getEffectiveStats()가 base + 장비 + 상태효과를 합산하는 단일 진실 소스
- 스킬은 데이터 기반 (shared/data/skillDefs.ts에 추가만으로 새 스킬 생성)

## 대화 로그
대화별 상세 기록은 `docs/conversations/` 디렉토리에 저장됩니다.
