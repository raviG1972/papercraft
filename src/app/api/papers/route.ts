import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const papers = await db.questionPaper.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json(papers);
  } catch (error) {
    console.error('Error fetching papers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch papers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subject, grade, instructions, duration, totalMarks, sections } = body;

    if (!title || !subject) {
      return NextResponse.json(
        { error: 'Title and subject are required' },
        { status: 400 }
      );
    }

    const paper = await db.questionPaper.create({
      data: {
        title,
        subject,
        grade: grade || null,
        instructions: instructions || null,
        duration: duration || null,
        totalMarks: totalMarks != null ? Number(totalMarks) : null,
        sections: {
          create: (sections || []).map(
            (section: {
              name: string;
              order: number;
              questions?: {
                content: string;
                marks?: number;
                order?: number;
                sourceType?: string;
                suggestedAnswer?: string;
                markScheme?: string;
                difficulty?: string;
              }[];
            }) => ({
              name: section.name,
              order: section.order,
              questions: {
                create: (section.questions || []).map(
                  (q: {
                    content: string;
                    marks?: number;
                    order?: number;
                    sourceType?: string;
                    suggestedAnswer?: string;
                    markScheme?: string;
                    difficulty?: string;
                  }) => ({
                    content: q.content,
                    marks: q.marks != null ? Number(q.marks) : null,
                    order: q.order ?? 0,
                    sourceType: q.sourceType || 'manual',
                    suggestedAnswer: q.suggestedAnswer || null,
                    markScheme: q.markScheme || null,
                    difficulty: q.difficulty || null,
                  })
                ),
              },
            })
          ),
        },
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json(paper, { status: 201 });
  } catch (error) {
    console.error('Error creating paper:', error);
    return NextResponse.json(
      { error: 'Failed to create paper' },
      { status: 500 }
    );
  }
}