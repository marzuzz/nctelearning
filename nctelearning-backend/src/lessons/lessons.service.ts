import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';

export interface CreateLessonDto {
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  durationMinutes?: number;
  isPublished?: boolean;
}

export interface UpdateLessonDto {
  title?: string;
  description?: string;
  orderIndex?: number;
  durationMinutes?: number;
  isPublished?: boolean;
}

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
  ) {}

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    const lesson = this.lessonsRepository.create(createLessonDto);
    return this.lessonsRepository.save(lesson);
  }

  async findAll(): Promise<Lesson[]> {
    return this.lessonsRepository.find({
      relations: ['course', 'videos', 'quizzes', 'essayExercises'],
      order: { orderIndex: 'ASC' },
    });
  }

  async findById(id: string): Promise<Lesson | null> {
    return this.lessonsRepository.findOne({
      where: { id },
      relations: ['course', 'videos', 'quizzes', 'essayExercises'],
    });
  }

  async findByCourse(courseId: string): Promise<Lesson[]> {
    return this.lessonsRepository.find({
      where: { courseId, isPublished: true },
      relations: ['course', 'videos', 'quizzes', 'essayExercises'],
      order: { orderIndex: 'ASC' },
    });
  }

  async update(id: string, updateLessonDto: UpdateLessonDto): Promise<Lesson> {
    const lesson = await this.findById(id);
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    Object.assign(lesson, updateLessonDto);
    return this.lessonsRepository.save(lesson);
  }

  async remove(id: string): Promise<void> {
    const result = await this.lessonsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
  }
}
