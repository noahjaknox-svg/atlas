"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProposalComment = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  userName: string;
};

export function ProposalCommentsPanel({
  proposalId,
  currentUserId,
  currentUserName,
  initialComments,
}: {
  proposalId: string;
  currentUserId: string;
  currentUserName: string;
  initialComments?: ProposalComment[];
}) {
  const [comments, setComments] = useState<ProposalComment[]>(initialComments ?? []);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (initialComments) return;
    void fetch(`/api/proposals/${proposalId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(() => {});
  }, [proposalId, initialComments]);

  async function postComment() {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    const res = await fetch(`/api/proposals/${proposalId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const json = await res.json();
    setPosting(false);
    if (res.ok) {
      setComments((c) => [...c, json]);
      setDraft("");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (!posting && draft.trim()) void postComment();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-atlas-border/60 px-3 py-2">
        <p className="atlas-kicker text-atlas-text">Team thread</p>
        <span className="rounded-full bg-atlas-accent/15 px-2.5 py-0.5 text-xs font-medium text-atlas-accent">
          {comments.length}
        </span>
      </div>

      <ul className="atlas-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {comments.length === 0 && (
          <li className="atlas-caption rounded-lg border border-dashed border-atlas-border/50 px-3 py-4 text-center">
            No messages yet. Use this thread for internal notes on this proposal.
          </li>
        )}
        {comments.map((c) => {
          const mine = c.userId === currentUserId;
          return (
            <li
              key={c.id}
              className={cn(
                "max-w-[95%] rounded-lg px-2.5 py-2",
                mine
                  ? "ml-auto border border-atlas-accent/20 bg-atlas-accent/10"
                  : "mr-auto border border-atlas-border/40 bg-atlas-bg"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    mine ? "text-atlas-accent" : "text-atlas-muted"
                  )}
                >
                  {mine ? "You" : c.userName}
                </span>
                <span className="atlas-caption shrink-0 opacity-90">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-atlas-text">
                {c.body}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="shrink-0 border-t border-atlas-border bg-atlas-bg/60 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="Message the team…"
          className="w-full resize-none rounded-lg border border-atlas-border/80 bg-atlas-surface px-3 py-2 text-sm leading-relaxed text-atlas-text placeholder:text-atlas-muted/70 focus:border-atlas-accent focus:outline-none focus:ring-1 focus:ring-atlas-accent/30"
        />
        <p className="atlas-caption mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2 w-full text-xs"
          disabled={posting || !draft.trim()}
          onClick={() => void postComment()}
        >
          {posting ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
