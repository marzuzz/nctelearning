import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { GradeLevel } from '../users/entities/user.entity';

export interface CreateCourseDto {
  title: string;
  description?: string;
  gradeLevel: GradeLevel;
  thumbnailUrl?: string;
  createdById: string;
  isPublished?: boolean;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  gradeLevel?: GradeLevel;
  thumbnailUrl?: string;
  isPublished?: boolean;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const course = this.coursesRepository.create(createCourseDto);
    return this.coursesRepository.save(course);
  }

  async findAll(): Promise<Course[]> {
    try {
      // Try with relations first, fallback to without relations if it fails
      try {
        return this.coursesRepository.find({
          relations: ['createdBy', 'lessons'],
          order: { createdAt: 'DESC' },
        });
      } catch (relationError) {
        console.warn('Failed to load with relations, trying without:', relationError);
        return this.coursesRepository.find({
          relations: ['lessons'],
          order: { createdAt: 'DESC' },
        });
      }
    } catch (error) {
      console.error('Error in findAll courses:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<Course | null> {
    return this.coursesRepository.findOne({
      where: { id },
      relations: ['createdBy', 'lessons'],
    });
  }

  async findByGradeLevel(gradeLevel: GradeLevel): Promise<Course[]> {
    return this.coursesRepository.find({
      where: { gradeLevel, isPublished: true },
      relations: ['createdBy', 'lessons'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTeacher(teacherId: string): Promise<Course[]> {
    return this.coursesRepository.find({
      where: { createdById: teacherId },
      relations: ['createdBy', 'lessons'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPublished(): Promise<Course[]> {
    return this.coursesRepository.find({
      where: { isPublished: true },
      relations: ['createdBy', 'lessons'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findById(id);
    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    Object.assign(course, updateCourseDto);
    return this.coursesRepository.save(course);
  }

  async remove(id: string): Promise<void> {
    const result = await this.coursesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }
  }

  async publish(id: string): Promise<Course> {
    return this.update(id, { isPublished: true });
  }

  async unpublish(id: string): Promise<Course> {
    return this.update(id, { isPublished: false });
  }
}
