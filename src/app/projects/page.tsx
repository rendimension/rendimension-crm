"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FolderKanban, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectKanban } from "@/components/projects/ProjectKanban";
import { TeamWorkload } from "@/components/projects/TeamWorkload";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, t, c] = await Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/team").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]);
    setProjects(Array.isArray(p) ? p : []);
    setTeam(Array.isArray(t) ? t : []);
    const contactList = Array.isArray(c) ? c : (c.contacts ?? []);
    setContacts(contactList);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = projects.filter((p: any) =>
    !["completed", "invoice_sent"].includes(p.project?.status)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {active} active · {projects.length} total
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">
            <FolderKanban className="h-4 w-4 mr-2" />Board
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />Team Workload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <ProjectKanban projects={projects} onUpdate={load} />
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamWorkload team={team} onUpdate={load} />
        </TabsContent>
      </Tabs>

      {showNew && (
        <NewProjectDialog
          contacts={contacts}
          team={team}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}
