"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Edit2, MessageSquareText } from "lucide-react";
import { buildGenerationLabel } from "@/components/entry-fields";
import type { BeetleEntry, SpawnSet, SpawnSetFormValues } from "@/types/beetle";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { SpawnSetSecondForm } from "./spawn-set-second-form";
import { useBeetleStore, emptySpawnSetForm } from "@/store/use-beetle-store";
import { createId, today } from "@/types/utils";

export function SpawnSetDetail({ 
  entry, 
  allEntries,
}: { 
  entry: SpawnSet; 
  allEntries: BeetleEntry[];
}) {
  const [expandedMemos, setExpandedMemos] = useState<Record<string, boolean>>({});
  const [isSecondFormOpen, setIsSecondFormOpen] = useState(false);
  const [editingChildSet, setEditingChildSet] = useState<any>(null); // 産卵セットの2回目以降の編集用
  const updateSpawnSet = useBeetleStore((state) => state.updateSpawnSet);

  const toggleMemo = (id: string) => {
    setExpandedMemos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const s = entry as any;
  // 1回目のセットと2回目以降（sets配列）を統合
  const rawSets = [
    {
      id: "primary",
      title: "1回目",
      setDate: s.setDate || s.createdAt?.slice(0, 10),
      setEndDate: s.setEndDate,
      eggCount: s.eggCount ?? 0,
      larvaCount: s.larvaCount ?? 0,
      substrate: s.substrate,
      containerSize: s.containerSize,
      pressure: s.pressure,
      moisture: s.moisture,
      memo: s.memo,
    },
    ...(s.sets || []).map((set: any, i: number) => ({ ...set, title: `${i + 2}回目` })) // sets配列の各要素にtitleを追加
  ].sort((a, b) => (a.setDate || "").localeCompare(b.setDate || "")); // 日付の昇順（古い順）

  // 前回のセット方法を引き継ぐ処理
  const allSets: any[] = [];
  let lastSetup = { substrate: "", containerSize: "", pressure: "", moisture: 3 };

  rawSets.forEach((set) => {
    const processedSet = { ...set };
    if (!processedSet.substrate) processedSet.substrate = lastSetup.substrate; else lastSetup.substrate = processedSet.substrate;
    if (!processedSet.containerSize) processedSet.containerSize = lastSetup.containerSize; else lastSetup.containerSize = processedSet.containerSize;
    if (processedSet.pressure === undefined || processedSet.pressure === "") processedSet.pressure = lastSetup.pressure; else lastSetup.pressure = processedSet.pressure;
    if (processedSet.moisture === undefined || processedSet.moisture === "") processedSet.moisture = lastSetup.moisture; else lastSetup.moisture = processedSet.moisture;
    allSets.push(processedSet);
  });

  // 表示用に日付の降順（新しい順）にソート
  allSets.sort((a, b) => (b.setDate || "").localeCompare(a.setDate || ""));

  // 全回転の合計を計算
  const totals = allSets.reduce(
    (acc, set) => {
      acc.eggs += Number(set.eggCount || 0);
      acc.larvae += Number(set.larvaCount || 0);
      return acc;
    },
    { eggs: 0, larvae: 0 }
  );

  const handleAddSecondSet = useCallback(() => {
    setEditingChildSet(null); // 新規追加なので編集対象はクリア
    setIsSecondFormOpen(true);
  }, []);

  const handleEditSet = useCallback((set: any) => {
    // 1回目のセットを編集する場合
    if (set.id === "primary") {
      setEditingChildSet({
        ...entry, // entryの全プロパティを渡す
        id: "primary", // IDをprimaryとして識別
        setDate: entry.setDate,
        setEndDate: entry.setEndDate,
        eggCount: entry.eggCount,
        larvaCount: entry.larvaCount,
        substrate: entry.substrate,
        containerSize: entry.containerSize,
        pressure: entry.pressure,
        moisture: entry.moisture,
        temperature: entry.temperature,
        cohabitation: entry.cohabitation,
        memo: entry.memo,
      });
    } else {
      setEditingChildSet({ ...set, parentId: entry.id }); // 親IDも渡す
    }
    setIsSecondFormOpen(true);
  }, [entry]);

  const handleDeleteSet = useCallback((setId: string) => {
    if (!window.confirm("この記録を削除しますか？")) return;

    const s = entry as any;
    if (setId === "primary") {
      // 1回目のセット（基本フィールド）をクリア
      updateSpawnSet(entry.id, {
        ...s,
        setDate: "", setEndDate: "", eggCount: 0, larvaCount: 0,
        substrate: "", containerSize: "", pressure: "", moisture: 3,
        temperature: "", cohabitation: "なし", memo: "",
      });
    } else {
      // sets配列から削除
      const updatedSets = (s.sets || []).filter((set: any) => set.id !== setId);
      updateSpawnSet(entry.id, { ...s, sets: updatedSets });
    }
  }, [entry, updateSpawnSet]);

  const handleSecondFormSubmit = useCallback((submittedSet: SpawnSetFormValues) => {
    let updatedSets;
    const { parentId, sets, useDifferentMethod, ...cleanSet } = submittedSet as any; // Remove useDifferentMethod as it's a UI flag

    if (cleanSet.id === "primary") {
      // 1回目のセットの編集の場合、SpawnSetSecondFormから受け取った値を直接entryに適用
      updateSpawnSet(entry.id, {
        ...entry,
        setDate: cleanSet.setDate,
        setEndDate: cleanSet.setEndDate,
        eggCount: cleanSet.eggCount,
        larvaCount: cleanSet.larvaCount,
        substrate: cleanSet.substrate,
        containerSize: cleanSet.containerSize,
        pressure: cleanSet.pressure,
        moisture: cleanSet.moisture,
        temperature: cleanSet.temperature,
        cohabitation: cleanSet.cohabitation,
        memo: cleanSet.memo,
      } as any);
    }
    else if (editingChildSet && editingChildSet.id) { // Editing an existing child set
      updatedSets = (entry.sets || []).map((s: any) => s.id === submittedSet.id ? { ...cleanSet, id: s.id } : s);
    } else { // New addition
      updatedSets = [...(entry.sets || []), { ...cleanSet, id: createId() }];
    }
    
    // 日付でソート
    if (cleanSet.id !== "primary") { // primaryセットはソート対象外
      updatedSets.sort((a: any, b: any) => (a.setDate || "").localeCompare(b.setDate || ""));
      updateSpawnSet(entry.id, { ...entry, sets: updatedSets } as any);
    }
    setIsSecondFormOpen(false);
    setEditingChildSet(null);
  }, [entry, editingChildSet, updateSpawnSet]);

  return (
    <div className="space-y-4">
      {/* 合計成績のサマリー */}
      <div className="bg-[#FF9800]/5 border border-[#FF9800]/10 rounded-2xl p-4 flex justify-around items-center shadow-sm">
        <div className="text-center">
          <div className="text-[10px] font-black text-[#EF6C00] uppercase tracking-widest mb-1">合計卵数</div>
          <div className="text-2xl font-black text-[#EF6C00]">{totals.eggs}<span className="text-xs ml-0.5">個</span></div>
        </div>
        <div className="w-px h-8 bg-[#FF9800]/20" />
        <div className="text-center">
          <div className="text-[10px] font-black text-[#EF6C00] uppercase tracking-widest mb-1">合計幼虫数</div>
          <div className="text-2xl font-black text-[#EF6C00]">{totals.larvae}<span className="text-xs ml-0.5">頭</span></div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="font-black text-gray-700">産卵セット履歴</h3>
        <button onClick={handleAddSecondSet} className="relative z-0 bg-[#FF9800] text-white p-1 rounded-full shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
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
      </div>
    </div>
  );
}
