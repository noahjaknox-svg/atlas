import type { KanbanColumnId } from "@/lib/schedule/types";

export const KANBAN_COLUMNS: { id: KanbanColumnId; label: string }[] = [
  { id: "available", label: "Available" },
  { id: "repo_opportunity", label: "Repo Opportunity" },
  { id: "soft_hold", label: "Soft Hold" },
  { id: "hard_block", label: "Hard Block" },
];
