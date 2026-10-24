import {
  LayoutDashboard, Users, UserCheck, Settings, Shield, BookOpen, Calendar, Bell,
  Mic2, GraduationCap, ClipboardList, DollarSign, Package, ShoppingBag, School,
  type LucideIcon,
} from 'lucide-react'

// color: tono del sistema de Apple para el ícono del módulo (estilo Ajustes de iOS).
// modulo: nombre en el panel de permisos; sin módulo = visible para todo el que entra al panel.
export interface NavItem { href: string; label: string; icon: LucideIcon; color: string; modulo?: string }
export interface NavGrupo { titulo: string | null; items: NavItem[] }

export const NAV_GRUPOS: NavGrupo[] = [
  { titulo: null, items: [
    { href: '/',             label: 'Inicio',       icon: LayoutDashboard, color: '#a35d2d' },
  ] },
  { titulo: 'Personas', items: [
    { href: '/congregantes', label: 'Congregantes', icon: Users,           color: '#ff9500', modulo: 'congregantes' },
    { href: '/miembros',     label: 'Seguimiento',  icon: UserCheck,       color: '#30b0c7', modulo: 'miembros' },
    { href: '/ministerios',  label: 'Ministerios',  icon: BookOpen,        color: '#5856d6', modulo: 'ministerios' },
  ] },
  { titulo: 'Actividades', items: [
    { href: '/calendario',   label: 'Calendario',   icon: Calendar,        color: '#ff3b30', modulo: 'calendario' },
    { href: '/servidores',   label: 'Servidores',   icon: Mic2,            color: '#ff2d55', modulo: 'servidores' },
    { href: '/tareas',       label: 'Tareas',       icon: ClipboardList,   color: '#f5b400', modulo: 'diseno' },
    { href: '/ventas',       label: 'Ventas',       icon: ShoppingBag,     color: '#00c7be', modulo: 'ventas' },
  ] },
  { titulo: 'Formación', items: [
    { href: '/academia',     label: 'Academia',     icon: School,          color: '#af52de', modulo: 'academia' },
    { href: '/capacitacion', label: 'Capacitación', icon: GraduationCap,   color: '#32ade6', modulo: 'capacitacion' },
  ] },
  { titulo: 'Administración', items: [
    { href: '/finanzas',     label: 'Finanzas',     icon: DollarSign,      color: '#34c759', modulo: 'finanzas' },
    { href: '/inventario',   label: 'Inventario',   icon: Package,         color: '#a2845e', modulo: 'inventario' },
    { href: '/roles',        label: 'Roles',        icon: Shield,          color: '#636366', modulo: 'roles' },
  ] },
  { titulo: 'Cuenta', items: [
    { href: '/notificaciones', label: 'Notificaciones', icon: Bell,        color: '#ff3b30' },
    { href: '/configuracion',  label: 'Configuración',  icon: Settings,    color: '#8e8e93' },
  ] },
]

export const NAV_ITEMS: NavItem[] = NAV_GRUPOS.flatMap((g) => g.items)

export function isActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

// Grupos del menú filtrados por los módulos que la persona puede ver.
export function gruposVisibles(modulos: string[]): NavGrupo[] {
  return NAV_GRUPOS
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.modulo || modulos.includes(i.modulo)) }))
    .filter((g) => g.items.length > 0)
}

// Módulo al que pertenece una ruta del panel (para redirigir si no tiene permiso).
export function moduloDeRuta(pathname: string): string | undefined {
  return NAV_ITEMS.find((i) => i.modulo && i.href !== '/' && (pathname === i.href || pathname.startsWith(i.href + '/')))?.modulo
}
