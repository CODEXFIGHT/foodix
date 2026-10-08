/**
 * Convierte el nombre de un restaurante en un slug de URL.
 * "El Rincón Norteño" → "el-rincon-norteno"
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')                    // separa acentos
    .replace(/[̀-ͯ]/g, '')     // elimina diacríticos (combining marks)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')         // no alfanumérico → guion
    .replace(/^-+|-+$/g, '')             // recorta guiones de los extremos
    .slice(0, 60)
}

/** Dominio público base para mostrar la URL del cliente. */
export const APP_DOMAIN = 'restauros.app'
