"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Send, Users, CheckCircle, FileText, ArrowRight } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  revision_team: { label: "Revision: Team", color: "bg-orange-100 text-orange-700" },
  revision_client: { label: "Revision: Client", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  invoice_sent: { label: "Invoice Sent", color: "bg-purple-100 text-purple-700" },
};

const REV_ICONS: Record<string, React.ReactNode> = {
  sent_to_team: <Users className="h-3 w-3" />,
  sent_to_client: <Send className="h-3 w-3" />,
  received_from_client: <ArrowRight className="h-3 w-3" />,
  note: <FileText className="h-3 w-3" />,
};

export function ProjectDetailDialog({
  projectId,
  onClose,
  onUpdate,
}: {
  projectId: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [revNote, setRevNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch("/api/team").then((r) => r.json()),
    ]).then(([p, t]) => {
      setData(p);
      setTeam(Array.isArray(t) ? t : []);
    });
  }, [projectId]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, revisionNote: revNote || undefined }),
    });
    setRevNote("");
    const updated = await fetch(`/api/projects/${projectId}`).then((r) => r.json());
    setData(updated);
    setSaving(false);
    onUpdate();
  };

  const updateAssignee = async (assigneeId: string) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId, addRevision: false }),
    });
    const updated = await fetch(`/api/projects/${projectId}`).then((r) => r.json());
    setData(updated);
    onUpdate();
  };

  if (!data) return null;

  const cfg = STATUS_CONFIG[data.project?.status] ?? STATUS_CONFIG.in_progress;
  const revisions = data.revisions ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{data.project?.title}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cfg.color}>{cfg.label}</Badge>
            <span className="text-sm text-muted-foreground">
              {data.contact?.name}{data.contact?.company ? ` · ${data.contact.company}` : ""}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Assignee */}
          <div>
            <label className="text-sm font-medium mb-1 block">Assigned to</label>
            <Select
              value={data.project?.assigneeId ?? "unassigned"}
              onValueChange={(v) => updateAssignee(v === "unassigned" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Assign to team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {team.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.activeProjects} active)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Move to next status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Move project to</label>
            <Textarea
              placeholder="Optional note for this revision (e.g. 'sent v3 to client')"
              value={revNote}
              onChange={(e) => setRevNote(e.target.value)}
              className="mb-2 text-sm"
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG)
                .filter(([s]) => s !== data.project?.status)
                .map(([s, c]) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => updateStatus(s)}
                  >
                    {s === "revision_team" && <Users className="h-3 w-3 mr-1" />}
                    {s === "revision_client" && <Send className="h-3 w-3 mr-1" />}
                    {s === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {c.label}
                  </Button>
                ))}
            </div>
          </div>

          {/* Revision history */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Revision History ({revisions.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {revisions.map((r: any) => (
                <div key={r.id} className="flex gap-3 text-sm border-l-2 border-muted pl-3 py-1">
                  <span className="text-muted-foreground mt-0.5">
                    {REV_ICONS[r.type] ?? <FileText className="h-3 w-3" />}
                  </span>
                  <div>
                    <p className="font-medium capitalize">{r.type.replace(/_/g, " ")}</p>
                    {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {revisions.length === 0 && (
                <p className="text-sm text-muted-foreground">No revisions yet.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
