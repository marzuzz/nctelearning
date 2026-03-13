import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { VideosModule } from './videos/videos.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { EssayExercisesModule } from './essay-exercises/essay-exercises.module';
import { UserProgressModule } from './user-progress/user-progress.module';
import { memoryStorage } from 'multer';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') || '5432'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    LessonsModule,
    VideosModule,
    QuizzesModule,
    EssayExercisesModule,
    UserProgressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
