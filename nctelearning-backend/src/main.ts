import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DataSource } from 'typeorm';

async function ensureQuizFloatColumns(dataSource: DataSource) {
  // TypeORM synchronize doesn't always change existing column types.
  // If these columns were created as integer previously, decimals (e.g. 0.3) get truncated.
  const dbType = (dataSource.options as any)?.type as string | undefined;

  const targets: Array<{
    table: string;
    columns: string[];
  }> = [
    { table: 'quiz_attempt_answers', columns: ['pointsEarned', 'points_earned'] },
    { table: 'quiz_attempts', columns: ['score', 'totalPoints', 'total_points'] },
  ];

  // Postgres
  if (dbType === 'postgres') {
    const schemaRows: Array<{ current_schema: string }> = await dataSource.query(
      `SELECT current_schema() as current_schema`,
    );
    const schema = schemaRows?.[0]?.current_schema || 'public';

    for (const { table, columns } of targets) {
      for (const column of columns) {
        try {
          const rows: Array<{ data_type: string }> = await dataSource.query(
            `
              SELECT data_type
              FROM information_schema.columns
              WHERE table_schema = $1
                AND table_name = $2
                AND column_name = $3
              LIMIT 1
            `,
            [schema, table, column],
          );

          const dataType = rows?.[0]?.data_type;
          if (!dataType) continue;

          const isInteger =
            dataType === 'integer' ||
            dataType === 'bigint' ||
            dataType === 'smallint';
          if (!isInteger) continue;

          await dataSource.query(
            `ALTER TABLE "${schema}"."${table}" ALTER COLUMN "${column}" TYPE double precision USING "${column}"::double precision`,
          );
        } catch {
          // Best-effort schema fix: ignore if table/column doesn't exist or can't be altered.
        }
      }
    }
    return;
  }

  // MySQL / MariaDB
  if (dbType === 'mysql' || dbType === 'mariadb') {
    for (const { table, columns } of targets) {
      for (const column of columns) {
        try {
          const rows: Array<{ data_type: string }> = await dataSource.query(
            `
              SELECT DATA_TYPE as data_type
              FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ?
                AND COLUMN_NAME = ?
              LIMIT 1
            `,
            [table, column],
          );

          const dataType = (rows?.[0]?.data_type || '').toLowerCase();
          if (!dataType) continue;

          const isInteger =
            dataType === 'int' ||
            dataType === 'integer' ||
            dataType === 'bigint' ||
            dataType === 'smallint' ||
            dataType === 'mediumint' ||
            dataType === 'tinyint';
          if (!isInteger) continue;

          await dataSource.query(
            `ALTER TABLE \`${table}\` MODIFY \`${column}\` DOUBLE NOT NULL DEFAULT 0`,
          );
        } catch {
          // Best-effort schema fix: ignore if table/column doesn't exist or can't be altered.
        }
      }
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  try {
    const dataSource = app.get(DataSource);
    if (dataSource?.isInitialized) {
      await ensureQuizFloatColumns(dataSource);
    } else if (dataSource) {
      await dataSource.initialize();
      await ensureQuizFloatColumns(dataSource);
    }
  } catch {
    // Do not block app startup on schema check.
  }

  const port = process.env.PORT || 2030;
  await app.listen(port);
}
bootstrap();