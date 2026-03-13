import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../../users/entities/user.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  quizId: string;

  @Column()
  userId: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  totalPoints: number;

  @Column({ nullable: true })
  timeSpentMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Quiz, (quiz) => quiz.attempts)
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @ManyToOne(() => User, (user) => user.quizAttempts)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => QuizAttemptAnswer, (answer) => answer.attempt)
  answers: QuizAttemptAnswer[];

  // Helper methods
  get isCompleted(): boolean {
    return this.completedAt !== null;
  }

  get percentage(): number {
    if (this.totalPoints === 0) return 0;
    return Math.round((this.score / this.totalPoints) * 100);
  }

  get duration(): number {
    if (!this.completedAt) return 0;
    return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / 1000 / 60);
  }
}
