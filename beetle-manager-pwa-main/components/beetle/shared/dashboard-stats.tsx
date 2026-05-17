"use client";

import { Search } from "lucide-react";
import { EntryType } from "@/types/beetle";

interface DashboardStatsProps {
  stats: {
    adults: number;
    larvae: number;
    spawnSets: number;
    larvaeActive: number;
    larvaeEmerged: number;
    larvaeDeceased: number;
    larvaeSold: number;
    adultsActive: number;
    adultsDeceased: number;
    adultsSold: number;
    spawnSetsActive: number;
  };
  visibleTypes: EntryType[];
  onToggleType: (type: EntryType) => void;
  query: string;
  onQueryChange: (q: string) => void;
  larvaFilter: string;
  onLarvaFilterChange: (f: any) => void;
  adultFilter: string;
  onAdultFilterChange: (f: any) => void;
  spawnSetFilter: string;
  onSpawnSetFilterChange: (f: any) => void;
}

export function DashboardStats({
  stats,
  visibleTypes,
  onToggleType,
  query,
  onQueryChange,
  larvaFilter,
  onLarvaFilterChange,
  adultFilter,
  onAdultFilterChange,
  spawnSetFilter,
  onSpawnSetFilterChange,
}: DashboardStatsProps) {
  const typeThemes: Record<EntryType, { active: string; inactive: string }> = {
    "成虫": {
      active: "bg-orange-500 border-orange-500 text-white shadow-[0_8px_20px_rgba(249,115,22,0.22)] scale-[1.02]",
      inactive: "bg-white/60 border-orange-100 text-orange-700 shadow-sm opacity-50",
    },
    "幼虫": {
      active: "bg-emerald-600 border-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.22)] scale-[1.02]",
      inactive: "bg-white/60 border-emerald-100 text-emerald-700 shadow-sm opacity-50",
    },
    "産卵セット": {
      active: "bg-amber-500 border-amber-500 text-white shadow-[0_8px_20px_rgba(245,158,11,0.22)] scale-[1.02]",
      inactive: "bg-white/60 border-amber-100 text-amber-700 shadow-sm opacity-50",
    },
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button 
          onClick={() => onToggleType("成虫")}
          className={`p-2 rounded-[18px] border transition-all text-left ${visibleTypes.includes("成虫") ? typeThemes["成虫"].active : typeThemes["成虫"].inactive}`}
        >
          <p className="text-[10px] font-black opacity-80 mb-0.5">成虫</p>
          <p className="text-xl font-black leading-none">{stats.adults}<span className="text-xs ml-0.5 font-bold">頭</span></p>
        </button>
        <button 
          onClick={() => onToggleType("幼虫")}
          className={`p-2 rounded-[18px] border transition-all text-left ${visibleTypes.includes("幼虫") ? typeThemes["幼虫"].active : typeThemes["幼虫"].inactive}`}
        >
          <p className="text-[10px] font-black opacity-80 mb-0.5">幼虫</p>
          <p className="text-xl font-black leading-none">{stats.larvae}<span className="text-xs ml-0.5 font-bold">頭</span></p>
        </button>
        <button 
          onClick={() => onToggleType("産卵セット")}
          className={`p-2 rounded-[18px] border transition-all text-left ${visibleTypes.includes("産卵セット") ? typeThemes["産卵セット"].active : typeThemes["産卵セット"].inactive}`}
        >
          <p className="text-[10px] font-black opacity-80 mb-0.5">セット</p>
          <p className="text-xl font-black leading-none">{stats.spawnSets}<span className="text-xs ml-0.5 font-bold">件</span></p>
        </button>
      </div>

      <label className="flex items-center bg-white/90 rounded-[16px] px-4 py-2.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border border-white focus-within:border-[#FF9800] transition-all mb-3">
        <Search size={16} className="text-[#B0A495] mr-2" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="検索..."
          className="flex-1 text-[16px] text-[#4A3F35] outline-none bg-transparent placeholder-[#D7CCC8]"
        />
      </label>

      <div className="mt-2 mb-2">
        {visibleTypes.length === 1 && visibleTypes.includes("幼虫") && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button 
              onClick={() => onLarvaFilterChange("active")}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${larvaFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              飼育中 ({stats.larvaeActive})
            </button>
            <button
              onClick={() => onLarvaFilterChange("emerged")}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${larvaFilter === "emerged" ? "bg-[#795548] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              羽化済み ({stats.larvaeEmerged})
            </button>
            <button 
              onClick={() => onLarvaFilterChange("deceased")}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${larvaFilter === "deceased" ? "bg-[#F4511E] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              死亡 ({stats.larvaeDeceased})
            </button>
            <button 
              onClick={() => onLarvaFilterChange("sold")}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${larvaFilter === "sold" ? "bg-blue-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              販売済み ({stats.larvaeSold})
            </button>
          </div>
        )}

        {visibleTypes.length === 1 && visibleTypes.includes("成虫") && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => onAdultFilterChange("active")} className={`flex-1 min-w-[80px] px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${adultFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>飼育中 ({stats.adultsActive})</button>
            <button onClick={() => onAdultFilterChange("deceased")} className={`flex-1 min-w-[80px] px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${adultFilter === "deceased" ? "bg-[#F4511E] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>死亡 ({stats.adultsDeceased})</button>
            <button onClick={() => onAdultFilterChange("sold")} className={`flex-1 min-w-[80px] px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${adultFilter === "sold" ? "bg-blue-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>販売済み ({stats.adultsSold})</button>
          </div>
        )}

        {visibleTypes.length === 1 && visibleTypes.includes("産卵セット") && (
          <div className="flex gap-1.5">
            <button onClick={() => onSpawnSetFilterChange("active")} className={`flex-1 px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${spawnSetFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>継続中 ({stats.spawnSetsActive})</button>
            <button onClick={() => onSpawnSetFilterChange("finished")} className={`flex-1 px-2 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${spawnSetFilter === "finished" ? "bg-gray-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>終了 ({stats.spawnSets - stats.spawnSetsActive})</button>
          </div>
        )}
      </div>
    </>
  );
}
