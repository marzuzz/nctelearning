import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lesson } from '../../lessons/entities/lesson.entity';

@Entity('user_progress')
@Unique(['userId', 'lessonId'])
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  lessonId: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  completedAt: Date;

  @Column({ nullable: true })
  timeSpentMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.progress)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}
