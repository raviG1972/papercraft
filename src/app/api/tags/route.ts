import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const tags = await db.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    const formatted = tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      questionCount: t._count.questions,
      createdAt: t.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const existing = await db.tag.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json(
        { error: 'Tag already exists', tag: existing },
        { status: 409 }
      );
    }

    const tag = await db.tag.create({
      data: {
        name: name.trim(),
        color: color || null,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
