import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const question = await db.questionBank.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const formatted = {
      ...question,
      tags: question.tags.map((qt) => qt.tag),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
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
    const existing = await db.questionBank.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      text,
      type,
      subject,
      grade,
      language,
      marks,
      difficulty,
      options,
      correctAnswer,
      randomizeOptions,
      suggestedAnswer,
      markScheme,
      sourceNote,
      tagNames,
    } = body;

    // If tagNames is provided, update tags
    if (tagNames !== undefined) {
      // Delete existing tag links
      await db.questionTag.deleteMany({ where: { questionId: id } });

      // Create new tag links
      if (tagNames.length > 0) {
        for (const name of tagNames) {
          const existingTag = await db.tag.findUnique({ where: { name } });
          if (existingTag) {
            await db.questionTag.create({
              data: { questionId: id, tagId: existingTag.id },
            });
          } else {
            const created = await db.tag.create({ data: { name } });
            await db.questionTag.create({
              data: { questionId: id, tagId: created.id },
            });
          }
        }
      }
    }

    const question = await db.questionBank.update({
      where: { id },
      data: {
        ...(text != null ? { text } : {}),
        ...(type != null ? { type } : {}),
        ...(subject !== undefined ? { subject: subject || null } : {}),
        ...(grade !== undefined ? { grade: grade || null } : {}),
        ...(language != null ? { language } : {}),
        ...(marks !== undefined ? { marks: marks != null ? Number(marks) : null } : {}),
        ...(difficulty !== undefined ? { difficulty: difficulty || null } : {}),
        ...(options !== undefined ? { options: options ? JSON.stringify(options) : null } : {}),
        ...(correctAnswer !== undefined ? { correctAnswer: correctAnswer || null } : {}),
        ...(randomizeOptions !== undefined ? { randomizeOptions } : {}),
        ...(suggestedAnswer !== undefined ? { suggestedAnswer: suggestedAnswer || null } : {}),
        ...(markScheme !== undefined ? { markScheme: markScheme || null } : {}),
        ...(sourceNote !== undefined ? { sourceNote: sourceNote || null } : {}),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const formatted = {
      ...question,
      tags: question.tags.map((qt) => qt.tag),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
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
    const existing = await db.questionBank.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    await db.questionBank.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
