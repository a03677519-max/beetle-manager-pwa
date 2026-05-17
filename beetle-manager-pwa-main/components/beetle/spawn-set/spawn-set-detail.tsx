"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Edit2, MessageSquareText } from "lucide-react";
import { buildGenerationLabel } from "@/components/entry-fields";
import type { BeetleEntry, SpawnSet, SpawnSetFormValues } from "@/types/beetle";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { SpawnSetSecondForm } from "./spawn-set-second-form";
import { useBeetleStore, emptySpawnSetForm } from "@/store/use-beetle-store";
import { createId, today } from "@/types/utils";

export function SpawnSetDetail({ 
  entry, 
  allEntries = [],
  onAddSecondSet,
  onDeleteSet,
  onEditSet,
}: { 
  entry: SpawnSet; 
  allEntries?: BeetleEntry[];
  onAddSecondSet?: () => void;
  onDeleteSet?: (setId: string) => void;
  onEditSet?: (set: any) => void;
}) {
  const [expandedMemos, setExpandedMemos] = useState<Record<string, boolean>>({});
  const updateSpawnSet = useBeetleStore((state) => state.updateSpawnSet);

  const toggleMemo = (id: string) => {
    setExpandedMemos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const s = entry as any;
  // 1回目のセットと2回目以降（sets配列）を統合
  const rawSets = [
    {
      id: "primary",
      title: "1回目",
      setDate: s.setDate || s.createdAt?.slice(0, 10),
      setEndDate: s.setEndDate,
      eggCount: s.eggCount ?? 0,
      larvaCount: s.larvaCount ?? 0,
      substrate: s.substrate,
      containerSize: s.containerSize,
      pressure: s.pressure,
      moisture: s.moisture,
      memo: s.memo,
    },
    ...(s.sets || []).map((set: any, i: number) => ({ ...set, title: `${i + 2}回目` })) // sets配列の各要素にtitleを追加
  ].sort((a, b) => (a.setDate || "").localeCompare(b.setDate || "")); // 日付の昇順（古い順）

  // 前回のセット方法を引き継ぐ処理
  const allSets: any[] = [];
  let lastSetup = { substrate: "", containerSize: "", pressure: "", moisture: 3 };

  rawSets.forEach((set) => {
    const processedSet = { ...set };
    if (!processedSet.substrate) processedSet.substrate = lastSetup.substrate; else lastSetup.substrate = processedSet.substrate;
    if (!processedSet.containerSize) processedSet.containerSize = lastSetup.containerSize; else lastSetup.containerSize = processedSet.containerSize;
    if (processedSet.pressure === undefined || processedSet.pressure === "") processedSet.pressure = lastSetup.pressure; else lastSetup.pressure = processedSet.pressure;
    if (processedSet.moisture === undefined || processedSet.moisture === "") processedSet.moisture = lastSetup.moisture; else lastSetup.moisture = processedSet.moisture;
    allSets.push(processedSet);
  });

  // 表示用に日付の降順（新しい順）にソート
  allSets.sort((a, b) => (b.setDate || "").localeCompare(a.setDate || ""));

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
    <div className="space-y-6">
      {/* 合計成績のサマリー */}
      <div className="bg-[#FF9800]/5 border border-[#FF9800]/10 rounded-2xl p-4 flex justify-around items-center shadow-sm">
        <div className="text-center">
          <div className="text-[10px] font-black text-[#EF6C00] uppercase tracking-widest mb-1">合計卵数</div>
          <div className="text-2xl font-black text-[#EF6C00]">{totals.eggs}<span className="text-xs ml-0.5">個</span></div>
        </div>
        <div className="w-px h-8 bg-[#FF9800]/20" />
        <div className="text-center">
          <div className="text-[10px] font-black text-[#EF6C00] uppercase tracking-widest mb-1">合計幼虫数</div>
          <div className="text-2xl font-black text-[#EF6C00]">{totals.larvae}<span className="text-xs ml-0.5">頭</span></div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="font-black text-gray-700">産卵セット履歴</h3>
        <button onClick={() => onAddSecondSet?.()} className="relative z-0 bg-[#FF9800] text-white p-1 rounded-full shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 touch-pan-y select-none">
        <div className="bg-gray-50 p-4 rounded-2xl">
          <div className="text-xs text-gray-500">累代</div>
          <div className="font-bold text-gray-800 truncate">{buildGenerationLabel(entry.generation)}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl">
          <div className="text-xs text-gray-500">産地</div>
          <div className="font-bold text-gray-800 truncate">{entry.locality || "-"}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl">
          <div className="text-xs text-gray-500">温度</div>
          <div className="font-bold text-gray-800 truncate">{entry.temperature}℃</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl">
          <div className="text-xs text-gray-500">同居</div>
          <div className="font-bold text-gray-800 truncate">{entry.cohabitation}</div>
        </div>
      </div>

      {/* 履歴リストの表示 */}
      <div className="space-y-3">
        <div className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-widest border-l-4 border-[#FF9800] pl-3 mb-2">
          履歴一覧
        </div>
        {allSets.reverse().map((set) => (
          <div key={set.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-black text-[#FF9800] bg-orange-50 px-2 py-0.5 rounded-lg">{set.title}</span>
              <span className="text-xs font-bold text-gray-400">{formatDate(set.setDate)} 〜 {formatDate(set.setEndDate) || "継続中"}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 font-bold">回収結果</p>
                <p className="text-sm font-black text-gray-700">卵:{set.eggCount} / 幼虫:{set.larvaCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold">セット方法</p>
                <p className="text-[11px] font-bold text-gray-600 truncate">{set.substrate || "前回同様"}</p>
              </div>
            </div>
            {set.memo && (
              <p className="mt-2 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg italic">
                {set.memo}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
              <button onClick={() => onEditSet?.(set)} className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDeleteSet?.(set.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
