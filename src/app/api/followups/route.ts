import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { isNotNull, isNull, sql } from "drizzle-orm";

export async function GET() {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get all active contacts (not closed won / lost)
  const allContacts = db.select().from(contacts).all();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const overdue = allContacts.filter((c) => {
    if (!c.nextFollowupAt) return false;
    const d = new Date(c.nextFollowupAt);
    return d < todayStart;
  });

  const today = allContacts.filter((c) => {
    if (!c.nextFollowupAt) return false;
    const d = new Date(c.nextFollowupAt);
    return d >= todayStart && d <= todayEnd;
  });

  const waitingResponse = allContacts.filter((c) => {
    if (!c.lastContactedAt) return false;
    const d = new Date(c.lastContactedAt);
    return d <= threeDaysAgo && !c.nextFollowupAt;
  });

  const noContact = allContacts.filter((c) => !c.lastContactedAt);

  const upcoming = allContacts.filter((c) => {
    if (!c.nextFollowupAt) return false;
    const d = new Date(c.nextFollowupAt);
    return d > todayEnd && d <= in7Days;
  });

  return NextResponse.json({
    overdue,
    today,
    waitingResponse,
    noContact,
    upcoming,
  });
}
