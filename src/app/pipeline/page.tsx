import { db } from "@/db";
import { pipelineStages, deals, contacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { AddLeadButton } from "@/components/pipeline/AddLeadButton";
import type { PipelineColumn } from "@/types";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  const allStages = db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order))
    .all();

  // Deduplicate: keep only the first stage per name (one pipeline view)
  const seen = new Set<string>();
  const stages = allStages.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  const allDeals = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stageId: deals.stageId,
      brandId: deals.brandId,
      contactId: deals.contactId,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      notes: deals.notes,
      lastMovementAt: deals.lastMovementAt,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactTemperature: contacts.temperature,
      contactPhone: contacts.phone,
      contactEmail: contacts.email,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .all();

  const columns: PipelineColumn[] = stages.map((stage) => ({
    ...stage,
    deals: allDeals
      .filter((d) => d.stageId === stage.id)
      .map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        stageId: d.stageId,
        brandId: d.brandId,
        contactId: d.contactId,
        expectedClose: d.expectedClose,
        probability: d.probability,
        notes: d.notes,
        lastMovementAt: d.lastMovementAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        contactName: d.contactName,
        contactTemperature: d.contactTemperature,
        contactPhone: d.contactPhone,
        contactEmail: d.contactEmail,
      })) as PipelineColumn["deals"],
  }));

  const firstStageId = stages[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground">Drag and drop deals between stages</p>
        </div>
        <AddLeadButton firstStageId={firstStageId} />
      </div>

      <KanbanBoard initialColumns={columns} />
    </div>
  );
}
