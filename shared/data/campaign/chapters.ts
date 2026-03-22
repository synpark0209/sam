import { PROLOGUE } from './prologue.ts';
import { CHAPTER_1 } from './chapter1.ts';
import { CHAPTER_2 } from './chapter2.ts';
import type { Chapter } from '../../types/campaign.ts';

export const ALL_CHAPTERS: Chapter[] = [
  PROLOGUE,
  CHAPTER_1,
  CHAPTER_2,
  // TODO: CHAPTER_3 ~ CHAPTER_10 추가
];

export function getChapter(id: string): Chapter | undefined {
  return ALL_CHAPTERS.find(c => c.id === id);
}
