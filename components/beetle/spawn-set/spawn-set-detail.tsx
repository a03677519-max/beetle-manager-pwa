"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, MessageSquareText } from "lucide-react";
import { buildGenerationLabel } from "@/components/entry-fields";
import type { SpawnSet } from "@/types/beetle";
import { formatDate } from "@/lib/utils";

export function SpawnSetDetail({ 
  entry, 
  onAddSecondSet,
  onDeleteSet,
  onEditSet,
}: { 
  entry: SpawnSet; 
  onAddSecondSet: () => void; 
  onDeleteSet: (setId: string) => void;
  onEditSet: (set: any) => void;
}) {
  const [expandedMemos, setExpandedMemos] = useState<Record<string, boolean>>({});

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
    <div className="space-y-4">
      {/* 合計成績のサマリー */}
      <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-4 flex justify-around items-center shadow-[0_0_20px_rgba(153,27,27,0.1)] backdrop-blur-md">
        <div className="text-center">
          <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 opacity-70">Cursed Eggs</div>
          <div className="text-2xl font-black text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]">{totals.eggs}<span className="text-xs ml-0.5">個</span></div>
        </div>
        <div className="w-px h-8 bg-red-900/40" />
        <div className="text-center">
          <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 opacity-70">Awakened Larvae</div>
          <div className="text-2xl font-black text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]">{totals.larvae}<span className="text-xs ml-0.5">頭</span></div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="font-black text-purple-300/80 tracking-tighter italic">Ritual History...</h3>
        <button onClick={onAddSecondSet} className="relative z-0 bg-purple-900/60 text-purple-200 p-1 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-purple-500/30 active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto touch-pan-x pb-2 no-scrollbar">
        {allSets.map((set, index) => (
          <div key={set.id} className="min-w-[85%] bg-[#121216] p-4 rounded-3xl border border-purple-900/30 shadow-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm font-black text-purple-400/90 italic">{set.title} Night</div>
              <div className="flex gap-2">
              <button
                onClick={() => onEditSet(set)}
                className="p-1.5 text-gray-600 hover:text-purple-400 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => { if(window.confirm(`${set.title}の記録を削除しますか？`)) onDeleteSet(set.id); }}
                className="p-1.5 text-gray-600 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">セット期間</div>
              <div className="font-bold text-gray-300">
                {formatDate(set.setDate)} 〜 {set.setEndDate ? formatDate(set.setEndDate) : "継続中"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500">卵数</div>
                <div className="font-bold text-red-400">{set.eggCount ?? "-"}</div>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="text-xs text-gray-500">幼虫数</div>
                <div className="font-bold text-purple-400">{set.larvaCount ?? "-"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
              <div>マット: {set.substrate || "-"}</div>
              <div>容器: {set.containerSize || "-"}</div>
              <div>詰圧: {set.pressure}</div>
              <div>水分: {set.moisture}</div>
            </div>
            {set.memo && (
              <div 
                className="mt-3 bg-purple-950/30 p-3 rounded-2xl border border-purple-800/40 cursor-pointer active:bg-purple-900/40 transition-all shadow-inner"
                onClick={() => toggleMemo(set.id)}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-400 uppercase mb-1.5 tracking-widest">
                  <MessageSquareText size={11} className="text-purple-500 fill-purple-500/20" /> 
                  <span className="flex-1">Observed</span>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_#a855f7]" />
                </div>
                <div className={`text-xs text-purple-100/70 leading-relaxed whitespace-pre-wrap italic ${!expandedMemos[set.id] ? "line-clamp-2" : ""}`}>
                  {set.memo.split('\n').map((line: string) => line.trim() ? `・${line}` : line).join('\n')}
                </div>
                {!expandedMemos[set.id] && set.memo.length > 40 && (
                  <div className="text-[10px] text-purple-500 font-black mt-1.5 text-right opacity-60">
                    Read the whispers...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 touch-pan-y select-none">
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-gray-500">累代</div>
          <div className="font-bold text-gray-400 truncate">{buildGenerationLabel(entry.generation)}</div>
        </div>
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-gray-500">産地</div>
          <div className="font-bold text-gray-400 truncate">{entry.locality || "-"}</div>
        </div>
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-gray-500">温度</div>
          <div className="font-bold text-gray-400 truncate">{entry.temperature}℃</div>
        </div>
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-gray-500">同居</div>
          <div className="font-bold text-gray-400 truncate">{entry.cohabitation}</div>
        </div>
      </div>
    </div>
  );
}
