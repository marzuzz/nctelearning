import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './entities/video.entity';
import { User, UserRole, GradeLevel } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateVideoDto {
  lessonId?: string;
  gradeLevel: GradeLevel;
  title: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeMb?: number;
}

export interface UpdateVideoDto {
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeMb?: number;
  gradeLevel?: GradeLevel;
}

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private videosRepository: Repository<Video>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
  ) {}

  async create(createVideoDto: CreateVideoDto): Promise<Video> {
    try {
      console.log(`Creating video for grade level: ${createVideoDto.gradeLevel}`);
      
      // Validate required fields
      if (!createVideoDto.gradeLevel) {
        throw new NotFoundException('Grade level is required');
      }

      const video = this.videosRepository.create({
        ...createVideoDto,
        lessonId: createVideoDto.lessonId || null // Make lessonId optional
      });
      
      return await this.videosRepository.save(video);
    } catch (error) {
      console.error('Error in create video:', error);
      throw error;
    }
  }

  async createWithFile(file: any, createVideoDto: CreateVideoDto): Promise<Video> {
    try {
      console.log('Starting createWithFile with data:', {
        fileName: file?.originalname,
        fileSize: file?.size,
        title: createVideoDto.title,
        gradeLevel: createVideoDto.gradeLevel,
        lessonId: createVideoDto.lessonId
      });

      // File is already saved on disk by Multer diskStorage
      // Multer provides `path` and `filename`
      const savedFilePath = file.path as string; // absolute path
      const savedFileName = file.filename as string;
      const fileSizeMb = file.size / (1024 * 1024);

      // Create video record
      const videoData: CreateVideoDto = {
        ...createVideoDto,
        videoUrl: `/uploads/videos/${savedFileName}`,
        fileSizeMb: Math.round(fileSizeMb * 100) / 100, // Round to 2 decimal places
      };

      console.log('Calling create method with videoData:', videoData);

      // Use the create method which handles grade-based course creation
      const video = await this.create(videoData);
      
      console.log('Video created successfully:', video.id);
      return video;
    } catch (error) {
      console.error('Error in createWithFile:', error);
      throw error;
    }
  }

  async findAll(): Promise<Video[]> {
    return this.videosRepository.find({
      relations: ['lesson', 'lesson.course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForUser(user: User): Promise<Video[]> {
    const query = this.videosRepository
      .createQueryBuilder('video')
      .leftJoinAndSelect('video.lesson', 'lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .orderBy('video.createdAt', 'DESC');

    // Admins can see all videos
    if (user.role === UserRole.ADMIN) {
      return query.getMany();
    }

    // Regular users can only see videos for their grade level
    if (user.gradeLevel) {
      query.andWhere('video.gradeLevel = :gradeLevel', { gradeLevel: user.gradeLevel });
    } else {
      // If user has no grade level, return empty array
      return [];
    }

    return query.getMany();
  }

  async findById(id: string): Promise<Video | null> {
    return this.videosRepository.findOne({
      where: { id },
      relations: ['lesson', 'lesson.course'],
    });
  }

  async findByIdForUser(id: string, user: User): Promise<Video | null> {
    const video = await this.findById(id);
    if (!video) {
      return null;
    }

    // Check if user can access this video
    if (await this.canUserAccessVideo(video, user)) {
      return video;
    }

    return null;
  }

  async canUserAccessVideo(video: Video, user: User): Promise<boolean> {
    // Admins can access all videos
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Regular users can only access videos for their grade level
    if (!user.gradeLevel || !video.gradeLevel) {
      return false;
    }

    return user.gradeLevel === video.gradeLevel;
  }

  async findByLesson(lessonId: string): Promise<Video[]> {
    return this.videosRepository.find({
      where: { lessonId },
      relations: ['lesson', 'lesson.course'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(id: string, updateVideoDto: UpdateVideoDto): Promise<Video> {
    const video = await this.findById(id);
    if (!video) {
      throw new NotFoundException('Không tìm thấy video');
    }

    Object.assign(video, updateVideoDto);
    return this.videosRepository.save(video);
  }

  async remove(id: string): Promise<void> {
    const result = await this.videosRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy video');
    }
  }
}
