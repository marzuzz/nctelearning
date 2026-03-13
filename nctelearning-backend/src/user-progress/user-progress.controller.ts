import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { UserProgressService, CreateUserProgressDto } from './user-progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user-progress')
@UseGuards(JwtAuthGuard)
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Post()
  create(@Body() createProgressDto: CreateUserProgressDto) {
    return this.userProgressService.create(createProgressDto);
  }

  @Get()
  findByUser(@Query('userId') userId: string) {
    return this.userProgressService.findByUser(userId);
  }

  @Get('lesson')
  findByLesson(@Query('lessonId') lessonId: string) {
    return this.userProgressService.findByLesson(lessonId);
  }

  @Get('stats')
  getStats(@Query('userId') userId: string) {
    return this.userProgressService.getCompletionStats(userId);
  }

  @Get('check')
  hasCompleted(@Query('userId') userId: string, @Query('lessonId') lessonId: string) {
    return this.userProgressService.hasCompleted(userId, lessonId);
  }
}
