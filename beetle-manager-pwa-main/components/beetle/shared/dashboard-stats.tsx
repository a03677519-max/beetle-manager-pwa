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
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button 
          onClick={() => onToggleType("成虫")}
          className={`p-2 rounded-[18px] border transition-all text-left ${visibleTypes.includes("成虫") ? "bg-[#FF9800] border-[#FF9800] text-white shadow-[0_8px_20px_rgba(255,152,0,0.2)] scale-[1.02]" : "bg-white/60 border-white/80 text-[#4A3F35] shadow-sm opacity-50"}`}
        >
          <p className="text-[10px] font-black opacity-80 mb-0.5">成虫</p>
          <p className="text-xl font-black leading-none">{stats.adults}<span className="text-xs ml-0.5 font-bold">頭</span></p>
        </button>
        <button 
          onClick={() => onToggleType("幼虫")}
          className={`p-2 rounded-[18px] border transition-all text-left ${visibleTypes.includes("幼虫") ? "bg-[#FF9800] border-[#FF9800] text-white shadow-[0_8px_20px_rgba(255,152,0,0.2)] scale-[1.02]" : "bg-white/60 border-white/80 text-[#4A3F35] shadow-sm opacity-50"}`}
        >
          <p className="text-[10px] font-black opacity-80 mb-0.5">幼虫</p>
          <p className="text-xl font-black leading-none">{stats.larvae}<span className="text-xs ml-0.5 font-bold">頭</span></p>
        </button>
        <button 
          onClick={() => onToggleType("産卵セット")}
          className={`p-2 rounded-[18px] border transition-all text-left ${visibleTypes.includes("産卵セット") ? "bg-[#FF9800] border-[#FF9800] text-white shadow-[0_8px_20px_rgba(255,152,0,0.2)] scale-[1.02]" : "bg-white/60 border-white/80 text-[#4A3F35] shadow-sm opacity-50"}`}
        >
          <p className="text-[10px] font-black opacity-80 mb-0.5">セット</p>
          <p className="text-xl font-black leading-none">{stats.spawnSets}<span className="text-xs ml-0.5 font-bold">件</span></p>
        </button>
      </div>

      <label className="flex items-center bg-white/90 rounded-[16px] px-4 py-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border border-white focus-within:border-[#FF9800] transition-all mb-3">
        <Search size={16} className="text-[#B0A495] mr-2" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="検索..."
          className="flex-1 text-sm text-[#4A3F35] outline-none bg-transparent placeholder-[#D7CCC8]"
        />
      </label>

      <div className="mt-4">
        {visibleTypes.length === 1 && visibleTypes.includes("幼虫") && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button 
              onClick={() => onLarvaFilterChange("active")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              飼育中 ({stats.larvaeActive})
            </button>
            <button 
              onClick={() => onLarvaFilterChange("emerged")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "emerged" ? "bg-[#795548] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              羽化済み ({stats.larvaeEmerged})
            </button>
            <button 
              onClick={() => onLarvaFilterChange("deceased")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "deceased" ? "bg-[#F4511E] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              死亡 ({stats.larvaeDeceased})
            </button>
            <button 
              onClick={() => onLarvaFilterChange("sold")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "sold" ? "bg-blue-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
            >
              販売済み ({stats.larvaeSold})
            </button>
          </div>
        )}

        {visibleTypes.length === 1 && visibleTypes.includes("成虫") && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button onClick={() => onAdultFilterChange("active")} className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${adultFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>飼育中 ({stats.adultsActive})</button>
            <button onClick={() => onAdultFilterChange("deceased")} className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${adultFilter === "deceased" ? "bg-[#F4511E] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>死亡 ({stats.adultsDeceased})</button>
            <button onClick={() => onAdultFilterChange("sold")} className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${adultFilter === "sold" ? "bg-blue-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>販売済み ({stats.adultsSold})</button>
          </div>
        )}

        {visibleTypes.length === 1 && visibleTypes.includes("産卵セット") && (
          <div className="flex gap-2">
            <button onClick={() => onSpawnSetFilterChange("active")} className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${spawnSetFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>継続中 ({stats.spawnSetsActive})</button>
            <button onClick={() => onSpawnSetFilterChange("finished")} className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${spawnSetFilter === "finished" ? "bg-gray-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}>終了 ({stats.spawnSets - stats.spawnSetsActive})</button>
          </div>
        )}
      </div>
    </>
  );
}