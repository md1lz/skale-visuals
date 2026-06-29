import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronDown, LogOut, UserPen, X, Upload, Trash2 } from "lucide-react";
import {
  getAdminProfile,
  updateAdminProfile,
  logoutAdminFn,
} from "@/lib/admin-auth.functions";

type Profile = {
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

function Initials({ p }: { p: Profile }) {
  const base = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.username;
  const letters = base
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <span className="text-[11px] font-semibold text-white">{letters || "?"}</span>;
}

function Avatar({ p, size = 32 }: { p: Profile; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-full bg-gradient-to-br from-red-600 to-red-800 ring-1 ring-white/15 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {p.avatarUrl ? (
        <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <Initials p={p} />
      )}
    </span>
  );
}

export function AdminProfileMenu({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getAdminProfile);
  const saveProfile = useServerFn(updateAdminProfile);
  const logout = useServerFn(logoutAdminFn);

  const [profile, setProfile] = useState<Profile>({
    username: initialUsername,
    firstName: null,
    lastName: null,
    avatarUrl: null,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile().then((p) => setProfile(p)).catch(() => {});
  }, [fetchProfile]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleLogout() {
    await logout();
    await router.invalidate();
    navigate({ to: "/" });
  }

  const displayName =
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Mon profil";

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 rounded-lg border border-white/10 bg-neutral-900/60 hover:bg-white/5 px-2.5 py-2 transition"
        >
          <Avatar p={profile} />
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-xs font-medium text-white truncate">{displayName}</span>
            <span className="block text-[10px] text-neutral-500 truncate">@{profile.username}</span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-0 left-full ml-2 w-56 rounded-lg border border-white/10 bg-neutral-900 shadow-xl overflow-hidden z-50"
            >
              <button
                onClick={() => {
                  setOpen(false);
                  setEditing(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5 transition"
              >
                <UserPen className="h-3.5 w-3.5" />
                Modifier mon profil
              </button>
              <div className="h-px bg-white/10" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                Se déconnecter
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editing && (
          <ProfileEditor
            profile={profile}
            onClose={() => setEditing(false)}
            onSave={async (p) => {
              await saveProfile({
                data: {
                  firstName: p.firstName,
                  lastName: p.lastName,
                  avatarDataUrl: p.avatarUrl?.startsWith("data:") ? p.avatarUrl : undefined,
                  removeAvatar: p.avatarUrl === null,
                },
              });
              const fresh = await fetchProfile();
              setProfile(fresh);
              setEditing(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ProfileEditor({
  profile,
  onClose,
  onSave,
}: {
  profile: Profile;
  onClose: () => void;
  onSave: (p: Profile) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function pickFile(file: File) {
    if (file.size > 1_500_000) {
      setError("Image trop volumineuse (max 1.5 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setDraft((d) => ({ ...d, avatarUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={() => !saving && onClose()}
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-[92vw] max-w-4xl rounded-2xl border border-white/10 bg-neutral-950 p-8 shadow-2xl"
        style={{ zoom: 1.25 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold">Mon profil</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-neutral-500 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-5 mb-6">
          <Avatar p={draft} size={80} />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-900 hover:bg-white/5 px-3 py-2 text-xs text-neutral-200 transition"
            >
              <Upload className="h-3.5 w-3.5" />
              Importer une photo
            </button>
            {draft.avatarUrl && (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, avatarUrl: null }))}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Retirer
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1.5">Prénom</span>
            <input
              type="text"
              value={draft.firstName ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
              disabled={saving}
              className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-neutral-400 mb-1.5">Nom</span>
            <input
              type="text"
              value={draft.lastName ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
              disabled={saving}
              className="w-full rounded-lg bg-neutral-900 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition disabled:opacity-60"
            />
          </label>
        </div>

        <p className="text-xs text-neutral-500 mb-5">
          Identifiant : <span className="text-neutral-300">@{draft.username}</span>
        </p>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 transition disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-70 px-4 py-2.5 text-sm font-medium text-white transition"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
