'use client';

import { ArrowLeft, ClipboardList, HelpCircle, Bell, Plus } from 'lucide-react';

export function TopBar() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      {/* Left: back + breadcrumb */}
      <div className="flex items-center gap-3">
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <ClipboardList className="w-4 h-4 text-gray-400" />
          <span>Exams</span>
        </div>
      </div>

      {/* Right: action icons + avatar */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <HelpCircle className="w-4.5 h-4.5" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
          <Plus className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-orange-700">MR</span>
          </div>
          <span className="text-sm text-gray-700 font-medium hidden sm:block">Madhur Rastogi</span>
        </div>
      </div>
    </header>
  );
}
