"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { DateRollField, Field, BottomSheetInput, GenderField, useNextFieldNavigation } from "@/components/entry-fields";
import { today } from "@/types/utils";
import type { AdultFormValues } from "@/types/beetle";
import { EntryBaseFields } from "@/components/beetle/shared/entry-base-fields";
import { useBeetleStore } from "@/store/use-beetle-store";

export function AdultForm({
  initialValues,
  onSubmit,
  onCancel,
  id,
  className,
}: {
  initialValues: AdultFormValues;
  onSubmit: (value: AdultFormValues) => void;
  onCancel: () => void;
  id?: string;
  className?: string;
}) {
  const [values, setValues] = useState<AdultFormValues>(initialValues);
  const valuesRef = useRef(values);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const formId = id || "adult-form"; // Keep formId for onSubmit
  const { focusNextField } = useNextFieldNavigation(formId, true);
  const formRef = useRef<HTMLFormElement>(null);
  const allEntries = useBeetleStore((state) => state.entries);

  const isDead = useMemo(() => !!(values.deathDate && values.deathDate !== "-"), [values.deathDate]);
  const isSold = useMemo(() => !!((values.soldDate && values.soldDate !== "-") || values.status === "販売済み"), [values.soldDate, values.status]);

  const suggestions = useMemo(() => {
    const sSet = new Set<string>(["飼育中", "販売済み", "完品", "Ｂ品", "未後食"]);
    const entries = useBeetleStore.getState().entries;
    entries.forEach((e) => {
      if (e.type === "成虫" && e.status) sSet.add(e.status);
    });
    return Array.from(sSet).sort();
  }, []);

  const handleAutoNumbering = () => {
    // 1. プレフィックスの抽出 (例: "A_26312_01" -> "A")
    const basePrefix = values.managementName?.split('_')[0] || "A";
    
    // 2. 日付文字列の生成 (YYMDD形式: 2026-03-12 -> 26312)
    const dateVal = values.emergenceDate || today();
    const [year, month, day] = dateVal.split("-");
    const yy = year.slice(2);
    const m = parseInt(month, 10);
    const dd = day.padStart(2, "0");
    const dateStr = `${yy}${m}${dd}`;
    
    // 3. 同一和名・学名かつ、同じベースプレフィックスを持つ個体全体から連番を計算
    const prefixMatch = `${basePrefix}_`;
    const numbers = allEntries
      .filter(e => 
        e.japaneseName === values.japaneseName && 
        e.scientificName === values.scientificName &&
        e.managementName?.startsWith(prefixMatch)
      )
      .map(e => {
        const parts = e.managementName!.split('_');
        return parseInt(parts[parts.length - 1], 10);
      })
      .filter(n => !isNaN(n));

    const nextNum = Math.max(0, ...numbers) + 1;
    
    // 4. 数値のフォーマット (例: 1 -> 01, 2 -> 2)
    const numStr = nextNum === 1 ? "01" : String(nextNum);

    setValues({ 
      ...values, 
      managementName: `${basePrefix}_${dateStr}_${numStr}` 
    });
  };

  // Effect to synchronize internal form state with external initialValues prop.
  // This is important if the parent component can change `initialValues`
  // while this component is still mounted (e.g., for editing different entries).
  useEffect(() => {
    const fmt = (d?: string) => (d ? d.slice(0, 10) : "");
    setValues({
      ...initialValues,
      emergenceDate: fmt(initialValues.emergenceDate),
      feedingDate: fmt(initialValues.feedingDate),
      deathDate: fmt(initialValues.deathDate),
    });
  }, [initialValues]);

  const handleLarvaDataPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValues({ ...values, larvaMemo: text });
    } catch (err) {
      alert("クリップボードの読み取りに失敗しました。");
    }
  };

  return (
    <form
      id={formId}
      ref={formRef}
      className={`flex flex-col h-full overflow-hidden ${className || ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(valuesRef.current);
      }}
    >
      <div className="flex-1 overflow-y-auto px-1 space-y-2 mb-2">
        <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm space-y-2">
        <div className="flex justify-end px-1 -mb-1">
          <button
            type="button"
            onClick={handleAutoNumbering}
            className="flex items-center gap-1 px-3 py-1 bg-[#FF9800]/10 text-[#FF9800] rounded-full text-[11px] font-bold border border-[#FF9800]/20 active:scale-95 transition-all"
          >
            一括採番
          </button>
        </div>
        <EntryBaseFields
          japaneseName={values.japaneseName}
          scientificName={values.scientificName}
          locality={values.locality}
          generation={values.generation}
          managementName={values.managementName || ""}
          linkedEntryIds={values.linkedEntryIds}
          allEntries={allEntries}
          autoNumberingDate={values.emergenceDate}
          onNext={focusNextField}
          onChange={(patch) => setValues({ ...values, ...patch })}
        />

        <div className="grid grid-cols-2 gap-3">
          <GenderField
            value={values.gender}
            onChange={(val) => setValues({ ...values, gender: val })}
          />
          <BottomSheetInput
            label="サイズ (mm)"
            value={values.size || ""}
            placeholder="例: 75.5"
            inputMode="decimal"
            onNext={focusNextField}
            enterKeyHint="next"
            onChange={(val) => setValues({ ...values, size: val })}
          />
        </div>
        <BottomSheetInput
          label="状態"
          value={values.status || ""}
          placeholder="例: 未後食 / 完品"
          suggestions={suggestions}
          onNext={focusNextField}
          enterKeyHint="next"
          onChange={(val) => setValues({ ...values, status: val })}
        />

        <DateRollField
          label="羽化日"
          value={values.emergenceDate}
          onChange={(value) => setValues({ ...values, emergenceDate: value })}
        />
        <Field label="羽化/掘り出し">
          <div className="flex space-x-2">
            <button
              type="button"
              className={`flex-1 px-4 py-1.5 rounded-xl border font-bold text-sm transition-all duration-200 select-none ${
                values.emergenceType === "羽化"
                  ? "bg-[#7B5D3F] text-white border-[#7B5D3F] shadow-md shadow-[#7B5D3F]/20 scale-[1.02]"
                  : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white/80 active:scale-95"
              }`}
              onClick={() => setValues({ ...values, emergenceType: "羽化" })}
            >
              羽化
            </button>
            <button
              type="button"
              className={`flex-1 px-4 py-1.5 rounded-xl border font-bold text-sm transition-all duration-200 select-none ${
                values.emergenceType === "掘り出し"
                  ? "bg-[#7B5D3F] text-white border-[#7B5D3F] shadow-md shadow-[#7B5D3F]/20 scale-[1.02]"
                  : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white/80 active:scale-95"
              }`}
              onClick={() => setValues({ ...values, emergenceType: "掘り出し" })}
            >
              掘り出し
            </button>
          </div>
        </Field>
        <DateRollField
          label="後食日"
          value={values.feedingDate}
          onChange={(value) => setValues({ ...values, feedingDate: value })}
        />

        <div className="pt-2 border-t border-gray-50">
          <label className="flex items-center gap-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded-lg border-gray-300 text-[#FF9800] focus:ring-[#FF9800]"
              checked={isSold}
              onChange={(e) => setValues({ 
                ...values, 
                soldDate: e.target.checked ? today() : "-",
                status: e.target.checked ? "販売済み" : values.status === "販売済み" ? "飼育中" : values.status 
              })}
            />
            <span className="text-sm font-bold text-gray-700">販売済みとして登録</span>
          </label>
          {isSold && (
            <DateRollField
              label="販売日"
              value={values.soldDate || ""}
              onChange={(value) => setValues({ ...values, soldDate: value })}
            />
          )}

          <label className="flex items-center gap-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded-lg border-gray-300 text-[#FF9800] focus:ring-[#FF9800]"
              checked={isDead}
              onChange={(e) => setValues({ ...values, deathDate: e.target.checked ? today() : "-" })}
            />
            <span className="text-sm font-bold text-gray-700">死亡済みとして登録</span>
          </label>
          {isDead && (
            <DateRollField
              label="死亡日"
              value={values.deathDate}
              onChange={(value) => setValues({ ...values, deathDate: value })}
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-[#A67C52] tracking-wider uppercase">幼虫時データ</span>
            <button
              type="button"
              onClick={handleLarvaDataPaste}
              className="flex items-center gap-1 px-3 py-1 bg-[#FF9800]/10 text-[#FF9800] rounded-full text-[11px] font-bold border border-[#FF9800]/20 active:scale-95 transition-all"
            >
              貼付
            </button>
          </div>
          <textarea
            value={values.larvaMemo}
            onChange={(e) => setValues({ ...values, larvaMemo: e.target.value })}
            placeholder="幼虫時の詳細な履歴など"
            enterKeyHint="next"
            rows={4}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-[#FF9800] outline-none transition-all"
          />
        </div>

        <BottomSheetInput
          label="メモ / 備考"
          value={values.memo || ""}
          type="textarea"
          enterKeyHint="done"
          onNext={focusNextField}
          placeholder="管理上のメモなど"
          onChange={(val) => setValues({ ...values, memo: val })}
        />

        {/* ナビゲーションバー回避用のスペーサー */}
        <div className="h-32" />
        </div>
      </div>
    </form>
  );
}
