import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EssayExercisesService } from './essay-exercises.service';
import { EssayExercisesController } from './essay-exercises.controller';
import { EssayExercise } from './entities/essay-exercise.entity';
import { EssaySubmission } from './entities/essay-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EssayExercise, EssaySubmission])],
  controllers: [EssayExercisesController],
  providers: [EssayExercisesService],
  exports: [EssayExercisesService],
})
export class EssayExercisesModule {}
