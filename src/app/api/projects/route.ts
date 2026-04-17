import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, contacts, teamMembers, projectRevisions, deals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");

  try {
    const rows = await db
      .select({
        project: projects,
        contact: { id: contacts.id, name: contacts.name, company: contacts.company },
        assignee: { id: teamMembers.id, name: teamMembers.name },
      })
      .from(projects)
      .leftJoin(contacts, eq(projects.contactId, contacts.id))
      .leftJoin(teamMembers, eq(projects.assigneeId, teamMembers.id))
      .orderBy(desc(projects.createdAt));

    let result = rows;
    if (status) result = result.filter((r) => r.project.status === status);
    if (assigneeId) result = result.filter((r) => r.project.assigneeId === assigneeId);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date();

    // If converting from a deal, pull data from the deal automatically
    if (body.fromDeal && body.dealId) {
      const deal = db.select().from(deals).where(eq(deals.id, body.dealId)).get();
      if (!deal) {
        return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      }

      // Check if project already exists for this deal
      const existing = db.select().from(projects).where(eq(projects.dealId, body.dealId)).get();
      if (existing) {
        return NextResponse.json(
          { error: "A project for this deal already exists." },
          { status: 409 }
        );
      }

      const [project] = await db
        .insert(projects)
        .values({
          title: deal.title,
          contactId: deal.contactId ?? undefined,
          dealId: deal.id,
          status: "in_progress",
          startDate: now,
          value: deal.value,
          notes: deal.notes ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await db.insert(projectRevisions).values({
        projectId: project.id,
        type: "sent_to_team",
        notes: "Project created from Closed Won deal",
        createdAt: now,
      });

      return NextResponse.json(project, { status: 201 });
    }

    // Normal creation from form
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const [project] = await db
      .insert(projects)
      .values({
        title: body.title,
        contactId: body.contactId ?? undefined,
        dealId: body.dealId ?? undefined,
        assigneeId: body.assigneeId ?? undefined,
        status: "in_progress",
        startDate: body.startDate ? new Date(body.startDate) : now,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        value: body.value ?? 0,
        notes: body.notes ?? undefined,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await db.insert(projectRevisions).values({
      projectId: project.id,
      type: "sent_to_team",
      notes: "Project started",
      createdAt: now,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
