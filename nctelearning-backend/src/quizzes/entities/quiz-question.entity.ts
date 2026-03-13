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
import { Quiz } from './quiz.entity';
import { QuizQuestionOption } from './quiz-question-option.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  ESSAY = 'essay',
}

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  quizId: string;

  @Column({ type: 'text' })
  questionText: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  questionType: QuestionType;

  @Column()
  orderIndex: number;

  @Column({ default: 1 })
  points: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Quiz, (quiz) => quiz.questions)
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @OneToMany(() => QuizQuestionOption, (option) => option.question)
  options: QuizQuestionOption[];

  @OneToMany(() => QuizAttemptAnswer, (answer) => answer.question)
  attemptAnswers: QuizAttemptAnswer[];

  // Helper methods
  get correctOption(): QuizQuestionOption | undefined {
    return this.options?.find(option => option.isCorrect);
  }

  isMultipleChoice(): boolean {
    return this.questionType === QuestionType.MULTIPLE_CHOICE;
  }

  isEssay(): boolean {
    return this.questionType === QuestionType.ESSAY;
  }
}
