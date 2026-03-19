import { CHAPTER_1 } from './chapter1.ts';
import type { Chapter } from '../../types/campaign.ts';

// 2장, 3장은 추후 chapter2.ts, chapter3.ts로 분리 가능
// 현재는 placeholder 데이터

export const ALL_CHAPTERS: Chapter[] = [
  CHAPTER_1,
  // TODO: CHAPTER_2, CHAPTER_3 추가
];

export function getChapter(id: string): Chapter | undefined {
  return ALL_CHAPTERS.find(c => c.id === id);
}
