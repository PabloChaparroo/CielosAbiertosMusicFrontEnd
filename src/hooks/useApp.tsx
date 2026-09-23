import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/core/auth/useAuth";
import type { AppAction } from "@/core/auth/auth-store";
import { EquipoService } from "@/features/equipo/services/equipo.service";
import {
  annotations as mockAnnotations,
  MOCK_USER_ID_TO_EMAIL,
  setlists as mockSetlists,
  songs as mockSongs,
} from "@/mocks/data";
import type { Annotation, Setlist, Song, User } from "@/types";

type UsersLoadState = "loading" | "ready" | "error";

interface AppState {
  users: User[];
  usersLoadState: UsersLoadState;
  reloadUsers: () => void;
  currentUser: User;
  songs: Song[];
  addSong: (song: Song) => void;
  setlists: Setlist[];
  addSetlist: (s: Setlist) => void;
  updateSetlist: (s: Setlist) => void;
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

/**
 * Traduce los IDs fijos "u1".."u8" que usan los mocks de Setlists/Anotaciones
 * a los IDs reales de backend, matcheando por email. Puente temporal: ver el
 * comentario de MOCK_USER_ID_TO_EMAIL en mocks/data.ts — se borra por
 * completo cuando Setlists/Anotaciones se conecten al backend real.
 */
function buildMockIdAlias(users: User[]): Record<string, string> {
  const idByEmail = new Map(users.map((u) => [u.email, u.id]));
  const alias: Record<string, string> = {};
  for (const [mockId, email] of Object.entries(MOCK_USER_ID_TO_EMAIL)) {
    const realId = idByEmail.get(email);
    if (realId) alias[mockId] = realId;
  }
  return alias;
}

function remapSetlists(setlists: Setlist[], alias: Record<string, string>): Setlist[] {
  return setlists.map((s) => ({
    ...s,
    leaderId: alias[s.leaderId] ?? s.leaderId,
    teamIds: s.teamIds.map((id) => alias[id] ?? id),
  }));
}

function remapAnnotations(annotations: Annotation[], alias: Record<string, string>): Annotation[] {
  return annotations.map((a) => ({ ...a, authorId: alias[a.authorId] ?? a.authorId }));
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Identidad real (login contra el backend) — ver core/auth/.
  const { user: authUser, can: canReal } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoadState, setUsersLoadState] = useState<UsersLoadState>("loading");
  const [songs, setSongs] = useState<Song[]>(mockSongs);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [annotationList, setAnnotationList] = useState<Annotation[]>([]);
  const [favorites, setFavorites] = useState<string[]>(["s1", "s3", "s12", "s18"]);
  const [current, setCurrent] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadUsers = useCallback(() => {
    setUsersLoadState("loading");
    EquipoService.listMembers(true)
      .then((fetched) => {
        setUsers(fetched);
        const alias = buildMockIdAlias(fetched);
        setSetlists(remapSetlists(mockSetlists, alias));
        setAnnotationList(remapAnnotations(mockAnnotations, alias));
        setUsersLoadState("ready");
      })
      .catch(() => setUsersLoadState("error"));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  // authUser siempre debería existir acá (AppProvider solo se monta cuando
  // AuthGate ya confirmó sesión). Mientras "users" (GET /equipo) todavía está
  // cargando, se arma un currentUser provisorio a partir de /auth/me (que ya
  // se resolvió antes de montar este provider) para que la UI no se rompa
  // durante ese instante; en cuanto "users" llega, se reemplaza por el real.
  const currentUser: User =
    users.find((u) => u.id === authUser?.id) ??
    (authUser
      ? {
          id: authUser.id,
          name: authUser.name,
          roles: authUser.roles.map((name) => ({ id: name, name })),
          ministryRole: authUser.ministryRole,
          instruments: authUser.instruments,
          avatarColor: authUser.avatarColor,
          initials: authUser.initials,
          email: authUser.email,
          fechaHoraAlta: "",
          fechaHoraBaja: null,
        }
      : ({} as User));

  const value = useMemo<AppState>(
    () => ({
      users,
      usersLoadState,
      reloadUsers: loadUsers,
      currentUser,
      songs,
      addSong: (song) => setSongs((prev) => [song, ...prev]),
      setlists,
      addSetlist: (s) => setSetlists((prev) => [s, ...prev]),
      updateSetlist: (s) => setSetlists((prev) => prev.map((x) => (x.id === s.id ? s : x))),
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
            authorId: currentUser?.id ?? "",
            text,
            createdAt: new Date().toISOString(),
          },
        ]),
      updateAnnotation: (id, text) =>
        setAnnotationList((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a))),
      removeAnnotation: (id) => setAnnotationList((prev) => prev.filter((a) => a.id !== id)),
      // Deuda conocida (ya documentada, no resuelta por este ticket): compara
      // por nombre de rol en vez de por permiso real anotacion:update /
      // anotacion:delete. Es frágil ante un rename de rol hecho desde Roles y
      // Permisos (si alguien renombra "Admin" o "Líder", esta comparación deja
      // de matchear y el chequeo falla silenciosamente). Las anotaciones
      // siguen siendo un módulo mockeado y quedan fuera de alcance acá.
      canEditAnnotation: (a) =>
        a.authorId === currentUser?.id ||
        (currentUser?.roles.some((r) => r.name === "Admin" || r.name === "Líder") ?? false),
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
    [
      users,
      usersLoadState,
      loadUsers,
      currentUser,
      songs,
      setlists,
      annotationList,
      favorites,
      canReal,
      current,
      isPlaying,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
