import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { getLatestUnreadMessage } from "@/lib/project-chat.functions";

/** Instagram-style in-app banner for new chat messages. */
export function MessagePing({ role }: { role: "admin" | "editor" }) {
  const fetchLatest = useServerFn(getLatestUnreadMessage);
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["chat-ping", role],
    queryFn: () => fetchLatest(),
    refetchInterval: 15_000,
  });

  const msg = q.data && q.data.id !== dismissed ? q.data : null;

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setDismissed(msg.id), 6000);
    return () => clearTimeout(t);
  }, [msg]);

  return (
    <AnimatePresence>
      {msg && (
        <motion.button
          key={msg.id}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={() => {
            setDismissed(msg.id);
            const base = role === "admin" ? "/crm/admin/projets" : "/crm/monteur/projets";
            void navigate({
              to: base,
              search: { p: msg.project_id, ...(msg.video_id ? { v: msg.video_id } : {}) },
            });
          }}
          className="fixed inset-x-3 top-3 z-[350] flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/95 px-3 py-2.5 text-left shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:w-96"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-400 text-[12px] font-semibold text-white">
            {msg.author_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white">
              {msg.author_name} · {msg.project_title}
            </p>
            <p className="truncate text-[12px] text-neutral-400">{msg.preview}</p>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
