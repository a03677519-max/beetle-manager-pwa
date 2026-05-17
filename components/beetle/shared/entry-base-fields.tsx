"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Link as LinkIcon } from "lucide-react";
import { Field, GenerationRollField, BottomSheetInput } from "@/components/entry-fields";
import { today } from "@/types/utils";
import type { AdultFormValues, BeetleEntry } from "@/types/beetle";

export function EntryBaseFields({
  managementName,
  japaneseName,
  scientificName,
  locality,
  generation,
  linkedEntryIds = [],
  allEntries,
  autoNumberingDate,
  generationLabelSuffix,
  onNext,
  onChange,
}: {
  managementName: string;
  japaneseName: string;
  scientificName: string;
  locality: string;
  generation: AdultFormValues["generation"];
  linkedEntryIds?: string[];
  generationLabelSuffix?: string;
  onNext?: () => void;
  allEntries: BeetleEntry[];
  autoNumberingDate?: string;
  onChange: (patch: {
    managementName?: string;
    japaneseName?: string;
    scientificName?: string;
    locality?: string;
    generation?: AdultFormValues["generation"];
    linkedEntryIds?: string[];
  }) => void;
}) {
  const [isLinkedSelectOpen, setIsLinkedSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いた時に検索窓に自動フォーカス
  useEffect(() => {
    if (isLinkedSelectOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isLinkedSelectOpen]);

  const handleAutoNumbering = () => {
    const basePrefix = managementName?.split("_")[0] || "A";
    let dateVal = autoNumberingDate || today();
    let parts = dateVal.split("-");

    if (parts.length < 3 || parts.some((p) => !p || p === "-")) {
      const now = new Date();
      parts = [String(now.getFullYear()), String(now.getMonth() + 1), String(now.getDate())];
    }

    const [year, month, day] = parts;
    const yy = year.slice(-2);
    const m = parseInt(month, 10) || 1;
    const ddNum = parseInt(day, 10);
    const dd = isNaN(ddNum) ? day : day.padStart(2, "0");
    const dateStr = `${yy}${m}${dd}`;

    const prefixMatch = `${basePrefix}_`;
    const numbers = allEntries
      .filter(
        (entry) =>
          entry.japaneseName === japaneseName &&
          entry.scientificName === scientificName &&
          entry.managementName?.startsWith(prefixMatch)
      )
      .map((entry) => {
        const parts = entry.managementName!.split("_");
        return parseInt(parts[parts.length - 1], 10);
      })
      .filter((number) => !isNaN(number));

    const nextNum = Math.max(0, ...numbers) + 1;
    const numStr = nextNum === 1 ? "01" : String(nextNum);

    onChange({ managementName: `${basePrefix}_${dateStr}_${numStr}` });
  };

  const suggestions = useMemo(() => {
    const jSet = new Set<string>();
    const sSet = new Set<string>();
    const lSet = new Set<string>();
    const mSet = new Set<string>();

    // 文脈フィルタリング: 入力済みの名前と関連のある個体のみを抽出
    const contextEntries = allEntries.filter(e => 
      (!japaneseName || e.japaneseName === japaneseName) && 
      (!scientificName || e.scientificName === scientificName)
    );

    (contextEntries.length > 0 ? contextEntries : allEntries).forEach((entry) => {
      if (entry.japaneseName) jSet.add(entry.japaneseName);
      if (entry.scientificName) sSet.add(entry.scientificName);
      if (entry.locality) lSet.add(entry.locality);
      // 管理名は数値部分を除去してサジェスト
      if (entry.managementName) mSet.add(entry.managementName.replace(/[- ]\d+$/, ""));
    });
    return {
      japanese: Array.from(jSet).sort(),
      scientific: Array.from(sSet).sort(),
      locality: Array.from(lSet).sort(),
      management: Array.from(mSet).filter(v => v.length > 0).sort(),
    };
  }, [allEntries, japaneseName, scientificName]);

  const filteredEntries = useMemo(() => {
    const matched = allEntries.filter(e => !scientificName || e.scientificName === scientificName);
    if (!searchQuery) return matched;
    const q = searchQuery.toLowerCase();
    return matched.filter(e => 
      e.japaneseName.toLowerCase().includes(q) || 
      (e.managementName || "").toLowerCase().includes(q)
    );
  }, [allEntries, scientificName, searchQuery]);

  const selectedLinkedEntries = useMemo(() => allEntries.filter(e => linkedEntryIds.includes(e.id)), [allEntries, linkedEntryIds]);

  const japaneseToScientificMap = useMemo(() => {
    const map = new Map<string, string>();
    allEntries.forEach((entry) => {
      if (entry.japaneseName && entry.scientificName) {
        map.set(entry.japaneseName, entry.scientificName);
      }
    });
    return map;
  }, [allEntries]);

  const handleJapaneseNameChange = (val: string) => {
    const patch: any = { japaneseName: val };
    
    const relatedEntries = allEntries.filter(e => e.japaneseName === val);
    if (!scientificName && relatedEntries.length > 0) {
      const sciNames = Array.from(new Set(relatedEntries.map(e => e.scientificName).filter(Boolean)));
      if (sciNames.length === 1) patch.scientificName = sciNames[0];
    }

    if (!locality && relatedEntries.length > 0) {
      const localities = Array.from(new Set(relatedEntries.map(e => e.locality).filter(Boolean)));
      if (localities.length === 1) patch.locality = localities[0];
    }

    onChange(patch);
  };

  return (
    <>
      <div className="flex justify-end px-1 -mb-1">
        <button
          type="button"
          onClick={handleAutoNumbering}
          className="flex items-center gap-1 px-3 py-1 bg-[#FF9800]/10 text-[#FF9800] rounded-full text-[11px] font-bold border border-[#FF9800]/20 active:scale-95 transition-all"
        >
          一括採番
        </button>
      </div>
      <BottomSheetInput
        label="管理名 (No/名前)"
        value={managementName || ""}
        placeholder="例: P-01 / L-24-01"
        suggestions={suggestions.management}
        onNext={onNext}
        onChange={(val) => onChange({ managementName: val })}
      />
      <BottomSheetInput
        label="和名"
        value={japaneseName}
        placeholder="和名を入力"
        suggestions={suggestions.japanese}
        onNext={onNext}
        onChange={handleJapaneseNameChange}
      />
      <BottomSheetInput
        label="学名"
        value={scientificName}
        placeholder="学名を入力"
        suggestions={suggestions.scientific}
        onNext={onNext}
        onChange={(val) => onChange({ scientificName: val })}
      />
      <BottomSheetInput
        label="産地"
        value={locality}
        placeholder="産地を入力"
        suggestions={suggestions.locality}
        onNext={onNext}
        onChange={(val) => onChange({ locality: val })}
      />
      <GenerationRollField
        value={generation}
        labelSuffix={generationLabelSuffix}
        onChange={(value) => onChange({ generation: value })}
      />
      <Field label="紐付け個体 (親個体/ペア)">
        <button
          type="button"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-left flex justify-between items-center active:bg-gray-50 transition-all border-dashed"
          onClick={() => setIsLinkedSelectOpen(true)}
        > {/* Keep button */}
          <div className="flex items-center gap-2 overflow-hidden">
            <LinkIcon size={14} className={selectedLinkedEntries.length > 0 ? "text-[#FF9800]" : "text-gray-300"} />
            <span className={`truncate ${selectedLinkedEntries.length > 0 ? "text-gray-800 font-bold" : "text-gray-300"}`}>
              {selectedLinkedEntries.length > 0 
                ? selectedLinkedEntries.map(e => `${e.japaneseName}${e.managementName ? `[${e.managementName}]` : ""}`).join(", ")
                : "タップして個体を選択"}
            </span>
          </div>
        </button>
      </Field>

      <AnimatePresence>
        {isLinkedSelectOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
              onClick={() => setIsLinkedSelectOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-6 shadow-2xl z-10 flex flex-col max-h-[85dvh] pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-[#4A3F35]">紐付け個体の選択</h3>
                <button onClick={() => setIsLinkedSelectOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                  <X size={18} />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="名前や管理名で検索..."
                  value={searchQuery} // Keep value
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 bg-gray-50 rounded-2xl pl-11 pr-4 text-sm font-bold outline-none border border-transparent focus:border-[#FF9800]/20 transition-all"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <button
                  type="button"
                  className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${linkedEntryIds.length === 0 ? "bg-[#FF9800] text-white" : "bg-gray-50 text-gray-500"}`}
                  onClick={() => { onChange({ linkedEntryIds: [] }); setIsLinkedSelectOpen(false); }} // Keep onClick
                >
                  なし (紐付け解除)
                </button>
                {filteredEntries.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={`w-full text-left p-4 rounded-2xl font-bold flex flex-col ${linkedEntryIds.includes(e.id) ? "bg-[#FF9800] text-white" : "bg-gray-50 text-gray-700"}`} // Keep class
                    onClick={() => {
                      const isSelected = linkedEntryIds.includes(e.id);
                      const nextIds = isSelected 
                        ? linkedEntryIds.filter(id => id !== e.id)
                        : [...linkedEntryIds, e.id];
                      
                      const patch: any = { linkedEntryIds: nextIds };
                      if (!isSelected && nextIds.length === 1) {
                        const nextGen = { ...e.generation };
                        if (nextGen.primary === "WD") { nextGen.primary = "WF" as any; nextGen.count = "1"; }
                        else { nextGen.count = String((parseInt(nextGen.count) || 0) + 1); }
                        patch.locality = e.locality;
                        patch.generation = nextGen;
                      }
                      onChange(patch);
                    }}
                  >
                    <span className="text-sm">{e.japaneseName}</span>
                    <span className="text-[10px] opacity-70">
                      {e.managementName || "管理名なし"} / {e.locality || "産地不明"}
                      {(e.type === "成虫" && (e as any).emergenceDate) && ` / 羽化:${(e as any).emergenceDate}`}
                      {(e.type === "成虫" && (e as any).gender) && ` / 性別:${(e as any).gender}`}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
