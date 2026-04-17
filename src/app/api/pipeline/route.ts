import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineStages, deals, contacts, projects } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const stages = db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order))
    .all();

  const allDeals = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stageId: deals.stageId,
      contactId: deals.contactId,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      notes: deals.notes,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactTemperature: contacts.temperature,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .all();

  const pipeline = stages.map((stage) => ({
    ...stage,
    deals: allDeals.filter((d) => d.stageId === stage.id),
  }));

  return NextResponse.json(pipeline);
}

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  // Update a single deal's stage (drag and drop)
  if (body.dealId && body.stageId) {
    const existing = db.select().from(deals).where(eq(deals.id, body.dealId)).get();
    if (!existing) {
      return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
    }

    const result = db
      .update(deals)
      .set({ stageId: body.stageId, updatedAt: new Date() })
      .where(eq(deals.id, body.dealId))
      .returning()
      .get();

    // Auto-create project if moved to a Won stage
    const targetStage = db.select().from(pipelineStages).where(eq(pipelineStages.id, body.stageId)).get();
    if (targetStage?.isWon) {
      // Only create if no project already exists for this deal
      const existingProject = db
        .select()
        .from(projects)
        .where(eq(projects.dealId, body.dealId))
        .get();

      if (!existingProject) {
        const now = new Date();
        await db.insert(projects).values({
          title: existing.title,
          contactId: existing.contactId ?? undefined,
          dealId: body.dealId,
          status: "in_progress",
          value: existing.value,
          notes: existing.notes ?? undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return NextResponse.json({ ...result, projectCreated: targetStage?.isWon ?? false });
  }

  // Bulk update stages (from /setup or /customize)
  if (body.stages && Array.isArray(body.stages)) {
    const existingDeals = db.select().from(deals).all();
    if (existingDeals.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se pueden reemplazar etapas cuando hay deals activos. Elimina los deals primero.",
        },
        { status: 400 }
      );
    }

    db.delete(pipelineStages).run();

    for (const stage of body.stages) {
      db.insert(pipelineStages)
        .values({
          name: stage.name,
          order: stage.order,
          color: stage.color || "#64748b",
          isWon: stage.isWon || false,
          isLost: stage.isLost || false,
        })
        .run();
    }

    const updated = db
      .select()
      .from(pipelineStages)
      .orderBy(asc(pipelineStages.order))
      .all();

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Request invalido" }, { status: 400 });
}
