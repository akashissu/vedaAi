'use client';

import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  BookOpen,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface SidebarProps {
  collapsed?: boolean;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Home' },
  { icon: Users, label: 'My Classroom' },
  { icon: FileText, label: 'Assignments' },
  { icon: ClipboardList, label: 'Exams', active: true },
  { icon: BookOpen, label: 'My Library' },
];

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white shrink-0 transition-all duration-300',
        collapsed ? 'w-14' : 'w-[180px]'
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-base tracking-tight">VedaAI</span>
        )}
      </div>

      {/* AI Teacher's Toolkit */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <button className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-2 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            AI Teacher&apos;s Toolkit
          </button>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              item.active
                ? 'bg-gray-700 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-gray-800 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm shrink-0">
              🏫
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">Delhi Public School</p>
              <p className="text-xs text-gray-500 truncate">Bokaro Steel City</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
