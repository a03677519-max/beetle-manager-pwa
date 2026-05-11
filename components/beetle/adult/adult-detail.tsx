"use client";

import { buildGenerationLabel } from "@/components/entry-fields";
import type { AdultBeetle } from "@/types/beetle";
import { formatDate } from "@/lib/utils";
import { useBeetleStore } from "@/store/use-beetle-store";
import { ExternalLink } from "lucide-react";

export function AdultDetail({ entry }: { entry: AdultBeetle }) {
  const allEntries = useBeetleStore((state) => state.entries);

  // 紐付けられた幼虫データを検索（IDまたは管理名+学名の組み合わせ）
  const linkedLarva = allEntries.find((e) => 
    e.type === "幼虫" && (
      entry.linkedEntryIds?.includes(e.id) || 
      (entry.managementName && e.managementName === entry.managementName && e.scientificName === entry.scientificName)
    )
  );

  const handleNavigate = (id: string) => {
    window.dispatchEvent(new CustomEvent('app:navigate-entry', { detail: { id } }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">和名</div>
        <div className="font-bold text-gray-800 truncate">{entry.japaneseName}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">性別 / サイズ</div>
        <div className="font-bold text-gray-800 truncate">{entry.gender} / {entry.size || "-"}mm</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">状態</div>
        <div className="font-bold text-gray-800 truncate">{entry.status || "-"}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">産地</div>
        <div className="font-bold text-gray-800 truncate">{entry.locality || "-"}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">累代</div>
        <div className="font-bold text-gray-800 truncate">{buildGenerationLabel(entry.generation)}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">羽化日</div>
        <div className="font-bold text-gray-800 truncate">{formatDate(entry.emergenceDate)}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">後食日</div>
        <div className="font-bold text-gray-800 truncate">{formatDate(entry.feedingDate)}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">死亡日</div>
        <div className="font-bold text-gray-800 truncate">{formatDate(entry.deathDate)}</div>
      </div>
      <div className="bg-gray-50 p-4 rounded-2xl">
        <div className="text-xs text-gray-500">販売日</div>
        <div className="font-bold text-gray-800 truncate">{formatDate((entry as any).soldDate)}</div>
      </div>
      {entry.memo && (
        <div className="bg-gray-50 p-4 rounded-2xl col-span-2">
          <div className="text-xs text-gray-500">メモ</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{entry.memo}</div>
        </div>
      )}
      {entry.larvaMemo && (
        <div className="bg-gray-50 p-4 rounded-2xl col-span-2">
          <div className="text-xs text-gray-500">幼虫時データ</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{entry.larvaMemo}</div>
        </div>
      )}
      </div>

      {linkedLarva && (
        <button
          onClick={() => handleNavigate(linkedLarva.id)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#FF9800]/10 text-[#FF9800] rounded-2xl text-sm font-black border border-[#FF9800]/20 active:scale-95 transition-all"
        >
          <ExternalLink size={18} />
          幼虫時のデータを確認する
        </button>
      )}
    </div>
  );
}
