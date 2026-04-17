"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Clock, CalendarCheck, MessageCircle, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  temperature: string;
  score: number;
  lastContactedAt: string | null;
  nextFollowupAt: string | null;
  followupNotes: string | null;
  createdAt: string;
}

interface FollowupData {
  overdue: Lead[];
  today: Lead[];
  upcoming: Lead[];
  waitingResponse: Lead[];
  noContact: Lead[];
  summary: Record<string, number>;
}

const TEMP_COLORS: Record<string, string> = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-orange-100 text-orange-700",
  cold: "bg-blue-100 text-blue-700",
};

function LeadCard({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) {
  const [nextDate, setNextDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const markContacted = async () => {
    setSaving(true);
    await fetch(`/api/contacts/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastContactedAt: new Date().toISOString(),
        nextFollowupAt: nextDate || null,
        followupNotes: note || null,
      }),
    });
    setSaving(false);
    onUpdate();
  };

  const daysSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / 86400000);
  };

  return (
    <div className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{lead.name}</span>
          <Badge className={`text-xs ${TEMP_COLORS[lead.temperature] ?? ""}`}>
            {lead.temperature}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">
            {lead.source.replace("_", " ")}
          </span>
        </div>
        {lead.company && (
          <p className="text-xs text-muted-foreground">{lead.company}</p>
        )}
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          {lead.phone && <span>📞 {lead.phone}</span>}
          {lead.email && <span className="truncate">✉ {lead.email}</span>}
        </div>
        {lead.lastContactedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Last contact: {daysSince(lead.lastContactedAt)}d ago
          </p>
        )}
        {lead.followupNotes && (
          <p className="text-xs italic text-muted-foreground mt-1">"{lead.followupNotes}"</p>
        )}
        {/* Quick action */}
        <div className="flex gap-2 mt-2">
          <Input
            type="date"
            className="h-7 text-xs w-36"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            placeholder="Next follow-up"
          />
          <Input
            className="h-7 text-xs flex-1"
            placeholder="Quick note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" className="h-7 text-xs" onClick={markContacted} disabled={saving}>
            {saving ? "..." : "Contacted"}
          </Button>
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground shrink-0">
        Score: <span className="font-bold text-foreground">{lead.score}</span>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  leads,
  color,
  onUpdate,
}: {
  icon: React.ElementType;
  title: string;
  leads: Lead[];
  color: string;
  onUpdate: () => void;
}) {
  if (leads.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm flex items-center gap-2 ${color}`}>
          <Icon className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="ml-auto">{leads.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} onUpdate={onUpdate} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function FollowupsPage() {
  const [data, setData] = useState<FollowupData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/followups").then((r) => r.json());
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-muted-foreground text-sm p-4">Loading follow-ups...</p>;
  if (!data) return null;

  const total = (data.overdue?.length ?? 0) + (data.today?.length ?? 0) + (data.upcoming?.length ?? 0) + (data.noContact?.length ?? 0) + (data.waitingResponse?.length ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <p className="text-muted-foreground text-sm">
          {total} leads need attention
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Overdue", count: data.overdue?.length ?? 0, color: "text-red-600" },
          { label: "Today", count: data.today?.length ?? 0, color: "text-orange-600" },
          { label: "This week", count: data.upcoming?.length ?? 0, color: "text-blue-600" },
          { label: "Waiting reply", count: data.waitingResponse?.length ?? 0, color: "text-yellow-600" },
          { label: "Never contacted", count: data.noContact?.length ?? 0, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="text-center p-3">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Section icon={AlertCircle} title="Overdue" leads={data.overdue} color="text-red-600" onUpdate={load} />
      <Section icon={CalendarCheck} title="Due Today" leads={data.today} color="text-orange-600" onUpdate={load} />
      <Section icon={MessageCircle} title="Waiting for Reply (3+ days)" leads={data.waitingResponse} color="text-yellow-600" onUpdate={load} />
      <Section icon={UserX} title="Never Contacted" leads={data.noContact} color="text-muted-foreground" onUpdate={load} />
      <Section icon={Clock} title="Upcoming (next 7 days)" leads={data.upcoming} color="text-blue-600" onUpdate={load} />
    </div>
  );
}
