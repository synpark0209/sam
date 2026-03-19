import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class PvpRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  player1Id: number;

  @Column()
  player2Id: number;

  @Column({ nullable: true })
  winnerId: number;

  @Column()
  player1Name: string;

  @Column()
  player2Name: string;

  @Column({ default: 0 })
  eloDelta: number;

  @CreateDateColumn()
  createdAt: Date;
}
