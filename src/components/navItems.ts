import {
  LayoutDashboard, Users, UserCheck, Settings, Shield, BookOpen, Calendar, Bell,
  Mic2, GraduationCap, ClipboardList, DollarSign, Package, ShoppingBag, School,
  type LucideIcon,
} from 'lucide-react'

// color: tono del sistema de Apple para el ícono del módulo (estilo Ajustes de iOS).
export interface NavItem { href: string; label: string; icon: LucideIcon; color: string }
export interface NavGrupo { titulo: string | null; items: NavItem[] }

export const NAV_GRUPOS: NavGrupo[] = [
  { titulo: null, items: [
    { href: '/',             label: 'Inicio',       icon: LayoutDashboard, color: '#007aff' },
  ] },
  { titulo: 'Personas', items: [
    { href: '/congregantes', label: 'Congregantes', icon: Users,           color: '#ff9500' },
    { href: '/miembros',     label: 'Seguimiento',  icon: UserCheck,       color: '#30b0c7' },
    { href: '/ministerios',  label: 'Ministerios',  icon: BookOpen,        color: '#5856d6' },
  ] },
  { titulo: 'Actividades', items: [
    { href: '/calendario',   label: 'Calendario',   icon: Calendar,        color: '#ff3b30' },
    { href: '/servidores',   label: 'Servidores',   icon: Mic2,            color: '#ff2d55' },
    { href: '/tareas',       label: 'Tareas',       icon: ClipboardList,   color: '#f5b400' },
    { href: '/ventas',       label: 'Ventas',       icon: ShoppingBag,     color: '#00c7be' },
  ] },
  { titulo: 'Formación', items: [
    { href: '/academia',     label: 'Academia',     icon: School,          color: '#af52de' },
    { href: '/capacitacion', label: 'Capacitación', icon: GraduationCap,   color: '#32ade6' },
  ] },
  { titulo: 'Administración', items: [
    { href: '/finanzas',     label: 'Finanzas',     icon: DollarSign,      color: '#34c759' },
    { href: '/inventario',   label: 'Inventario',   icon: Package,         color: '#a2845e' },
    { href: '/roles',        label: 'Roles',        icon: Shield,          color: '#636366' },
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
