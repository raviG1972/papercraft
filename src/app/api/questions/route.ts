import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ensureQuestionBankTables } from '@/lib/db-setup';

export async function GET(request: NextRequest) {
  try {
    await ensureQuestionBankTables();
    const searchParams = request.nextUrl.searchParams;
    const subject = searchParams.get('subject');
    const type = searchParams.get('type');
    const language = searchParams.get('language');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

    const where: Record<string, unknown> = {};

    if (subject) where.subject = subject;
    if (type) where.type = type;
    if (language) where.language = language;
    if (search) where.text = { contains: search };

    // Tag filter: find questions that have a specific tag
    if (tag) {
      where.tags = {
        some: {
          tag: {
            name: tag,
          },
        },
      };
    }

    const [questions, total] = await Promise.all([
      db.questionBank.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.questionBank.count({ where }),
    ]);

    const formatted = questions.map((q) => ({
      ...q,
      tags: q.tags.map((qt) => qt.tag),
    }));

    return NextResponse.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureQuestionBankTables();
    const body = await request.json();
    const {
      text,
      type = 'short',
      subject,
      grade,
      language = 'english',
      marks,
      difficulty,
      options,
      correctAnswer,
      randomizeOptions = true,
      suggestedAnswer,
      markScheme,
      sourceNote,
      tagNames = [],
    } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'Question text is required' },
        { status: 400 }
      );
    }

    // Create or find tags
    const tagRecords: { id: string }[] = [];
    if (tagNames.length > 0) {
      for (const name of tagNames) {
        const existing = await db.tag.findUnique({ where: { name } });
        if (existing) {
          tagRecords.push({ id: existing.id });
        } else {
          const created = await db.tag.create({
            data: { name },
          });
          tagRecords.push({ id: created.id });
        }
      }
    }

    const question = await db.questionBank.create({
      data: {
        text,
        type,
        subject: subject || null,
        grade: grade || null,
        language,
        marks: marks != null ? Number(marks) : null,
        difficulty: difficulty || null,
        options: options ? JSON.stringify(options) : null,
        correctAnswer: correctAnswer || null,
        randomizeOptions,
        suggestedAnswer: suggestedAnswer || null,
        markScheme: markScheme || null,
        sourceNote: sourceNote || null,
        tags: {
          create: tagRecords.map((t) => ({ tagId: t.id })),
        },
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

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
