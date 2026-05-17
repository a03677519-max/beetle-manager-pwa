"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { BottomSheetInput, DateRollField, MoistureField, useNextFieldNavigation } from "@/components/entry-fields";
import type { SpawnSetFormValues } from "@/types/beetle";
import { today } from "@/lib/utils";

export function SpawnSetSecondForm({
  initialValues,
  onSubmit,
  onCancel,
  id,
  allEntries, // サジェスト用に追加
}: {
  initialValues: SpawnSetFormValues;
  onSubmit: (value: SpawnSetFormValues) => void;
  onCancel: () => void;
  id?: string;
  allEntries?: any[]; // サジェスト用に追加
}) {
  const formId = id || "spawn-set-second-form";
  const { focusNextField } = useNextFieldNavigation(formId, true);
  const formRef = useRef<HTMLFormElement>(null);

  // 最新のセット終了日を取得して開始日の初期値にする
  const getLatestEndDate = useCallback(() => {
    // 1. initialValuesそのものにsetsがある場合（親を渡された場合）
    // 2. allEntriesから親を探して取得する場合
    const parent = allEntries?.find(e => (e as any).sets?.some((s: any) => s.id === initialValues.id)) || initialValues;
    const s = parent as any;

    if (s.sets && s.sets.length > 0) {
      const sorted = [...s.sets].sort((a, b) => (b.setDate || "").localeCompare(a.setDate || "")); // 降順
      return sorted[0].setEndDate || sorted[0].setDate || today();
    }
    return s.setEndDate || s.setDate || today();
  }, [initialValues, allEntries]); // initialValues.id が変わるたびに再計算

  const latestEndDate = useMemo(() => {
    return getLatestEndDate();
  }, [getLatestEndDate]);

  const [values, setValues] = useState<any>({
    id: initialValues.id, // 編集用にIDを保持
    useDifferentMethod: false, // デフォルトでfalse
    setDate: latestEndDate,
    setEndDate: "",
    eggCount: initialValues.eggCount ?? 0,
    larvaCount: initialValues.larvaCount ?? 0,
  });

  // initialValuesが変更されたらstateを更新 (編集モード用)
  useEffect(() => {
    const isEdit = !!initialValues.id;
    setValues({
      id: initialValues.id,
      setDate: isEdit ? initialValues.setDate : latestEndDate,
      setEndDate: isEdit ? (initialValues.setEndDate || "") : "",
      eggCount: initialValues.eggCount ?? 0,
      larvaCount: initialValues.larvaCount ?? 0,
      substrate: initialValues.substrate || "",
      containerSize: initialValues.containerSize || "",
      pressure: initialValues.pressure || "",
      moisture: initialValues.moisture ?? 3,
      temperature: initialValues.temperature || "",
      cohabitation: initialValues.cohabitation || "なし",
      memo: initialValues.memo || "",
      useDifferentMethod: initialValues.useDifferentMethod || (isEdit && !!initialValues.substrate),
    });
  }, [initialValues, latestEndDate]);

  const suggestions = useMemo(() => {
    const cSet = new Set<string>();
    const tSet = new Set<string>();
    (allEntries || []).forEach((e) => {
      if (e.type === "産卵セット") {
        if (e.containerSize) cSet.add(e.containerSize);
        if (e.temperature) tSet.add(String(e.temperature));
        (e as any).sets?.forEach((s: any) => {
          if (s.containerSize) cSet.add(s.containerSize);
        });
      }
    });
    return {
      container: Array.from(cSet).sort(),
      temperature: Array.from(tSet).sort(),
    };
  }, [allEntries]);

  return (
    <form
      id={formId}
      ref={formRef}
      className="flex flex-col h-[70dvh] overflow-hidden bg-white"
      onKeyDown={(e) => { // テキストエリアでのEnterキーによる改行は許可
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault(); // それ以外のEnterキーはフォーム送信を防止
        }
      }}
      onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-gray-700">
        <h3 className="font-bold">追加のセット登録</h3>
        <div className="grid grid-cols-2 gap-3">
          <DateRollField label="開始日" value={values.setDate || ""} onChange={(val) => setValues((prev: any) => ({...prev, setDate: val}))} />
          <DateRollField label="割出日" value={values.setEndDate || ""} onChange={(val) => setValues((prev: any) => ({...prev, setEndDate: val}))} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
          <input type="checkbox" checked={!!values.setEndDate} onChange={(e) => setValues((prev: any) => ({...prev, setEndDate: e.target.checked ? today() : ""}))} />
          産卵を終了する（本日）
        </label>
        <div className="grid grid-cols-2 gap-3">
          <BottomSheetInput label="卵数" value={values.eggCount ?? ""} onNext={focusNextField} onChange={(val) => setValues((prev: any) => ({...prev, eggCount: parseInt(val) || 0}))} />
          <BottomSheetInput label="幼虫数" value={values.larvaCount ?? ""} onNext={focusNextField} onChange={(val) => setValues((prev: any) => ({...prev, larvaCount: parseInt(val) || 0}))} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer">
          <input type="checkbox" checked={!!values.useDifferentMethod} onChange={(e) => setValues((prev: any) => ({...prev, useDifferentMethod: e.target.checked}))} />
          前回とセット方法が違う
        </label>
        {values.useDifferentMethod && (
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded-lg">
            <BottomSheetInput label="マット" value={values.substrate || ""} onNext={focusNextField} onChange={(val) => setValues((prev: any) => ({...prev, substrate: val}))} suggestions={suggestions.container} />
            <BottomSheetInput label="容器" value={values.containerSize || ""} onNext={focusNextField} onChange={(val) => setValues((prev: any) => ({...prev, containerSize: val}))} suggestions={suggestions.container} />
            <BottomSheetInput label="詰圧" value={values.pressure || ""} onNext={focusNextField} onChange={(val) => setValues((prev: any) => ({...prev, pressure: val}))} />
            <MoistureField value={values.moisture ?? 3} onChange={(val) => setValues((prev: any) => ({...prev, moisture: val}))} /> {/* suggestions.temperature は温度用なので注意 */}
          </div>
        )}
        <BottomSheetInput
          label="メモ / 備考"
          value={values.memo || ""}
          type="textarea"
          placeholder="2回目セットの様子など"
          onNext={focusNextField}
          onChange={(v) => setValues({...values, memo: v})}
        />
        <div className="h-20" />
      </div>
      <div className="p-4 border-t border-gray-100 bg-white">
        <button type="submit" className="w-full py-3 bg-[#2D5A27] text-white rounded-xl font-black">
          {initialValues.id ? "保存" : "登録"}
        </button>
      </div>
    </form>
  );
}
