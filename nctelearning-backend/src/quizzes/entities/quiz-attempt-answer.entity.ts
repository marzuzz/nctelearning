import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizQuestionOption } from './quiz-question-option.entity';

@Entity('quiz_attempt_answers')
export class QuizAttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attemptId: string;

  @Column()
  questionId: string;

  @Column({ nullable: true })
  selectedOptionId: string;

  @Column({ type: 'text', nullable: true })
  answerText: string;

  @Column({ nullable: true })
  isCorrect: boolean;

  @Column({ type: 'float', default: 0 })
  pointsEarned: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => QuizAttempt, (attempt) => attempt.answers)
  @JoinColumn({ name: 'attemptId' })
  attempt: QuizAttempt;

  @ManyToOne(() => QuizQuestion, (question) => question.attemptAnswers)
  @JoinColumn({ name: 'questionId' })
  question: QuizQuestion;

  @ManyToOne(() => QuizQuestionOption)
  @JoinColumn({ name: 'selectedOptionId' })
  selectedOption: QuizQuestionOption;
}
