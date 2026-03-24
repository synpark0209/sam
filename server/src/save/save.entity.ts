import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class GameSave {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'jsonb' })
  campaignProgress: Record<string, unknown>;

  @Column({ default: 'prologue' })
  currentChapterId: string;

  @Column({ default: 0 })
  currentStageIdx: number;

  @Column({ default: 1 })
  maxLevel: number;

  @Column({ default: 1000 })
  gems: number;

  @Column({ default: 0 })
  gachaPity: number;

  @Column({ default: 1000 })
  pvpElo: number;

  @Column({ default: 0 })
  pvpWins: number;

  @Column({ default: 0 })
  pvpLosses: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
