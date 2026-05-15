"use client";

import { motion } from "framer-motion";
import { X, Settings, Database, Cloud, ArrowUpDown, History, FileText } from "lucide-react";
import { useBeetleStore } from "@/store/use-beetle-store";
import { BottomSheetInput, BottomSheetSelect } from "@/components/entry-fields";
import { ManagementNameFormat, ENTRY_TYPES } from "@/types/beetle";

export function SettingsView({ 
  onClose, 
  sortKeys,
  backupEntries,
  onRestoreBackup,
  onClearBackup,
}: {
  onClose: () => void, 
  sortKeys: { id: string, label: string }[],
  backupEntries?: BeetleEntry[] | null;
  onRestoreBackup?: () => void;
  onClearBackup?: () => void;
}) {
  const { switchBot, gitHub, mainSortConfig, managementNameFormats, updateSwitchBot, updateGitHub, setMainSortConfig, setManagementNameFormat, onRegenerateNames } = useBeetleStore();

  return (
    <motion.div 
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      className="fixed inset-0 z-[100] bg-white flex flex-col p-6"
    >
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Settings className="text-[#FF9800]" size={24} />
          <h2 className="text-xl font-black text-[#4A3F35]">設定</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4 text-[#FF9800]">
            <Cloud size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">SwitchBot API</h3>
          </div>
          <div className="space-y-4">
            <BottomSheetInput label="Token" value={switchBot.token} onChange={(v) => updateSwitchBot({ token: v })} />
            <BottomSheetInput label="Secret" value={switchBot.secret} onChange={(v) => updateSwitchBot({ secret: v })} />
            <BottomSheetInput label="Device ID" value={switchBot.deviceId} onChange={(v) => updateSwitchBot({ deviceId: v })} />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4 text-[#FF9800]">
            <Database size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">GitHub Sync</h3>
          </div>
          <div className="space-y-4">
            <BottomSheetInput label="Repo (owner/name)" value={gitHub.repo} onChange={(v) => updateGitHub({ repo: v })} />
            <BottomSheetInput label="Token" value={gitHub.token} type="password" onChange={(v) => updateGitHub({ token: v })} />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4 text-[#FF9800]">
            <ArrowUpDown size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">並び替え設定</h3>
          </div>
          <div className="space-y-6 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">第1ソート (優先)</p>
              <div className="grid grid-cols-2 gap-3">
                <BottomSheetSelect 
                  label="キー" 
                  value={sortKeys.find(k => k.id === mainSortConfig.primary.key)?.label || ""} 
                  options={sortKeys.map(k => k.label)} 
                  onChange={(val) => {
                    const key = sortKeys.find(k => k.label === val)?.id;
                    if (key) setMainSortConfig({ ...mainSortConfig, primary: { ...mainSortConfig.primary, key } });
                  }} 
                />
                <BottomSheetSelect 
                  label="順序" 
                  value={mainSortConfig.primary.direction === "asc" ? "昇順" : "降順"} 
                  options={["昇順", "降順"]} 
                  onChange={(val) => setMainSortConfig({ ...mainSortConfig, primary: { ...mainSortConfig.primary, direction: val === "昇順" ? "asc" : "desc" } })} 
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">第2ソート (同値の場合)</p>
              <div className="grid grid-cols-2 gap-3">
                <BottomSheetSelect 
                  label="キー" 
                  value={sortKeys.find(k => k.id === mainSortConfig.secondary.key)?.label || ""} 
                  options={sortKeys.map(k => k.label)} 
                  onChange={(val) => {
                    const key = sortKeys.find(k => k.label === val)?.id;
                    if (key) setMainSortConfig({ ...mainSortConfig, secondary: { ...mainSortConfig.secondary, key } });
                  }} 
                />
                <BottomSheetSelect 
                  label="順序" 
                  value={mainSortConfig.secondary.direction === "asc" ? "昇順" : "降順"} 
                  options={["昇順", "降順"]} 
                  onChange={(val) => setMainSortConfig({ ...mainSortConfig, secondary: { ...mainSortConfig.secondary, direction: val === "昇順" ? "asc" : "desc" } })} 
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4 text-[#FF9800]">
            <Database size={18} />
            <h3 className="text-sm font-black uppercase tracking-widest">管理名フォーマット</h3>
          </div>
          <div className="space-y-6 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
            {ENTRY_TYPES.map((type) => (
              <div key={type} className="space-y-4">
                <BottomSheetSelect
                  label={`${type}形式`}
                  value={
                    managementNameFormats[type] === "YYYYMMDD_NN" ? "YYYYMMDD_NN (例: 20260505_01)" :
                    managementNameFormats[type] === "YYMMDD-NN" ? "YYMMDD-NN (例: 260505-01)" :
                    "YYYYMMDD-SCI-NN (例: 20260505-DH-01)"
                  }
                  options={["YYYYMMDD_NN (例: 20260505_01)", "YYMMDD-NN (例: 260505-01)", "YYYYMMDD-SCI-NN (例: 20260505-DH-01)"]}
                  onChange={(val) => {
                    const format: ManagementNameFormat = val.includes("SCI") ? "YYYYMMDD-SCI-NN" :
                                                         val.startsWith("YYYY") ? "YYYYMMDD_NN" : "YYMMDD-NN";
                    setManagementNameFormat(type, format);
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {backupEntries && backupEntries.length > 0 && onRestoreBackup && onClearBackup && (
          <section>
            <div className="flex items-center gap-2 mb-4 text-[#FF9800]">
              <History size={18} />
              <h3 className="text-sm font-black uppercase tracking-widest">バックアップ</h3>
            </div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-3"
            >
              <div className="text-[10px] font-bold text-red-600 leading-tight">
                操作前のバックアップがあります。データを元の状態に差し戻しますか？
              </div>
              <div className="flex gap-2">
                <button onClick={onRestoreBackup} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black shadow-sm active:scale-95 transition-all">元に戻す (Undo)</button>
                <button onClick={onClearBackup} className="px-4 py-2 bg-white text-gray-400 rounded-lg text-[10px] font-bold border border-red-100 active:scale-95 transition-all">消去</button>
              </div>
            </motion.div>
          </section>
        )}
      </div>
    </motion.div>
  );
}