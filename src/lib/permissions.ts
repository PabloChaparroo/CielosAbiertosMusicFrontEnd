/**
 * Etiquetas en español para el catálogo de permisos. El catálogo en sí
 * (qué recursos y acciones existen) ya NO se hardcodea acá — viene siempre
 * de GET /permisos (ver features/roles-permisos/services/roles.service.ts).
 * Por eso estos mapas tienen fallback: un recurso nuevo en el backend no
 * debería romper esta pantalla, solo mostrarse con una etiqueta genérica
 * hasta que alguien le agregue una entrada acá.
 */

const resourceLabels: Record<string, string> = {
  cancion: "Canciones",
  setlist: "Setlists",
  equipo: "Equipo",
  anotacion: "Anotaciones",
  "anotacion-propia": "Anotaciones propias",
  estadisticas: "Estadísticas",
  rol: "Roles y permisos",
};

export function resourceLabel(resource: string): string {
  return resourceLabels[resource] ?? resource;
}

const actionLabels: Record<string, string> = {
  read: "Ver",
  write: "Crear",
  update: "Editar",
  delete: "Eliminar",
};

export function actionLabel(action: string): string {
  return actionLabels[action] ?? action;
}
