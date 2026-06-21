/**
 * Runtime database setup — ensures QuestionBank, Tag, QuestionTag tables exist.
 * Called automatically from API routes on first access.
 *
 * This avoids needing `prisma db push` during Vercel build.
 */

import { db } from '@/lib/db';

let setupDone = false;

export async function ensureQuestionBankTables() {
  if (setupDone) return;

  try {
    // Check if QuestionBank table exists (SQLite)
    const result = await db.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='QuestionBank'`
    );

    if (Array.isArray(result) && result.length > 0) {
      setupDone = true;
      return;
    }

    // Create tables
    console.log('[DB Setup] Creating QuestionBank tables...');

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuestionBank" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "text" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'short',
        "subject" TEXT,
        "grade" TEXT,
        "language" TEXT NOT NULL DEFAULT 'english',
        "marks" INTEGER,
        "difficulty" TEXT,
        "options" TEXT,
        "correctAnswer" TEXT,
        "randomizeOptions" BOOLEAN NOT NULL DEFAULT true,
        "suggestedAnswer" TEXT,
        "markScheme" TEXT,
        "sourceNote" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Tag" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "color" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuestionTag" (
        "questionId" TEXT NOT NULL,
        "tagId" TEXT NOT NULL,
        CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("questionId", "tagId")
      );
    `);

    // Create indexes
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "QuestionBank_type_idx" ON "QuestionBank"("type");
      CREATE INDEX IF NOT EXISTS "QuestionBank_subject_idx" ON "QuestionBank"("subject");
      CREATE INDEX IF NOT EXISTS "QuestionBank_language_idx" ON "QuestionBank"("language");
    `).catch(() => { /* ignore index errors */ });

    console.log('[DB Setup] QuestionBank tables created successfully');
    setupDone = true;
  } catch (err) {
    console.error('[DB Setup] Failed to create tables:', err);
    // Don't set setupDone = true so we retry next time
  }
}

// ─── OCR Sessions ──────────────────────────────────────────────────────

let ocrSetupDone = false;

export async function ensureOcrSessionTable() {
  if (ocrSetupDone) return;

  try {
    // Check if OcrSession table exists (SQLite)
    const result = await db.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='OcrSession'`
    );

    if (Array.isArray(result) && result.length > 0) {
      ocrSetupDone = true;
      return;
    }

    // Create table
    console.log('[DB Setup] Creating OcrSession table...');

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OcrSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "ocrText" TEXT NOT NULL,
        "originalText" TEXT NOT NULL,
        "fileNames" TEXT,
        "language" TEXT NOT NULL DEFAULT 'english',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index on title
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OcrSession_title_idx" ON "OcrSession"("title");
    `).catch(() => { /* ignore index errors */ });

    console.log('[DB Setup] OcrSession table created successfully');
    ocrSetupDone = true;
  } catch (err) {
    console.error('[DB Setup] Failed to create OcrSession table:', err);
    // Don't set ocrSetupDone = true so we retry next time
  }
}