"use client";

import { MessageSquarePlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteConversation } from "@/app/(app)/actions/coach";
import type { ChatConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConversationList({ conversations, activeId }: { conversations: ChatConversation[]; activeId: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/coach"
        className="mb-4 flex items-center justify-center gap-2 rounded-full bg-lime px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#d4ff4a]"
      >
        <MessageSquarePlus className="h-4 w-4" /> New chat
      </Link>
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-widest text-muted">Recent</p>
      <ul className="flex-1 space-y-1 overflow-y-auto">
        {conversations.length === 0 && <li className="px-2 text-sm text-muted">No chats yet.</li>}
        {conversations.map((c) => (
          <li key={c.id} className="group relative">
            <Link
              href={`/coach?c=${c.id}`}
              className={cn(
                "block truncate rounded-xl px-3 py-2.5 pr-9 text-sm transition-colors",
                c.id === activeId ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {c.title}
            </Link>
            <button
              type="button"
              aria-label={`Delete chat ${c.title}`}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteConversation(c.id);
                  if (!res.ok) return void toast.error(res.error);
                  if (c.id === activeId) router.push("/coach");
                })
              }
              className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-danger group-hover:block cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
