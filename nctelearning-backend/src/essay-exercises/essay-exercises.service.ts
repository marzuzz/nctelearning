import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EssayExercise } from './entities/essay-exercise.entity';
import { EssaySubmission } from './entities/essay-submission.entity';
import { GradeLevel } from '../users/entities/user.entity';

export interface CreateEssayExerciseDto {
  lessonId: string;
  title: string;
  prompt: string;
  wordCountMin?: number;
  wordCountMax?: number;
  timeLimitMinutes?: number;
  isPublished?: boolean;
  gradeLevel?: GradeLevel;
  practiceType: 'doc_hieu' | 'viet';
  topic:
    | 'tho'
    | 'truyen'
    | 'ki'
    | 'nghi_luan'
    | 'thong_tin'
    | 'nghi_luan_xa_hoi'
    | 'nghi_luan_van_hoc';
}

export interface CreateEssaySubmissionDto {
  exerciseId: string;
  userId: string;
  content: string;
  wordCount?: number;
  timeSpentMinutes?: number;
}

@Injectable()
export class EssayExercisesService {
  constructor(
    @InjectRepository(EssayExercise)
    private exercisesRepository: Repository<EssayExercise>,
    @InjectRepository(EssaySubmission)
    private submissionsRepository: Repository<EssaySubmission>,
  ) {}

  async createExercise(createExerciseDto: CreateEssayExerciseDto): Promise<EssayExercise> {
    const exercise = this.exercisesRepository.create(createExerciseDto);
    return this.exercisesRepository.save(exercise);
  }

  async createSubmission(createSubmissionDto: CreateEssaySubmissionDto): Promise<EssaySubmission> {
    const submission = this.submissionsRepository.create(createSubmissionDto);
    return this.submissionsRepository.save(submission);
  }

  async findAllExercises(
    gradeLevel?: '10' | '11' | '12',
    practiceType?: 'doc_hieu' | 'viet',
    topic?: string
  ): Promise<EssayExercise[]> {
    const qb = this.exercisesRepository.createQueryBuilder('exercise')
      .leftJoinAndSelect('exercise.lesson', 'lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .orderBy('exercise.createdAt', 'DESC');

    if (gradeLevel) {
      qb.andWhere('(exercise.gradeLevel = :gradeLevel OR course.gradeLevel = :gradeLevel)', { gradeLevel });
    }

    if (practiceType) {
      qb.andWhere('exercise.practiceType = :practiceType', { practiceType });
    }

    if (topic) {
      qb.andWhere('exercise.topic = :topic', { topic });
    }

    return qb.getMany();
  }

  async findExerciseById(id: string): Promise<EssayExercise | null> {
    return this.exercisesRepository.findOne({
      where: { id },
      relations: ['lesson'],
    });
  }

  async findByLesson(lessonId: string): Promise<EssayExercise[]> {
    return this.exercisesRepository.find({
      where: { lessonId, isPublished: true },
      relations: ['lesson'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByUser(userId: string): Promise<EssaySubmission[]> {
    return this.submissionsRepository.find({
      where: { userId },
      relations: ['exercise', 'exercise.lesson'],
      order: { submittedAt: 'DESC' },
    });
  }

  async gradeSubmission(submissionId: string, grade: number, feedback?: string): Promise<EssaySubmission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp');
    }

    submission.grade = grade;
    submission.feedback = feedback || '';
    submission.gradedAt = new Date();

    return this.submissionsRepository.save(submission);
  }

  async deleteExercise(id: string): Promise<void> {
    await this.exercisesRepository.delete(id);
  }
}
