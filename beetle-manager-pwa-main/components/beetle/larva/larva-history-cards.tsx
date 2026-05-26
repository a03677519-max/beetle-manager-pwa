"use client";

import type { LarvaBeetle, LarvaLog } from "@/types/beetle";
import { formatDate, getDaysRange, today } from "@/lib/utils";

const formatRangeDays = (range: { min: number; max: number } | null) => {
  if (!range) return "-";
  return range.min === range.max ? `${range.min}日` : `${range.min}〜${range.max}日`;
};

export function LarvaHistoryCards({ entry }: { entry: LarvaBeetle }) {
  const logs = [...(entry.logs || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (logs.length === 0) return null;

  return (
    <>
      {logs.map((log: LarvaLog, index) => {
        const exchangeRange = getDaysRange(log.date, today());
        const hatchRange = entry.hatchDate ? getDaysRange(entry.hatchDate, log.date || today()) : null;

        return (
          <div key={log.id} className="w-[17rem] sm:w-80 shrink-0 snap-start flex flex-col gap-2">
            <article className="min-w-0 rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex min-w-0 items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1 pr-1">
                  <div className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-widest mb-1">飼育ログ</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-lg text-white bg-emerald-600">{logs.length - index}回目</span>
                    <span className="text-[10px] font-black text-gray-300">{index + 1}/{logs.length}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-black text-emerald-700 leading-none tracking-tighter break-words">
                    {log.weight || 0}<span className="text-[14px] ml-0.5 font-bold">g</span>
                  </div>
                  <div className="text-[10px] font-black text-emerald-400 mt-1">{log.stage || "-"}</div>
                </div>
              </div>

              <div className="text-xs font-bold text-gray-400 break-words mb-3">
                {formatDate(log.date || "")}
              </div>

              <div className="mb-3 flex min-w-0 flex-wrap gap-1.5">
                <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black text-[#FF9800]">
                  交換から{formatRangeDays(exchangeRange)}
                </span>
                {hatchRange && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                    ふ化から{formatRangeDays(hatchRange)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
                  <p className="text-[10px] text-gray-400 font-bold">マット</p>
                  <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">{log.substrate || "-"}</p>
                </div>
                <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
                  <p className="text-[10px] text-gray-400 font-bold">ボトル</p>
                  <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">{log.bottleSize || "-"}</p>
                </div>
                <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
                  <p className="text-[10px] text-gray-400 font-bold">環境</p>
                  <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">水:{log.moisture ?? "-"} / 圧:{log.pressure ?? "-"}</p>
                </div>
                <div className="min-w-0 bg-[#F8F9FA] p-3 rounded-xl border border-gray-50">
                  <p className="text-[10px] text-gray-400 font-bold">温度・性別</p>
                  <p className="text-[11px] font-bold text-gray-600 break-words whitespace-normal">{log.temperature || "-"}℃ / {log.gender || "不明"}</p>
                </div>
              </div>
            </article>
          </div>
        );
      })}
    </>
  );
}
