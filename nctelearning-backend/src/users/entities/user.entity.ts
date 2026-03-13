import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { QuizAttempt } from '../../quizzes/entities/quiz-attempt.entity';
import { EssaySubmission } from '../../essay-exercises/entities/essay-submission.entity';
import { UserProgress } from '../../user-progress/entities/user-progress.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum GradeLevel {
  GRADE_10 = '10',
  GRADE_11 = '11',
  GRADE_12 = '12',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'grade_level',
    nullable: true,
  })
  gradeLevel: GradeLevel;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Course, (course) => course.createdBy)
  courses: Course[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.user)
  quizAttempts: QuizAttempt[];

  @OneToMany(() => EssaySubmission, (submission) => submission.user)
  essaySubmissions: EssaySubmission[];

  @OneToMany(() => UserProgress, (progress) => progress.user)
  progress: UserProgress[];

  // Helper methods
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isStudent(): boolean {
    return this.role === UserRole.USER;
  }
}
