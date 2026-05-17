"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import type { SpawnSet } from "@/types/beetle";
import { formatDate } from "@/lib/utils";

export type SpawnSetDisplayRecord = {
  id: string;
  setDate?: string;
  setEndDate?: string;
  eggCount?: number;
  larvaCount?: number;
  substrate?: string;
  containerSize?: string;
  pressure?: string;
  moisture?: number;
  memo?: string;
  isPrimary?: boolean;
  title: string;
  displaySubstrate: string;
  displayContainerSize: string;
  displayPressure: string;
  displayMoisture: number | string;
};

export const buildSpawnSetDisplayRecords = (entry: SpawnSet): SpawnSetDisplayRecord[] => {
  const s = entry as any;
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
    ...(s.sets || []).map((set: any) => ({ ...set, isPrimary: false })),
  ]
    .filter((set) => set.id === "primary" || set.setDate)
    .sort((a, b) => (a.setDate || "").localeCompare(b.setDate || ""));

  const records: SpawnSetDisplayRecord[] = [];
  let lastSetup = { substrate: "", containerSize: "", pressure: "", moisture: 3 as number | string };

  allRawSets.forEach((set, index) => {
    const displaySubstrate = set.substrate || lastSetup.substrate;
    const displayContainerSize = set.containerSize || lastSetup.containerSize;
    const displayPressure = (set.pressure === undefined || set.pressure === "") ? lastSetup.pressure : set.pressure;
    const displayMoisture = (set.moisture === undefined || set.moisture === "") ? lastSetup.moisture : set.moisture;

    records.push({
      ...set,
      title: `${index + 1}回目`,
      displaySubstrate,
      displayContainerSize,
      displayPressure,
      displayMoisture,
    });

    if (set.substrate) lastSetup.substrate = set.substrate;
    if (set.containerSize) lastSetup.containerSize = set.containerSize;
    if (set.pressure !== undefined && set.pressure !== "") lastSetup.pressure = set.pressure;
    if (set.moisture !== undefined && set.moisture !== "") lastSetup.moisture = set.moisture;
  });

  return records;
};

export const getSpawnSetHistoryRecords = (entry: SpawnSet) =>
  [...buildSpawnSetDisplayRecords(entry)].sort((a, b) => (b.setDate || "").localeCompare(a.setDate || ""));

export function SpawnSetHistoryCards({
  entry,
  onAddSet,
  onEditSet,
  onDeleteSet,
}: {
  entry: SpawnSet;
  onAddSet?: (entry: SpawnSet) => void;
  onEditSet?: (entry: SpawnSet, set: SpawnSetDisplayRecord) => void;
  onDeleteSet?: (entry: SpawnSet, setId: string) => void;
}) {
  const historySets = getSpawnSetHistoryRecords(entry);

  return (
    <>
      {historySets.map((set, index) => (
        <article
          key={set.id}
          className="w-[17rem] sm:w-80 shrink-0 snap-start rounded-[28px] border border-orange-100 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-widest mb-1">{set.isPrimary ? "初回セット" : "産卵履歴"}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${set.isPrimary ? "text-white bg-[#FF9800]" : "text-[#FF9800] bg-orange-50"}`}>{set.title}</span>
                <span className="text-[10px] font-black text-gray-300">{index + 1}/{historySets.length}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditSet?.(entry, set);
                }}
                className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteSet?.(entry, set.id);
                }}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="text-xs font-bold text-gray-400 break-words mb-3">
            {formatDate(set.setDate || "")} 〜 {set.setEndDate ? formatDate(set.setEndDate) : "継続中"}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
              <p className="text-[10px] text-gray-400 font-bold">回収結果</p>
              <p className="text-sm font-black text-gray-700 break-words whitespace-normal">卵:{set.eggCount ?? 0} / 幼:{set.larvaCount ?? 0}</p>
            </div>
            <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
              <p className="text-[10px] text-gray-400 font-bold">セット方法</p>
              <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">{set.displaySubstrate || "前回同様"}</p>
            </div>
            <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
              <p className="text-[10px] text-gray-400 font-bold">容器</p>
              <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">{set.displayContainerSize || "-"}</p>
            </div>
            <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
              <p className="text-[10px] text-gray-400 font-bold">環境</p>
              <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">水:{set.displayMoisture ?? "-"} / 圧:{set.displayPressure || "-"}</p>
            </div>
          </div>

          {set.memo && (
            <p className="mt-3 text-[11px] text-gray-500 bg-orange-50/40 p-3 rounded-xl break-words whitespace-pre-wrap italic border border-orange-50">
              {set.memo}
            </p>
          )}
        </article>
      ))}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAddSet?.(entry);
        }}
        className="w-44 shrink-0 snap-start rounded-[28px] border border-dashed border-orange-200 bg-white/70 p-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.03)] active:scale-[0.97] transition-all"
      >
        <div className="w-9 h-9 rounded-full bg-[#FF9800] text-white flex items-center justify-center shadow-lg shadow-orange-100 mb-3">
          <Plus size={20} />
        </div>
        <div className="text-sm font-black text-gray-600">履歴を追加</div>
        <div className="text-[10px] font-bold text-gray-400 mt-1 leading-snug">カード横に独立した産卵履歴を追加します</div>
      </button>
    </>
  );
}
