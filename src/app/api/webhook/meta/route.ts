/**
 * Meta Lead Ads Webhook
 * URL: POST /api/webhook/meta
 * Configure in Meta Business > Lead Ads > CRM Integration
 *
 * Also handles GET for webhook verification (Meta requires this)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities, deals, pipelineStages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "rendimension-crm-2026";

// Meta verification handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Receive lead
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta sends: { object: "page", entry: [{ changes: [{ value: { leadgen_id, form_id, field_data } }] }] }
    const entries = body?.entry ?? [];

    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const val = change?.value;
        if (!val?.field_data) continue;

        const fields: Record<string, string> = {};
        for (const f of val.field_data) {
          fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
        }

        const name =
          fields["full_name"] ||
          `${fields["first_name"] ?? ""} ${fields["last_name"] ?? ""}`.trim() ||
          "Meta Lead";

        const now = new Date();

        // 1. Create contact
        const [contact] = await db
          .insert(contacts)
          .values({
            name,
            email: fields["email"] ?? null,
            phone: fields["phone_number"] ?? fields["phone"] ?? null,
            company: fields["company_name"] ?? fields["company"] ?? null,
            source: "facebook_ads",
            temperature: "cold",
            score: 40,
            notes: `Meta Lead Ads — Form ID: ${val.form_id ?? "unknown"}\nLeadgen ID: ${val.leadgen_id ?? "unknown"}\nRaw fields: ${JSON.stringify(fields)}`,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        // 2. Find the first pipeline stage ("New Lead")
        const firstStage = db
          .select()
          .from(pipelineStages)
          .orderBy(asc(pipelineStages.order))
          .get();

        // 3. Create deal in first stage
        if (firstStage) {
          await db.insert(deals).values({
            title: `${name}${fields["company_name"] ?? fields["company"] ? ` - ${fields["company_name"] ?? fields["company"]}` : ""} (FB Lead)`,
            contactId: contact.id,
            stageId: firstStage.id,
            value: 0,
            probability: 10,
            notes: `Lead from Meta Ads — Form: ${val.form_id ?? "unknown"}`,
            createdAt: now,
            updatedAt: now,
          });
        }

        // 4. Auto-log activity
        await db.insert(activities).values({
          type: "note",
          description: `New lead from Meta Ads (Facebook/Instagram). Form: ${val.form_id ?? "unknown"}`,
          contactId: contact.id,
          createdAt: now,
        });

        console.log(`[Meta Webhook] New lead: ${name} | ${fields["email"]} | Form: ${val.form_id}`);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (e) {
    console.error("[Meta Webhook] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
