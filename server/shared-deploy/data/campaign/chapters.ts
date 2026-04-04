import { PROLOGUE } from './prologue.ts';
import { CHAPTER_1 } from './chapter1.ts';
import { CHAPTER_2 } from './chapter2.ts';
import { CHAPTER_3 } from './chapter3.ts';
import { CHAPTER_4 } from './chapter4.ts';
import { CHAPTER_5 } from './chapter5.ts';
import { CHAPTER_6 } from './chapter6.ts';
import { CHAPTER_7 } from './chapter7.ts';
import { CHAPTER_8 } from './chapter8.ts';
import { CHAPTER_9 } from './chapter9.ts';
import { CHAPTER_10 } from './chapter10.ts';
import type { Chapter } from '../../types/campaign.ts';

export const ALL_CHAPTERS: Chapter[] = [
  PROLOGUE,
  CHAPTER_1,
  CHAPTER_2,
  CHAPTER_3,
  CHAPTER_4,
  CHAPTER_5,
  CHAPTER_6,
  CHAPTER_7,
  CHAPTER_8,
  CHAPTER_9,
  CHAPTER_10,
];

export function getChapter(id: string): Chapter | undefined {
  return ALL_CHAPTERS.find(c => c.id === id);
}
