"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/constants";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquarePlus, Trash2, Check, X, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import type { Temperature } from "@/types";

interface DealCardProps {
  id: string;
  title: string;
  value: number;
  contactName: string | null;
  contactTemperature: string | null;
  probability: number;
  lastNote?: string | null;
  isWon?: boolean;
  onDelete?: (id: string) => void;
  onNoteAdded?: () => void;
}

export function DealCard({
  id,
  title,
  value,
  contactName,
  contactTemperature,
  probability,
  lastNote,
  isWon,
  onDelete,
  onNoteAdded,
}: DealCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    await fetch(`/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", description: note.trim(), dealId: id }),
    });
    await fetch(`/api/deals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: note.trim() }),
    });
    setSaving(false);
    setNote("");
    setShowNoteInput(false);
    onNoteAdded?.();
  };

  const deleteDeal = async () => {
    await fetch(`/api/deals/${id}`, { method: "DELETE" });
    onDelete?.(id);
  };

  const convertToProject = async () => {
    setConverting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: id, fromDeal: true }),
      });
      if (res.ok) {
        toast.success("Project created! Go to Projects to see it.");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not create project.");
      }
    } catch {
      toast.error("Network error.");
    }
    setConverting(false);
  };

  const stopPropagation = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <div className="space-y-2">
        {/* Title */}
        <p className="text-sm font-medium leading-tight">{title}</p>

        {/* Value + temperature */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(value)}
          </span>
          {contactTemperature && (
            <StatusBadge temperature={contactTemperature as Temperature} size="sm" />
          )}
        </div>

        {/* Contact + probability */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{contactName || "No contact"}</span>
          <span>{probability}%</span>
        </div>

        {/* Last note preview */}
        {lastNote && !showNoteInput && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 leading-snug line-clamp-2">
            {lastNote}
          </p>
        )}

        {/* Convert to project banner (only on Won stage) */}
        {isWon && (
          <div onPointerDown={stopPropagation}>
            <button
              onClick={convertToProject}
              disabled={converting}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-2 py-1.5 transition-colors disabled:opacity-50"
            >
              <FolderKanban className="h-3 w-3" />
              {converting ? "Creating..." : "→ Send to Projects"}
            </button>
          </div>
        )}

        {/* Inline note input */}
        {showNoteInput && (
          <div onPointerDown={stopPropagation} className="space-y-1">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note or next action..."
              rows={2}
              className="w-full text-xs border rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) saveNote();
                if (e.key === "Escape") { setShowNoteInput(false); setNote(""); }
              }}
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => { setShowNoteInput(false); setNote(""); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                onClick={saveNote}
                disabled={saving || !note.trim()}
                className="p-1 rounded hover:bg-primary/10 text-primary disabled:opacity-40"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          onPointerDown={stopPropagation}
          className="flex items-center justify-between pt-1 border-t border-border/40"
        >
          <button
            onClick={() => { setShowNoteInput(!showNoteInput); setConfirmDelete(false); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquarePlus className="h-3 w-3" />
            Note
          </button>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-destructive">Delete?</span>
              <button onClick={deleteDeal} className="text-xs text-destructive hover:underline font-medium">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
