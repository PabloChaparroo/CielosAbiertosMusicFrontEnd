import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Download,
  EllipsisVertical,
  Laptop,
  MonitorDown,
  Share,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { isRunningInstalled, useInstallPrompt } from "@/lib/install-prompt";

type Platform = "android" | "iphone" | "computadora";

const tabs: Array<{ id: Platform; label: string; icon: typeof Smartphone }> = [
  { id: "android", label: "Android", icon: Smartphone },
  { id: "iphone", label: "iPhone", icon: Smartphone },
  { id: "computadora", label: "Computadora", icon: Laptop },
];

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac: se reconoce por la pantalla táctil
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
    return "iphone";
  if (/Android/.test(ua)) return "android";
  return "computadora";
}

/** Botón o ícono tal como aparece en el navegador, dentro del texto */
function Key({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 align-middle text-sm font-semibold text-foreground">
      {children}
    </span>
  );
}

const steps: Record<Platform, { browser: string; items: ReactNode[] }> = {
  android: {
    browser: "Con Google Chrome",
    items: [
      <>Abrí la app en Chrome e iniciá sesión.</>,
      <>
        Tocá los tres puntitos{" "}
        <Key>
          <EllipsisVertical className="h-4 w-4" />
        </Key>{" "}
        arriba a la derecha.
      </>,
      <>
        Elegí{" "}
        <Key>
          <MonitorDown className="h-4 w-4" /> Instalar y crear acceso directo
        </Key>{" "}
        (en algunos celulares dice <Key>Agregar a la pantalla principal</Key>).
      </>,
      <>
        Confirmá con <Key>Instalar</Key>. El ícono de Cielos Abiertos aparece en la pantalla de
        inicio, junto a tus otras apps.
      </>,
    ],
  },
  iphone: {
    browser: "Con Safari",
    items: [
      <>Abrí la app en Safari e iniciá sesión.</>,
      <>
        Tocá el botón Compartir{" "}
        <Key>
          <Share className="h-4 w-4" />
        </Key>{" "}
        (abajo en el centro, o arriba a la derecha en iPad).
      </>,
      <>
        Deslizá hacia abajo y elegí{" "}
        <Key>
          <SquarePlus className="h-4 w-4" /> Agregar a inicio
        </Key>
        .
      </>,
      <>
        Tocá <Key>Agregar</Key> arriba a la derecha. El ícono de Cielos Abiertos aparece en la
        pantalla de inicio.
      </>,
    ],
  },
  computadora: {
    browser: "Con Google Chrome o Microsoft Edge",
    items: [
      <>Abrí la app en Chrome o Edge e iniciá sesión.</>,
      <>
        En la barra de direcciones, a la derecha, tocá el ícono de instalar{" "}
        <Key>
          <MonitorDown className="h-4 w-4" />
        </Key>
        .
      </>,
      <>
        Si no aparece: menú{" "}
        <Key>
          <EllipsisVertical className="h-4 w-4" />
        </Key>{" "}
        → <Key>Transmitir, guardar y compartir</Key> → <Key>Instalar página como app</Key> (en Edge:{" "}
        <Key>Aplicaciones</Key> → <Key>Instalar este sitio como una aplicación</Key>).
      </>,
      <>Confirmá con Instalar. Se abre en su propia ventana y queda en el menú de inicio.</>,
    ],
  },
};

/** Guía para instalar la app en el celular (o la compu) y abrirla con un toque */
export function InstalarPage() {
  // la plataforma se detecta en el navegador (no en el servidor): hasta entonces, Android
  const [platform, setPlatform] = useState<Platform>("android");
  const [installed, setInstalled] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const { install } = useInstallPrompt();
  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isRunningInstalled());
  }, []);
  const guide = steps[platform];

  return (
    <AppLayout title="Instalar app" subtitle="Tené Cielos Abiertos a un toque, como cualquier app">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {installed ? (
          <div className="surface-card flex items-center gap-3 p-5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">Ya estás usando la app instalada.</span> No hace falta
              hacer nada más.
            </p>
          </div>
        ) : justInstalled ? (
          <div className="surface-card flex items-center gap-3 p-5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">¡Listo!</span> Buscá el ícono de Cielos Abiertos en tu
              pantalla de inicio.
            </p>
          </div>
        ) : install ? (
          <div className="surface-card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Tu navegador permite instalarla directo, sin seguir los pasos.
            </p>
            <button
              onClick={() => void install().then(setJustInstalled)}
              className="flex shrink-0 items-center gap-2 rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              <Download className="h-4 w-4" /> Instalar app
            </button>
          </div>
        ) : null}

        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPlatform(tab.id)}
              aria-pressed={platform === tab.id}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                platform === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        <section className="surface-card p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            {guide.browser}
          </h2>
          <ol className="flex flex-col gap-4">
            {guide.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-gold text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-0.5 leading-relaxed">{item}</p>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          La app instalada es la misma de siempre: se actualiza sola y entrás con tu misma cuenta.
        </p>
      </div>
    </AppLayout>
  );
}
