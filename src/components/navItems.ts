import {
  LayoutDashboard, Users, UserCheck, Settings, Shield, BookOpen, Calendar, Bell,
  Mic2, GraduationCap, ClipboardList, DollarSign, Package, ShoppingBag, School,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem { href: string; label: string; icon: LucideIcon }

export const NAV_ITEMS: NavItem[] = [
  { href: '/',               label: 'Inicio',         icon: LayoutDashboard },
  { href: '/congregantes',   label: 'Congregantes',   icon: Users },
  { href: '/miembros',       label: 'Miembros',       icon: UserCheck },
  { href: '/ministerios',    label: 'Ministerios',    icon: BookOpen },
  { href: '/calendario',     label: 'Calendario',     icon: Calendar },
  { href: '/servidores',     label: 'Servidores',     icon: Mic2 },
  { href: '/academia',       label: 'Academia',       icon: School },
  { href: '/capacitacion',   label: 'Capacitación',   icon: GraduationCap },
  { href: '/tareas',         label: 'Tareas',         icon: ClipboardList },
  { href: '/finanzas',       label: 'Finanzas',       icon: DollarSign },
  { href: '/inventario',     label: 'Inventario',     icon: Package },
  { href: '/ventas',         label: 'Ventas',         icon: ShoppingBag },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/roles',          label: 'Roles',          icon: Shield },
  { href: '/configuracion',  label: 'Configuración',  icon: Settings },
]

export function isActive(href: string, pathname: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}
