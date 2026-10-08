import { History } from "lucide-react";
import type { Metadata } from "next";
import { Chat } from "@/components/coach/chat";
import { ConversationList } from "@/components/coach/conversation-list";
import { requireOnboardedProfile } from "@/lib/data/profile";
import type { ChatConversation, ChatMessage } from "@/lib/types";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Coach" };

export default async function CoachPage({ searchParams }: PageProps<"/coach">) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireOnboardedProfile();
  const requestedId = typeof sp.c === "string" ? sp.c : null;
  const prefill = typeof sp.q === "string" ? sp.q.slice(0, 500) : undefined;

  const { data: convData } = await supabase
    .from("chat_conversations")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(30);
  const conversations = (convData ?? []) as ChatConversation[];
  const activeId = requestedId && conversations.some((c) => c.id === requestedId) ? requestedId : null;

  const { data: msgData } = activeId
    ? await supabase.from("chat_messages").select("id, role, content, proposals, created_at").eq("conversation_id", activeId).order("created_at")
    : { data: [] };

  return (
    <div className="-mb-20 grid gap-6 lg:-mb-4 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block lg:h-[calc(100dvh-5rem)]">
        <ConversationList conversations={conversations} activeId={activeId} />
      </aside>
      <div className="min-w-0">
        <h1 className="sr-only">AI Coach</h1>
        <details className="mb-3 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted [&::-webkit-details-marker]:hidden">
            <History className="h-4 w-4" /> Chats
          </summary>
          <div className="card mt-2 max-h-72 p-3">
            <ConversationList conversations={conversations} activeId={activeId} />
          </div>
        </details>
        <Chat
          key={activeId ?? "new"}
          conversationId={activeId}
          initialMessages={(msgData ?? []) as ChatMessage[]}
          userName={firstName(profile.full_name)}
          prefill={prefill}
        />
      </div>
    </div>
  );
}
