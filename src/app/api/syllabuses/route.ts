import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const syllabuses = await db.syllabus.findMany({
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(syllabuses);
  } catch (error) {
    console.error('Error fetching syllabuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch syllabuses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subject, grade, year, language, chapters } = body;

    if (!title || !subject || !grade) {
      return NextResponse.json(
        { error: 'Title, subject, and grade are required' },
        { status: 400 }
      );
    }

    const syllabus = await db.syllabus.create({
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

    return NextResponse.json(syllabus, { status: 201 });
  } catch (error) {
    console.error('Error creating syllabus:', error);
    return NextResponse.json(
      { error: 'Failed to create syllabus' },
      { status: 500 }
    );
  }
}