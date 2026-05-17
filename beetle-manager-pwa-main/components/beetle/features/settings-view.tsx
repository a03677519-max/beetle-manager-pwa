"use client";

import { X, Hash, Type, ChevronRight, Info, RotateCcw, Trash2, Eraser, RotateCw, Save, RefreshCw } from "lucide-react";
import { MANAGEMENT_NAME_PRESETS } from "@/store/use-beetle-store";
import { useState } from "react";
import type { EntryType } from "@/types/beetle";

export function SettingsView({ 
  onClose,
  managementNameFormats,
  onUpdateManagementNameFormat,
  backupEntries,
  onRestoreBackup,
  onClearBackup,
  onCleanupManagementNames,
  onRegenerateNames,
  onSaveManagementNameFormats,
  keepAlreadyNumberedNames,
  onUpdateKeepAlreadyNumberedNames
}: any) {
  const types: EntryType[] = ["成虫", "幼虫", "産卵セット"];
  const [showCustom, setShowCustom] = useState<Record<string, boolean>>({});

  return (
    <div className="fixed inset-0 z-[100] bg-[#F8F5F2] overflow-y-auto pb-20">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#4A3F35] flex items-center gap-2">
          <Hash className="text-[#FF9800]" size={20} />
          アプリ設定
        </h2>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* 自動採番設定 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={18} className="text-[#FF9800]" />
            <h3 className="font-black text-[#4A3F35]">自動採番テンプレート</h3>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 leading-relaxed font-bold">
              既存の管理名がある場合、末尾に連番(_01等)を付加します。下の設定を有効にすると、既に連番がある管理名は維持します。
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-600">採番済みの管理名を維持</p>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed mt-1">
                  管理名の末尾が「_01」「-01」などの場合、全個体に適用しても番号を二重に付与しません。
                </p>
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={!!keepAlreadyNumberedNames}
                onChange={(e) => onUpdateKeepAlreadyNumberedNames(e.target.checked)}
              />
              <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${keepAlreadyNumberedNames ? "bg-[#FF9800]" : "bg-gray-200"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${keepAlreadyNumberedNames ? "translate-x-6" : "translate-x-1"}`} />
              </span>
            </label>
          </div>

          {types.map((type) => (
            <div key={type} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-gray-600">{type}</span>
              </div>
              
              <div className="space-y-2">
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#FF9800]"
                  value={MANAGEMENT_NAME_PRESETS.find(p => p.value === managementNameFormats[type]) ? managementNameFormats[type] : "CUSTOM"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "CUSTOM") {
                      setShowCustom({ ...showCustom, [type]: true });
                    } else {
                      onUpdateManagementNameFormat(type, val);
                      setShowCustom({ ...showCustom, [type]: false });
                    }
                  }}
                >
                  {MANAGEMENT_NAME_PRESETS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                {(showCustom[type] || !MANAGEMENT_NAME_PRESETS.find(p => p.value === managementNameFormats[type])) && (
                  <div className="pt-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">カスタムテンプレート入力</div>
                    <input 
                      type="text"
                      className="w-full bg-white border border-[#FF9800]/30 rounded-xl px-4 py-2 text-sm font-bold text-[#4A3F35] outline-none focus:border-[#FF9800] shadow-sm"
                      placeholder="例: {SHORT_SCI}_YYYYMMDD_NN"
                      value={managementNameFormats[type]}
                      onChange={(e) => onUpdateManagementNameFormat(type, e.target.value)}
                    />
                    <p className="text-[9px] text-gray-400 mt-1.5 ml-1 leading-relaxed">
                      タグ: <span className="text-[#FF9800]">{`{SHORT_SCI}, {JPN}, {LOC}, {GEN}, YYYY, MM, DD, NN`}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button 
              onClick={onSaveManagementNameFormats}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FF9800] text-white rounded-xl text-xs font-black shadow-lg shadow-orange-100 active:scale-95 transition-all"
            >
              <Save size={16} /> 設定を保存
            </button>
            <button 
              onClick={onRegenerateNames}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-[#FF9800] text-[#FF9800] rounded-xl text-xs font-black active:scale-95 transition-all"
            >
              <RefreshCw size={16} /> 全個体に適用
            </button>
          </div>
        </section>

        {/* 管理名の整理 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Eraser size={18} className="text-[#FF9800]" />
            <h3 className="font-black text-[#4A3F35]">管理名のクリーンアップ</h3>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
              管理名の「_（アンダースコア）」以降をすべて削除し、ベース名のみを残します。日付のみの自動採番名は空欄に戻します。
            </p>
            <button 
              onClick={onCleanupManagementNames}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all"
            >
              <Eraser size={14} /> 一括クリーンアップ実行
            </button>
          </div>
        </section>

        {/* バックアップ管理 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={18} className="text-[#FF9800]" />
            <h3 className="font-black text-[#4A3F35]">データバックアップ</h3>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
            {backupEntries ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500">前回のバックアップ: {backupEntries.length} 件</p>
                <div className="flex gap-2">
                  <button onClick={onRestoreBackup} className="flex-1 bg-[#FF9800] text-white py-2 rounded-xl text-xs font-black shadow-sm">復元する</button>
                  <button onClick={onClearBackup} className="px-4 bg-gray-100 text-gray-400 py-2 rounded-xl text-xs font-black"><Trash2 size={14} /></button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-bold text-center py-2">保存されたバックアップはありません</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
