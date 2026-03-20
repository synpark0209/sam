/**
 * 유닛 스프라이트 PNG 생성 스크립트
 *
 * 사용법: npx tsx scripts/generate-unit-sprites.ts
 *
 * AI 이미지로 교체 시:
 * - client/public/assets/units/ 디렉토리에 아래 파일명으로 저장
 * - 크기: 96x96px, 배경 투명(PNG)
 * - 파일명: {병종}_{진영}.png
 *
 * 필요한 파일 목록:
 *   infantry_player.png    - 아군 보병 (파란 갑옷, 검)
 *   infantry_enemy.png     - 적군 보병 (빨간 갑옷, 검)
 *   cavalry_player.png     - 아군 기병 (말 탄 파란 기사, 창)
 *   cavalry_enemy.png      - 적군 기병 (말 탄 빨간 기사, 창)
 *   archer_player.png      - 아군 궁병 (파란 경갑, 활)
 *   archer_enemy.png       - 적군 궁병 (빨간 경갑, 활)
 *   strategist_player.png  - 아군 책사 (파란 로브, 부채, 관모)
 *   strategist_enemy.png   - 적군 책사 (빨간 로브, 부채, 관모)
 *   bandit_player.png      - 아군 도적 (파란 복면, 쌍검)
 *   bandit_enemy.png       - 적군 도적 (빨간 복면, 쌍검)
 *   martial_artist_player.png - 아군 무도가 (파란 도복, 주먹)
 *   martial_artist_enemy.png  - 적군 무도가 (빨간 도복, 주먹)
 *
 * AI 프롬프트 예시 (DALL-E / Midjourney):
 *   "Chibi SD style Three Kingdoms warrior, infantry with sword and blue armor,
 *    96x96 pixel art, transparent background, front-facing, cute proportions"
 */

console.log('=== 유닛 스프라이트 이미지 사양 ===');
console.log('');
console.log('AI 이미지 생성 도구에서 아래 사양으로 이미지를 생성하세요:');
console.log('');
console.log('크기: 96x96 픽셀');
console.log('배경: 투명 (PNG)');
console.log('스타일: 삼국지 치비/SD 캐릭터 픽셀아트');
console.log('방향: 정면 또는 3/4 각도');
console.log('');
console.log('저장 위치: client/public/assets/units/');
console.log('');
console.log('파일 목록:');
const classes = ['infantry', 'cavalry', 'archer', 'strategist', 'bandit', 'martial_artist'];
const factions = ['player', 'enemy'];
for (const cls of classes) {
  for (const fac of factions) {
    console.log(`  ${cls}_${fac}.png`);
  }
}
