"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  contacts: Array<{ id: string; name: string; company?: string | null }>;
  team: Array<{ id: string; name: string; activeProjects: number }>;
  onClose: () => void;
  onCreated: () => void;
}

export function NewProjectDialog({ contacts, team, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: "",
    contactId: "",
    assigneeId: "",
    dueDate: "",
    value: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.contactId) return;
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        contactId: form.contactId,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate || null,
        value: form.value ? Math.round(parseFloat(form.value) * 100) : 0,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    onCreated();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Project title *</Label>
            <Input
              placeholder="e.g. Alo Yoga — Miami Store Renders"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div>
            <Label>Client *</Label>
            <Select value={form.contactId || undefined} onValueChange={(v) => set("contactId", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.company ? ` - ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Assign to</Label>
            <Select value={form.assigneeId || undefined} onValueChange={(v) => set("assigneeId", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member (optional)" />
              </SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.activeProjects} active)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <div>
              <Label>Value ($)</Label>
              <Input
                type="number"
                placeholder="5000"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Project details, scope, references..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title || !form.contactId}>
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
