import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const members = await db.select().from(teamMembers).where(eq(teamMembers.isActive, true));

    const allProjects = await db
      .select({ assigneeId: projects.assigneeId, status: projects.status })
      .from(projects);

    const workload = members.map((m) => {
      const active = allProjects.filter(
        (p) => p.assigneeId === m.id && p.status !== "completed" && p.status !== "invoice_sent"
      );
      return {
        ...m,
        activeProjects: active.length,
        inProgress: active.filter((p) => p.status === "in_progress").length,
        waitingTeam: active.filter((p) => p.status === "revision_team").length,
        waitingClient: active.filter((p) => p.status === "revision_client").length,
      };
    });

    return NextResponse.json(workload);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [member] = await db
      .insert(teamMembers)
      .values({
        name: body.name,
        email: body.email ?? null,
        role: body.role ?? "designer",
        createdAt: new Date(),
      })
      .returning();
    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
