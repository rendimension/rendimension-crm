"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, User } from "lucide-react";

interface TeamMemberWorkload {
  id: string;
  name: string;
  email: string | null;
  role: string;
  activeProjects: number;
  inProgress: number;
  waitingTeam: number;
  waitingClient: number;
}

export function TeamWorkload({ team, onUpdate }: { team: TeamMemberWorkload[]; onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("designer");

  const addMember = async () => {
    if (!name.trim()) return;
    await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), role }),
    });
    setName("");
    setShowAdd(false);
    onUpdate();
  };

  const getLoadColor = (count: number) =>
    count === 0 ? "text-green-600" : count <= 2 ? "text-yellow-600" : "text-red-600";

  const getLoadLabel = (count: number) =>
    count === 0 ? "Free" : count <= 2 ? "Normal" : "Overloaded";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {team.length} team members · {team.reduce((a, m) => a + m.activeProjects, 0)} active projects
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </div>

      {showAdd && (
        <Card className="border-dashed">
          <CardContent className="pt-4 flex gap-2">
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              className="flex-1"
            />
            <Input
              placeholder="Role (e.g. designer)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addMember}>Add</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground font-normal capitalize">{m.role}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`ml-auto text-xs font-medium ${getLoadColor(m.activeProjects)}`}
                >
                  {getLoadLabel(m.activeProjects)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 rounded p-2">
                  <p className="text-lg font-bold text-blue-600">{m.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="bg-orange-50 rounded p-2">
                  <p className="text-lg font-bold text-orange-500">{m.waitingTeam}</p>
                  <p className="text-xs text-muted-foreground">Team Rev.</p>
                </div>
                <div className="bg-yellow-50 rounded p-2">
                  <p className="text-lg font-bold text-yellow-600">{m.waitingClient}</p>
                  <p className="text-xs text-muted-foreground">Client Rev.</p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {m.activeProjects} active project{m.activeProjects !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}

        {team.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No team members yet. Add your first team member above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
