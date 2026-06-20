import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureOcrSessionTable } from '@/lib/db-setup';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureOcrSessionTable();

    const { id } = await params;

    const sessions = await db.$queryRawUnsafe(
      `SELECT * FROM "OcrSession" WHERE "id" = $1`,
      id
    );

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json(
        { error: 'OCR session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sessions[0]);
  } catch (error) {
    console.error('[OCR Session GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OCR session' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, ocrText, originalText, language } = body;

    // Build dynamic SET clause based on provided fields
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      setClauses.push(`"title" = $${paramIndex++}`);
      values.push(title);
    }
    if (ocrText !== undefined) {
      setClauses.push(`"ocrText" = $${paramIndex++}`);
      values.push(ocrText);
    }
    if (originalText !== undefined) {
      setClauses.push(`"originalText" = $${paramIndex++}`);
      values.push(originalText);
    }
    if (language !== undefined) {
      setClauses.push(`"language" = $${paramIndex++}`);
      values.push(language);
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No fields provided for update' },
        { status: 400 }
      );
    }

    // Always update updatedAt
    setClauses.push(`"updatedAt" = CURRENT_TIMESTAMP`);

    values.push(id);

    const sql = `UPDATE "OcrSession" SET ${setClauses.join(', ')} WHERE "id" = $${paramIndex}`;

    const result = await db.$queryRawUnsafe(sql, ...values);

    // Check if any row was updated
    if (!Array.isArray(result) || result.length === 0) {
      // Fetch to check existence
      const existing = await db.$queryRawUnsafe(
        `SELECT * FROM "OcrSession" WHERE "id" = $1`,
        id
      );
      if (!Array.isArray(existing) || existing.length === 0) {
        return NextResponse.json(
          { error: 'OCR session not found' },
          { status: 404 }
        );
      }
    }

    const updated = await db.$queryRawUnsafe(
      `SELECT * FROM "OcrSession" WHERE "id" = $1`,
      id
    );

    return NextResponse.json(Array.isArray(updated) ? updated[0] : updated);
  } catch (error) {
    console.error('[OCR Session PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update OCR session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check existence first
    const existing = await db.$queryRawUnsafe(
      `SELECT "id" FROM "OcrSession" WHERE "id" = $1`,
      id
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json(
        { error: 'OCR session not found' },
        { status: 404 }
      );
    }

    await db.$executeRawUnsafe(
      `DELETE FROM "OcrSession" WHERE "id" = $1`,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[OCR Session DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete OCR session' },
      { status: 500 }
    );
  }
}