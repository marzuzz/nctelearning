import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EssayExercise } from './essay-exercise.entity';
import { User } from '../../users/entities/user.entity';

@Entity('essay_submissions')
export class EssaySubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  exerciseId: string;

  @Column()
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  wordCount: number;

  @Column({ nullable: true })
  timeSpentMinutes: number;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column({ nullable: true })
  gradedAt: Date;

  @Column({ nullable: true })
  grade: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => EssayExercise, (exercise) => exercise.submissions)
  @JoinColumn({ name: 'exerciseId' })
  exercise: EssayExercise;

  @ManyToOne(() => User, (user) => user.essaySubmissions)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Helper methods
  get isGraded(): boolean {
    return this.gradedAt !== null;
  }

  get gradeFormatted(): string {
    if (this.grade === null) return 'Chưa chấm';
    return `${this.grade}/100`;
  }

  get wordCountFormatted(): string {
    return `${this.wordCount || 0} từ`;
  }
}
