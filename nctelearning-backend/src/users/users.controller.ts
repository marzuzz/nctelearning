import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole, GradeLevel } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query('role') role?: UserRole, @Query('gradeLevel') gradeLevel?: GradeLevel) {
    if (role) {
      return this.usersService.findByRole(role);
    }
    if (gradeLevel) {
      return this.usersService.findByGradeLevel(gradeLevel);
    }
    return this.usersService.findAll();
  }

  @Get('students')
  getStudents(@Query('gradeLevel') gradeLevel?: GradeLevel) {
    if (gradeLevel) {
      return this.usersService.getStudentsByGrade(gradeLevel);
    }
    return this.usersService.findByRole(UserRole.USER);
  }

  @Get('teachers')
  getTeachers() {
    return this.usersService.getTeachers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
