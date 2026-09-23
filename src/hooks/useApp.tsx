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
import {
  annotations as mockAnnotations,
  members,
  rolePermissions as mockRolePermissions,
  roles as mockRoles,
  setlists as mockSetlists,
  songs as mockSongs,
} from "@/mocks/data";
import type { Annotation, Role, Setlist, Song, SystemRole, User } from "@/types";

interface AppState {
  users: User[];
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  setRole: (role: SystemRole) => void;
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
  can: (
    action: "manageTeam" | "editSongs" | "createSetlist" | "viewStats" | "manageRoles",
  ) => boolean;
  roles: Role[];
  rolePermissions: Record<string, string[]>;
  addRole: (name: string) => void;
  updateRolePermissions: (roleId: string, permissions: string[]) => void;
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
  const [users, setUsers] = useState<User[]>(members);
  const [currentUserId, setCurrentUserId] = useState("u2");
  const [songs, setSongs] = useState<Song[]>(mockSongs);
  const [setlists, setSetlists] = useState<Setlist[]>(mockSetlists);
  const [annotationList, setAnnotationList] = useState<Annotation[]>(mockAnnotations);
  const [favorites, setFavorites] = useState<string[]>(["s1", "s3", "s12", "s18"]);
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [rolePermissionsMap, setRolePermissionsMap] =
    useState<Record<string, string[]>>(mockRolePermissions);
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

  const currentUser = users.find((u) => u.id === currentUserId) ?? users[0]!;

  const can = useCallback(
    (action: "manageTeam" | "editSongs" | "createSetlist" | "viewStats" | "manageRoles") => {
      const r = currentUser.role;
      if (r === "admin") return true;
      if (r === "lider") return action !== "manageTeam" && action !== "manageRoles";
      return action === "viewStats";
    },
    [currentUser.role],
  );

  const value = useMemo<AppState>(
    () => ({
      users,
      currentUser,
      setCurrentUserId,
      setRole: (role) =>
        setUsers((prev) => prev.map((u) => (u.id === currentUserId ? { ...u, role } : u))),
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
      canEditAnnotation: (a) =>
        a.authorId === currentUser.id ||
        currentUser.role === "admin" ||
        currentUser.role === "lider",
      can,
      roles,
      rolePermissions: rolePermissionsMap,
      addRole: (name) => setRoles((prev) => [...prev, { id: `r${Date.now()}`, name }]),
      updateRolePermissions: (roleId, permissions) =>
        setRolePermissionsMap((prev) => ({ ...prev, [roleId]: permissions })),
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
      currentUser,
      currentUserId,
      songs,
      setlists,
      annotationList,
      favorites,
      can,
      roles,
      rolePermissionsMap,
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

export const roleLabels: Record<SystemRole, string> = {
  admin: "Administrador",
  lider: "Líder de alabanza",
  musico: "Músico / Vocalista",
};
