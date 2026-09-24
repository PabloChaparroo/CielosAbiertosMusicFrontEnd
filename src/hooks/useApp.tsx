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
import { AnnotationsService } from "@/features/canciones/services/annotations.service";
import { FavoritesService } from "@/features/canciones/services/favorites.service";
import { SongsService } from "@/features/canciones/services/songs.service";
import { SetlistsService } from "@/features/musica/setlists/services/setlists.service";
import type { Annotation, Setlist, Song, User } from "@/types";

type LoadState = "loading" | "ready" | "error";

interface AppState {
  users: User[];
  usersLoadState: LoadState;
  reloadUsers: () => void;
  currentUser: User;
  songs: Song[];
  songsLoadState: LoadState;
  addSong: (song: Song) => void;
  updateSong: (song: Song) => void;
  setlists: Setlist[];
  setlistsLoadState: LoadState;
  addSetlist: (s: Setlist) => void;
  /**
   * Persiste contra el backend real (no hay endpoint de "solo reordenar" ni
   * de "un item a la vez": el PATCH manda siempre el array `items` completo
   * en el nuevo orden). Optimista + revert-con-aviso si falla — nunca queda
   * un cambio "solo local" sin intentar persistirse.
   */
  updateSetlist: (s: Setlist) => Promise<void>;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  annotations: Annotation[];
  annotationsLoadState: LoadState;
  loadAnnotationsForSong: (songId: string) => void;
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

export function AppProvider({ children }: { children: ReactNode }) {
  // Identidad real (login contra el backend) — ver core/auth/.
  const { user: authUser, can: canReal } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoadState, setUsersLoadState] = useState<LoadState>("loading");
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoadState, setSongsLoadState] = useState<LoadState>("loading");
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [setlistsLoadState, setSetlistsLoadState] = useState<LoadState>("loading");
  const [annotationList, setAnnotationList] = useState<Annotation[]>([]);
  const [annotationsLoadState, setAnnotationsLoadState] = useState<LoadState>("ready");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [current, setCurrent] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadUsers = useCallback(() => {
    setUsersLoadState("loading");
    EquipoService.listMembers(true)
      .then((fetched) => setUsers(fetched))
      .then(() => setUsersLoadState("ready"))
      .catch(() => setUsersLoadState("error"));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setSongsLoadState("loading");
    SongsService.listAll()
      .then((fetched) => {
        setSongs(fetched);
        setSongsLoadState("ready");
      })
      .catch(() => setSongsLoadState("error"));
  }, []);

  useEffect(() => {
    setSetlistsLoadState("loading");
    SetlistsService.listAll()
      .then((fetched) => {
        setSetlists(fetched);
        setSetlistsLoadState("ready");
      })
      .catch(() => setSetlistsLoadState("error"));
  }, []);

  useEffect(() => {
    FavoritesService.listMine()
      .then(setFavorites)
      .catch(() => setFavorites([]));
  }, []);

  const loadAnnotationsForSong = useCallback((songId: string) => {
    setAnnotationsLoadState("loading");
    AnnotationsService.listBySong(songId)
      .then((fetched) => {
        setAnnotationList((prev) => [...prev.filter((a) => a.songId !== songId), ...fetched]);
        setAnnotationsLoadState("ready");
      })
      .catch(() => setAnnotationsLoadState("error"));
  }, []);

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
          avatarKey: authUser.avatarKey,
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
      songsLoadState,
      addSong: (song) => setSongs((prev) => [song, ...prev]),
      updateSong: (song) => setSongs((prev) => prev.map((s) => (s.id === song.id ? song : s))),
      setlists,
      setlistsLoadState,
      addSetlist: (s) => setSetlists((prev) => [s, ...prev]),
      updateSetlist: (s) => {
        const previous = setlists;
        // Optimista: se ve el cambio de inmediato (drag & drop se siente
        // instantáneo), pero se persiste ya mismo contra el backend real —
        // nunca queda como "solo local" a la espera de un guardado futuro.
        setSetlists((prev) => prev.map((x) => (x.id === s.id ? s : x)));
        return SetlistsService.updateSetlist(s.id, {
          title: s.title,
          date: s.date,
          isUpcoming: s.isUpcoming,
          type: s.type,
          leaderId: s.leaderId,
          teamIds: s.teamIds,
          items: s.items.map((item) => ({
            songId: item.songId,
            key: item.key,
            ...(item.note ? { note: item.note } : {}),
          })),
        })
          .then((saved) => {
            setSetlists((prev) => prev.map((x) => (x.id === s.id ? saved : x)));
          })
          .catch((err) => {
            // Revert explícito: si el guardado real falla, no se deja el
            // cambio "pegado" solo en el cliente — se vuelve al estado
            // previo y el caller (SetlistDetail) avisa al usuario.
            setSetlists(previous);
            throw err;
          });
      },
      favorites,
      toggleFavorite: (id) => {
        setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
        FavoritesService.toggle(id).catch(() => {
          // revierte el optimista si el toggle real falló
          setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
        });
      },
      annotations: annotationList,
      annotationsLoadState,
      loadAnnotationsForSong,
      addAnnotation: (songId, text) => {
        AnnotationsService.create(songId, text)
          .then(() => loadAnnotationsForSong(songId))
          .catch(() => setAnnotationsLoadState("error"));
      },
      updateAnnotation: (id, text) => {
        const songId = annotationList.find((a) => a.id === id)?.songId;
        AnnotationsService.update(id, text)
          .then(() => {
            if (songId) loadAnnotationsForSong(songId);
          })
          .catch(() => setAnnotationsLoadState("error"));
      },
      removeAnnotation: (id) => {
        const songId = annotationList.find((a) => a.id === id)?.songId;
        AnnotationsService.remove(id)
          .then(() => {
            if (songId) loadAnnotationsForSong(songId);
          })
          .catch(() => setAnnotationsLoadState("error"));
      },
      // Resuelto de raíz (ya no compara por nombre de rol): la autoría manda
      // sobre el permiso "propio" y, si no es el autor, se exige el permiso
      // de moderación real — igual criterio que assertCanEdit() en el
      // backend (AnnotationsService.assertCanEdit).
      canEditAnnotation: (a) =>
        a.authorId === currentUser?.id
          ? canReal("editOwnAnnotation")
          : canReal("editAnyAnnotation"),
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
      songsLoadState,
      setlists,
      setlistsLoadState,
      annotationList,
      annotationsLoadState,
      loadAnnotationsForSong,
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
