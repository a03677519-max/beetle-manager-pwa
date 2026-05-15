"use client";

import { motion } from "framer-motion";
import { X, Settings, Database, Cloud, ArrowUpDown } from "lucide-react";
import { useBeetleStore } from "@/store/use-beetle-store";
import { BottomSheetInput, BottomSheetSelect } from "@/components/entry-fields";

export function SettingsView({ onClose, sortKeys }: { onClose: () => void, sortKeys: { id: string, label: string }[] }) {
  const { switchBot, gitHub, mainSortConfig, updateSwitchBot, updateGitHub, setMainSortConfig } = useBeetleStore();

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
      </div>
    </motion.div>
  );
}