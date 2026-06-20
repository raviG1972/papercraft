import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paper = await db.questionPaper.findUnique({
      where: { id },
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

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    return NextResponse.json(paper);
  } catch (error) {
    console.error('Error fetching paper:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paper' },
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
    const { title, subject, grade, instructions, duration, totalMarks, sections } = body;

    const existing = await db.questionPaper.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    // Delete existing sections and questions (cascade delete handles questions)
    await db.paperSection.deleteMany({ where: { paperId: id } });

    // Update paper and recreate sections
    const paper = await db.questionPaper.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        subject: subject ?? existing.subject,
        grade: grade != null ? grade : existing.grade,
        instructions: instructions != null ? instructions : existing.instructions,
        duration: duration != null ? duration : existing.duration,
        totalMarks: totalMarks != null ? Number(totalMarks) : existing.totalMarks,
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

    return NextResponse.json(paper);
  } catch (error) {
    console.error('Error updating paper:', error);
    return NextResponse.json(
      { error: 'Failed to update paper' },
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
    const existing = await db.questionPaper.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    await db.questionPaper.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting paper:', error);
    return NextResponse.json(
      { error: 'Failed to delete paper' },
      { status: 500 }
    );
  }
}