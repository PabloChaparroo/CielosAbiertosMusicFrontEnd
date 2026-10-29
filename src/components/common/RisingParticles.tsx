/** Partículas que suben desde abajo por toda la página: columna (%), tamaño (px) y ritmo fijos */
const PARTICLES = [
  { x: 4, size: 3, delay: 0, duration: 16 },
  { x: 12, size: 2, delay: 6, duration: 20 },
  { x: 21, size: 3, delay: 11, duration: 18 },
  { x: 30, size: 2, delay: 3, duration: 22 },
  { x: 39, size: 3, delay: 9, duration: 17 },
  { x: 48, size: 2, delay: 14, duration: 21 },
  { x: 57, size: 3, delay: 1.5, duration: 19 },
  { x: 66, size: 2, delay: 7.5, duration: 23 },
  { x: 75, size: 3, delay: 12.5, duration: 16 },
  { x: 84, size: 2, delay: 4.5, duration: 20 },
  { x: 92, size: 3, delay: 10, duration: 18 },
  { x: 97, size: 2, delay: 16, duration: 22 },
];

/**
 * Fondo de página como el de Inicio: partículas doradas que suben desde abajo de la pantalla, fijas
 * detrás de todo el contenido (que tiene que ir en `relative` para dibujarse encima). Con `glow`
 * suma el sombreado de la portada: resplandor dorado desde arriba y un tinte violeta al medio.
 * Con "reducir movimiento" las partículas no se muestran (ver `rising-particle` en styles.css).
 */
export function RisingParticles({ glow = false }: { glow?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden xl:left-[272px]">
      {glow ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-5%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,oklch(0.3_0.08_285/0.25),transparent_75%)]" />
        </>
      ) : null}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="rising-particle absolute -bottom-2 rounded-full bg-primary"
          style={{
            left: `${p.x}%`,
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
