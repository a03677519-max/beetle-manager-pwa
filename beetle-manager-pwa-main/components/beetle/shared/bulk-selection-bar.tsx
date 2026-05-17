"use client";

import { FileSpreadsheet, Trash2, Edit } from "lucide-react";
import { EntryType } from "@/types/beetle";

interface BulkSelectionBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkExport: () => void;
  onBulkDelete: () => void;
  onBulkEdit: () => void;
  onSelectByType: (type: EntryType) => void;
  availableTypes: EntryType[];
  selectedTypeCounts: Record<EntryType, { selected: number; total: number }>;
}

export function BulkSelectionBar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkExport,
  onBulkDelete,
  onBulkEdit,
  onSelectByType,
  availableTypes,
  selectedTypeCounts,
}: BulkSelectionBarProps) {
  return (
    <div className="bg-white p-3 rounded-[24px] border border-red-100 mb-6 space-y-3 shadow-lg shadow-red-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">一括操作中: {selectedCount}件</span>
        <div className="flex gap-2">
          <button onClick={onSelectAll} className="px-3 py-1 bg-white border border-orange-100 rounded-full text-[10px] font-black text-[#FF9800] shadow-sm active:scale-95 transition-all">表示中を全選択</button>
          <button onClick={onDeselectAll} className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black text-gray-400 shadow-sm active:scale-95 transition-all">選択解除</button>
        </div>
      </div>
      {availableTypes.length > 1 && (
        <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
          {availableTypes.map((type) => (
            <button 
              key={type}
              onClick={() => onSelectByType(type)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${
                selectedTypeCounts[type]?.selected === selectedTypeCounts[type]?.total && selectedTypeCounts[type]?.total > 0
                  ? "bg-[#FF9800] text-white border-[#FF9800] shadow-sm"
                  : "bg-orange-50/50 text-[#FF9800] border-orange-100"
              }`}
            >
              {type}: {selectedTypeCounts[type]?.selected === selectedTypeCounts[type]?.total && selectedTypeCounts[type]?.total > 0 ? "解除" : "全選択"}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button onClick={onBulkExport} disabled={selectedCount === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-[11px] font-bold disabled:opacity-30 transition-all active:scale-95">
          <FileSpreadsheet size={14} /> Excel
        </button>
        <button onClick={onBulkDelete} disabled={selectedCount === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-500 rounded-xl text-[11px] font-bold disabled:opacity-30 transition-all active:scale-95">
          <Trash2 size={14} /> 削除
        </button>
        <button onClick={onBulkEdit} disabled={selectedCount === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-500 rounded-xl text-[11px] font-bold disabled:opacity-30 transition-all active:scale-95">
          <Edit size={14} /> 一括編集
        </button>
      </div>
    </div>
  );
}