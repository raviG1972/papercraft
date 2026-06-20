import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureOcrSessionTable } from '@/lib/db-setup';
import { createId } from '@/lib/id-utils';

export async function GET(request: NextRequest) {
  try {
    await ensureOcrSessionTable();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    let sql = `SELECT * FROM "OcrSession"`;
    const params: string[] = [];

    if (search) {
      sql += ` WHERE "title" ILIKE $1`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY "createdAt" DESC`;

    const sessions = await db.$queryRawUnsafe(sql, ...params);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[OCR Sessions GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OCR sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureOcrSessionTable();

    const body = await request.json();
    const { title, ocrText, originalText, fileNames, language } = body;

    if (!title || !ocrText || !originalText) {
      return NextResponse.json(
        { error: 'title, ocrText, and originalText are required' },
        { status: 400 }
      );
    }

    const id = createId();
    const fileNamesStr = typeof fileNames === 'string' ? fileNames : (fileNames ? JSON.stringify(fileNames) : '[]');
    const lang = language || 'english';

    await db.$executeRawUnsafe(
      `INSERT INTO "OcrSession" ("id", "title", "ocrText", "originalText", "fileNames", "language", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      title,
      ocrText,
      originalText,
      fileNamesStr,
      lang
    );

    const session = await db.$queryRawUnsafe(
      `SELECT * FROM "OcrSession" WHERE "id" = $1`,
      id
    );

    return NextResponse.json(Array.isArray(session) ? session[0] : session, { status: 201 });
  } catch (error) {
    console.error('[OCR Sessions POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create OCR session' },
      { status: 500 }
    );
  }
}