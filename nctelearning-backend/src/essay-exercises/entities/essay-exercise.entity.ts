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
import { EssaySubmission } from './essay-submission.entity';

@Entity('essay_exercises')
export class EssayExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  lessonId: string | null;

  @Column({ name: 'grade_level', type: 'varchar', length: 10, nullable: true })
  gradeLevel: GradeLevel | null;

  @Column()
  title: string;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ default: 200 })
  wordCountMin: number;

  @Column({ default: 1000 })
  wordCountMax: number;

  @Column({ default: 60 })
  timeLimitMinutes: number;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ name: 'practice_type', type: 'varchar', length: 10 })
  practiceType: 'doc_hieu' | 'viet';

  @Column({ name: 'topic', type: 'varchar', length: 32 })
  topic:
    | 'tho' // Thơ
    | 'truyen' // Truyện
    | 'ki' // Kí
    | 'nghi_luan' // Văn bản nghị luận
    | 'thong_tin' // Văn bản thông tin
    | 'nghi_luan_xa_hoi' // Nghị luận xã hội
    | 'nghi_luan_van_hoc';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Lesson, (lesson) => lesson.essayExercises, { nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson | null;

  @OneToMany(() => EssaySubmission, (submission) => submission.exercise)
  submissions: EssaySubmission[];

  // Helper methods
  get wordCountRange(): string {
    return `${this.wordCountMin} - ${this.wordCountMax} từ`;
  }

  get timeLimitFormatted(): string {
    return `${this.timeLimitMinutes} phút`;
  }
}
