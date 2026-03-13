import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { GradeLevel } from '../../users/entities/user.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  lessonId: string;

  @Column({ name: 'grade_level', type: 'varchar', length: 10, nullable: true })
  gradeLevel: GradeLevel | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable:true })

  @Column({ nullable: true })
  timeLimitMinutes: number;

  @Column({ default: 3 })
  maxAttempts: number;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ name: 'practice_type', type: 'varchar', length: 10, nullable: true })
  practiceType: 'doc_hieu' | 'viet' | null;

  @Column({ name: 'topic', type: 'varchar', length: 32, nullable: true })
  topic: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Lesson, (lesson) => lesson.quizzes, { nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @OneToMany(() => QuizQuestion, (question) => question.quiz, { cascade: true, onDelete: 'CASCADE' })
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz, { cascade: true, onDelete: 'CASCADE' })
  attempts: QuizAttempt[];

  // Helper methods
  get totalPoints(): number {
    return this.questions?.reduce((sum, question) => sum + question.points, 0) || 0;
  }

  get questionCount(): number {
    return this.questions?.length || 0;
  }
}
