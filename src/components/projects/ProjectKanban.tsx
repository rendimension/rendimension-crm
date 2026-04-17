"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, ChevronRight } from "lucide-react";
import { ProjectDetailDialog } from "./ProjectDetailDialog";

const COLUMNS = [
  { status: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { status: "revision_team", label: "Revision: Team", color: "bg-orange-500" },
  { status: "revision_client", label: "Revision: Client", color: "bg-yellow-500" },
  { status: "completed", label: "Completed", color: "bg-green-500" },
  { status: "invoice_sent", label: "Invoice Sent", color: "bg-purple-500" },
];

interface ProjectRow {
  project: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    value: number;
    notes: string | null;
    assigneeId: string | null;
  };
  contact: { id: string; name: string; company: string | null } | null;
  assignee: { id: string; name: string } | null;
}

export function ProjectKanban({ projects, onUpdate }: { projects: ProjectRow[]; onUpdate: () => void }) {
  const [selected, setSelected] = useState<ProjectRow | null>(null);

  const moveStatus = async (id: string, status: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onUpdate();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = projects.filter((p) => p.project.status === col.status);
        return (
          <div key={col.status} className="min-w-[260px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${col.color}`} />
              <span className="font-semibold text-sm">{col.label}</span>
              <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((row) => (
                <Card
                  key={row.project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelected(row)}
                >
                  <CardHeader className="pb-2 pt-3 px-3">
                    <p className="font-medium text-sm leading-tight">{row.project.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.contact?.name ?? "—"}{row.contact?.company ? ` · ${row.contact.company}` : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    {row.assignee && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {row.assignee.name}
                      </div>
                    )}
                    {row.project.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(row.project.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    {row.project.value > 0 && (
                      <p className="text-xs font-medium text-green-600">
                        ${(row.project.value / 100).toLocaleString()}
                      </p>
                    )}
                    {/* Quick move buttons */}
                    <div className="flex gap-1 pt-1 flex-wrap">
                      {COLUMNS.filter((c) => c.status !== col.status).slice(0, 2).map((c) => (
                        <Button
                          key={c.status}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={(e) => { e.stopPropagation(); moveStatus(row.project.id, c.status); }}
                        >
                          <ChevronRight className="h-3 w-3 mr-1" />
                          {c.label.split(":")[0]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                  No projects
                </div>
              )}
            </div>
          </div>
        );
      })}

      {selected && (
        <ProjectDetailDialog
          projectId={selected.project.id}
          onClose={() => setSelected(null)}
          onUpdate={() => { setSelected(null); onUpdate(); }}
        />
      )}
    </div>
  );
}
