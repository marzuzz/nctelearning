import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Not, DataSource } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion, QuestionType } from './entities/quiz-question.entity';
import { QuizQuestionOption } from './entities/quiz-question-option.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswer } from './entities/quiz-attempt-answer.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { GradeLevel } from '../users/entities/user.entity';

export interface CreateQuizDto {
  lessonId?: string;
  title: string;
  description?: string;
  prompt,
  timeLimitMinutes?: number;
  maxAttempts?: number;
  isPublished?: boolean;
  gradeLevel?: GradeLevel;
  practiceType?: 'doc_hieu' | 'viet';
  topic?: string;
}

export interface CreateQuizQuestionDto {
  quizId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'essay';
  orderIndex: number;
  points?: number;
}

export interface CreateQuizOptionDto {
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private quizzesRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private questionsRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizQuestionOption)
    private optionsRepository: Repository<QuizQuestionOption>,
    @InjectRepository(QuizAttempt)
    private attemptsRepository: Repository<QuizAttempt>,
    @InjectRepository(QuizAttemptAnswer)
    private answersRepository: Repository<QuizAttemptAnswer>,
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async createQuiz(createQuizDto: CreateQuizDto): Promise<Quiz> {
    // If lessonId provided, ensure it exists; otherwise allow quiz without lesson
    if (createQuizDto.lessonId) {
      const lesson = await this.lessonsRepository.findOne({ where: { id: createQuizDto.lessonId }, relations: ['course'] });
      if (!lesson) {
        throw new BadRequestException('Lesson không tồn tại');
      }
    }

    const quiz = this.quizzesRepository.create({
      ...createQuizDto,
      maxAttempts: createQuizDto.maxAttempts ?? 3,
    });
    return this.quizzesRepository.save(quiz);
  }

  async createQuestion(createQuestionDto: CreateQuizQuestionDto): Promise<QuizQuestion> {
    const question = this.questionsRepository.create({
      ...createQuestionDto,
      questionType: createQuestionDto.questionType as any,
    });
    return this.questionsRepository.save(question);
  }

  async createOption(createOptionDto: CreateQuizOptionDto): Promise<QuizQuestionOption> {
    const option = this.optionsRepository.create(createOptionDto);
    return this.optionsRepository.save(option);
  }

  async findAllQuizzes(gradeLevel?: '10' | '11' | '12'): Promise<Quiz[]> {
    const qb = this.quizzesRepository.createQueryBuilder('quiz')
      .leftJoinAndSelect('quiz.lesson', 'lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .leftJoinAndSelect('quiz.questions', 'questions')
      .leftJoinAndSelect('questions.options', 'options')
      .orderBy('quiz.createdAt', 'DESC');

    if (gradeLevel) {
      qb.andWhere('(quiz.gradeLevel = :gradeLevel OR course.gradeLevel = :gradeLevel)', { gradeLevel });
    }

    return qb.getMany();
  }

  async findQuizById(id: string): Promise<Quiz | null> {
    return this.quizzesRepository.findOne({
      where: { id },
      relations: ['lesson', 'lesson.course', 'questions', 'questions.options'],
    });
  }

  async findByLesson(lessonId: string): Promise<Quiz[]> {
    return this.quizzesRepository.find({
      where: { lessonId, isPublished: true },
      relations: ['lesson', 'questions', 'questions.options'],
      order: { createdAt: 'ASC' },
    });
  }

  async startAttempt(quizId: string, userId: string): Promise<QuizAttempt> {
    // Check if user already has a completed attempt for this quiz using query builder
    const completedAttempt = await this.attemptsRepository
      .createQueryBuilder('attempt')
      .where('attempt.quizId = :quizId', { quizId })
      .andWhere('attempt.userId = :userId', { userId })
      .andWhere('attempt.completedAt IS NOT NULL')
      .getOne();

    if (completedAttempt) {
      throw new BadRequestException('Bạn đã hoàn thành bài tập này rồi. Mỗi học sinh chỉ được làm bài tập một lần.');
    }

    // Check if user has an in-progress attempt
    const inProgressAttempt = await this.attemptsRepository
      .createQueryBuilder('attempt')
      .where('attempt.quizId = :quizId', { quizId })
      .andWhere('attempt.userId = :userId', { userId })
      .andWhere('attempt.completedAt IS NULL')
      .getOne();

    if (inProgressAttempt) {
      // Return existing in-progress attempt instead of creating a new one
      return inProgressAttempt;
    }

    // Create new attempt
    const attempt = this.attemptsRepository.create({
      quizId,
      userId,
      startedAt: new Date(),
    });
    return this.attemptsRepository.save(attempt);
  }

  async submitAnswer(attemptId: string, questionId: string, selectedOptionId?: string, answerText?: string): Promise<QuizAttemptAnswer> {
    // Check if answer already exists for this question in this attempt
    const existingAnswer = await this.answersRepository.findOne({
      where: { attemptId, questionId },
    });

    if (existingAnswer) {
      // Update existing answer
      if (answerText !== undefined) {
        existingAnswer.answerText = answerText;
        existingAnswer.selectedOptionId = null as any; // Clear selectedOptionId when updating with text
      }
      if (selectedOptionId !== undefined) {
        existingAnswer.selectedOptionId = selectedOptionId;
        existingAnswer.answerText = null as any; // Clear answerText when updating with option
      }
      return this.answersRepository.save(existingAnswer);
    }

    // Create new answer
    const answer = this.answersRepository.create({
      attemptId,
      questionId,
      selectedOptionId,
      answerText,
    });
    
    return this.answersRepository.save(answer);
  }

  async completeAttempt(attemptId: string, timeSpentMinutes?: number): Promise<QuizAttempt> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId },
      relations: ['answers', 'quiz', 'quiz.questions', 'quiz.questions.options'],
    });

    if (!attempt) {
      throw new NotFoundException('Không tìm thấy bài làm');
    }

    // Auto-grade answers for multiple choice questions
    for (const answer of attempt.answers) {
      if (!answer.selectedOptionId) continue;
      
      // Find the selected option
      const question = attempt.quiz.questions.find(q => q.id === answer.questionId);
      if (!question) continue;
      
      const selectedOption = question.options.find(opt => opt.id === answer.selectedOptionId);
      if (selectedOption) {
        answer.isCorrect = selectedOption.isCorrect;
        answer.pointsEarned = answer.isCorrect ? question.points : 0;
        await this.answersRepository.save(answer);
      }
    }

    // Reload answers after grading
    const gradedAnswers = await this.answersRepository.find({
      where: { attemptId },
    });

    // Calculate score
    let score = 0;
    for (const answer of gradedAnswers) {
      if (answer.isCorrect) {
        score += answer.pointsEarned;
      }
    }

    // Calculate time spent
    const completedAt = new Date();
    let calculatedTimeSpent: number;
    if (timeSpentMinutes !== undefined) {
      calculatedTimeSpent = timeSpentMinutes;
    } else {
      // Calculate from startedAt to completedAt
      const durationMs = completedAt.getTime() - attempt.startedAt.getTime();
      calculatedTimeSpent = Math.round(durationMs / 1000 / 60);
    }

    attempt.completedAt = completedAt;
    attempt.score = score;
    attempt.totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
    attempt.timeSpentMinutes = calculatedTimeSpent;

    return this.attemptsRepository.save(attempt);
  }

  async listAttemptsForQuiz(quizId: string, status?: 'in_progress' | 'completed'): Promise<QuizAttempt[]> {
    const where: any = { quizId };
    if (status === 'in_progress') {
      where.completedAt = null;
    } else if (status === 'completed') {
      where.completedAt = Not(null as unknown as Date);
    }
    return this.attemptsRepository.find({
      where,
      relations: ['user'],
      order: { startedAt: 'DESC' },
    });
  }

  async getAttemptWithAnswers(attemptId: string): Promise<QuizAttempt | null> {
    return this.attemptsRepository.findOne({
      where: { id: attemptId },
      relations: [
        'answers',
        'answers.question',
        'answers.selectedOption',
        'quiz',
        'quiz.questions',
        'quiz.questions.options',
        'user',
      ],
    });
  }

  async getMyAttemptWithAnswers(attemptId: string, userId: string): Promise<QuizAttempt | null> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId, userId },
      relations: [
        'answers',
        'answers.question',
        'answers.selectedOption',
        'quiz',
        'quiz.questions',
        'quiz.questions.options',
        'user',
      ],
      order: {
        quiz: {
          questions: {
            orderIndex: 'ASC',
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Không tìm thấy bài làm');
    }

    // Ensure questions are sorted by orderIndex
    if (attempt.quiz && attempt.quiz.questions) {
      attempt.quiz.questions.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return attempt;
  }

  async updateAnswer(answerId: string, answerText?: string, selectedOptionId?: string): Promise<QuizAttemptAnswer> {
    const answer = await this.answersRepository.findOne({ where: { id: answerId } });
    if (!answer) {
      throw new NotFoundException('Không tìm thấy câu trả lời');
    }
    if (answerText !== undefined) {
      answer.answerText = answerText;
      if (answerText) {
        answer.selectedOptionId = null as any; // Clear selectedOptionId when updating with text
      }
    }
    if (selectedOptionId !== undefined) {
      answer.selectedOptionId = selectedOptionId;
      if (selectedOptionId) {
        answer.answerText = null as any; // Clear answerText when updating with option
      }
    }
    return this.answersRepository.save(answer);
  }

  async gradeAnswer(answerId: string, pointsEarned?: number, isCorrect?: boolean, feedback?: string): Promise<QuizAttemptAnswer> {
    const answer = await this.answersRepository.findOne({ 
      where: { id: answerId },
      relations: ['attempt'],
    });
    if (!answer) {
      throw new NotFoundException('Không tìm thấy câu trả lời');
    }
    if (typeof pointsEarned === 'number') {
      answer.pointsEarned = pointsEarned;
    }
    if (typeof isCorrect === 'boolean') {
      answer.isCorrect = isCorrect;
    }
    if (feedback !== undefined) {
      answer.feedback = feedback;
    }
    const savedAnswer = await this.answersRepository.save(answer);
    
    // Automatically recalculate attempt score after grading
    await this.recalculateAttemptScore(answer.attemptId);
    
    return savedAnswer;
  }

  async recalculateAttemptScore(attemptId: string): Promise<QuizAttempt> {
    const attempt = await this.attemptsRepository.findOne({
      where: { id: attemptId },
      relations: ['quiz', 'quiz.questions', 'answers'],
    });

    if (!attempt) {
      throw new NotFoundException('Không tìm thấy bài làm');
    }

    // Recalculate score from all answers
    const calculatedScore = attempt.answers.reduce((sum, answer) => {
      return sum + (answer.pointsEarned || 0);
    }, 0);

    attempt.score = calculatedScore;
    attempt.totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);

    return this.attemptsRepository.save(attempt);
  }

  async updateAttemptScore(attemptId: string, score: number): Promise<QuizAttempt> {
    // Use recalculateAttemptScore to ensure score is always accurate
    return this.recalculateAttemptScore(attemptId);
  }

  async deleteAllAttempts(): Promise<{ message: string; deletedAttempts: number; deletedAnswers: number }> {
    try {
      // Get counts before deletion
      const answersCountBefore = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM quiz_attempt_answers'
      );
      const attemptsCountBefore = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM quiz_attempts'
      );
      
      const deletedAnswers = parseInt(answersCountBefore[0]?.count || '0', 10);
      const deletedAttempts = parseInt(attemptsCountBefore[0]?.count || '0', 10);
      
      // Delete all answers first (due to foreign key constraints)
      await this.dataSource.query('DELETE FROM quiz_attempt_answers');
      
      // Delete all attempts
      await this.dataSource.query('DELETE FROM quiz_attempts');
      
      return {
        message: 'Đã xóa tất cả bài làm và câu trả lời',
        deletedAttempts,
        deletedAnswers,
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteQuiz(id: string): Promise<void> {
    // Check if quiz exists
    const quiz = await this.quizzesRepository.findOne({ where: { id } });
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài tập');
    }

    // Delete related data manually to ensure cascade works
    // First delete all answers
    const attempts = await this.attemptsRepository.find({ where: { quizId: id } });
    for (const attempt of attempts) {
      await this.answersRepository.delete({ attemptId: attempt.id });
    }
    
    // Then delete all attempts
    await this.attemptsRepository.delete({ quizId: id });

    // Delete all options
    const questions = await this.questionsRepository.find({ where: { quizId: id } });
    for (const question of questions) {
      await this.optionsRepository.delete({ questionId: question.id });
    }

    // Delete all questions
    await this.questionsRepository.delete({ quizId: id });

    // Finally delete the quiz
    const result = await this.quizzesRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException('Không thể xóa bài tập');
    }
  }

  async getAllAttemptsGroupedByGrade(): Promise<Record<string, QuizAttempt[]>> {
    // Use query builder to properly filter non-null completedAt
    // Don't load answers to optimize performance
    const attempts = await this.attemptsRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.user', 'user')
      .leftJoinAndSelect('attempt.quiz', 'quiz')
      .where('attempt.completedAt IS NOT NULL')
      .orderBy('attempt.completedAt', 'DESC')
      .getMany();

    // Group by grade level
    const grouped: Record<string, QuizAttempt[]> = {
      '10': [],
      '11': [],
      '12': [],
    };

    for (const attempt of attempts) {
      const gradeLevel = attempt.user?.gradeLevel || 'unknown';
      if (gradeLevel in grouped) {
        grouped[gradeLevel].push(attempt);
      }
    }

    return grouped;
  }

  async getMyAttempts(userId: string): Promise<QuizAttempt[]> {
    try {
      const attempts = await this.attemptsRepository.find({
        where: { userId },
        relations: ['quiz', 'answers', 'quiz.questions', 'quiz.questions.options'],
        order: { startedAt: 'DESC' },
      });

      // Debug: Log loaded attempts and their answers
      console.log(`[getMyAttempts] Loaded ${attempts.length} attempts for user ${userId}`);
      attempts.forEach((attempt, idx) => {
        console.log(`[getMyAttempts] Attempt ${idx + 1}:`, {
          id: attempt.id,
          quizTitle: attempt.quiz?.title,
          completedAt: attempt.completedAt,
          hasAnswers: !!attempt.answers,
          answersCount: attempt.answers?.length ?? 0,
          answersType: Array.isArray(attempt.answers) ? 'array' : typeof attempt.answers,
        });
        if (attempt.answers && attempt.answers.length > 0) {
          console.log(`[getMyAttempts] Answers for attempt ${attempt.id}:`, 
            attempt.answers.map(a => ({ id: a.id, questionId: a.questionId, pointsEarned: a.pointsEarned }))
          );
        }
      });

      // For each attempt, check if it's fully graded
      for (const attempt of attempts) {
        try {
          if (!attempt.completedAt) {
            (attempt as any).isFullyGraded = false;
            continue;
          }

          // Load questions separately to check for essay questions
          const quiz = await this.quizzesRepository.findOne({
            where: { id: attempt.quizId },
            relations: ['questions', 'questions.options'],
          });

          if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            (attempt as any).isFullyGraded = true; // No questions means fully graded
            continue;
          }

          // Check if there are essay questions
          const essayQuestions = quiz.questions.filter(q => {
            if (!q) return false;
            const isEssay = q.questionType === QuestionType.ESSAY;
            const hasNoOptions = !q.options || !Array.isArray(q.options) || q.options.length === 0;
            return isEssay || hasNoOptions;
          });

          if (essayQuestions.length === 0) {
            // No essay questions, so it's fully graded after completion
            (attempt as any).isFullyGraded = true;
            continue;
          }

          // Check if all essay answers have been graded
          const answers = attempt.answers || [];
          const essayAnswers = answers.filter(a => 
            a && essayQuestions.some(q => q && q.id === a.questionId)
          );

          if (essayAnswers.length === 0) {
            (attempt as any).isFullyGraded = false;
            continue;
          }

          // Check if all essay answers that exist have been graded
          // If student answered an essay question, it must be graded
          // If student didn't answer, we can't grade it, so it doesn't count
          const allGraded = essayAnswers.every(a => 
            a && a.pointsEarned !== null && a.pointsEarned !== undefined
          );

          // Consider fully graded if:
          // 1. All essay answers that exist have been graded (pointsEarned is set)
          // 2. At least one essay answer exists (meaning student answered at least one essay question)
          (attempt as any).isFullyGraded = allGraded && essayAnswers.length > 0;
        } catch (error) {
          // If there's an error checking grading status, default to false
          (attempt as any).isFullyGraded = false;
        }
        
        // Ensure answers array is always present (even if empty) for proper serialization
        if (!attempt.answers) {
          (attempt as any).answers = [];
        }
      }

      return attempts;
    } catch (error) {
      // Log error and return empty array
      return [];
    }
  }

}

