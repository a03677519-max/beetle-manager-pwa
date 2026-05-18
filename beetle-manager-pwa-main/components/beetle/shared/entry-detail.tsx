"use client";

import { motion } from "framer-motion";
import { X, Edit2, Copy, Trash2, FileSpreadsheet, Network } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BeetleEntry } from "@/types/beetle";
import { AdultDetail } from "@/components/beetle/adult/adult-detail";
import { LarvaDetail } from "@/components/beetle/larva/larva-detail";
import { SpawnSetDetail } from "@/components/beetle/spawn-set/spawn-set-detail";
import { PhotoSection } from "@/components/beetle/shared/photo-section";
import { useBeetleStore } from "@/store/use-beetle-store";
import { buildGenerationLabel } from "@/components/entry-fields";

export function EntryDetail({
  entry,
  onClose,
  onFetchTemperature,
  isFetchingTemperature,
  onAddSecondSet,
  onDeleteSet,
  onEditSet,
}: {
  entry: BeetleEntry;
  onClose: () => void;
  onFetchTemperature: (setter: (value: string) => void) => void;
  isFetchingTemperature: boolean;
  onAddSecondSet?: () => void;
  onDeleteSet?: (setId: string) => void;
  onEditSet?: (set: any) => void;
}) {
  const startEditing = useBeetleStore((state) => state.startEditing);
  const deleteEntry = useBeetleStore((state) => state.deleteEntry);
  const entries = useBeetleStore((state) => state.entries);
  const linkedEntries = entries.filter((item) => entry.linkedEntryIds?.includes(item.id));

  const copyToClipboard = () => {
    const e = entry as any;
    const fmtDate = (d: string) => (d || "").replace(/-/g, "/");
    
    let text = `和名 ${e.japaneseName}\n`;
    text += `学名 ${e.scientificName}\n`;
    text += `産地 ${e.locality || ""}\n`;
    
    const displayDate = e.hatchDate || e.setDate || e.createdAt || "";
    text += `累代 ${buildGenerationLabel(e.generation)} ${e.managementName || ""} ${fmtDate(displayDate)}`.trimEnd() + "\n";
    
    text += `\n`;
    
    const logs = (e.type === "幼虫" ? e.logs : []).slice(0, 4);
    for (let i = 0; i < 4; i++) {
      if (logs[i]) {
        const log = logs[i];
        text += `${fmtDate(log.date)} ${log.substrate || ""} 水${log.moisture || 0}圧${log.pressure || 0} ${log.bottleSize || ""} ${log.stage || ""} ${log.gender || ""}\n`;
      } else {
        text += `\n`;
      }
    }
    
    const eDate = e.actualEmergenceDate || e.emergenceDate || "";
    const fDate = e.feedingDate || "";
    const eType = e.emergenceType || "羽化";
    
    const emergencePart = eDate ? `${fmtDate(eDate)} ${eType}` : "　　　　　　　羽化";
    const feedingPart = fDate ? `${fmtDate(fDate)} 後食` : "　　　　　　　後食";
    text += `${emergencePart} ${feedingPart}`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert("データをコピーしました");
    }).catch(() => {
      alert("コピーに失敗しました");
    });
  };

  const copyToExcel = () => {
    const e = entry as any;
    const fmtDate = (d: string) => (d || "").replace(/-/g, "/");
    
    // 種別に応じた計測値の抽出
    let measurement = "";
    if (e.type === "幼虫" && e.logs && e.logs.length > 0) {
      measurement = `${e.logs[0].weight}g`;
    } else if (e.type === "成虫") {
      measurement = e.size ? `${e.size}mm` : "";
    }

    // コピーする項目とその順番の定義
    const columns = [
      { header: "管理名", value: e.managementName || "" },
      { header: "和名", value: e.japaneseName },
      { header: "学名", value: e.scientificName },
      { header: "累代", value: buildGenerationLabel(e.generation) },
      { header: "種別", value: e.type },
      { header: "孵化/開始日", value: fmtDate(e.hatchDate || e.setDate) },
      { header: "羽化日", value: fmtDate(e.emergenceType === "羽化" ? (e.actualEmergenceDate || e.emergenceDate) : "") },
      { header: "掘出日", value: fmtDate(e.extractionDate || (e.emergenceType === "掘り出し" ? (e.actualEmergenceDate || e.emergenceDate) : "")) },
      { header: "計測値", value: measurement },
      { header: "温度", value: e.temperature || "" },
      { header: "水分", value: e.moisture || "" },
      { header: "詰圧", value: e.pressure || "" },
      { header: "容器サイズ", value: e.containerSize || "" },
      { header: "メモ", value: (e.memo || "").replace(/\n/g, " ") },
    ];

    // 飼育ログ（交換履歴）を古い順に横並びで追加
    const logs = [...(e.logs || [])].reverse();
    logs.forEach((log, index) => {
      const num = index + 1;
      columns.push(
        { header: `履歴${num}_日付`, value: fmtDate(log.date) },
        { header: `履歴${num}_体重`, value: log.weight ? `${log.weight}g` : "" },
        { header: `履歴${num}_ステージ`, value: log.stage || "" },
        { header: `履歴${num}_マット`, value: log.substrate || "" },
        { header: `履歴${num}_ボトル`, value: log.bottleSize || "" },
        { header: `履歴${num}_温度`, value: log.temperature || "" },
        { header: `履歴${num}_水分`, value: log.moisture || "" },
        { header: `履歴${num}_詰圧`, value: log.pressure || "" }
      );
    });

    // 産卵セットの2回目履歴がある場合に追加
    if (e.type === "産卵セット" && e.secondSetDate) {
      columns.push(
        { header: "セット2_開始日", value: fmtDate(e.secondSetDate) },
        { header: "セット2_割出日", value: fmtDate(e.secondSetEndDate) },
        { header: "セット2_卵数", value: e.secondEggCount ?? "" },
        { header: "セット2_幼虫数", value: e.secondLarvaCount ?? "" },
        { header: "セット2_マット", value: e.secondSubstrate || e.substrate || "" },
        { header: "セット2_容器", value: e.secondContainerSize || e.containerSize || "" },
        { header: "セット2_詰圧", value: e.secondPressure || e.pressure || "" },
        { header: "セット2_水分", value: e.secondMoisture ?? e.moisture ?? "" }
      );
    }

    const headers = columns.map(c => c.header).join("\t");
    const row = columns.map(c => c.value).join("\t");
    const text = headers + "\n" + row;
    
    navigator.clipboard.writeText(text).then(() => {
      alert("Excel形式でコピーしました");
    }).catch(() => {
      alert("コピーに失敗しました");
    });
  };

  const handleDelete = () => {
    if (window.confirm("この個体データを削除してもよろしいですか？")) {
      deleteEntry(entry.id);
      onClose();
    }
  };

  return (
    <motion.div className="fixed inset-0 z-90 flex flex-col justify-end pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-xl pointer-events-auto" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 450, mass: 0.8 }}
        className="bg-white rounded-t-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] h-[90dvh] z-10 w-full max-w-md mx-auto overscroll-contain pointer-events-auto flex min-w-0 flex-col overflow-hidden"
      >
        <div className="flex min-w-0 justify-between items-start gap-3 p-6 sticky top-0 bg-white/90 backdrop-blur-sm z-10 min-h-[72px] border-b border-gray-50 shrink-0">
          <div className="min-w-0 flex-1 text-left">
            <h2 className="text-[18px] font-bold leading-tight text-[#4A3F35] break-words whitespace-normal">{entry.japaneseName}</h2>
            <p className="text-[12px] font-serif italic leading-snug text-gray-400 break-words whitespace-normal">{entry.scientificName}</p>
            {entry.bloodline && <p className="mt-1 text-[11px] font-black text-[#FF9800] break-words">血統: {entry.bloodline}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button 
              type="button" 
              className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-green-600 transition-colors" 
              onClick={copyToExcel}
              title="Excel形式でコピー"
            >
              <FileSpreadsheet size={18} />
            </button>
            <button 
              type="button" 
              className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-blue-500 transition-colors" 
              onClick={copyToClipboard}
              title="テキストをコピー"
            >
              <Copy size={18} />
            </button>
            <button 
              type="button" 
              className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-colors" 
              onClick={handleDelete}
              title="削除"
            >
              <Trash2 size={18} />
            </button>
            <button 
              type="button" 
              className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-[#FF9800] transition-colors" 
              onClick={() => { startEditing(entry.id); }}
            >
              <Edit2 size={18} />
            </button>
            <button type="button" className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-6 scroll-smooth [overflow-wrap:anywhere]">
          <PhotoSection entry={entry} />

          {(entry.bloodline || linkedEntries.length > 0) && (
            <section className="mt-5 rounded-[24px] border border-[#F1EDE8] bg-[#FFFBF7] p-4 shadow-inner">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#A67C52]">
                <Network size={15} className="text-[#FF9800]" /> 血統 / 家系図
              </div>
              {linkedEntries.length > 0 ? (
                <div className="space-y-2">
                  {linkedEntries.map((linked) => (
                    <button
                      key={linked.id}
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('app:navigate-entry', { detail: { id: linked.id } }))}
                      className="w-full rounded-2xl bg-white px-3 py-2 text-left border border-white shadow-sm active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 rounded-full bg-[#FF9800]/10 px-2 py-0.5 text-[10px] font-black text-[#FF9800]">親/関連</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#4A3F35] break-words">{linked.managementName || linked.japaneseName}</div>
                          <div className="text-[10px] text-gray-400 break-words">{linked.bloodline || linked.locality || "血統情報未入力"}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="rounded-2xl bg-[#FF9800]/5 px-3 py-2 border border-[#FF9800]/10">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 rounded-full bg-[#FF9800] px-2 py-0.5 text-[10px] font-black text-white">当個体</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#4A3F35] break-words">{entry.managementName || entry.japaneseName}</div>
                        <div className="text-[10px] text-[#A67C52] break-words">{entry.bloodline || "血統情報未入力"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-bold text-[#4A3F35] break-words">{entry.bloodline}</p>
              )}
            </section>
          )}

          <div className="mt-6">
            {entry.type === "成虫" ? <AdultDetail entry={entry} /> : null}
            {entry.type === "幼虫" ? (
              <LarvaDetail
                entry={entry}
                onFetchTemperature={onFetchTemperature}
                isFetchingTemperature={isFetchingTemperature}
              />
            ) : null}
            {entry.type === "産卵セット" ? (
              <SpawnSetDetail 
                entry={entry} 
                allEntries={useBeetleStore((state) => state.entries)}
                onAddSecondSet={onAddSecondSet || (() => {})} 
                onDeleteSet={onDeleteSet || (() => {})}
                onEditSet={onEditSet || (() => {})}
              />
            ) : null}
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}
