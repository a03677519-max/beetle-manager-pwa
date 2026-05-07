"use client";

import { Plus } from "lucide-react";
import { buildGenerationLabel } from "@/components/entry-fields";
import type { SpawnSet } from "@/types/beetle";
import { formatDate } from "@/lib/utils";

export function SpawnSetDetail({ entry, onAddSecondSet }: { entry: SpawnSet; onAddSecondSet: () => void }) {
  const s = entry as any;
  const sets = [
    {
      title: "1回目",
      setDate: s.setDate,
      setEndDate: s.setEndDate,
      eggCount: s.eggCount,
      larvaCount: s.larvaCount,
      substrate: s.substrate,
      containerSize: s.containerSize,
      pressure: s.pressure,
      moisture: s.moisture,
    },
    ...(s.secondSetDate
      ? [
          {
            title: "2回目",
            setDate: s.secondSetDate,
            setEndDate: s.secondSetEndDate,
            eggCount: s.secondEggCount,
            larvaCount: s.secondLarvaCount,
            substrate: s.secondSubstrate || s.substrate,
            containerSize: s.secondContainerSize || s.containerSize,
            pressure: s.secondPressure || s.pressure,
            moisture: s.secondMoisture ?? s.moisture,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-black text-gray-700">産卵セット履歴</h3>
        <button onClick={onAddSecondSet} className="bg-[#FF9800] text-white p-1 rounded-full shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto touch-pan-x pb-2 no-scrollbar">
        {sets.map((set, index) => (
          <div key={index} className="min-w-[85%] bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="text-sm font-bold text-gray-700">{set.title}</div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">セット期間</div>
              <div className="font-bold text-gray-800">
                {formatDate(set.setDate)} 〜 {set.setEndDate ? formatDate(set.setEndDate) : "継続中"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-xs text-gray-500">卵数</div>
                <div className="font-bold text-gray-800">{set.eggCount ?? "-"}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-xs text-gray-500">幼虫数</div>
                <div className="font-bold text-gray-800">{set.larvaCount ?? "-"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>マット: {set.substrate || "-"}</div>
              <div>容器: {set.containerSize || "-"}</div>
              <div>詰圧: {set.pressure}</div>
              <div>水分: {set.moisture}</div>
            </div>
          </div>
        ))}
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
        {entry.memo && (
          <div className="bg-gray-50 p-4 rounded-2xl col-span-2">
            <div className="text-xs text-gray-500">メモ</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{entry.memo}</div>
          </div>
        )}
      </div>
    </div>
  );
}
