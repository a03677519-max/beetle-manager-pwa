"use client";

import type { BeetleEntry, EntryType, ManagementNameFormat } from "@/types/beetle";
import { Modal } from "../../ui/modal";
import { Trash2, RotateCcw } from "lucide-react";

interface SettingsViewProps {
  onClose: () => void;
  sortKeys: { id: string; label: string }[];
  backupEntries?: BeetleEntry[] | null;
  onRestoreBackup?: () => void;
  onClearBackup?: () => void;
  managementNameFormats: Record<EntryType, ManagementNameFormat>;
  onUpdateManagementNameFormat: (type: EntryType, format: ManagementNameFormat) => void;
}

export function SettingsView({
  onClose,
  backupEntries,
  onRestoreBackup,
  onClearBackup,
  managementNameFormats,
  onUpdateManagementNameFormat,
}: SettingsViewProps) {
  return (
    <Modal isOpen={true} onClose={onClose} title="設定">
      <div className="space-y-6 py-2">
        {/* バックアップ管理セクション */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">
            データバックアップ
          </h3>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">一時保存データ</span>
              <span className="text-xs font-black bg-white px-2 py-1 rounded-lg border border-gray-100">
                {backupEntries?.length || 0} 件
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onRestoreBackup}
                disabled={!backupEntries || backupEntries.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold disabled:opacity-30 transition-all active:scale-95"
              >
                <RotateCcw size={14} /> 復元する
              </button>
              <button
                onClick={onClearBackup}
                disabled={!backupEntries || backupEntries.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold disabled:opacity-30 transition-all active:scale-95"
              >
                <Trash2 size={14} /> 削除
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed px-1">
              ※ 一括操作（削除・編集）の直前に自動的にバックアップが作成されます。誤って削除した際などに利用してください。
            </p>
          </div>
        </section>

        {/* 自動採番設定セクション */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">
            自動採番（管理名）の規則
          </h3>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4 shadow-sm">
            {(["成虫", "幼虫", "産卵セット"] as EntryType[]).map((type) => (
              // Added key prop for list rendering
              <div key={type} className="space-y-2">
                <label className="text-[10px] font-black text-[#A67C52] uppercase tracking-wider block">
                  {type} の命名規則
                </label>
                <div className="flex bg-gray-50 rounded-xl p-1 gap-1">
                  {(["YYYYMMDD_NN", "YYMMDD-NN", "YYYYMMDD-SCI-NN"] as ManagementNameFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => onUpdateManagementNameFormat(type, f)}
                      className={`flex-1 py-2 text-[9px] font-bold rounded-lg transition-all ${
                        managementNameFormats[type] === f
                          ? "bg-[#FF9800] text-white shadow-sm"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {f === "YYYYMMDD_NN" ? "標準" : f === "YYMMDD-NN" ? "短縮" : "学名入り"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[9px] text-gray-400 leading-relaxed italic px-1 pt-1 border-t border-gray-50">
              ※ 標準: 20240101_01<br />
              ※ 短縮: 240101-01<br />
              ※ 学名入り: 20240101-DA-01 (学名頭文字)
            </p>
          </div>
        </section>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full py-4 bg-[#FF9800] text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
        >
          設定を閉じる
        </button>
      </div>
    </Modal>
  );
}