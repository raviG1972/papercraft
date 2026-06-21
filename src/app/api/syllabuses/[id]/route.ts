import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const syllabus = await db.syllabus.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!syllabus) {
      return NextResponse.json({ error: 'Syllabus not found' }, { status: 404 });
    }

    return NextResponse.json(syllabus);
  } catch (error) {
    console.error('Error fetching syllabus:', error);
    return NextResponse.json(
      { error: 'Failed to fetch syllabus' },
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
    const { title, subject, grade, year, language, chapters } = body;

    // Delete existing chapters and lessons, then recreate
    const existingLessons = await db.lesson.findMany({
      where: { chapter: { syllabusId: id } },
      select: { id: true },
    });
    const existingChapters = await db.chapter.findMany({
      where: { syllabusId: id },
      select: { id: true },
    });

    // Delete in order (lessons first, then chapters)
    if (existingLessons.length > 0) {
      await db.lesson.deleteMany({
        where: { id: { in: existingLessons.map((l) => l.id) } },
      });
    }
    if (existingChapters.length > 0) {
      await db.chapter.deleteMany({
        where: { id: { in: existingChapters.map((c) => c.id) } },
      });
    }

    // Update syllabus and recreate chapters
    const syllabus = await db.syllabus.update({
      where: { id },
      data: {
        title,
        subject,
        grade,
        chapters: {
          create: (chapters || []).map(
            (ch: { name: string; order: number; lessons?: { name: string; description: string | null; order: number }[] }) => ({
              name: ch.name,
              order: ch.order,
              lessons: {
                create: (ch.lessons || []).map(
                  (l: { name: string; description: string | null; order: number }) => ({
                    name: l.name,
                    description: l.description,
                    order: l.order,
                  })
                ),
              },
            })
          ),
        },
      },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });

    return NextResponse.json(syllabus);
  } catch (error) {
    console.error('Error updating syllabus:', error);
    return NextResponse.json(
      { error: 'Failed to update syllabus' },
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
    await db.syllabus.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    return NextResponse.json(
      { error: 'Failed to delete syllabus' },
      { status: 500 }
    );
  }
}