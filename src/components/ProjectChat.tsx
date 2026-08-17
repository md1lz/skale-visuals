import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUp,
  Check,
  CheckCheck,
  ChevronDown,
  Film,
  ImageIcon,
  Loader2,
  Mic,
  MessagesSquare,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getProjectChat,
  postProjectComment,
  markProjectCommentsRead,
  toggleProjectCommentReaction,
  deleteProjectComment,
  createProjectChatUploadUrl,
  setProjectTyping,
  getProjectTyping,
} from "@/lib/project-chat.functions";
import { fmtSec, ImageLightbox, VoiceBubble } from "@/components/chat-media";
import { fmtDateTimeFR, videoLabel } from "@/lib/project-display";
import { useIsMobile } from "@/hooks/use-mobile";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "👏", "✅"];
const MENTION_RE = /#\[([^\]\n]+)\]\(vid:([0-9a-fA-F-]{36})\)/g;

type VideoRef = { id: string; video_number: number; title: string | null };

/** Renders a message body, turning #[Vidéo 1 - x](vid:uuid) tokens into chips. */
function MessageBody({
  content,
  onOpenVideo,
}: {
  content: string;
  onOpenVideo?: (id: string) => void;
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
        onClick={() => onOpenVideo?.(id)}
        className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[12px] font-medium text-sky-300 transition hover:bg-sky-500/30"
      >
        <Film className="h-3 w-3" />#{label}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <p className="whitespace-pre-wrap text-sm text-neutral-200">{parts}</p>;
}

export function ProjectChat({
  projectId,
  role,
  onOpenVideo,
}: {
  projectId: string;
  role: "editor" | "admin";
  onOpenVideo?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const fetchChat = useServerFn(getProjectChat);
  const sendComment = useServerFn(postProjectComment);
  const markRead = useServerFn(markProjectCommentsRead);
  const react = useServerFn(toggleProjectCommentReaction);
  const removeComment = useServerFn(deleteProjectComment);
  const makeUpload = useServerFn(createProjectChatUploadUrl);
  const pingTyping = useServerFn(setProjectTyping);
  const fetchTyping = useServerFn(getProjectTyping);

  const [open, setOpen] = useState(true);
  const isMobile = useIsMobile();

  // On phones the chat is a full-screen sheet, closed by default.
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [unlocked, setUnlocked] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 40 }, () => 4));

  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<BlobPart[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recCancelledRef = useRef(false);
  const recSecondsRef = useRef(0);
  const sendOnStopRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const typingSentAtRef = useRef(0);
  const typingOffRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = useQuery({
    queryKey: ["project-chat", projectId],
    queryFn: () => fetchChat({ data: { project_id: projectId } }),
    refetchInterval: 15_000,
  });
  const typingQ = useQuery({
    queryKey: ["project-chat", "typing", projectId],
    queryFn: () => fetchTyping({ data: { project_id: projectId } }),
    refetchInterval: 2000,
    staleTime: 0,
  });

  const comments = q.data?.comments ?? [];
  const reactions = q.data?.reactions ?? [];
  const me = q.data?.viewer;
  const videos = (q.data?.videos ?? []) as VideoRef[];

  const unreadIds = useMemo(
    () =>
      new Set(
        comments
          .filter((c) =>
            role === "editor"
              ? c.author_type === "admin" && !c.read_by_editor
              : c.author_type === "editor" && !c.read_by_admin,
          )
          .map((c) => c.id),
      ),
    [comments, role],
  );

  // Project chat refreshes through the 15s polling above. No client-side
  // Realtime subscription: project_comments is backend-only (deny-all RLS)
  // and is read exclusively through authenticated server functions.

  useEffect(() => {
    if (unreadIds.size === 0) return;
    const t = setTimeout(() => {
      markRead({ data: { project_id: projectId } })
        .then(() => qc.invalidateQueries({ queryKey: ["project-chat", projectId] }))
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [unreadIds, projectId, markRead, qc]);

  useEffect(() => {
    if (unlocked) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [unlocked, comments.length, open, visibleCount]);

  useEffect(() => {
    return () => {
      if (typingOffRef.current) clearTimeout(typingOffRef.current);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      recCancelledRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      void pingTyping({ data: { project_id: projectId, state: "off" as const } }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const sendTyping = useCallback(
    (state: "typing" | "recording" | "off") => {
      void pingTyping({ data: { project_id: projectId, state } }).catch(() => {});
    },
    [pingTyping, projectId],
  );

  function notifyTyping(value: string) {
    if (typingOffRef.current) clearTimeout(typingOffRef.current);
    if (!value.trim()) {
      typingSentAtRef.current = 0;
      sendTyping("off");
      return;
    }
    const now = Date.now();
    if (now - typingSentAtRef.current > 1800) {
      typingSentAtRef.current = now;
      sendTyping("typing");
    }
    typingOffRef.current = setTimeout(() => {
      typingSentAtRef.current = 0;
      sendTyping("off");
    }, 4000);
  }

  /* ------------- mentions ------------- */

  function onChangeMessage(value: string) {
    setMessage(value);
    notifyTyping(value);
    const caret = textRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = before.match(/#([^\s#]*)$/);
    setMentionQuery(m ? m[1]!.toLowerCase() : null);
  }

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return videos
      .filter((v) => videoLabel(v).toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [mentionQuery, videos]);

  function insertMention(v: VideoRef) {
    const el = textRef.current;
    const caret = el?.selectionStart ?? message.length;
    const before = message.slice(0, caret).replace(/#([^\s#]*)$/, "");
    const after = message.slice(caret);
    const token = `#[${videoLabel(v)}](vid:${v.id}) `;
    const next = `${before}${token}${after}`;
    setMessage(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = (before + token).length;
      el?.setSelectionRange(pos, pos);
    });
  }

  /* ------------- media ------------- */

  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  function pickImage(file: File | null | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast.error("Format non supporté (jpg, png, gif, webp)");
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

  async function uploadFile(blob: Blob, kind: "image" | "audio", fileName: string) {
    const { path, token } = await makeUpload({
      data: { project_id: projectId, file_name: fileName, kind },
    });
    const { error } = await supabase.storage.from("site-videos").uploadToSignedUrl(path, token, blob);
    if (error) throw new Error(error.message);
    return path;
  }

  async function send(voice?: { blob: Blob; seconds: number }) {
    if ((!message.trim() && !imageFile && !voice) || busy) return;
    setBusy(true);
    try {
      let image_path: string | null = null;
      let audio_path: string | null = null;
      if (imageFile) image_path = await uploadFile(imageFile, "image", imageFile.name);
      if (voice) {
        const ext = voice.blob.type.includes("mp4") ? "mp4" : "webm";
        audio_path = await uploadFile(voice.blob, "audio", `vocal.${ext}`);
      }
      await sendComment({
        data: {
          project_id: projectId,
          content: message.trim(),
          image_path,
          audio_path,
          audio_duration: voice ? Math.max(1, Math.round(voice.seconds)) : null,
        },
      });
      setMessage("");
      setMentionQuery(null);
      clearImage();
      sendTyping("off");
      qc.invalidateQueries({ queryKey: ["project-chat", projectId] });
      setOpen(true);
      setTimeout(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }, 250);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    if (recording) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Autorisez l'accès au microphone dans les paramètres de votre navigateur.");
      return;
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recChunksRef.current = [];
    recCancelledRef.current = false;
    sendOnStopRef.current = false;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const bars = 40;
        const step = Math.floor(buf.length / bars) || 1;
        const next: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += buf[i * step + j] ?? 0;
          next.push(Math.max(4, Math.min(28, 4 + (sum / step / 255) * 60)));
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
      setLevels(Array.from({ length: 40 }, () => 4));
      sendTyping("off");
      setRecording(false);
      const seconds = recSecondsRef.current;
      setRecSeconds(0);
      if (recCancelledRef.current) return;
      const blob = new Blob(recChunksRef.current, { type: mime });
      if (!blob.size || !sendOnStopRef.current) return;
      sendOnStopRef.current = false;
      void send({ blob, seconds: Math.max(1, seconds) });
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setRecSeconds(0);
    recSecondsRef.current = 0;
    sendTyping("recording");
    recTimerRef.current = setInterval(() => {
      recSecondsRef.current += 1;
      setRecSeconds(recSecondsRef.current);
      if (recSecondsRef.current % 2 === 0) sendTyping("recording");
      if (recSecondsRef.current >= 120) {
        sendOnStopRef.current = true;
        recorderRef.current?.stop();
      }
    }, 1000);
  }

  async function handleReaction(commentId: string, emoji: string) {
    setPickerFor(null);
    try {
      await react({ data: { comment_id: commentId, emoji } });
      qc.invalidateQueries({ queryKey: ["project-chat", projectId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleDelete(commentId: string) {
    setPickerFor(null);
    try {
      await removeComment({ data: { comment_id: commentId } });
      qc.invalidateQueries({ queryKey: ["project-chat", projectId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-300 transition hover:text-white"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
        <MessagesSquare className="h-4 w-4 text-red-400" />
        Chat général du projet
        <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-normal normal-case tracking-normal text-neutral-400">
          {comments.length} message{comments.length > 1 ? "s" : ""}
        </span>
        {unreadIds.size > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-medium text-white">
            {unreadIds.size}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 py-4">
          <div className="relative mb-3 h-[22rem]">
            <div className="chat-fade-top pointer-events-none absolute inset-x-0 top-0 z-20 h-16 rounded-t-xl" />
            <button
              type="button"
              onClick={() => {
                if (unlocked) {
                  setUnlocked(false);
                  setVisibleCount(10);
                } else {
                  setUnlocked(true);
                  setVisibleCount(Math.max(10, comments.length));
                }
                requestAnimationFrame(() => {
                  const el = scrollRef.current;
                  if (el) el.scrollTop = el.scrollHeight;
                });
              }}
              className="absolute right-1.5 top-1.5 z-30 rounded-full border border-white/10 bg-neutral-900/80 px-2.5 py-1 text-[11px] text-neutral-300 backdrop-blur transition hover:bg-white/10 hover:text-white"
            >
              {unlocked ? "Verrouiller" : "↑ Voir les anciens messages"}
            </button>
            <div
              ref={scrollRef}
              className={`flex h-full flex-col gap-3 pr-1.5 ${
                unlocked
                  ? "overflow-y-auto overscroll-contain [scrollbar-width:thin]"
                  : "justify-end overflow-hidden"
              }`}
            >
              <div className="mt-auto space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    Aucun message. Utilise « # » pour mentionner une vidéo du projet.
                  </p>
                ) : (
                  comments.slice(-visibleCount).map((c) => {
                    const mine = me
                      ? c.author_type === me.kind && (c.author_id ? c.author_id === me.id : true)
                      : c.author_type === role;
                    const mineReaction = reactions.find(
                      (r) => r.comment_id === c.id && me && r.author_name === me.name,
                    );
                    const grouped = new Map<string, number>();
                    reactions
                      .filter((r) => r.comment_id === c.id)
                      .forEach((r) => grouped.set(r.emoji, (grouped.get(r.emoji) ?? 0) + 1));
                    return (
                      <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className="group relative max-w-[85%]">
                          <div
                            className={`rounded-xl px-3 py-2 ${
                              mine
                                ? "border border-red-500/20 bg-red-500/10"
                                : "border border-white/10 bg-white/[0.04]"
                            } ${unreadIds.has(c.id) ? "border-l-2 border-l-red-500" : ""}`}
                          >
                            <div className="mb-0.5 flex items-center gap-2">
                              <span className="text-xs font-medium text-white">
                                {mine ? "Moi" : c.author_name}
                              </span>
                              <span className="text-[11px] text-neutral-500">
                                {fmtDateTimeFR(c.created_at)}
                              </span>
                            </div>
                            {c.content && (
                              <MessageBody content={c.content} onOpenVideo={onOpenVideo} />
                            )}
                            {c.image_url && (
                              <img
                                src={c.image_url}
                                alt="Pièce jointe"
                                onClick={() => setLightbox(c.image_url!)}
                                className="mt-1 max-h-48 w-auto max-w-[200px] cursor-zoom-in rounded-lg border border-white/10 object-cover"
                              />
                            )}
                            {c.audio_url && (
                              <VoiceBubble src={c.audio_url} duration={c.audio_duration} />
                            )}
                            {mine && (
                              <div className="mt-0.5 flex items-center justify-end gap-1">
                                {c.read_at ? (
                                  <>
                                    <span className="text-[10px] text-emerald-400">Lu</span>
                                    <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] text-neutral-500">Envoyé</span>
                                    <Check className="h-3.5 w-3.5 text-neutral-500" />
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {grouped.size > 0 && (
                            <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
                              {[...grouped.entries()].map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(c.id, emoji)}
                                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition ${
                                    mineReaction?.emoji === emoji
                                      ? "border-red-500/40 bg-red-500/15 text-white"
                                      : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  {count > 1 && <span>{count}</span>}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => setPickerFor(pickerFor === c.id ? null : c.id)}
                            className={`absolute top-1 ${
                              mine ? "-left-7" : "-right-7"
                            } rounded-full p-1 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:text-white`}
                          >
                            <SmilePlus className="h-4 w-4" />
                          </button>

                          {role === "admin" && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              title="Supprimer ce message"
                              className={`absolute top-8 ${
                                mine ? "-left-7" : "-right-7"
                              } rounded-full p-1 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:text-red-400`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {pickerFor === c.id && (
                            <>
                              <div className="fixed inset-0 z-[290]" onClick={() => setPickerFor(null)} />
                              <div className="absolute bottom-full z-[300] mb-1 flex gap-1 rounded-full border border-white/10 bg-neutral-900 px-2 py-1 shadow-xl">
                                {REACTION_EMOJIS.map((e) => (
                                  <button
                                    key={e}
                                    onClick={() => handleReaction(c.id, e)}
                                    className="rounded-full px-1 text-base transition hover:scale-125"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}

          <div className="h-5 px-1">
            <AnimatePresence>
              {typingQ.data && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="flex items-center gap-1.5 text-[11px] text-neutral-400"
                >
                  {typingQ.data.recording ? (
                    <>
                      <Mic className="h-3.5 w-3.5 animate-pulse text-red-400" />
                      <span>{typingQ.data.name} est en train d'enregistrer un vocal 🎙</span>
                    </>
                  ) : (
                    <span>{typingQ.data.name} est en train d'écrire…</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {imagePreview && !recording && (
            <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <div className="relative">
                <img src={imagePreview} alt="Aperçu" className="h-16 w-16 rounded-md object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute -right-2 -top-2 rounded-full bg-neutral-800 p-1 text-neutral-300 transition hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {recording ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-neutral-950 px-3 py-2">
              <span className="flex items-center gap-1.5 text-sm tabular-nums text-red-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {fmtSec(recSeconds)}
              </span>
              <div className="flex h-8 flex-1 items-center justify-center gap-[2px] overflow-hidden">
                {levels.map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}px` }}
                    className="w-[3px] rounded-full bg-red-400/80 transition-[height] duration-75"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  recCancelledRef.current = true;
                  sendOnStopRef.current = false;
                  recorderRef.current?.stop();
                }}
                title="Annuler l'enregistrement"
                className="rounded-full p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  sendOnStopRef.current = true;
                  recorderRef.current?.stop();
                }}
                title="Envoyer le vocal"
                className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-500"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-end gap-2">
              {mentionMatches.length > 0 && (
                <div className="absolute bottom-full left-0 z-[320] mb-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
                  <p className="border-b border-white/5 px-3 py-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
                    Mentionner une vidéo
                  </p>
                  {mentionMatches.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => insertMention(v)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-white/10"
                    >
                      <Film className="h-3.5 w-3.5 text-sky-400" />
                      {videoLabel(v)}
                    </button>
                  ))}
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => pickImage(e.target.files?.[0])}
              />
              <textarea
                ref={textRef}
                value={message}
                onChange={(e) => onChangeMessage(e.target.value)}
                onPaste={(e) => {
                  const item = Array.from(e.clipboardData.items).find((i) =>
                    i.type.startsWith("image/"),
                  );
                  const file = item?.getAsFile();
                  if (file) {
                    e.preventDefault();
                    pickImage(file);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setMentionQuery(null);
                  if (e.key === "Enter" && !e.shiftKey) {
                    if (mentionMatches.length > 0) {
                      e.preventDefault();
                      insertMention(mentionMatches[0]!);
                      return;
                    }
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Message du projet…  (# pour mentionner une vidéo)"
                className="flex-1 resize-none rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                title="Envoyer une image"
                className="rounded-full p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void startRecording()}
                title="Enregistrer un vocal"
                className="rounded-full p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                onClick={() => void send()}
                disabled={busy}
                title="Envoyer"
                className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}