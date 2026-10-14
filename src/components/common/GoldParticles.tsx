/** Posición (%), tamaño (px) y ritmo fijos: así las partículas no saltan entre renders */
const PARTICLES = [
  { x: 6, y: 12, size: 2, delay: 0, duration: 8 },
  { x: 22, y: 38, size: 3, delay: 2.5, duration: 10 },
  { x: 40, y: 8, size: 2, delay: 5, duration: 9 },
  { x: 58, y: 52, size: 3, delay: 1, duration: 11 },
  { x: 74, y: 24, size: 2, delay: 3.5, duration: 8 },
  { x: 90, y: 64, size: 3, delay: 6, duration: 10 },
  { x: 14, y: 78, size: 2, delay: 4, duration: 9 },
  { x: 48, y: 88, size: 3, delay: 7, duration: 11 },
  { x: 84, y: 92, size: 2, delay: 2, duration: 8 },
];

/**
 * Partículas doradas que flotan, como en la portada de Inicio. Van como fondo de un contenedor
 * con `relative`: el contenido que va encima también tiene que llevar `relative`. Con "reducir
 * movimiento" quedan quietas (ver `hero-particle` en styles.css).
 */
export function GoldParticles({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="hero-particle absolute rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
