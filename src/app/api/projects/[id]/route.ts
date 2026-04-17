import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, projectRevisions, teamMembers, contacts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [row] = await db
      .select({
        project: projects,
        contact: { id: contacts.id, name: contacts.name, company: contacts.company },
        assignee: { id: teamMembers.id, name: teamMembers.name },
      })
      .from(projects)
      .leftJoin(contacts, eq(projects.contactId, contacts.id))
      .leftJoin(teamMembers, eq(projects.assigneeId, teamMembers.id))
      .where(eq(projects.id, id));

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const revisions = await db
      .select()
      .from(projectRevisions)
      .where(eq(projectRevisions.projectId, id))
      .orderBy(desc(projectRevisions.createdAt));

    return NextResponse.json({ ...row, revisions });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const now = new Date();

    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.completedDate !== undefined) updateData.completedDate = new Date(body.completedDate);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.value !== undefined) updateData.value = body.value;

    const [updated] = await db.update(projects).set(updateData).where(eq(projects.id, id)).returning();

    if (body.status && body.addRevision !== false) {
      const revType =
        body.status === "revision_team" ? "sent_to_team"
        : body.status === "revision_client" ? "sent_to_client"
        : "note";
      await db.insert(projectRevisions).values({
        projectId: id,
        type: revType,
        notes: body.revisionNote ?? `Status: ${body.status}`,
        createdAt: now,
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.delete(projectRevisions).where(eq(projectRevisions.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
