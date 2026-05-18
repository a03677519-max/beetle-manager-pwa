"use client";

import { StatusBadge, Stage } from "@/components/ui/status-badge";
import { GrowthBar } from "@/components/ui/growth-bar";
import { buildGenerationLabel } from "@/components/entry-fields";
import type { BeetleEntry, SpawnSet } from "@/types/beetle";
import { getDaysRange, today, getLarvaDateInfo, getSpawnSetDateInfo } from "@/lib/utils";
import { useMemo } from "react";
import Image from "next/image";
import { Edit2, Trash2 } from "lucide-react";

function BloodlineTree({ entry }: { entry: BeetleEntry }) {
  const linkedCount = entry.linkedEntryIds?.length ?? 0;

  if (!entry.bloodline && linkedCount === 0) return null;

  return (
    <div className="mt-2 rounded-2xl border border-orange-100 bg-[#FFFBF7] px-3 py-2 text-[10px] text-[#A67C52] shadow-inner">
      <div className="mb-1 font-black uppercase tracking-wider text-[#D97706]">血統</div>
      <div className="relative pl-3">
        <div className="absolute left-1 top-1 bottom-1 w-px bg-orange-200" />
        {linkedCount > 0 && (
          <div className="relative mb-1 flex min-w-0 items-start gap-2">
            <span className="absolute -left-3 top-2 h-px w-3 bg-orange-200" />
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 font-black text-[#D97706]">親</span>
            <span className="min-w-0 break-words font-bold text-[#8B5A2B]">紐付け {linkedCount}件</span>
          </div>
        )}
        <div className="relative flex min-w-0 items-start gap-2">
          <span className="absolute -left-3 top-2 h-px w-3 bg-orange-200" />
          <span className="shrink-0 rounded-full bg-[#FF9800] px-2 py-0.5 font-black text-white">個体</span>
          <span className="min-w-0 break-words font-bold text-[#4A3F35]">{entry.bloodline || "血統情報未入力"}</span>
        </div>
      </div>
    </div>
  );
}

export function EntryCard({
  entry,
  onOpen,
  onEdit,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  viewMode = "list",
}: {
  entry: BeetleEntry;
  onOpen: (entry: BeetleEntry) => void;
  onEdit?: (e: React.MouseEvent, id: string) => void;
  onDelete?: (e: React.MouseEvent, id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  viewMode?: "list" | "grid";
}) {
  const logs = entry.type === "幼虫" ? entry.logs : [];
  const latestWeight = logs.length > 0 ? logs[0].weight : null;
  const prevWeight = logs.length > 1 ? logs[1].weight : null;
  const weightDiff = latestWeight && prevWeight ? latestWeight - prevWeight : 0;

  // 産卵セットの合計実績を計算
  const spawnTotals = useMemo(() => {
    if (entry.type !== "産卵セット") return null;
    const s = entry as SpawnSet;
    const primaryEggs = Number(s.eggCount || 0);
    const primaryLarvae = Number(s.larvaCount || 0);
    const historyEggs = (s.sets || []).reduce((sum, set) => sum + Number(set.eggCount || 0), 0);
    const historyLarvae = (s.sets || []).reduce((sum, set) => sum + Number(set.larvaCount || 0), 0);
    return { eggs: primaryEggs + historyEggs, larvae: primaryLarvae + historyLarvae };
  }, [entry]);

  // エサ交換アラート（信号機）
  const lastLogDate = logs.length > 0 ? logs[0].date : entry.createdAt;
  const range = getDaysRange(lastLogDate, today());
  
  // 曖昧な日付の場合は「最大日数（最も時間が経過している可能性）」を基準に色を決定し
  // メンテナンスの遅れ（通知の見逃し）を防ぎます。
  const diffDays = range?.max ?? 0;

  let dateColor = "text-[#FF9800]"; // 明るいオレンジ (既に暖色)
  if (diffDays >= 90) dateColor = "text-[#E74C3C]"; // 赤
  else if (diffDays >= 60) dateColor = "text-[#F1C40F]"; // 黄


  const isDeceased = !!(entry as any).deathDate && (entry as any).deathDate !== "-";
  const stageMap: Record<string, Stage> = { "成虫": "成虫", "幼虫": "幼虫", "産卵セット": "卵" };
  const stage = isDeceased ? "死亡" : (stageMap[entry.type] || "卵");

  if (viewMode === "grid") {
    return (
      <article 
        className="flex min-w-0 flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.97] transition-all relative"
        onClick={() => onOpen(entry)}
      >
        {entry.photos[0] && (
          <div className="relative aspect-square w-full">
            <Image src={entry.photos[0]} alt={entry.japaneseName} fill className="object-cover" unoptimized />
            <div className="absolute top-2 right-2">
              <StatusBadge stage={stage} />
            </div>
          </div>
        )}
        <div className="min-w-0 p-3">
          <h3 className="font-bold text-gray-800 text-sm leading-snug break-words whitespace-normal">{entry.japaneseName}</h3>
          <BloodlineTree entry={entry} />
          {entry.type === "産卵セット" && spawnTotals && (
            <div className="flex min-w-0 flex-wrap items-center gap-1 mt-1">
              <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black tracking-tighter">卵:{spawnTotals.eggs}</span>
              <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black tracking-tighter">幼:{spawnTotals.larvae}</span>
            </div>
          )}
          {latestWeight && (
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-1">
              <span className="text-primary font-bold">{latestWeight}g</span>
              <span className={`text-[10px] ${dateColor}`}>あと{Math.max(0, 90 - diffDays)}日</span>
            </div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(e, entry.id); }} className="p-1.5 bg-white/90 text-[#FF9800] rounded-full shadow-sm">
                <Edit2 size={14} />
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(e, entry.id); }} className="p-1.5 bg-black/50 text-white rounded-full">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <article // Keep article
      className={`flex min-w-0 bg-white rounded-[32px] p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] cursor-pointer active:scale-[0.97] transition-all duration-300 select-none touch-manipulation relative overflow-hidden border ${isSelected ? "border-[#FF9800] ring-4 ring-orange-50" : "border-[#F1EDE8]"}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(entry);
      }}
    >
      {isSelectionMode && (
        <div data-selection-drag-handle className="absolute top-4 left-4 z-20 -m-3 p-3 touch-none">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? "bg-[#FF9800] border-[#FF9800]" : "bg-white border-gray-200"}`}>
            {isSelected && <div className="w-2.5 h-1 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />}
          </div>
        </div>
      )}

      {entry.photos[0] && (
        <div className={`relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-[22px] sm:rounded-[24px] overflow-hidden mr-3 sm:mr-5 shadow-inner bg-gray-50 transition-all ${isSelectionMode ? "ml-9 sm:ml-10" : ""}`}>
          <Image src={entry.photos[0]} alt={entry.japaneseName} fill className="object-cover" unoptimized />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 justify-between items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex min-w-0 items-start flex-wrap gap-x-2 gap-y-1 mb-1">
              <h3 className="min-w-0 flex-1 basis-[9rem] text-lg sm:text-xl font-black text-[#3C3631] tracking-tight leading-tight break-words whitespace-normal">{entry.japaneseName}</h3>
              {entry.type === "成虫" && (
                <span className={`shrink-0 text-base font-bold ${entry.gender === "オス" ? "text-blue-500" : entry.gender === "メス" ? "text-pink-500" : "text-gray-400"}`}>
                  {entry.gender === "オス" ? "♂" : entry.gender === "メス" ? "♀" : ""}
                </span>
              )}
              {entry.managementName && <span className="min-w-0 max-w-full text-[10px] font-black bg-[#F9F7F5] px-2 py-0.5 rounded-lg text-[#B0A495] border border-[#E8E2DA] shadow-inner break-words">{entry.managementName}</span>}
            </div>
            <p className="text-[12px] italic text-[#B0A495] font-serif leading-tight break-words whitespace-normal">{entry.scientificName}</p>
            <BloodlineTree entry={entry} />
            {entry.memo && (
              <p className="text-[11px] text-gray-400 mt-1 break-words whitespace-pre-wrap italic">
                {entry.memo}
              </p>
            )}
          </div>
          <StatusBadge stage={stage} className="shrink-0" />
        </div>
        
        <div className="flex min-w-0 flex-col gap-3 mt-3 sm:flex-row sm:justify-between sm:items-end">
          <dl className="min-w-0 text-[13px] text-[#8B7D7B] space-y-1">
            {entry.type === "成虫" && (
              <div className="min-w-0 text-[11px] font-bold text-gray-600 space-y-0.5 mb-1 break-words">
                {entry.size && <div className="break-words"><span className="text-muted">サイズ:</span> {entry.size}mm</div>}
                {entry.emergenceDate && <div className="break-words"><span className="text-muted">{(entry as any).emergenceType === "掘り出し" ? "掘出日" : "羽化日"}:</span> {entry.emergenceDate.replace(/-/g, "/")}</div>}
                {entry.feedingDate && <div className="break-words"><span className="text-muted">後食日:</span> {entry.feedingDate.replace(/-/g, "/")}</div>}
                {(entry as any).deathDate && <div className="text-red-500 break-words"><span className="text-muted">死亡日:</span> {(entry as any).deathDate.replace(/-/g, "/")}</div>}
              </div>
            )}
            {entry.type === "幼虫" && logs[0] && (
              <div className="min-w-0 text-[11px] font-bold text-gray-600 bg-gray-50/80 p-2 rounded-xl mb-2 border border-gray-100">
                <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-0.5 mb-0.5">
                  <span className="min-w-0 break-words">{logs[0].substrate}</span>
                  <span className="shrink-0">{logs[0].bottleSize}</span>
                </div>
                <div className="text-[9px] text-gray-400 font-normal leading-snug break-words">
                  水:{logs[0].moisture} 圧:{logs[0].pressure} 温:{logs[0].temperature || "-"}℃ ステージ:{logs[0].stage}
                </div>
              </div>
            )}
            {entry.type === "幼虫" && (entry as any).deathDate && (
              <div className="text-[11px] font-bold text-red-500 mb-1 break-words">
                <span className="text-muted">死亡日:</span> {(entry as any).deathDate.replace(/-/g, "/")}
              </div>
            )}
            <div className="break-words">
              <span className="text-muted">産地:</span> {entry.locality || "-"}
            </div>
            <div className="break-words">
              <span className="text-muted">累代:</span> {buildGenerationLabel(entry.generation)}
            </div>
            {(entry.type === "幼虫" || entry.type === "産卵セット") && (
              <div className="break-words">
                {(() => {
                  const { label, value } = entry.type === "幼虫" 
                    ? getLarvaDateInfo(entry) 
                    : getSpawnSetDateInfo(entry);
                  return <><span className="text-muted">{label}:</span> {value}</>;
                })()}
              </div>
            )}
            <div className={`text-[11px] font-bold mt-1 break-words ${dateColor}`}>
              {range 
                ? (range.min === range.max ? `${range.min}日前に交換` : `${range.min}〜${range.max}日前に交換`)
                : "今日交換"}
            </div>
          </dl>
          
          {latestWeight && (
            <div className="w-full text-right flex-shrink-0 sm:w-auto sm:ml-2">
              <div className="flex flex-row items-end justify-between gap-3 sm:flex-col sm:items-end">
                <div className="text-2xl font-black text-[#FF9800] leading-none tracking-tighter break-words">
                  {latestWeight}<span className="text-[14px] ml-0.5 font-bold">g</span>
                </div>
                <div className="mt-1.5 h-[14px]">
                  {weightDiff !== 0 && (
                    <span className={`text-[12px] font-bold whitespace-nowrap ${weightDiff > 0 ? 'text-[#E74C3C]' : 'text-[#FB8C00]'}`}>
                      {weightDiff > 0 ? `+${weightDiff}g` : `${weightDiff}g`} {weightDiff > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
              <GrowthBar weight={latestWeight} /> {/* Keep GrowthBar */}
            </div>
          )}

          {entry.type === "産卵セット" && spawnTotals && (
            <div className="w-full text-right flex-shrink-0 sm:w-auto sm:ml-2">
              <div className="flex flex-col items-end">
                <div className="text-2xl font-black text-[#EF6C00] leading-none tracking-tighter break-words">
                  {spawnTotals.eggs + spawnTotals.larvae}<span className="text-[14px] ml-0.5 font-bold">匹</span>
                </div>
                <div className="text-[10px] font-black text-orange-400 mt-1 uppercase tracking-tighter break-words">
                  卵:{spawnTotals.eggs} / 幼:{spawnTotals.larvae}
                </div>
              </div>
            </div>
          )}
        </div>

        {(onEdit || onDelete) && !isSelectionMode && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-gray-50 pt-3">
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(e, entry.id); }} className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1.5 text-[10px] font-black text-[#FF9800] shadow-sm active:scale-95">
                <Edit2 size={14} /> 再編集
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(e, entry.id); }} className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-500 shadow-sm active:scale-95">
                <Trash2 size={14} /> 削除
              </button>
            )}
          </div>
        )}

        {/* スパイクライン */}
        {logs.length > 1 && (
          <div className="absolute right-4 bottom-16 w-24 h-8 opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 40" className="w-full h-full">
              <path // Keep path
                d={`M ${logs.slice(0, 5).reverse().map((l, i) => `${(i * 25)},${40 - (l.weight / 50 * 30)}`).join(' L ')}`}
                fill="none"
                stroke="#FF9800"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </div>
    </article>
  );
}
