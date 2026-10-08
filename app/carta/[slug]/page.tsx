/**
 * FoodIX — Sistema de gestión para restaurantes
 * Carta digital pública por sucursal: /carta/{slug}. Lee los productos reales
 * desde la API y reutiliza el modal de detalle y el carrito.
 *
 * UI estilo carta digital tipo "Vips": cuadrícula responsive de platillos
 * agrupada por secciones (2 columnas en móvil, 3-4 en escritorio). Cada tarjeta
 * muestra una imagen grande y una banda con el nombre; las secciones, badges y
 * temperatura filtran la cuadrícula en tiempo real.
 *
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 */
'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Search, X, ChevronRight, ChevronDown, Check, ArrowDownUp, UtensilsCrossed, GlassWater, LayoutGrid, Flame, Snowflake, Phone, PauseCircle, BadgePercent } from 'lucide-react'
import { apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'
import { BADGE_CONFIG, type MenuItem, type BadgeType } from '@/lib/data/menuData'
import { normalize } from '@/lib/utils/productSearch'
import { slugify } from '@/lib/utils/slugify'
import { CategorySlider } from '../CategorySlider'
import { CategorySidebar } from '../CategorySidebar'
import { BranchAddressTicker } from '../BranchAddressTicker'
import { BranchNameMarquee } from '../BranchNameMarquee'

// ── Orden de los platillos ────────────────────────────────────────────────────
type SortKey = 'default' | 'price-asc' | 'price-desc' | 'featured'
const SORT_LABEL: Record<SortKey, string> = {
  default: 'Recomendado',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
  featured: 'Destacados primero',
}

// Resalta las coincidencias de la búsqueda dentro de un texto.
function highlight(text: string, q: string) {
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-300 text-stone-900 rounded px-0.5 font-bold">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}
import { CartaItemViewer } from '../CartaItemViewer'
import { CartPanel } from '../CartPanel'
import { PaquetesSection, PAQUETES_CAT_ID, type PublicCombo } from '../PaquetesSection'
import { PromoStrip, promoBadgeLabel, type PublicPromotion } from '../PromoStrip'

interface ApiProduct {
  id: number
  category_id: number | null
  name: string
  description: string
  price: number
  ingredients: string[]
  allergens: string[]
  badge: string | null
  station_override: Station | null
  images: string[]
  image: string | null
}

type MenuGroup = 'alimento' | 'bebida'
type Station = 'hot' | 'cold' | 'both'

interface ApiCategory {
  id: number
  name: string
  color: string
  station: Station
  menu_group: MenuGroup
  sort_order: number
}

// Etiqueta y estilo del chip/badge de temperatura (caliente / frío).
const STATION_META: Record<'hot' | 'cold', { label: string; Icon: typeof Flame; chip: string; badge: string; anim: string }> = {
  hot:  { label: 'Caliente', Icon: Flame,     chip: 'bg-orange-500 text-white border-transparent', badge: 'bg-orange-500/95 text-white', anim: 'animate-carta-heat' },
  cold: { label: 'Frío',     Icon: Snowflake, chip: 'bg-sky-500 text-white border-transparent',    badge: 'bg-sky-500/95 text-white',    anim: 'animate-carta-cool' },
}

interface PublicMenu {
  branch: { name: string; slug: string; logo_url: string | null; phone: string | null; address: string | null }
  paused?: boolean
  pause_message?: string
  categories: ApiCategory[]
  products: ApiProduct[]
  /** Vacío si el plan de la sucursal no incluye la función 'promotions'. */
  combos?: PublicCombo[]
  promotions?: PublicPromotion[]
}

// Slug de la pseudo-sección "Paquetes" en la URL (?categoria=paquetes). No es
// una categoría real de la BD, así que la sincronización de la URL la resuelve
// aparte de data.categories.
const PAQUETES_SLUG = 'paquetes'

function toMenuItem(p: ApiProduct): MenuItem {
  const images = p.images.length ? p.images : (p.image ? [p.image] : [])
  return {
    id: String(p.id),
    name: p.name,
    description: p.description,
    price: p.price,
    image: p.image ?? '',
    images,
    categoryId: p.category_id != null ? String(p.category_id) : '',
    badge: (p.badge as BadgeType) ?? undefined,
    ingredients: p.ingredients,
    prepTime: 0,
    calories: 0,
    serves: 0,
    allergens: p.allergens,
    spiceLevel: 0,
    tags: [],
  }
}

// Sucursales con carta SOLO informativa (sin pedido): no se puede agregar al
// carrito ni enviar al mesero, ni se piden mesa/notas/alergias.
const VIEW_ONLY_SLUGS = ['mariscos-alejandro']

// Infinite scroll: se muestran los primeros INITIAL_BATCH productos y se cargan
// PAGE_SIZE más cada vez que el usuario se acerca al final (cerca del logo).
// Primer lote pequeño para mejorar LCP en móviles; el resto se incorpora
// progresivamente al acercarse al final de la carta.
const INITIAL_BATCH = 40
const PAGE_SIZE = 40

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Selector de orden custom (reemplaza al <select> nativo) con el estilo de la
// carta: botón blanco redondeado + panel flotante con la opción activa marcada.
// Se cierra al hacer click fuera o con Escape.
function SortDropdown({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const options = Object.keys(SORT_LABEL) as SortKey[]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Ordenar platillos"
        className={cn(
          'inline-flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl border bg-white text-xs font-semibold text-stone-700 shadow-sm transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/40',
          open ? 'border-[#E85D04] ring-2 ring-[#E85D04]/30' : 'border-stone-200 hover:border-stone-300',
        )}
      >
        <ArrowDownUp className="h-3.5 w-3.5 text-[#E85D04]" />
        <span className="whitespace-nowrap">{SORT_LABEL[value]}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-stone-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-40 mt-2 w-56 origin-top-right rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-slide-down"
        >
          {options.map(k => {
            const isActive = value === k
            return (
              <button
                key={k}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { onChange(k); setOpen(false) }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  isActive ? 'bg-[#E85D04]/10 text-[#E85D04] font-bold' : 'text-stone-600 font-medium hover:bg-stone-100',
                )}
              >
                {SORT_LABEL[k]}
                {isActive && <Check className="h-4 w-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CartaSucursalPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const slug = String(params?.slug ?? '')
  const orderingEnabled = !VIEW_ONLY_SLUGS.includes(slug.toLowerCase())

  const [data, setData] = useState<PublicMenu | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [group, setGroup] = useState<MenuGroup | null>(null)
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [badge, setBadge] = useState<BadgeType | null>(null)
  const [sort, setSort] = useState<SortKey>('default')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [urlReady, setUrlReady] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(80)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 180)
    return () => window.clearTimeout(timer)
  }, [query])


  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const measure = () => setHeaderHeight(Math.ceil(header.getBoundingClientRect().height))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [data?.branch.address, data?.branch.phone])

  // Infinite scroll + reveal premium ligado al scroll.
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH)
  const [loadingMore, setLoadingMore] = useState(false)
  const [endGlow, setEndGlow] = useState(false)
  const loadingRef = useRef(false)
  const gridWrapRef = useRef<HTMLDivElement>(null)
  const paquetesWrapRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)

  // Scrollspy del sidebar de categorías en escritorio: solo indicador visual,
  // NO cambia `selectedCat` ni refiltra el grid (ver sectionRefs más abajo).
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    if (!slug) return
    let alive = true
    const cacheKey = `restauros_carta_${slug}`
    // Huella del último contenido recibido: permite saltarse re-renders y
    // re-escrituras de caché cuando el sondeo devuelve exactamente lo mismo.
    let lastSerialized = ''

    // 1) Hidratación instantánea desde caché local (stale-while-revalidate). En
    //    visitas repetidas la carta aparece AL INSTANTE en Web/Android/iOS
    //    mientras se revalida en segundo plano, en vez de mostrar el spinner.
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setData(JSON.parse(cached) as PublicMenu)
        setStatus('ready')
        lastSerialized = cached
      }
    } catch { /* caché corrupta o no disponible: se ignora */ }

    // Evita peticiones solapadas (clave en redes móviles lentas): cada nueva
    // carga aborta la anterior que siga en vuelo.
    let controller: AbortController | null = null

    const load = (initial: boolean) => {
      controller?.abort()
      controller = new AbortController()
      // Solo mostramos el spinner si NO hay nada que pintar todavía.
      if (initial && !lastSerialized) setStatus('loading')
      apiRequest<PublicMenu>(`/public/menu/${slug}`, { auth: false, signal: controller.signal })
        .then(d => {
          if (!alive) return
          const serialized = JSON.stringify(d)
          // Re-renderiza y reescribe caché SOLO si el contenido cambió de verdad:
          // evita el churn de re-render del grid completo en cada sondeo.
          if (serialized !== lastSerialized) {
            lastSerialized = serialized
            setData(d)
            try { localStorage.setItem(cacheKey, serialized) } catch { /* cuota llena */ }
          }
          setStatus('ready')
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          // Si ya hay carta en pantalla (caché o carga previa), la conservamos:
          // mejor mostrar datos algo viejos que un error en redes inestables.
          if (alive && !lastSerialized) setStatus('error')
      })
    }

    // Si el administrador suspende o reactiva desde otra pestaña del mismo
    // navegador, refrescamos la carta inmediatamente en vez de esperar al
    // siguiente intervalo de sondeo.
    const onCartaSync = (event: StorageEvent) => {
      if (event.key !== 'restauros_carta_sync' || !event.newValue) return
      try {
        const payload = JSON.parse(event.newValue) as { slug?: string }
        if (payload.slug === slug) load(false)
      } catch { /* valor de sincronización inválido: se ignora */ }
    }
    const refreshWhenActive = () => { if (!document.hidden) load(false) }

    load(true)

    // Tiempo real: re-sondea para reflejar cambios del admin (fotos, precios,
    // disponibilidad) sin recargar. Intervalo más amplio + jitter para no saturar
    // el backend cuando hay MUCHOS clientes a la vez (evita el "thundering herd"
    // de peticiones sincronizadas). Solo se sondea con la pestaña visible.
    const nextDelay = () => 10_000 + Math.floor(Math.random() * 5_000)
    let timer = window.setTimeout(function tick() {
      if (!document.hidden) load(false)
      timer = window.setTimeout(tick, nextDelay())
    }, nextDelay())
    const onVisible = refreshWhenActive
    window.addEventListener('focus', refreshWhenActive)
    window.addEventListener('pageshow', refreshWhenActive)
    window.addEventListener('storage', onCartaSync)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive = false
      controller?.abort()
      clearTimeout(timer)
      window.removeEventListener('focus', refreshWhenActive)
      window.removeEventListener('pageshow', refreshWhenActive)
      window.removeEventListener('storage', onCartaSync)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [slug])

  const items = useMemo(() => (data?.products ?? []).map(toMenuItem), [data])

  // Placeholder dinámico (efecto "máquina de escribir") con nombres reales de
  // platillos/bebidas. La clave estable evita reiniciar la animación en cada
  // re-sondeo (cada 12s) salvo que cambie la lista de productos.
  const namesKey = useMemo(
    () => items.map(i => i.name).filter(Boolean).join('|'),
    [items],
  )
  const [placeholder, setPlaceholder] = useState('Buscar platillo…')
  const [searchFocused, setSearchFocused] = useState(false)
  useEffect(() => {
    const names = namesKey ? namesKey.split('|') : []
    // Mientras el usuario escribe (o no hay productos) no animamos.
    if (query || names.length === 0) {
      setPlaceholder('Buscar platillo…')
      return
    }
    // Orden aleatorio (Fisher-Yates) para que cada visita muestre los nombres
    // en distinto orden.
    for (let k = names.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1))
      ;[names[k], names[j]] = [names[j], names[k]]
    }
    let word = 0
    let char = 0
    let deleting = false
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const name = names[word % names.length]
      if (!deleting) {
        char++
        setPlaceholder(`Buscar ${name.slice(0, char)}`)
        if (char >= name.length) { deleting = true; timer = setTimeout(tick, 1500); return }
        timer = setTimeout(tick, 85)
      } else {
        char--
        setPlaceholder(`Buscar ${name.slice(0, Math.max(0, char))}`)
        if (char <= 0) { deleting = false; word++; timer = setTimeout(tick, 350); return }
        timer = setTimeout(tick, 40)
      }
    }
    timer = setTimeout(tick, 600)
    return () => clearTimeout(timer)
  }, [namesKey, query])

  // Mapa categoría → datos (grupo y nombre) para filtrar y buscar.
  const catById = useMemo(() => {
    const m = new Map<string, ApiCategory>()
    ;(data?.categories ?? []).forEach(c => m.set(String(c.id), c))
    return m
  }, [data])

  // Estación efectiva por producto (override del producto o la de su categoría).
  // Sirve para filtrar por temperatura (caliente/frío) y para el badge.
  const stationById = useMemo(() => {
    const m = new Map<string, Station>()
    ;(data?.products ?? []).forEach(p => {
      const cat = p.category_id != null ? catById.get(String(p.category_id)) : undefined
      m.set(String(p.id), p.station_override ?? cat?.station ?? 'both')
    })
    return m
  }, [data, catById])

  // Grupos presentes (solo mostramos las pestañas Alimentos/Bebidas si hay de ambos).
  const groupsPresent = useMemo(() => {
    const s = new Set<MenuGroup>()
    ;(data?.categories ?? []).forEach(c => s.add(c.menu_group))
    return s
  }, [data])
  const showGroupTabs = groupsPresent.size > 1

  // ── Paquetes y promociones (Módulo de crecimiento) ───────────────────────
  const combos = useMemo(() => data?.combos ?? [], [data])
  const promotions = useMemo(() => data?.promotions ?? [], [data])

  // Los paquetes son transversales (llevan alimento y bebida), así que su pill
  // aparece en cualquier pestaña de grupo, siempre en primer lugar.
  const showPaquetes = combos.length > 0

  // Descuento vigente por producto: se resuelve una sola vez y se consulta al
  // pintar cada tarjeta. Si varias promociones tocan el mismo producto se
  // muestra la de mayor valor (el backend las acumula todas al cobrar; el chip
  // solo anuncia la más llamativa).
  const promoByProductId = useMemo(() => {
    const m = new Map<string, PublicPromotion>()
    const vigentes = promotions.filter(p => p.active_now && p.applies_to !== 'order')
    if (vigentes.length === 0) return m

    ;(data?.products ?? []).forEach(p => {
      let best: PublicPromotion | undefined
      vigentes.forEach(promo => {
        const aplica = promo.applies_to === 'product'
          ? promo.target_id === p.id
          : promo.target_id === p.category_id
        if (!aplica) return
        if (!best || promo.value > best.value) best = promo
      })
      if (best) m.set(String(p.id), best)
    })
    return m
  }, [promotions, data])

  // Categorías visibles según el grupo elegido (para las pills).
  const categoriesInView = useMemo(() => {
    const reales = (data?.categories ?? []).filter(c => group == null || c.menu_group === group)
    return showPaquetes
      ? [{ id: PAQUETES_CAT_ID, name: 'Paquetes', color: '#F59E0B' }, ...reales]
      : reales
  }, [data, group, showPaquetes])

  // La URL usa el slug estable de la categoría para que los enlaces sean
  // legibles y compartibles. Se corrigen automáticamente los parámetros
  // inválidos sin provocar una recarga completa.
  useEffect(() => {
    if (!data) return
    const requested = searchParams.get('categoria')
    const category = requested
      ? data.categories.find(c => String(c.id) === requested || slugify(c.name) === requested)
      : undefined
    // "Paquetes" no es una categoría de la BD: se reconoce por su slug fijo y
    // solo es válida si la sucursal tiene combos publicados.
    const esPaquetes = requested === PAQUETES_SLUG && (data.combos?.length ?? 0) > 0
    const nextId = esPaquetes ? PAQUETES_CAT_ID : (category?.id ?? null)
    setSelectedCat(current => current === nextId ? current : nextId)
    if (requested && !category && !esPaquetes) {
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('categoria')
      router.replace(`${pathname}${nextParams.toString() ? `?${nextParams}` : ''}`, { scroll: false })
    }
    setUrlReady(true)
  }, [data, pathname, router, searchParams])

  useEffect(() => {
    if (!urlReady || !data) return
    const current = searchParams.get('categoria')
    const category = selectedCat == null ? undefined : data.categories.find(c => c.id === selectedCat)
    const next = selectedCat === PAQUETES_CAT_ID
      ? PAQUETES_SLUG
      : (category ? slugify(category.name) : null)
    if (current === next || (!current && next === null)) return
    const nextParams = new URLSearchParams(searchParams.toString())
    if (next) nextParams.set('categoria', next)
    else nextParams.delete('categoria')
    router.replace(`${pathname}${nextParams.toString() ? `?${nextParams}` : ''}`, { scroll: false })
  }, [data, pathname, router, searchParams, selectedCat, urlReady])

  // Ítems acotados al grupo (para saber qué chips de destacados ofrecer).
  const itemsInGroup = useMemo(
    () => (group == null ? items : items.filter(i => catById.get(i.categoryId)?.menu_group === group)),
    [items, group, catById],
  )

  // Badges presentes en el grupo actual, en orden fijo.
  const badgesPresent = useMemo(() => {
    const order: BadgeType[] = ['Recomendado', 'Popular', 'Nuevo', 'Especialidad', 'Promo']
    const present = new Set(itemsInGroup.map(i => i.badge).filter(Boolean) as BadgeType[])
    return order.filter(b => present.has(b))
  }, [itemsInGroup])

  // Índice de búsqueda preparado una sola vez por catálogo/grupo. Evita
  // normalizar nombre, descripción, ingredientes y categoría en cada render
  // mientras el usuario escribe.
  const searchIndex = useMemo(() => {
    const index = new Map<string, string>()
    itemsInGroup.forEach(item => {
      index.set(item.id, normalize([
        item.name,
        item.description,
        ...item.ingredients,
        catById.get(item.categoryId)?.name ?? '',
      ].join(' ')))
    })
    return index
  }, [itemsInGroup, catById])

  const filtered = useMemo(() => {
    let list = itemsInGroup
    if (selectedCat != null) list = list.filter(i => i.categoryId === String(selectedCat))
    if (badge != null) list = list.filter(i => i.badge === badge)

    const q = normalize(debouncedQuery)
    if (q) list = list.filter(i => searchIndex.get(i.id)?.includes(q))

    if (sort !== 'default') {
      list = [...list].sort((a, b) => {
        if (sort === 'price-asc') return a.price - b.price
        if (sort === 'price-desc') return b.price - a.price
        // featured: con badge primero
        return (a.badge ? 0 : 1) - (b.badge ? 0 : 1)
      })
    }
    return list
  }, [itemsInGroup, selectedCat, badge, debouncedQuery, sort, searchIndex])

  // Firma de los filtros: al cambiar, re-disparamos la animación de entrada de
  // las tarjetas (key de cada tarjeta) para un efecto de aparición escalonada.
  const filterKey = useMemo(
    () => `${group ?? 'all'}|${selectedCat ?? 'all'}|${badge ?? 'all'}|${sort}`,
    [group, selectedCat, badge, sort],
  )

  // Lista realmente renderizada (infinite scroll): los primeros INITIAL_BATCH y
  // luego bloques de PAGE_SIZE. Si hay <= INITIAL_BATCH, se muestran todos.
  const limited = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMore = filtered.length > limited.length

  // Al cambiar filtros/búsqueda se reinicia el conteo visible (vuelve a INITIAL_BATCH).
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH)
    loadingRef.current = false
    setLoadingMore(false)
  }, [filterKey, debouncedQuery])

  // Vista agrupada por sección (estilo Vips): solo cuando no hay un orden
  // específico ni una sección puntual seleccionada. Respeta el orden del admin.
  const grouped = useMemo(() => {
    const byCat = new Map<string, MenuItem[]>()
    limited.forEach(it => {
      const k = it.categoryId || '∅'
      const arr = byCat.get(k)
      if (arr) arr.push(it)
      else byCat.set(k, [it])
    })
    const cats = (data?.categories ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    const out: { id: string; name: string; color: string; items: MenuItem[] }[] = []
    cats.forEach(c => {
      const list = byCat.get(String(c.id))
      if (list?.length) out.push({ id: String(c.id), name: c.name, color: c.color, items: list })
    })
    const orphan = byCat.get('∅')
    if (orphan?.length) out.push({ id: '∅', name: 'Otros', color: '#E85D04', items: orphan })
    return out
  }, [limited, data])
  const useGrouped = sort === 'default' && selectedCat == null

  // Al escribir en el buscador (solo en móvil) ocultamos los filtros y el
  // encabezado, y mostramos los resultados como un carrusel horizontal enfocado.
  const searching = query.trim().length > 0

  // Vista exclusiva de paquetes: se oculta la cuadrícula de platillos (y su
  // estado vacío, que si no aparecería porque ningún producto pertenece a la
  // pseudo-categoría).
  const soloPaquetes = selectedCat === PAQUETES_CAT_ID

  // Los paquetes encabezan la carta salvo cuando el cliente está buscando o
  // filtrando por destacado, donde el resultado debe ser solo lo que pidió.
  const mostrarPaquetes = showPaquetes && !searching && badge == null
    && (selectedCat == null || soloPaquetes)

  // Si la categoría elegida no pertenece al grupo activo, la deseleccionamos.
  // "Paquetes" queda exenta: un paquete puede mezclar alimento y bebida, así
  // que sigue seleccionada al cambiar de pestaña de grupo.
  useEffect(() => {
    if (selectedCat == null || selectedCat === PAQUETES_CAT_ID || group == null) return
    if (catById.get(String(selectedCat))?.menu_group !== group) setSelectedCat(null)
  }, [group, selectedCat, catById])

  // ── Barra de categorías sticky con slide-down/up ─────────────────────────
  // Aparece (slide-down) al hacer scroll y se oculta (slide-up) al volver al
  // top. Listener pasivo y auto-throttled: solo dispara setState cuando se cruza
  // el umbral (guardado en un ref), evitando re-renders en cada evento.
  const [catBarStuck, setCatBarStuck] = useState(false)
  const stuckRef = useRef(false)
  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 80
      if (next !== stuckRef.current) {
        stuckRef.current = next
        setCatBarStuck(next)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Reveal premium ligado al scroll ──────────────────────────────────────
  // Un único IntersectionObserver observa todas las tarjetas y conmuta la clase
  // `is-visible` directamente en el DOM (sin setState → cero re-renders). Al
  // salir del viewport (volver arriba) se quita la clase: la animación se
  // reinicia y vuelve a reproducirse al bajar de nuevo. Se re-observa cuando
  // cambian la lista visible o el modo de vista (al cargar más / filtrar).
  useEffect(() => {
    if (prefersReducedMotion()) return
    // La sección de paquetes vive fuera de la cuadrícula de platillos, así que
    // se observa aparte: si no, sus tarjetas se quedarían en opacity 0 para
    // siempre (nunca recibirían `is-visible`).
    const roots = [gridWrapRef.current, paquetesWrapRef.current].filter(Boolean) as HTMLElement[]
    if (roots.length === 0) return

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          e.target.classList.toggle('is-visible', e.isIntersecting)
        }
      },
      { threshold: 0, rootMargin: '0px 0px 250px 0px' },
    )
    roots.forEach(root => {
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => io.observe(el))
    })
    return () => io.disconnect()
  }, [limited, useGrouped, searching, status, combos, mostrarPaquetes])

  // ── Scrollspy del sidebar de categorías (escritorio) ─────────────────────
  // Observer independiente del de arriba: solo determina qué sección de
  // `grouped` está en el viewport para resaltarla en CategorySidebar. NO
  // filtra el grid — el click en el sidebar solo hace scroll (scrollToCategory).
  useEffect(() => {
    if (!useGrouped) return
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (!visible.length) return
        const topMost = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        const id = topMost.target.getAttribute('data-cat-id')
        setActiveSectionId(id === '∅' || id === null ? null : Number(id))
      },
      { rootMargin: `-${headerHeight + 16}px 0px -70% 0px`, threshold: 0 },
    )
    sectionRefs.current.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [grouped, useGrouped, headerHeight])

  function scrollToCategory(id: number | null) {
    const key = id == null ? '∅' : String(id)
    sectionRefs.current.get(key)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  // ── Infinite scroll ──────────────────────────────────────────────────────
  // El sentinel vive justo antes del footer (logo DevHive). Con rootMargin
  // inferior amplio, la carga se dispara ANTES de llegar al fondo, cerca del
  // logo. `loadingRef` evita disparos múltiples simultáneos.
  const hasMoreRef = useRef(hasMore)
  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || !hasMoreRef.current || loadingRef.current) return
        loadingRef.current = true
        setLoadingMore(true)
        window.setTimeout(() => {
          setVisibleCount(c => c + PAGE_SIZE)
          setLoadingMore(false)
          loadingRef.current = false
        }, 420)
      },
      { rootMargin: '0px 0px 360px 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [status])

  // ── Glow del logo DevHive al llegar al final ─────────────────────────────
  useEffect(() => {
    const el = footerRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setEndGlow(entry.isIntersecting),
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [status])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 border-2 border-[#E85D04] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (status === 'error' || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-6 text-center">
        <span className="text-5xl mb-3">🍽️</span>
        <h1 className="text-xl font-bold text-stone-800">Carta no disponible</h1>
        <p className="text-stone-500 text-sm mt-1">No encontramos el menú de este restaurante.</p>
      </div>
    )
  }

  if (data.paused) {
    return (
      <main className="min-h-[100dvh] bg-gradient-to-b from-stone-100 to-stone-50 text-stone-900">
        <header className="relative overflow-hidden bg-gradient-to-b from-[#241F1B] to-[#151210] text-white shadow-[0_12px_32px_-14px_rgba(0,0,0,0.7)]">
          <div aria-hidden className="pointer-events-none absolute -top-20 -left-12 h-44 w-44 rounded-full bg-[#E85D04]/25 blur-3xl" />
          <div className="relative mx-auto flex min-h-16 max-w-3xl items-center gap-3 px-5 py-4">
            {data.branch.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.branch.logo_url}
                alt={data.branch.name}
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/25 ring-offset-2 ring-offset-[#1C1917]"
              />
            ) : (
              <span className="text-2xl" aria-hidden>🍽️</span>
            )}
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#F7A25C]">Carta digital</span>
              <h1 className="truncate text-lg font-extrabold sm:text-xl">{data.branch.name}</h1>
            </div>
          </div>
        </header>

        <section className="mx-auto flex min-h-[calc(100dvh-81px)] max-w-3xl items-center justify-center px-5 py-12 text-center">
          <div className="w-full max-w-md rounded-[2rem] border border-stone-200/80 bg-white px-6 py-10 shadow-[0_20px_60px_-24px_rgba(28,25,23,0.28)] sm:px-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E85D04]/10 text-[#E85D04]">
              <PauseCircle className="h-9 w-9" strokeWidth={1.8} aria-hidden />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E85D04]">Un momento, por favor</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">Esta carta está en pausa</h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-stone-500 sm:text-base">
              {data.pause_message ?? 'Esta carta está temporalmente en pausa. Gracias por visitarnos; esperamos atenderte muy pronto.'}
            </p>
            {data.branch.phone && (
              <a
                href={`tel:${data.branch.phone.replace(/[^+\d]/g, '')}`}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#E85D04] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#E85D04]/20 transition hover:bg-[#C44D00] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#E85D04]/25"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Comunicarme con el establecimiento
              </a>
            )}
            <p className="mt-7 text-xs font-medium text-stone-400">Gracias por tu comprensión.</p>
          </div>
        </section>
      </main>
    )
  }

  const sectionLabel = soloPaquetes
    ? 'Paquetes'
    : selectedCat == null
      ? 'Toda la carta'
      : (data.categories.find(c => c.id === selectedCat)?.name ?? 'Sección')

  // Tarjeta de platillo estilo Vips: imagen grande + banda con el nombre.
  // `showCat` muestra el chip de sección cuando la vista no está agrupada.
  // `reveal` activa la aparición premium ligada al scroll (carta-reveal +
  // IntersectionObserver con stagger). En el carrusel de búsqueda se desactiva
  // (las tarjetas usan la aparición simple de montaje).
  const DishCard = (item: MenuItem, idx: number, showCat: boolean, reveal = true) => {
    const st = stationById.get(item.id)
    const stMeta = st === 'hot' || st === 'cold' ? STATION_META[st] : null
    const cat = catById.get(item.categoryId)
    const promo = promoByProductId.get(item.id)
    // Stagger por posición dentro del lote visible (se reinicia en cada fila
    // de ~10 para que el escalonado se sienta vivo y no acumule retardo).
    const stagger = `${(idx % 10) * 45}ms`
    return (
      <button
        key={`${filterKey}-${item.id}`}
        onClick={() => setViewerId(item.id)}
        aria-label={`Ver detalle de ${item.name}`}
        {...(reveal ? { 'data-reveal': '' } : {})}
        style={reveal ? { transitionDelay: stagger } : { animationDelay: stagger }}
        className={cn(
          'group relative w-full flex flex-col text-left bg-white rounded-[1.25rem] overflow-hidden border border-stone-200/60 shadow-[0_4px_16px_-6px_rgba(28,25,23,0.18)] hover:shadow-[0_18px_36px_-12px_rgba(28,25,23,0.32)] hover:-translate-y-1 active:scale-[.965] active:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]/50 transition-all duration-300 ease-out',
          reveal ? 'carta-reveal' : 'animate-fade-in-up',
        )}
      >
        <div className="relative aspect-square bg-stone-100 overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width:639px) 50vw, (max-width:1023px) 33vw, 22vw"
              className="object-cover transition-[transform,filter] duration-500 ease-out group-hover:scale-105 group-active:scale-110 group-active:brightness-110"
              priority={idx < 4}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-5xl">🍽️</div>
          )}

          {/* Scrim inferior: asegura que el precio siempre sea legible sobre
              cualquier foto (clara u oscura) y aporta profundidad premium. */}
          {item.image && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
          )}

          {/* Chips superiores: sección (opcional), destacado y temperatura */}
          <div className="absolute top-2 left-2 right-2 flex flex-wrap items-start gap-1">
            {showCat && cat && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow text-white" style={{ backgroundColor: cat.color }}>
                {cat.name}
              </span>
            )}
            {item.badge && (
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shadow', BADGE_CONFIG[item.badge]?.bg)}>
                {BADGE_CONFIG[item.badge]?.label}
              </span>
            )}
            {stMeta && (
              <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shadow', stMeta.badge, stMeta.anim)}>
                <stMeta.Icon className="h-3 w-3" /> {stMeta.label}
              </span>
            )}
            {promo && (
              <span
                title={promo.name}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow"
              >
                <BadgePercent className="h-3 w-3" /> {promoBadgeLabel(promo)}
              </span>
            )}
          </div>

          {/* Precio */}
          <span className="absolute bottom-2 right-2 z-[1] inline-flex items-center rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1 text-white text-sm font-extrabold shadow-lg ring-1 ring-white/10">
            ${item.price}
            <span className="text-[9px] font-medium text-white/70 ml-0.5">MXN</span>
          </span>
        </div>

        {/* Banda con el nombre (estilo Vips) — degradado diagonal + sheen
            superior fino para un acabado más pulido. */}
        <div className="relative flex min-h-[3.25rem] flex-1 flex-col justify-center bg-gradient-to-br from-[#F26611] via-[#E85D04] to-[#C44D00] px-3 py-2.5 transition-colors duration-200 group-active:from-[#C44D00] group-active:to-[#A83E00]">
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
          <h3 className="text-center text-sm font-bold uppercase leading-tight tracking-wide text-white line-clamp-2">
            {highlight(item.name, query.trim())}
          </h3>
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-stone-100 to-stone-50 pb-28 flex flex-col">
      {/* Header */}
      <header
        ref={headerRef}
        className={cn(
          'sticky top-0 z-30 overflow-hidden bg-gradient-to-b from-[#241F1B] to-[#151210] text-white border-b border-white/[0.07] transition-shadow duration-300',
          catBarStuck ? 'shadow-[0_12px_32px_-14px_rgba(0,0,0,0.7)]' : 'shadow-none',
        )}
      >
        {/* Halo cálido de marca detrás del logo + hairline inferior en degradado:
            dan profundidad y un acabado premium sin recargar (solo decorativos). */}
        <div aria-hidden className="pointer-events-none absolute -top-20 -left-12 h-44 w-44 rounded-full bg-[#E85D04]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#E85D04]/45 to-transparent" />

        <div className="relative mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-3 lg:px-6">
          {data.branch.logo_url ? (
            <div className="relative shrink-0">
              <span aria-hidden className="absolute inset-0 rounded-full bg-[#E85D04]/40 blur-md" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.branch.logo_url}
                alt={data.branch.name}
                className="relative h-12 w-12 rounded-full object-cover ring-2 ring-white/25 ring-offset-2 ring-offset-[#1C1917]"
              />
            </div>
          ) : (
            <span className="text-2xl">🍽️</span>
          )}
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#F7A25C]">Carta digital</span>
            <BranchNameMarquee name={data.branch.name} />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {data.branch.phone && (
                <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                  <Phone className="h-3 w-3 text-stone-500" /> {data.branch.phone}
                </span>
              )}
              {data.branch.address && <BranchAddressTicker address={data.branch.address} />}
            </div>
          </div>
        </div>
      </header>

      {/* Layout de dos columnas en escritorio (≥1024px): sidebar de categorías
          fijo + contenido. En mobile/tablet es una sola columna, como antes. */}
      <div className="mx-auto w-full max-w-7xl lg:flex lg:items-start lg:gap-8 lg:pt-6">
        {/* Sidebar de categorías — solo escritorio. El scrollspy (activeSectionId)
            resalta la sección visible; el click hace scroll suave, no filtra. */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:px-0 px-4" style={{ top: headerHeight + 24 }}>
          <CategorySidebar
            categories={categoriesInView}
            activeSectionId={activeSectionId}
            onSelect={scrollToCategory}
            groupTabs={showGroupTabs ? { value: group, onChange: setGroup } : undefined}
          />
        </aside>

        <div className="min-w-0 flex-1">

      {/* Barra de control sticky: buscador + filtros. Se pega justo debajo del
          header al hacer scroll (misma mecánica que la barra de categorías) y
          revela un borde + sombra sutil al despegar. Antes el buscador se iba
          scroll arriba y se recuperaba con un FAB flotante; ahora permanece
          siempre accesible, fijo en la parte superior. */}
      <div
        className={cn(
          'sticky z-20 bg-stone-50/95 backdrop-blur-md border-b transition-[border-color,box-shadow] duration-300',
          catBarStuck ? 'border-stone-200/70 shadow-[0_8px_20px_-10px_rgba(28,25,23,0.22)]' : 'border-transparent',
        )}
        style={{ top: `${headerHeight}px` }}
      >
        {/* Buscador — al enfocar se expande a todo el ancho. */}
        <div className="w-full px-4 pt-3 pb-1">
          <div
            className={cn(
              'relative mx-auto transition-[max-width] duration-300 ease-out',
              searchFocused ? 'max-w-6xl' : 'max-w-xl',
            )}
          >
            <Search
              className={cn(
                'absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition-all duration-300',
                searchFocused ? 'h-5 w-5 text-[#E85D04]' : 'h-4 w-4',
              )}
            />
            <input
              ref={searchInputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              enterKeyHint="search"
              placeholder={placeholder}
              className={cn(
                'w-full rounded-2xl border border-stone-200 bg-white text-stone-900 font-semibold placeholder:text-stone-400 placeholder:font-semibold focus:outline-none focus:ring-4 focus:ring-[#E85D04]/20 focus:border-[#E85D04]/50 transition-all duration-300 ease-out',
                searchFocused ? 'pl-12 pr-12 py-4 text-base shadow-lg' : 'pl-10 pr-10 py-3 text-sm shadow-sm',
              )}
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Limpiar" className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                <X className={cn('transition-all', searchFocused ? 'h-5 w-5' : 'h-4 w-4')} />
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de grupo: Alimentos / Bebidas (solo si hay de ambos). En
            escritorio se mueven arriba del CategorySidebar (prop groupTabs). */}
        {showGroupTabs && (
          <div className={cn('max-w-xl w-full mx-auto px-4 pt-2 lg:hidden', searching && 'hidden md:block')}>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-stone-200/70">
              {([
                { value: null,       label: 'Todo',      Icon: LayoutGrid },
                { value: 'alimento', label: 'Alimentos', Icon: UtensilsCrossed },
                { value: 'bebida',   label: 'Bebidas',   Icon: GlassWater },
              ] as const).map(t => (
                <button
                  key={t.label}
                  onClick={() => setGroup(t.value)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-semibold transition-colors',
                    group === t.value ? 'bg-white text-[#E85D04] shadow-sm animate-carta-pop' : 'text-stone-500 hover:text-stone-700',
                  )}
                >
                  <t.Icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secciones del menú (pills). Solo mobile/tablet: en escritorio la
            navegación vive en el sidebar. */}
        <nav className={cn('w-full py-2 lg:hidden', searching && 'hidden md:block')}>
          <div className="max-w-6xl w-full mx-auto px-4">
            <CategorySlider categories={categoriesInView} activeId={selectedCat} onChange={setSelectedCat} />
          </div>
        </nav>
      </div>

      {/* Chips de destacados (filtra por badge) */}
      {badgesPresent.length > 0 && (
        <div className={cn('max-w-6xl w-full mx-auto px-4 pt-2', searching && 'hidden md:block')}>
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {badgesPresent.map(b => {
              const cfg = BADGE_CONFIG[b]
              const isActive = badge === b
              return (
                <button
                  key={b}
                  onClick={() => setBadge(isActive ? null : b)}
                  className={cn(
                    'whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                    isActive ? cn(cfg.bg, 'border-transparent shadow animate-carta-pop-glow') : 'bg-white text-stone-600 border-stone-200',
                  )}
                >
                  {cfg.label}
                </button>
              )
            })}
            {badge && (
              <button
                onClick={() => setBadge(null)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border border-stone-200 bg-white text-stone-500 inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Quitar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Promociones vigentes: el descuento lo aplica el backend al confirmar
          el pedido; esta franja solo lo anuncia. */}
      {promotions.length > 0 && (
        <div className={cn('max-w-6xl w-full mx-auto px-4 pt-3', searching && 'hidden md:block')}>
          <PromoStrip
            promotions={promotions}
            categoryName={id => catById.get(String(id))?.name}
            productName={id => data.products.find(p => p.id === id)?.name}
          />
        </div>
      )}

      {/* Encabezado de sección + orden */}
      <div className={cn('max-w-6xl w-full mx-auto px-4 pt-4 flex items-end justify-between gap-3', searching && 'hidden md:flex')}>
        <div key={filterKey} className="min-w-0 animate-carta-section">
          <p className="text-xs uppercase tracking-[0.2em] text-[#E85D04] font-bold">Carta</p>
          <h2 className="text-2xl font-extrabold text-stone-900 truncate">{sectionLabel}</h2>
          {soloPaquetes ? (
            <span className="text-xs text-stone-400 font-medium">
              {combos.length} {combos.length === 1 ? 'paquete' : 'paquetes'}
            </span>
          ) : filtered.length > 0 && (
            <span className="text-xs text-stone-400 font-medium">
              {filtered.length} {filtered.length === 1 ? 'platillo' : 'platillos'}
            </span>
          )}
        </div>
        {!soloPaquetes && (
          <div className="shrink-0 mb-0.5">
            <SortDropdown value={sort} onChange={setSort} />
          </div>
        )}
      </div>

      {/* Paquetes (combos a precio fijo), encabezando la carta */}
      {mostrarPaquetes && (
        <div ref={paquetesWrapRef} className="max-w-6xl w-full mx-auto px-4 pt-4">
          <PaquetesSection
            combos={combos}
            canOrder={orderingEnabled}
            scrollMarginTop={headerHeight + 16}
            sectionRef={el => {
              const key = String(PAQUETES_CAT_ID)
              if (el) sectionRefs.current.set(key, el); else sectionRefs.current.delete(key)
            }}
            onSeeAll={soloPaquetes ? undefined : () => setSelectedCat(PAQUETES_CAT_ID)}
          />
        </div>
      )}

      {/* Cuadrícula de platillos */}
      {soloPaquetes ? null : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-400 py-20 px-6 text-center">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-sm">No hay platillos que coincidan.</p>
          {(group != null || selectedCat != null || badge != null || query.trim() !== '') && (
            <button
              onClick={() => { setGroup(null); setSelectedCat(null); setBadge(null); setQuery('') }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E85D04] text-white text-sm font-semibold shadow"
            >
              <X className="h-4 w-4" /> Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Móvil: al buscar, los resultados se ven como carrusel horizontal */}
          {searching && (
            <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 py-4 flex-1 items-start [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {filtered.map((it, i) => (
                <div key={`car-${filterKey}-${it.id}`} className="snap-center shrink-0 w-[64%] flex">
                  {DishCard(it, i, true, false)}
                </div>
              ))}
            </div>
          )}
        <div ref={gridWrapRef} className={cn('max-w-6xl w-full mx-auto px-4 pt-4 flex-1', searching && 'hidden md:block')}>
          {useGrouped ? (
            <div className="space-y-8">
              {grouped.map(sec => (
                <section
                  key={sec.id}
                  id={`cat-${sec.id}`}
                  data-cat-id={sec.id}
                  ref={el => { if (el) sectionRefs.current.set(sec.id, el); else sectionRefs.current.delete(sec.id) }}
                  style={{ scrollMarginTop: headerHeight + 16 }}
                  className="carta-menu-section"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="h-5 w-1.5 rounded-full shadow-sm" style={{ backgroundColor: sec.color }} />
                    <h3 className="text-lg font-extrabold uppercase tracking-wide" style={{ color: sec.color }}>{sec.name}</h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                      style={{ backgroundColor: `${sec.color}1a`, color: sec.color }}
                    >
                      {sec.items.length}
                    </span>
                    <button
                      onClick={() => setSelectedCat(sec.id === '∅' ? null : Number(sec.id))}
                      className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-stone-400 hover:text-[#E85D04] transition-colors"
                    >
                      Ver sección <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
                    {sec.items.map((it, i) => DishCard(it, i, false))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
              {limited.map((it, i) => DishCard(it, i, true))}
            </div>
          )}

          {/* Sentinel del infinite scroll: justo antes del footer (logo DevHive). */}
          <div ref={sentinelRef} aria-hidden className="h-4 w-full bg-transparent" />

          {/* Loader elegante mientras se cargan más platillos. */}
          {loadingMore && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 animate-fade-in" role="status" aria-live="polite">
              <div className="animate-spin h-7 w-7 border-2 border-[#E85D04] border-t-transparent rounded-full" />
              <p className="text-xs font-medium text-stone-400">Cargando más platillos…</p>
            </div>
          )}

          {/* Mensaje discreto al terminar de recorrer toda la carta. */}
          {!hasMore && filtered.length > INITIAL_BATCH && (
            <p className="text-center text-xs font-medium text-stone-400 py-8 animate-fade-in">
              Has visto todos los productos disponibles
            </p>
          )}
        </div>
        </>
      )}

        </div>
      </div>

      {/* Footer — firma DevHive. Sin fondo propio: se funde con el degradado de
          la página para que no aparezca una banda/parte de otro color. El logo
          emite un glow al llegar al final. */}
      <footer ref={footerRef} className="mt-auto pt-14 pb-8 flex flex-col items-center gap-2 text-center animate-fade-in">
        <a
          href="https://codexfight.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://i.ibb.co/j9vRcWRb/logo-img1.png"
            alt="CodexFight"
            className={cn(
              'h-11 w-11 rounded-2xl object-contain shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
              endGlow && 'carta-logo-glow',
            )}
          />
          <p className="text-xs font-semibold tracking-wide text-stone-500 transition-colors group-hover:text-stone-700">
            CodexFight — 2026
          </p>
        </a>
      </footer>

      <CartaItemViewer
        items={filtered}
        activeId={viewerId}
        onActiveIdChange={setViewerId}
        onClose={() => setViewerId(null)}
        categoryName={it => catById.get(it.categoryId)?.name ?? 'Menú'}
        canOrder={orderingEnabled}
      />
      {orderingEnabled && <CartPanel />}
    </div>
  )
}
