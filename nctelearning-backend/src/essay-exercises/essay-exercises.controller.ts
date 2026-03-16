import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { EssayExercisesService, CreateEssayExerciseDto, CreateEssaySubmissionDto } from './essay-exercises.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('essay-exercises')
export class EssayExercisesController {
  constructor(private readonly essayExercisesService: EssayExercisesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createExercise(
    @Body() createExerciseDto?: CreateEssayExerciseDto,
  ) {
    return this.essayExercisesService.createExercise(
      (createExerciseDto || ({} as CreateEssayExerciseDto)) as CreateEssayExerciseDto,
    );
  }

  @Post('submissions')
  @UseGuards(JwtAuthGuard)
  createSubmission(@Body() createSubmissionDto: CreateEssaySubmissionDto, @Request() req: any) {
    // Attach userId from authenticated user
    const userId = req.user?.id;
    return this.essayExercisesService.createSubmission({ ...createSubmissionDto, userId });
  }

  @Get()
  findAll(
    @Query('lessonId') lessonId?: string,
    @Query('gradeLevel') gradeLevel?: '10' | '11' | '12',
    @Query('practiceType') practiceType?: 'doc_hieu' | 'viet',
    @Query('topic') topic?: string
  ) {
    if (lessonId) {
      return this.essayExercisesService.findByLesson(lessonId);
    }
    return this.essayExercisesService.findAllExercises(gradeLevel, practiceType, topic);
  }

  @Get('submissions')
  @UseGuards(JwtAuthGuard)
  findSubmissions(@Query('userId') userId: string) {
    return this.essayExercisesService.findByUser(userId);
  }

  @Get('my/submissions')
  @UseGuards(JwtAuthGuard)
  getMySubmissions(@CurrentUser() user: User) {
    return this.essayExercisesService.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.essayExercisesService.findExerciseById(id);
  }

  @Patch('submissions/:id/grade')
  @UseGuards(JwtAuthGuard)
  gradeSubmission(@Param('id') id: string, @Body() body: { grade: number; feedback?: string }) {
    return this.essayExercisesService.gradeSubmission(id, body.grade, body.feedback);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.essayExercisesService.deleteExercise(id);
  }
}
