import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/core/auth/useAuth";
import type { AppAction } from "@/core/auth/auth-store";
import {
  annotations as mockAnnotations,
  members,
  setlists as mockSetlists,
  songs as mockSongs,
} from "@/mocks/data";
import type { Annotation, Setlist, Song, User } from "@/types";

interface AppState {
  users: User[];
  currentUser: User;
  songs: Song[];
  addSong: (song: Song) => void;
  setlists: Setlist[];
  addSetlist: (s: Setlist) => void;
  updateSetlist: (s: Setlist) => void;
  addMember: (u: User) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  annotations: Annotation[];
  addAnnotation: (songId: string, text: string) => void;
  updateAnnotation: (id: string, text: string) => void;
  removeAnnotation: (id: string) => void;
  canEditAnnotation: (a: Annotation) => boolean;
  can: (action: AppAction) => boolean;
  // player
  current: Song | null;
  isPlaying: boolean;
  play: (song: Song) => void;
  toggle: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const Ctx = createContext<AppState | null>(null);

const FAV_KEY = "ca_favorites";

export function AppProvider({ children }: { children: ReactNode }) {
  // Identidad real (login contra el backend) — ver core/auth/. AppProvider
  // solo se monta cuando AuthGate ya confirmó que hay sesión, así que
  // `authUser` siempre debería existir acá; el fallback a members[0] es
  // por las dudas (ej. un usuario real sin contraparte en el mock, caso
  // documentado en el ticket) y no debería activarse en el uso normal.
  const { user: authUser, can: canReal } = useAuth();

  const [users, setUsers] = useState<User[]>(members);
  const [songs, setSongs] = useState<Song[]>(mockSongs);
  const [setlists, setSetlists] = useState<Setlist[]>(mockSetlists);
  const [annotationList, setAnnotationList] = useState<Annotation[]>(mockAnnotations);
  const [favorites, setFavorites] = useState<string[]>(["s1", "s3", "s12", "s18"]);
  const [current, setCurrent] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(JSON.parse(raw) as string[]);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch {
      /* noop */
    }
  }, [favorites]);

  // Puente entre la identidad real (login) y los módulos de negocio que
  // siguen 100% mockeados: las 8 personas del mock son las mismas 8 del
  // seed real del backend (mismo email), así que "quién soy yo" para
  // autoría de anotaciones/setlists mockeados se resuelve matcheando el
  // email logueado contra ese mock — no inventa una identidad nueva.
  const currentUser = users.find((u) => u.email === authUser?.email) ?? users[0]!;

  const value = useMemo<AppState>(
    () => ({
      users,
      currentUser,
      songs,
      addSong: (song) => setSongs((prev) => [song, ...prev]),
      setlists,
      addSetlist: (s) => setSetlists((prev) => [s, ...prev]),
      updateSetlist: (s) => setSetlists((prev) => prev.map((x) => (x.id === s.id ? s : x))),
      addMember: (u) => setUsers((prev) => [...prev, u]),
      favorites,
      toggleFavorite: (id) =>
        setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id])),
      annotations: annotationList,
      addAnnotation: (songId, text) =>
        setAnnotationList((prev) => [
          ...prev,
          {
            id: `a${Date.now()}`,
            songId,
            authorId: currentUser.id,
            text,
            createdAt: new Date().toISOString(),
          },
        ]),
      updateAnnotation: (id, text) =>
        setAnnotationList((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a))),
      removeAnnotation: (id) => setAnnotationList((prev) => prev.filter((a) => a.id !== id)),
      // Deuda conocida: compara contra el rol mock (fijo), no contra el
      // permiso real anotacion:update/anotacion:delete que ya usa el
      // backend. Puede discrepar si a alguien se le asigna/saca un rol real
      // en runtime — las anotaciones siguen siendo un módulo mockeado y
      // quedó fuera de alcance de este ticket (ver docs/estado-actual.md).
      canEditAnnotation: (a) =>
        a.authorId === currentUser.id ||
        currentUser.role === "admin" ||
        currentUser.role === "lider",
      can: canReal,
      current,
      isPlaying,
      play: (song) => {
        if (current?.id === song.id) {
          setIsPlaying((p) => !p);
          return;
        }
        setCurrent(song);
        setIsPlaying(true);
      },
      toggle: () => setIsPlaying((p) => !p),
      audioRef,
    }),
    [users, currentUser, songs, setlists, annotationList, favorites, canReal, current, isPlaying],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const roleLabels: Record<User["role"], string> = {
  admin: "Administrador",
  lider: "Líder de alabanza",
  musico: "Músico / Vocalista",
};
