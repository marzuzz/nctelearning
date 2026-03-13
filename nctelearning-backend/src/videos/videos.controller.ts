import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFile, BadRequestException, ForbiddenException, Req, Res, Header, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideosService, CreateVideoDto, UpdateVideoDto } from './videos.service';
import { Video } from './entities/video.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('health')
  async healthCheck() {
    try {
      // Simple health check
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        cb(null, uploadsDir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
      },
    }),
    limits: {
      // allow large lesson videos (e.g., up to ~4GB)
      fileSize: 4 * 1024 * 1024 * 1024,
    },
  }))
  async create(
    @UploadedFile() file: any,
    @Body() createVideoDto: CreateVideoDto
  ) {
    try {
      console.log('Video upload request received:', {
        fileName: file?.originalname,
        fileSize: file?.size,
        title: createVideoDto.title,
        gradeLevel: createVideoDto.gradeLevel,
        lessonId: createVideoDto.lessonId,
        bodyKeys: Object.keys(createVideoDto)
      });

      if (!file) {
        console.error('No file uploaded');
        throw new BadRequestException('Video file is required');
      }

      // Validate file type
      if (!file.mimetype.startsWith('video/')) {
        console.error('Invalid file type:', file.mimetype);
        throw new BadRequestException('File must be a video');
      }

      // Basic safety check (actual limit handled by Multer limits above)
      if (!Number.isFinite(file.size) || file.size <= 0) {
        throw new BadRequestException('Tệp tin không hợp lệ');
      }

      // Validate required fields
      if (!createVideoDto.title) {
        console.error('Missing title');
        throw new BadRequestException('Title is required');
      }

      if (!createVideoDto.gradeLevel) {
        console.error('Missing gradeLevel');
        throw new BadRequestException('Grade level is required');
      }

      console.log('Starting video creation process...');
      const result = await this.videosService.createWithFile(file, createVideoDto);
      console.log('Video created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('Error in video upload:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Re-throw the error to be handled by the global exception filter
      throw error;
    }
  }

  // Byte-range streaming endpoint for reliable playback of large files
  @Get('stream/:id')
  @UseGuards(JwtAuthGuard)
  async stream(@Param('id') id: string, @Res() res, @Req() req) {
    const video = await this.videosService.findById(id);
    if (!video || !video.videoUrl) {
      res.status(HttpStatus.NOT_FOUND).send('Video not found');
      return;
    }

    const absolutePath = path.join(process.cwd(), video.videoUrl.startsWith('/') ? video.videoUrl.substring(1) : video.videoUrl);
    if (!fs.existsSync(absolutePath)) {
      res.status(HttpStatus.NOT_FOUND).send('File not found');
      return;
    }

    const stat = fs.statSync(absolutePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(absolutePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(absolutePath).pipe(res);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentUser() user: User,
    @Query('lessonId') lessonId?: string
  ) {
    if (lessonId) {
      const videos = await this.videosService.findByLesson(lessonId);
      // Filter videos based on user access
      const accessibleVideos: Video[] = [];
      for (const video of videos) {
        if (await this.videosService.canUserAccessVideo(video, user)) {
          accessibleVideos.push(video);
        }
      }
      return accessibleVideos;
    }
    return this.videosService.findAllForUser(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const video = await this.videosService.findByIdForUser(id, user);
    if (!video) {
      throw new ForbiddenException('Bạn không có quyền truy cập video này');
    }
    return video;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateVideoDto: UpdateVideoDto) {
    return this.videosService.update(id, updateVideoDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.videosService.remove(id);
  }
}
