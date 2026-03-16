import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { QuizzesService, CreateQuizDto, CreateQuizQuestionDto, CreateQuizOptionDto } from './quizzes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, User } from '../users/entities/user.entity';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createQuiz(
    @Body() createQuizDto?: CreateQuizDto,
  ) {
    const dto = (createQuizDto ?? {}) as CreateQuizDto;
    return this.quizzesService.createQuiz(dto);
  }

  @Post('questions')
  @UseGuards(JwtAuthGuard)
  createQuestion(@Body() createQuestionDto: CreateQuizQuestionDto) {
    return this.quizzesService.createQuestion(createQuestionDto);
  }

  @Post('options')
  @UseGuards(JwtAuthGuard)
  createOption(@Body() createOptionDto: CreateQuizOptionDto) {
    return this.quizzesService.createOption(createOptionDto);
  }

  @Get()
  findAll(
    @Query('lessonId') lessonId?: string,
    @Query('gradeLevel') gradeLevel?: '10' | '11' | '12'
  ) {
    if (lessonId) {
      return this.quizzesService.findByLesson(lessonId);
    }
    return this.quizzesService.findAllQuizzes(gradeLevel);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizzesService.findQuizById(id);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  startAttempt(@Param('id') quizId: string, @Body() body: { userId: string }) {
    return this.quizzesService.startAttempt(quizId, body.userId);
  }

  @Post('attempts/:attemptId/answers')
  @UseGuards(JwtAuthGuard)
  submitAnswer(@Param('attemptId') attemptId: string, @Body() body: { questionId: string; selectedOptionId?: string; answerText?: string }) {
    return this.quizzesService.submitAnswer(attemptId, body.questionId, body.selectedOptionId, body.answerText);
  }

  @Post('attempts/:attemptId/complete')
  @UseGuards(JwtAuthGuard)
  completeAttempt(
    @Param('attemptId') attemptId: string,
    @Body() body?: { timeSpentMinutes?: number }
  ) {
    return this.quizzesService.completeAttempt(attemptId, body?.timeSpentMinutes);
  }

  // User endpoints - must be defined BEFORE parameterized routes to avoid route conflicts
  @Get('my/attempts')
  @UseGuards(JwtAuthGuard)
  getMyAttempts(@CurrentUser() user: User) {
    return this.quizzesService.getMyAttempts(user.id);
  }

  @Get('my/attempts/:attemptId')
  @UseGuards(JwtAuthGuard)
  getMyAttempt(@Param('attemptId') attemptId: string, @CurrentUser() user: User) {
    return this.quizzesService.getMyAttemptWithAnswers(attemptId, user.id);
  }

  // Admin endpoints for managing attempts
  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listAttempts(
    @Param('id') quizId: string,
    @Query('status') status?: 'in_progress' | 'completed'
  ) {
    return this.quizzesService.listAttemptsForQuiz(quizId, status);
  }

  @Get('attempts/:attemptId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAttempt(@Param('attemptId') attemptId: string) {
    return this.quizzesService.getAttemptWithAnswers(attemptId);
  }

  @Patch('attempts/answers/:answerId')
  @UseGuards(JwtAuthGuard)
  updateAnswer(
    @Param('answerId') answerId: string,
    @Body() body: { answerText?: string; selectedOptionId?: string; pointsEarned?: number | string; isCorrect?: boolean; feedback?: string }
  ) {
    // If it's an admin request with pointsEarned or isCorrect, use gradeAnswer
    if (body.pointsEarned !== undefined || body.isCorrect !== undefined || body.feedback !== undefined) {
      const parsedPointsEarned =
        typeof body?.pointsEarned === 'string' ? Number.parseFloat(body.pointsEarned) : body?.pointsEarned;
      return this.quizzesService.gradeAnswer(answerId, parsedPointsEarned as number, body.isCorrect, body.feedback);
    }
    // Otherwise, update the answer text or selected option
    return this.quizzesService.updateAnswer(answerId, body.answerText, body.selectedOptionId);
  }

  @Patch('attempts/:attemptId/score')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateAttemptScore(
    @Param('attemptId') attemptId: string,
    @Body() body: { score: number | string }
  ) {
    const parsedScore =
      typeof body?.score === 'string' ? Number.parseFloat(body.score) : body?.score;
    return this.quizzesService.updateAttemptScore(attemptId, parsedScore as number);
  }

  @Get('admin/attempts/by-grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllAttemptsByGrade() {
    return this.quizzesService.getAllAttemptsGroupedByGrade();
  }


  @Delete('admin/attempts/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteAllAttempts() {
    return this.quizzesService.deleteAllAttempts();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.quizzesService.deleteQuiz(id);
  }
}
