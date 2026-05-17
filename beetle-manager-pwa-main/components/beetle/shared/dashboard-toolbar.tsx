"use client";

import { Settings, RefreshCw, FileSpreadsheet, Loader2, Hash } from "lucide-react";

interface DashboardToolbarProps {
  isSyncing: boolean;
  isSelectionMode: boolean;
  onRegenerateNames: () => void;
  onGitHubSync: () => void;
  onExcelExport: () => void;
  onOpenSettings: () => void;
  onToggleSelection: () => void;
}

export function DashboardToolbar({
  isSyncing,
  isSelectionMode,
  onRegenerateNames,
  onGitHubSync,
  onExcelExport,
  onOpenSettings,
  onToggleSelection,
}: DashboardToolbarProps) {
  return (
    <div className="flex justify-between items-center mb-2">
      <p className="text-[11px] font-black text-[#B0A495] uppercase tracking-[0.3em]">Breeding Dashboard</p>
      <div className="flex gap-2 items-center">
        <button 
          onClick={onRegenerateNames}
          className="px-2 py-1 bg-white border border-[#E8E2DA] rounded-full text-[10px] font-black text-gray-500 hover:text-[#FF9800] transition-all shadow-sm active:scale-95"
          title="規則に従って全個体の名前を付け直します"
        >
          <Hash size={12} />
          一括採番
        </button>
        <button
          onClick={onGitHubSync}
          className={`flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E8E2DA] rounded-full text-[10px] font-black ${isSyncing ? 'text-orange-400' : 'text-gray-500 hover:text-blue-600'} transition-all shadow-sm active:scale-95`}
          disabled={isSyncing}
        >
          {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          <span>同期</span>
        </button>
        <button
          onClick={onExcelExport}
          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E8E2DA] rounded-full text-[10px] font-black text-gray-500 hover:text-green-600 transition-all shadow-sm active:scale-95"
        >
          <FileSpreadsheet size={12} />
          <span>Excel出力</span>
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button onClick={onOpenSettings} className="p-1.5 bg-white border border-[#E8E2DA] rounded-full text-gray-400 hover:text-[#FF9800] transition-all shadow-sm active:scale-95">
          <Settings size={16} />
        </button>
        <button onClick={onToggleSelection} className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all ${isSelectionMode ? "bg-[#F4511E] text-white shadow-lg shadow-red-200" : "bg-[#EFE9E2] text-[#8B7D7B]"}`}>一括</button>
      </div>
    </div>
  );
}