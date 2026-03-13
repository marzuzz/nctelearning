import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_question_options')
export class QuizQuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  questionId: string;

  @Column({ type: 'text' })
  optionText: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column()
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => QuizQuestion, (question) => question.options)
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;
}
