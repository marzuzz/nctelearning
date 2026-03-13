import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CoursesService, CreateCourseDto, UpdateCourseDto } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GradeLevel } from '../users/entities/user.entity';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  findAll(@Query('gradeLevel') gradeLevel?: GradeLevel, @Query('teacherId') teacherId?: string) {
    if (gradeLevel) {
      return this.coursesService.findByGradeLevel(gradeLevel);
    }
    if (teacherId) {
      return this.coursesService.findByTeacher(teacherId);
    }
    return this.coursesService.findPublished();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async findAllForAdmin() {
    try {
      console.log('Fetching all courses for admin');
      const courses = await this.coursesService.findAll();
      console.log(`Found ${courses.length} courses`);
      return courses;
    } catch (error) {
      console.error('Error in findAllForAdmin:', error);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id') id: string) {
    return this.coursesService.publish(id);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  unpublish(@Param('id') id: string) {
    return this.coursesService.unpublish(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
