import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    
    const user = await this.usersService.create({
      ...registerDto,
      passwordHash,
    });

    const accessToken = this.generateAccessToken(user);
    
    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    console.log(`[LOGIN_ATTEMPT] email: ${loginDto.email}`);
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.isActive) {
      console.log(`[LOGIN_FAIL] email: ${loginDto.email} (user not found or inactive)`);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      console.log(`[LOGIN_FAIL] email: ${loginDto.email} (bad password)`);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const accessToken = this.generateAccessToken(user);
    console.log(`[LOGIN_SUCCESS] email: ${user.email}`);
    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      gradeLevel: user.gradeLevel,
      avatarUrl: user.avatarUrl,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
    return null;
  }
}
