import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCheck,
  Film,
  ImageIcon,
  Loader2,
  Mic,
  Reply,
  Trash2,
  X,
} from "lucide-react";
import { fmtSec, ImageLightbox, VoiceBubble } from "@/components/chat-media";

export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
export const MENTION_RE = /#\[([^\]\n]+)\]\(vid:([0-9a-fA-F-]{36})\)/g;

export type InstaMessage = {
  id: string;
  author_type: string;
  author_id: string | null;
  author_name: string;
  content: string | null;
  image_url: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  read_at?: string | null;
  read_by_admin?: boolean | null;
  read_by_editor?: boolean | null;
  reply_to?: string | null;
  created_at: string;
};

export type InstaReaction = {
  id: string;
  comment_id: string;
  author_name: string;
  author_id?: string | null;
  emoji: string;
};

export type MentionItem = { id: string; label: string };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function initials(name: string) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === y.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Renders a body, turning #[Vidéo 1 - x](vid:uuid) tokens into chips. */
export function InstaBody({
  content,
  onOpenMention,
  mine,
}: {
  content: string;
  onOpenMention?: (id: string) => void;
  mine?: boolean;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, "g");
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    const label = m[1]!;
    const id = m[2]!;
    parts.push(
      <button
        key={`${id}-${m.index}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenMention?.(id);
        }}
        className={`mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium transition ${
          mine
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
        }`}
      >
        <Film className="h-3 w-3" />#{label}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <span className="whitespace-pre-wrap break-words">{parts}</span>;
}

export type InstaSendPayload = {
  content: string;
  imageFile: File | null;
  voice: { blob: Blob; seconds: number } | null;
  replyTo: string | null;
};

/** Bulle avec gestes : swipe droite = répondre, appui long = réactions. */
function GestureBubble({
  onReply,
  onLongPress,
  onTap,
  className,
  children,
}: {
  onReply: () => void;
  onLongPress: () => void;
  onTap: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const dxRef = useRef(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);
  const longFired = useRef(false);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const move = (v: number) => {
    dxRef.current = v;
    setDx(v);
  };

  return (
    <div
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.stopPropagation();
        start.current = { x: e.clientX, y: e.clientY };
        moved.current = false;
        longFired.current = false;
        clear();
        timer.current = setTimeout(() => {
          longFired.current = true;
          move(0);
          onLongPress();
        }, 500);
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const x = e.clientX - s.x;
        const y = e.clientY - s.y;
        if (Math.abs(x) > 8 || Math.abs(y) > 8) {
          moved.current = true;
          clear();
        }
        if (!longFired.current && x > 0 && Math.abs(x) > Math.abs(y)) {
          e.stopPropagation();
          move(Math.min(80, x * 0.6));
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        clear();
        const d = dxRef.current;
        move(0);
        start.current = null;
        if (d > 40) onReply();
        else if (!moved.current && !longFired.current) onTap();
      }}
      onPointerCancel={() => {
        clear();
        move(0);
        start.current = null;
      }}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        transform: `translateX(${dx}px)`,
        transition: dx ? "none" : "transform .18s ease-out",
        touchAction: "pan-y",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
      className={className}
    >
      {children}
    </div>
  );
}

export function InstaChat({
  open,
  onClose,
  title,
  subtitle,
  messages,
  reactions = [],
  viewerId,
  viewerKind,
  canDelete,
  typing,
  mentions,
  onOpenMention,
  onSend,
  onReact,
  onDelete,
  onTyping,
  placeholder = "Message…",
  variant = "overlay",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  messages: InstaMessage[];
  reactions?: InstaReaction[];
  viewerId: string | null;
  viewerKind: string;
  canDelete?: boolean;
  typing?: { name: string; recording: boolean } | null;
  mentions?: MentionItem[];
  onOpenMention?: (id: string) => void;
  onSend: (p: InstaSendPayload) => Promise<void>;
  onReact: (commentId: string, emoji: string) => Promise<void> | void;
  onDelete?: (commentId: string) => Promise<void> | void;
  onTyping?: (state: "typing" | "recording" | "off") => void;
  placeholder?: string;
  variant?: "overlay" | "inline";
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [stampFor, setStampFor] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recCancelHint, setRecCancelHint] = useState(false);
  const [locked, setLocked] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 34 }, () => 4));

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recCancelledRef = useRef(false);
  const recSecondsRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdModeRef = useRef(false);
  const typingSentAt = useRef(0);
  const typingOff = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recStartX = useRef(0);
  const recStartY = useRef(0);
  const pressStartRef = useRef(0);
  const lockedRef = useRef(false);
  const holdReleasedRef = useRef(false);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const scrollToEnd = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    endRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
  }, []);

  const [visibleCount, setVisibleCount] = useState(40);
  const shown = useMemo(
    () => (messages.length > visibleCount ? messages.slice(-visibleCount) : messages),
    [messages, visibleCount],
  );

  useEffect(() => {
    if (variant !== "inline" && !open) return;
    // Toujours atterrir sur le message le plus récent à l'ouverture.
    requestAnimationFrame(() => {
      scrollToEnd();
      requestAnimationFrame(() => scrollToEnd());
    });
    const t1 = setTimeout(() => scrollToEnd(), 220);
    const t2 = setTimeout(() => scrollToEnd(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, variant, messages.length, scrollToEnd]);

  // Le geste "retour" (swipe bord gauche / bouton back) ferme le chat, sans naviguer.
  useEffect(() => {
    if (variant !== "overlay" || !open) return;
    window.history.pushState({ instachat: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if ((window.history.state as { instachat?: boolean } | null)?.instachat)
        window.history.back();
    };
  }, [open, variant, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pickerFor) setPickerFor(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, pickerFor]);

  useEffect(() => {
    return () => {
      if (typingOff.current) clearTimeout(typingOff.current);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      recCancelledRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive")
        recorderRef.current.stop();
      onTyping?.("off");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------- typing signal ---------------------------- */
  function notifyTyping(value: string) {
    if (!onTyping) return;
    if (typingOff.current) clearTimeout(typingOff.current);
    if (!value.trim()) {
      typingSentAt.current = 0;
      onTyping("off");
      return;
    }
    const now = Date.now();
    if (now - typingSentAt.current > 1800) {
      typingSentAt.current = now;
      onTyping("typing");
    }
    typingOff.current = setTimeout(() => {
      typingSentAt.current = 0;
      onTyping("off");
    }, 4000);
  }

  /* ------------------------------- mentions ------------------------------ */
  const mentionMatches = useMemo(() => {
    if (mentionQuery === null || !mentions) return [];
    return mentions.filter((v) => v.label.toLowerCase().includes(mentionQuery)).slice(0, 6);
  }, [mentionQuery, mentions]);

  function updateText(value: string) {
    setText(value);
    notifyTyping(value);
    if (!mentions) return;
    const caret = textRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)#([^\s#]*)$/);
    setMentionQuery(m ? (m[1] ?? "").toLowerCase() : null);
  }

  function insertMention(item: MentionItem) {
    const el = textRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/#([^\s#]*)$/, "");
    const next = `${before}#[${item.label}](vid:${item.id}) ${text.slice(caret)}`;
    setText(next);
    setMentionQuery(null);
    requestAnimationFrame(() => el?.focus());
  }

  /* -------------------------------- images ------------------------------- */
  function pickImage(file: File | null | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type))
      return toast.error("Format non supporté (jpg, png, gif, webp)");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image trop lourde, max 5 Mo");
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearImage() {
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  /* -------------------------------- sending ------------------------------ */
  async function submit(voice?: { blob: Blob; seconds: number }) {
    if (busy) return;
    const content = text.trim();
    if (!content && !imageFile && !voice) return;
    setBusy(true);
    try {
      await onSend({ content, imageFile, voice: voice ?? null, replyTo });
      setText("");
      setReplyTo(null);
      clearImage();
      if (typingOff.current) clearTimeout(typingOff.current);
      typingSentAt.current = 0;
      onTyping?.("off");
      setTimeout(() => scrollToEnd(true), 200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------- recording ----------------------------- */
  function lockRecording() {
    lockedRef.current = true;
    setLocked(true);
    setRecCancelHint(false);
  }

  function cancelWithAnim() {
    setTrashing(true);
    stopRecording(true);
    setTimeout(() => setTrashing(false), 600);
  }

  async function startRecording(mode: "hold" | "lock", clientX = 0, clientY = 0) {
    if (recording) return;
    holdReleasedRef.current = false;
    lockedRef.current = mode === "lock";
    setLocked(mode === "lock");
    recStartX.current = clientX;
    recStartY.current = clientY;
    let stream: MediaStream;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Enregistrement audio non supporté sur ce navigateur.");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Autorisez l'accès au microphone.");
      return;
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recChunksRef.current = [];
    recCancelledRef.current = false;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const bars = 34;
        const step = Math.floor(buf.length / bars) || 1;
        const next: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += buf[i * step + j] ?? 0;
          next.push(Math.max(4, Math.min(26, 4 + (sum / step / 255) * 60)));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* waveform is decorative */
    }
    rec.ondataavailable = (e) => e.data.size && recChunksRef.current.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      void audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setLevels(Array.from({ length: 34 }, () => 4));
      setRecording(false);
      setRecCancelHint(false);
      lockedRef.current = false;
      setLocked(false);
      onTyping?.("off");
      const seconds = recSecondsRef.current;
      setRecSeconds(0);
      if (recCancelledRef.current) return;
      const blob = new Blob(recChunksRef.current, { type: mime });
      if (!blob.size || seconds < 1) return;
      void submit({ blob, seconds: Math.max(1, seconds) });
    };
    recorderRef.current = rec;
    rec.start();
    if (mode === "hold" && holdReleasedRef.current) {
      // Le doigt a été relâché avant l'autorisation : on bascule en mode verrouillé.
      lockRecording();
    }
    setRecording(true);
    setRecSeconds(0);
    recSecondsRef.current = 0;
    onTyping?.("recording");
    recTimerRef.current = setInterval(() => {
      recSecondsRef.current += 1;
      setRecSeconds(recSecondsRef.current);
      if (recSecondsRef.current >= 120) stopRecording(false);
    }, 1000);
  }

  function stopRecording(cancel: boolean) {
    recCancelledRef.current = cancel;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  /* -------------------------------- render ------------------------------- */
  const grouped = useMemo(() => {
    return shown.map((m, i) => {
      const prev = shown[i - 1];
      const next = shown[i + 1];
      const mine = viewerId ? m.author_id === viewerId : m.author_type === viewerKind;
      const sameAsPrev =
        prev && prev.author_id === m.author_id && dayKey(prev.created_at) === dayKey(m.created_at);
      const sameAsNext =
        next && next.author_id === m.author_id && dayKey(next.created_at) === dayKey(m.created_at);
      const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
      return { m, mine, first: !sameAsPrev, last: !sameAsNext, newDay };
    });
  }, [shown, viewerId, viewerKind]);

  const lastMine = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((m) => (viewerId ? m.author_id === viewerId : m.author_type === viewerKind)),
    [messages, viewerId, viewerKind],
  );
  const lastMineRead = Boolean(
    lastMine &&
    (lastMine.read_at ||
      (viewerKind === "admin" ? lastMine.read_by_editor : lastMine.read_by_admin)),
  );

  const replyPreview = replyTo ? byId.get(replyTo) : null;

  const inner = (
    <>
          {/* header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-white/5 px-3 py-3 sm:px-5">
            {variant === "overlay" && (
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full text-neutral-200 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-red-500 to-orange-400 text-[12px] font-semibold text-white">
              {initials(title)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              {subtitle && <p className="truncate text-[11px] text-neutral-500">{subtitle}</p>}
            </div>
          </div>

          {/* messages */}
          <div
            ref={scrollRef}
            onClick={() => setPickerFor(null)}
            className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
          >
            <div className="mx-auto flex max-w-2xl flex-col gap-0.5">
              {messages.length > shown.length && (
                <button
                  onClick={() => setVisibleCount((c) => c + 40)}
                  className="mx-auto mb-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-neutral-400 transition hover:bg-white/5 hover:text-white"
                >
                  Voir les anciens messages
                </button>
              )}
              {grouped.length === 0 && (
                <p className="py-16 text-center text-sm text-neutral-600">
                  Aucun message pour l'instant.
                </p>
              )}
              {grouped.map(({ m, mine, first, last, newDay }) => {
                const rx = reactions.filter((r) => r.comment_id === m.id);
                const parent = m.reply_to ? byId.get(m.reply_to) : null;
                return (
                  <div key={m.id}>
                    {newDay && (
                      <p className="py-4 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-600">
                        {dayLabel(m.created_at)}
                      </p>
                    )}
                    <div
                      className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : ""}`}
                    >
                      {!mine &&
                        (last ? (
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-800 text-[10px] font-semibold text-neutral-300">
                            {initials(m.author_name)}
                          </div>
                        ) : (
                          <div className="h-7 w-7 shrink-0" />
                        ))}
                      <GestureBubble
                        onReply={() => setReplyTo(m.id)}
                        onLongPress={() => setPickerFor(m.id)}
                        onTap={() => setStampFor((s) => (s === m.id ? null : m.id))}
                        className={`relative max-w-[78%] cursor-pointer select-none rounded-3xl px-3.5 py-2 text-sm ${
                          mine ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-100"
                        } ${first && !mine ? "rounded-bl-3xl" : ""} ${last ? "" : "mb-0.5"}`}
                      >
                        {!mine && first && (
                          <p className="mb-0.5 text-[11px] font-semibold text-neutral-400">
                            {m.author_name}
                          </p>
                        )}
                        {parent && (
                          <div
                            className={`mb-1.5 rounded-xl border-l-2 px-2 py-1 text-[11px] ${
                              mine
                                ? "border-white/50 bg-white/10 text-white/80"
                                : "border-neutral-600 bg-black/25 text-neutral-400"
                            }`}
                          >
                            <span className="font-semibold">{parent.author_name}</span>
                            <br />
                            <span className="line-clamp-2">
                              {parent.content || (parent.image_url ? "Photo" : "Message vocal")}
                            </span>
                          </div>
                        )}
                        {m.image_url && (
                          <img
                            src={m.image_url}
                            alt="Pièce jointe"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightbox(m.image_url!);
                            }}
                            className="mb-1 max-h-64 w-full rounded-2xl object-cover"
                          />
                        )}
                        {m.audio_url && (
                          <VoiceBubble src={m.audio_url} duration={m.audio_duration} />
                        )}
                        {m.content && (
                          <InstaBody
                            content={m.content}
                            mine={mine}
                            onOpenMention={onOpenMention}
                          />
                        )}

                        {rx.length > 0 && (
                          <div
                            className={`absolute -bottom-3 flex gap-0.5 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[11px] shadow ${
                              mine ? "right-2" : "left-2"
                            }`}
                          >
                            {rx.map((r) => (
                              <button
                                key={r.id}
                                title={r.author_name}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void onReact(m.id, r.emoji);
                                }}
                              >
                                {r.emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        <AnimatePresence>
                          {pickerFor === m.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.7, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.7, y: 6 }}
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute -top-12 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900 px-2 py-1.5 shadow-xl ${
                                mine ? "right-0" : "left-0"
                              }`}
                            >
                              {REACTION_EMOJIS.map((e) => (
                                <button
                                  key={e}
                                  onClick={() => {
                                    setPickerFor(null);
                                    void onReact(m.id, e);
                                  }}
                                  className="text-lg transition hover:scale-125"
                                >
                                  {e}
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  setPickerFor(null);
                                  setReplyTo(m.id);
                                }}
                                className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-neutral-300"
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </button>
                              {canDelete && onDelete && (
                                <button
                                  onClick={() => {
                                    setPickerFor(null);
                                    void onDelete(m.id);
                                  }}
                                  className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GestureBubble>
                    </div>
                    <AnimatePresence>
                      {stampFor === m.id && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`px-2 pt-1 text-[10px] text-neutral-600 ${mine ? "text-right" : "text-left pl-11"}`}
                        >
                          {hhmm(m.created_at)}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {lastMine?.id === m.id && (
                      <p className="flex items-center justify-end gap-1 px-1 pt-1.5 text-[10px] text-neutral-500">
                        {lastMineRead ? (
                          <>
                            <CheckCheck className="h-3.5 w-3.5 text-sky-400" /> Vu
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" /> Envoyé
                          </>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}

              {typing && (
                <div className="mt-2 flex items-center gap-2 pl-1 text-[11px] text-neutral-500">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-neutral-800 text-[10px] font-semibold text-neutral-300">
                    {initials(typing.name)}
                  </div>
                  {typing.recording ? (
                    <span className="flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1.5">
                      <Mic className="h-3.5 w-3.5 animate-pulse text-red-400" /> enregistre un
                      vocal…
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-2">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                          className="h-1.5 w-1.5 rounded-full bg-neutral-400"
                        />
                      ))}
                    </span>
                  )}
                </div>
              )}
              <div ref={endRef} className="h-px w-full" />
            </div>
          </div>

          {/* composer */}
          <div className="shrink-0 border-t border-white/5 px-3 py-3 sm:px-5">
            <div className="mx-auto max-w-2xl">
              <AnimatePresence>
                {replyPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 flex items-start gap-2 rounded-xl border-l-2 border-red-500 bg-neutral-900 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 text-[11px] text-neutral-400">
                      <p className="font-semibold text-neutral-300">
                        Réponse à {replyPreview.author_name}
                      </p>
                      <p className="truncate">
                        {replyPreview.content ||
                          (replyPreview.image_url ? "Photo" : "Message vocal")}
                      </p>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="text-neutral-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {imagePreview && (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-neutral-900 p-2">
                  <img src={imagePreview} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <button onClick={clearImage} className="text-neutral-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {mentionMatches.length > 0 && (
                <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
                  {mentionMatches.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => insertMention(v)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-neutral-200 transition hover:bg-white/5"
                    >
                      <Film className="h-3.5 w-3.5 text-sky-400" />#{v.label}
                    </button>
                  ))}
                </div>
              )}

              {recording ? (
                <div className="flex items-center gap-3 rounded-full bg-neutral-900 px-4 py-2.5">
                  {locked ? (
                    <motion.button
                      onClick={cancelWithAnim}
                      animate={trashing ? { rotate: [0, -18, 14, 0], scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5 }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-red-400 transition hover:bg-red-500/15"
                      aria-label="Annuler le vocal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  ) : (
                    <motion.span
                      animate={
                        recCancelHint ? { rotate: [0, -18, 14, 0], scale: 1.15 } : { scale: 1 }
                      }
                      transition={{ duration: 0.5 }}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                        recCancelHint ? "bg-red-500/20 text-red-400" : "text-red-500"
                      }`}
                    >
                      {recCancelHint ? (
                        <Trash2 className="h-4 w-4" />
                      ) : (
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                      )}
                    </motion.span>
                  )}
                  <motion.div
                    animate={
                      trashing
                        ? { x: -60, y: 18, scale: 0.2, opacity: 0 }
                        : { x: recCancelHint ? -14 : 0, opacity: 1, scale: 1 }
                    }
                    transition={{ duration: trashing ? 0.45 : 0.15 }}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <div className="flex h-6 flex-1 items-center gap-[2px] overflow-hidden">
                      {levels.map((h, i) => (
                        <span
                          key={i}
                          style={{ height: h }}
                          className="w-[3px] rounded-full bg-red-400/80"
                        />
                      ))}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-300">
                      {fmtSec(recSeconds)}
                    </span>
                  </motion.div>
                  <span className="hidden shrink-0 text-[11px] text-neutral-500 sm:block">
                    {locked
                      ? "Vocal verrouillé"
                      : recCancelHint
                        ? "Relâchez pour annuler"
                        : "← annuler · ↑ verrouiller"}
                  </span>
                  <button
                    onClick={() => stopRecording(false)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-600 text-white transition hover:bg-red-500"
                    aria-label="Envoyer le vocal"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => pickImage(e.target.files?.[0])}
                  />
                  <div className="flex flex-1 items-end gap-1 rounded-3xl bg-neutral-900 py-1.5 pl-4 pr-1.5">
                    <textarea
                      ref={textRef}
                      value={text}
                      rows={1}
                      onChange={(e) => updateText(e.target.value)}
                      onPaste={(e) => {
                        const f = Array.from(e.clipboardData.files)[0];
                        if (f) {
                          e.preventDefault();
                          pickImage(f);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (mentionMatches.length > 0) insertMention(mentionMatches[0]!);
                          else void submit();
                        }
                      }}
                      placeholder={placeholder}
                      className="max-h-28 w-full resize-none self-center bg-transparent py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
                    />
                    {text.trim() || imageFile ? (
                      <button
                        onClick={() => void submit()}
                        disabled={busy}
                        className="grid h-9 w-9 shrink-0 place-items-center self-end rounded-full bg-red-600 text-white transition hover:bg-red-500 disabled:opacity-50"
                        aria-label="Envoyer"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUp className="h-5 w-5" />
                        )}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="grid h-9 w-9 shrink-0 place-items-center self-end rounded-full text-neutral-300 transition hover:bg-white/10"
                          aria-label="Envoyer une image"
                        >
                          <ImageIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            if (e.pointerType === "mouse" && e.button !== 0) return;
                            e.currentTarget.setPointerCapture(e.pointerId);
                            pressStartRef.current = Date.now();
                            holdModeRef.current = false;
                            recStartX.current = e.clientX;
                            recStartY.current = e.clientY;
                            if (holdTimer.current) clearTimeout(holdTimer.current);
                            const x = e.clientX;
                            const y = e.clientY;
                            holdTimer.current = setTimeout(() => {
                              holdModeRef.current = true;
                              void startRecording("hold", x, y);
                            }, 350);
                          }}
                          onPointerMove={(e) => {
                            if (!holdModeRef.current || !recording || lockedRef.current) return;
                            if (e.clientY - recStartY.current < -60) {
                              lockRecording();
                              return;
                            }
                            setRecCancelHint(e.clientX - recStartX.current < -70);
                          }}
                          onPointerUp={(e) => {
                            if (holdTimer.current) clearTimeout(holdTimer.current);
                            holdReleasedRef.current = true;
                            if (!holdModeRef.current) {
                              // clic simple → enregistrement verrouillé
                              void startRecording("lock");
                              return;
                            }
                            if (lockedRef.current) return;
                            if (recorderRef.current?.state !== "recording") return;
                            if (e.clientX - recStartX.current < -70) cancelWithAnim();
                            else stopRecording(false);
                          }}
                          onPointerCancel={() => {
                            if (holdTimer.current) clearTimeout(holdTimer.current);
                            holdReleasedRef.current = true;
                            if (lockedRef.current) return;
                            if (recorderRef.current?.state === "recording") lockRecording();
                          }}
                          className="grid h-9 w-9 shrink-0 touch-none select-none place-items-center self-end rounded-full text-neutral-300 transition hover:bg-white/10"
                          aria-label="Message vocal"
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="flex h-[68vh] max-h-[620px] min-h-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
        {inner}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.x > 110 || info.velocity.x > 700) onClose();
          }}
          onPointerDownCapture={(e) => e.stopPropagation()}
          onTouchStartCapture={(e) => e.stopPropagation()}
          style={{ height: "100dvh" }}
          className="fixed inset-0 z-[300] flex w-screen flex-col overflow-hidden bg-neutral-950"
        >
          {inner}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
