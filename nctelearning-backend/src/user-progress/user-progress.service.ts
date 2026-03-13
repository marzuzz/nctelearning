import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProgress } from './entities/user-progress.entity';

export interface CreateUserProgressDto {
  userId: string;
  lessonId: string;
  timeSpentMinutes?: number;
}

@Injectable()
export class UserProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private progressRepository: Repository<UserProgress>,
  ) {}

  async create(createProgressDto: CreateUserProgressDto): Promise<UserProgress> {
    const progress = this.progressRepository.create(createProgressDto);
    return this.progressRepository.save(progress);
  }

  async findByUser(userId: string): Promise<UserProgress[]> {
    return this.progressRepository.find({
      where: { userId },
      relations: ['lesson', 'lesson.course'],
      order: { completedAt: 'DESC' },
    });
  }

  async findByLesson(lessonId: string): Promise<UserProgress[]> {
    return this.progressRepository.find({
      where: { lessonId },
      relations: ['user'],
      order: { completedAt: 'DESC' },
    });
  }

  async hasCompleted(userId: string, lessonId: string): Promise<boolean> {
    const progress = await this.progressRepository.findOne({
      where: { userId, lessonId },
    });
    return !!progress;
  }

  async getCompletionStats(userId: string): Promise<{ completed: number; total: number }> {
    const completed = await this.progressRepository.count({
      where: { userId },
    });
    
    // This would need to be calculated based on available lessons
    // For now, returning a placeholder
    return { completed, total: 0 };
  }
}
