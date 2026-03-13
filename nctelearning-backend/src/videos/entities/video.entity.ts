import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lesson } from '../../lessons/entities/lesson.entity';
import { GradeLevel } from '../../users/entities/user.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_id', nullable: true })
  lessonId: string | null;

  @Column({ name: 'grade_level', type: 'varchar', length: 10 })
  gradeLevel: GradeLevel;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'video_url' })
  videoUrl: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @Column({ name: 'file_size_mb', nullable: true })
  fileSizeMb: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Lesson, (lesson) => lesson.videos, { nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  // Helper methods
  get durationFormatted(): string {
    if (!this.durationSeconds) return '0:00';
    
    const minutes = Math.floor(this.durationSeconds / 60);
    const seconds = this.durationSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
