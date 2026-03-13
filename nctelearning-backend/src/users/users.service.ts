import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, GradeLevel } from './entities/user.entity';

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  gradeLevel?: GradeLevel;
  avatarUrl?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  gradeLevel?: GradeLevel;
  avatarUrl?: string;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.usersRepository.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });
  }

  async findByGradeLevel(gradeLevel: GradeLevel): Promise<User[]> {
    return this.usersRepository.find({
      where: { gradeLevel },
      order: { createdAt: 'DESC' },
    });
  }

  async getStudentsByGrade(gradeLevel: GradeLevel): Promise<User[]> {
    return this.usersRepository.find({
      where: { 
        role: UserRole.USER,
        gradeLevel 
      },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  async getTeachers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.ADMIN },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }
}
