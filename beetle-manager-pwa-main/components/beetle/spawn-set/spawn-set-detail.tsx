"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { buildGenerationLabel } from "@/components/entry-fields";
import { Modal } from "@/components/ui/modal";
import type { BeetleEntry, SpawnSet } from "@/types/beetle";
import { buildSpawnSetDisplayRecords } from "./spawn-set-history-cards";

export function SpawnSetDetail({ 
  entry, 
  allEntries: _allEntries = [],
  onAddSecondSet,
  onEditSet,
}: { 
  entry: SpawnSet; 
  allEntries?: BeetleEntry[];
  onAddSecondSet?: () => void;
  onDeleteSet?: (setId: string) => void;
  onEditSet?: (set: any) => void;
}) {
  const [isBloodlineOpen, setIsBloodlineOpen] = useState(false);
  const allSets = buildSpawnSetDisplayRecords(entry);

  // 全回転の合計を計算
  const totals = allSets.reduce(
    (acc, set) => {
      acc.eggs += Number(set.eggCount || 0);
      acc.larvae += Number(set.larvaCount || 0);
      return acc;
    },
    { eggs: 0, larvae: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-black text-gray-700">産卵セット</h3>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">履歴はカード横の別枠に表示</p>
        </div>
        <button onClick={() => onAddSecondSet?.()} className="relative z-0 bg-[#FF9800] text-white p-1 rounded-full shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {/* 合計成績のサマリー */}
        <div className="bg-[#FF9800]/5 border border-[#FF9800]/10 rounded-2xl p-4 flex justify-around items-stretch gap-3 shadow-sm">
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[10px] font-black text-[#EF6C00] uppercase tracking-widest mb-1">合計卵数</div>
            <div className="text-2xl font-black text-[#EF6C00] break-words whitespace-normal">{totals.eggs}<span className="text-xs ml-0.5">個</span></div>
          </div>
          <div className="w-px self-center h-8 bg-[#FF9800]/20" />
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[10px] font-black text-[#EF6C00] uppercase tracking-widest mb-1">合計幼虫数</div>
            <div className="text-2xl font-black text-[#EF6C00] break-words whitespace-normal">{totals.larvae}<span className="text-xs ml-0.5">頭</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 touch-pan-y select-none">
          <div className="min-w-0 bg-gray-50 p-4 rounded-2xl">
            <div className="text-xs text-gray-500">累代</div>
            <div className="font-bold text-gray-800 break-words whitespace-normal">{buildGenerationLabel(entry.generation)}</div>
          </div>
          <div className="min-w-0 bg-gray-50 p-4 rounded-2xl">
            <div className="text-xs text-gray-500">産地</div>
            <div className="font-bold text-gray-800 break-words whitespace-normal">{entry.locality || "-"}</div>
          </div>
          <button
            type="button"
            onClick={() => setIsBloodlineOpen(true)}
            className="min-w-0 bg-gray-50 p-4 rounded-2xl col-span-2 text-left active:bg-gray-100 transition-colors"
          >
            <div className="text-xs text-gray-500">血統</div>
            <div className="font-bold text-gray-800 truncate">{entry.bloodline || "-"}</div>
            <div className="mt-1 text-[10px] font-bold text-[#FF9800]">タップで詳細表示</div>
          </button>
          <div className="min-w-0 bg-gray-50 p-4 rounded-2xl">
            <div className="text-xs text-gray-500">温度</div>
            <div className="font-bold text-gray-800 break-words whitespace-normal">{entry.temperature}℃</div>
          </div>
          <div className="min-w-0 bg-gray-50 p-4 rounded-2xl">
            <div className="text-xs text-gray-500">同居</div>
            <div className="font-bold text-gray-800 break-words whitespace-normal">{entry.cohabitation}</div>
          </div>
        </div>
      </div>
      <Modal isOpen={isBloodlineOpen} onClose={() => setIsBloodlineOpen(false)} title="血統詳細" centered>
        <div className="rounded-2xl bg-[#FFFBF7] p-4 text-sm font-bold leading-relaxed text-[#4A3F35] whitespace-pre-wrap break-words">
          {entry.bloodline || "血統情報未入力"}
        </div>
      </Modal>
    </div>
  );
}
