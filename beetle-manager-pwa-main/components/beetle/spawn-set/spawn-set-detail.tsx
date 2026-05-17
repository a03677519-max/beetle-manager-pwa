"use client";

import { Plus, Trash2, Edit2 } from "lucide-react";
import { buildGenerationLabel } from "@/components/entry-fields";
import type { BeetleEntry, SpawnSet } from "@/types/beetle";
import { formatDate } from "@/lib/utils";

export function SpawnSetDetail({ 
  entry, 
  allEntries: _allEntries = [],
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
  const s = entry as any;
  // 全てのセットを一度フラットな配列にする。1回目(primary)は登録カードとして扱い、履歴からは独立させる。
  const allRawSets = [
    {
      id: "primary",
      setDate: s.setDate || s.createdAt?.slice(0, 10),
      setEndDate: s.setEndDate,
      eggCount: s.eggCount ?? 0,
      larvaCount: s.larvaCount ?? 0,
      substrate: s.substrate,
      containerSize: s.containerSize,
      pressure: s.pressure,
      moisture: s.moisture,
      memo: s.memo,
      isPrimary: true,
    },
    ...(s.sets || []).map((set: any) => ({ ...set, isPrimary: false }))
  ].filter(set => set.id === "primary" || set.setDate).sort((a, b) => (a.setDate || "").localeCompare(b.setDate || ""));

  // 日付順に並べた後で、適切なタイトルと前回情報の表示用引き継ぎを行う
  const allSets: any[] = [];
  let lastSetup = { substrate: "", containerSize: "", pressure: "", moisture: 3 };

  allRawSets.forEach((set, index) => {
    const displaySubstrate = set.substrate || lastSetup.substrate;
    const displayContainerSize = set.containerSize || lastSetup.containerSize;
    const displayPressure = (set.pressure === undefined || set.pressure === "") ? lastSetup.pressure : set.pressure;
    const displayMoisture = (set.moisture === undefined || set.moisture === "") ? lastSetup.moisture : set.moisture;
    const processedSet = { 
      ...set, 
      title: `${index + 1}回目`, // ソート後に順番を割り当て
      displaySubstrate,
      displayContainerSize,
      displayPressure,
      displayMoisture,
    };
    if (set.substrate) lastSetup.substrate = set.substrate;
    if (set.containerSize) lastSetup.containerSize = set.containerSize;
    if (set.pressure !== undefined && set.pressure !== "") lastSetup.pressure = set.pressure;
    if (set.moisture !== undefined && set.moisture !== "") lastSetup.moisture = set.moisture;
    allSets.push(processedSet);
  });

  const primarySet = allSets.find((set) => set.id === "primary") || allRawSets.find((set) => set.id === "primary");
  const historySets = allSets.filter((set) => set.id !== "primary");

  // 全回転の合計を計算
  const totals = allSets.reduce(
    (acc, set) => {
      acc.eggs += Number(set.eggCount || 0);
      acc.larvae += Number(set.larvaCount || 0);
      return acc;
    },
    { eggs: 0, larvae: 0 }
  );

  const renderSetRecord = (set: any, options?: { primary?: boolean }) => (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-sm ${options?.primary ? "bg-white border-orange-100" : "bg-[#F8F9FA] border-gray-100"}`}>
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${options?.primary ? "text-white bg-[#FF9800]" : "text-[#FF9800] bg-orange-50"}`}>
          {set.title || "1回目"}
        </span>
        <span className="text-xs font-bold text-gray-400 break-words text-right">
          {formatDate(set.setDate)} 〜 {set.setEndDate ? formatDate(set.setEndDate) : "継続中"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 bg-white/70 p-3 rounded-xl border border-white/80">
          <p className="text-[10px] text-gray-400 font-bold">回収結果</p>
          <p className="text-sm font-black text-gray-700 break-words whitespace-normal">卵:{set.eggCount ?? 0} / 幼虫:{set.larvaCount ?? 0}</p>
        </div>
        <div className="min-w-0 bg-white/70 p-3 rounded-xl border border-white/80">
          <p className="text-[10px] text-gray-400 font-bold">セット方法</p>
          <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">{set.displaySubstrate || "前回同様"}</p>
        </div>
        <div className="min-w-0 bg-white/70 p-3 rounded-xl border border-white/80">
          <p className="text-[10px] text-gray-400 font-bold">容器</p>
          <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">{set.displayContainerSize || "-"}</p>
        </div>
        <div className="min-w-0 bg-white/70 p-3 rounded-xl border border-white/80">
          <p className="text-[10px] text-gray-400 font-bold">環境</p>
          <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">水:{set.displayMoisture ?? "-"} / 圧:{set.displayPressure || "-"}</p>
        </div>
      </div>

      {set.memo && (
        <p className="mt-3 text-[11px] text-gray-500 bg-white/80 p-3 rounded-xl break-words whitespace-pre-wrap italic border border-white">
          {set.memo}
        </p>
      )}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        <button type="button" onClick={() => onEditSet?.(set)} className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors">
          <Edit2 size={16} />
        </button>
        <button type="button" onClick={() => onDeleteSet?.(set.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-black text-gray-700">産卵セット</h3>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5">右へスワイプして履歴を表示</p>
        </div>
        <button onClick={() => onAddSecondSet?.()} className="relative z-0 bg-[#FF9800] text-white p-1 rounded-full shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </div>

      <div className="-mx-6 overflow-x-auto px-6 pb-4 snap-x snap-mandatory touch-pan-x hide-scrollbar">
        <div className="flex gap-4">
          <section className="min-w-full shrink-0 snap-center space-y-4">
            <div className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-widest border-l-4 border-[#FF9800] pl-3">
              登録カード
            </div>

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
              <div className="min-w-0 bg-gray-50 p-4 rounded-2xl">
                <div className="text-xs text-gray-500">温度</div>
                <div className="font-bold text-gray-800 break-words whitespace-normal">{entry.temperature}℃</div>
              </div>
              <div className="min-w-0 bg-gray-50 p-4 rounded-2xl">
                <div className="text-xs text-gray-500">同居</div>
                <div className="font-bold text-gray-800 break-words whitespace-normal">{entry.cohabitation}</div>
              </div>
            </div>

            {primarySet && renderSetRecord(primarySet, { primary: true })}
          </section>

          {historySets.length > 0 ? (
            historySets.map((set, index) => (
              <section key={set.id} className="min-w-full shrink-0 snap-center space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-widest border-l-4 border-[#FF9800] pl-3">
                    履歴カード
                  </div>
                  <div className="text-[10px] font-black text-gray-300">{index + 1} / {historySets.length}</div>
                </div>
                {renderSetRecord(set)}
              </section>
            ))
          ) : (
            <section className="min-w-full shrink-0 snap-center space-y-4">
              <div className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-widest border-l-4 border-[#FF9800] pl-3">
                履歴カード
              </div>
              <div className="min-w-0 bg-white border border-dashed border-orange-200 p-6 rounded-2xl text-center shadow-sm">
                <p className="text-sm font-black text-gray-500">追加のセット履歴はまだありません。</p>
                <p className="text-[11px] text-gray-400 mt-1">1回目の登録カードから独立した履歴として右側に追加されます。</p>
                <button type="button" onClick={() => onAddSecondSet?.()} className="mt-4 px-4 py-2 bg-[#FF9800] text-white rounded-xl text-xs font-black shadow-lg shadow-orange-100 active:scale-95 transition-all">
                  履歴を追加
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
