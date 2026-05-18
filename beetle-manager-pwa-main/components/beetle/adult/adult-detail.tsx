"use client";

import { useState } from "react";
import { buildGenerationLabel } from "@/components/entry-fields";
import { Modal } from "@/components/ui/modal";
import type { AdultBeetle } from "@/types/beetle";
import { formatDate } from "@/lib/utils";
import { useBeetleStore } from "@/store/use-beetle-store";

export function AdultDetail({ entry }: { entry: AdultBeetle }) {
  const [isBloodlineOpen, setIsBloodlineOpen] = useState(false);
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
    <div className="flex flex-col h-full bg-white">
      {/* 横スクロールコンテナ - snap機能でカード単位の移動を実現 */}
      <div className="flex-1 overflow-x-auto flex gap-6 px-1 pb-6 snap-x snap-mandatory hide-scrollbar">
        {/* カード1: 基本情報 */}
        <div className="min-w-full shrink-0 snap-center space-y-3">
          <div className="min-w-0 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="text-xs text-gray-500 mb-0.5">名称</div>
            <div className="font-bold text-gray-800 text-lg leading-tight break-words whitespace-normal">{entry.japaneseName}</div>
            {entry.scientificName && (
              <div className="text-sm text-gray-500 italic mt-1 break-words whitespace-normal">{entry.scientificName}</div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 bg-gray-50 p-3 rounded-xl border border-gray-50">
              <div className="text-xs text-gray-400">性別 / サイズ</div>
              <div className="font-bold text-gray-700 text-sm break-words whitespace-normal">{entry.gender} / {entry.size || "-"}mm</div>
            </div>
            <div className="min-w-0 bg-gray-50 p-3 rounded-xl border border-gray-50">
              <div className="text-xs text-gray-400">状態</div>
              <div className="font-bold text-gray-700 text-sm break-words whitespace-normal">{entry.status || "-"}</div>
            </div>
            <div className="min-w-0 bg-gray-50 p-3 rounded-xl border border-gray-50">
              <div className="text-xs text-gray-400">産地</div>
              <div className="font-bold text-gray-700 text-sm break-words whitespace-normal">{entry.locality || "-"}</div>
            </div>
            <div className="min-w-0 bg-gray-50 p-3 rounded-xl border border-gray-50">
              <div className="text-xs text-gray-400">累代</div>
              <div className="font-bold text-gray-700 text-sm break-words whitespace-normal">{buildGenerationLabel(entry.generation)}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsBloodlineOpen(true)}
              className="min-w-0 bg-gray-50 p-3 rounded-xl border border-gray-50 col-span-2 text-left active:bg-gray-100 transition-colors"
            >
              <div className="text-xs text-gray-400">血統</div>
              <div className="font-bold text-gray-700 text-sm truncate">{entry.bloodline || "-"}</div>
              <div className="mt-1 text-[10px] font-bold text-[#FF9800]">タップで詳細表示</div>
            </button>
            <div className="min-w-0 bg-gray-50 p-3 rounded-xl border border-gray-50">
              <div className="text-xs text-gray-400">羽化日</div>
              <div className="font-bold text-gray-700 text-sm break-words whitespace-normal">{formatDate(entry.emergenceDate)}</div>
            </div>
            <div className="min-w-0 bg-gray-50 p-3 rounded-xl border border-gray-50">
              <div className="text-xs text-gray-400">後食日</div>
              <div className="font-bold text-gray-700 text-sm break-words whitespace-normal">{formatDate(entry.feedingDate)}</div>
            </div>
          </div>
        </div>

        {/* カード2: 履歴・メモ */}
        {(entry.memo || entry.larvaMemo) && (
          <div className="min-w-full shrink-0 snap-center space-y-3">
            {entry.memo && (
              <div className="min-w-0 bg-orange-50/30 p-4 rounded-2xl border border-orange-100/50">
                <div className="text-xs text-orange-600 font-bold mb-2">管理メモ</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {entry.memo}
                </div>
              </div>
            )}
            {entry.larvaMemo && (
              <div className="min-w-0 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="text-xs text-gray-500 font-bold mb-2">幼虫時のデータ</div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">
                  {entry.larvaMemo}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 追従する登録/遷移ボタン */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-4 -mx-6 z-20">
        {linkedLarva && (
          <button
            onClick={() => handleNavigate(linkedLarva.id)}
            className="w-full flex items-center justify-center py-4 bg-[#FF9800] text-white rounded-[20px] text-sm font-bold shadow-lg shadow-orange-100 active:scale-[0.98] transition-all"
          >
            幼虫時のデータを確認する
          </button>
        )}
      </div>
      <Modal isOpen={isBloodlineOpen} onClose={() => setIsBloodlineOpen(false)} title="血統詳細" centered>
        <div className="rounded-2xl bg-[#FFFBF7] p-4 text-sm font-bold leading-relaxed text-[#4A3F35] whitespace-pre-wrap break-words">
          {entry.bloodline || "血統情報未入力"}
        </div>
      </Modal>
    </div>
  );
}
