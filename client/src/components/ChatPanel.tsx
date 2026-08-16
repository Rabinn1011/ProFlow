import { useEffect, useMemo, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useMessages } from "../hooks/useMessages";
import { MAX_MESSAGE_LENGTH, type ChatMessage } from "../services/message.service";

const errorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const formatDay = (iso: string): string => {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function ChatPanel({
  workspaceId,
  projectId,
  onClose,
  onSend,
}: {
  workspaceId: string;
  projectId: string;
  onClose: () => void;
  onSend: (body: string) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMessages(workspaceId, projectId, true);

  // Pages come newest-first; flatten back into chronological order for display.
  const messages: ChatMessage[] = useMemo(() => {
    if (!data) return [];
    return [...data.pages].reverse().flatMap((page) => page.messages);
  }, [data]);

  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Project chat"
        className="relative flex h-full w-full max-w-md animate-fade-in-up flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Chat</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          {isPending && <p className="text-sm text-slate-400">Loading messages...</p>}

          {isError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage(error) ?? "Failed to load messages"}
            </div>
          )}

          {hasNextPage && (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mx-auto mb-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-70"
            >
              {isFetchingNextPage ? "Loading..." : "Load older messages"}
            </button>
          )}

          {!isPending && messages.length === 0 && (
            <p className="my-auto text-center text-sm text-slate-400">
              No messages yet. Say something.
            </p>
          )}

          <ul className="space-y-3">
            {messages.map((message, index) => {
              const isMine = message.author.id === user?.id;
              const previous = messages[index - 1];
              const showDay =
                !previous ||
                new Date(previous.createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();

              return (
                <li key={message.id}>
                  {showDay && (
                    <div className="my-3 text-center text-xs font-medium text-slate-400">
                      {formatDay(message.createdAt)}
                    </div>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%]">
                      {!isMine && (
                        <div className="mb-1 text-xs font-semibold text-slate-500">
                          {message.author.name}
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm ${
                          isMine
                            ? "bg-violet-600 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      </div>
                      <div
                        className={`mt-1 text-[11px] text-slate-400 ${isMine ? "text-right" : ""}`}
                      >
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div ref={bottomRef} />
        </div>

        <footer className="border-t border-slate-200 px-5 py-4">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Write a message..."
              aria-label="Message"
              className="min-w-0 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="rounded-lg bg-violet-600 p-2.5 text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Enter to send · Shift+Enter for a new line</p>
        </footer>
      </aside>
    </div>
  );
}
