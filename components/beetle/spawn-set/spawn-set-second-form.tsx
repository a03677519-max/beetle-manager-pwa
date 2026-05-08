"use client";

import { useState, useMemo } from "react";
import { BottomSheetInput, DateRollField, MoistureField } from "@/components/entry-fields";
import type { SpawnSetFormValues } from "@/types/beetle";
import { today } from "@/lib/utils";

export function SpawnSetSecondForm({
  initialValues,
  onSubmit,
  onCancel,
  id,
}: {
  initialValues: SpawnSetFormValues;
  onSubmit: (value: SpawnSetFormValues) => void;
  onCancel: () => void;
  id?: string;
}) {
  // 最新のセット終了日を取得して開始日の初期値にする
  const latestEndDate = useMemo(() => {
    const entry = initialValues as any;
    if (entry.sets && entry.sets.length > 0) {
      const sorted = [...entry.sets].sort((a, b) => (b.setDate || "").localeCompare(a.setDate || ""));
      return sorted[0].setEndDate || sorted[0].setDate || today();
    }
    return entry.setEndDate || entry.setDate || today();
  }, [initialValues]);

  const [values, setValues] = useState<any>({
    setDate: latestEndDate,
    setEndDate: "",
    eggCount: 0,
    larvaCount: 0,
  });

  return (
    <form
      id={id}
      className="flex flex-col h-[70dvh] overflow-hidden"
      onKeyDown={(e) => { // テキストエリアでのEnterキーによる改行は許可
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          e.preventDefault(); // それ以外のEnterキーはフォーム送信を防止
        }
      }}
      onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h3 className="font-bold text-gray-700">追加のセット登録</h3>
        <div className="grid grid-cols-2 gap-3">
          <DateRollField label="開始日" value={values.setDate || ""} onChange={(val) => setValues((prev: any) => ({...prev, setDate: val}))} />
          <DateRollField label="割出日" value={values.setEndDate || ""} onChange={(val) => setValues((prev: any) => ({...prev, setEndDate: val}))} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <input type="checkbox" checked={!!values.setEndDate} onChange={(e) => setValues((prev: any) => ({...prev, setEndDate: e.target.checked ? today() : ""}))} />
          産卵を終了する（本日）
        </label>
        <div className="grid grid-cols-2 gap-3">
          <BottomSheetInput label="卵数" value={values.eggCount ?? ""} onChange={(val) => setValues((prev: any) => ({...prev, eggCount: parseInt(val) || 0}))} />
          <BottomSheetInput label="幼虫数" value={values.larvaCount ?? ""} onChange={(val) => setValues((prev: any) => ({...prev, larvaCount: parseInt(val) || 0}))} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <input type="checkbox" checked={!!values.useDifferentMethod} onChange={(e) => setValues((prev: any) => ({...prev, useDifferentMethod: e.target.checked}))} />
          前回とセット方法が違う
        </label>
        {values.useDifferentMethod && (
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded-lg">
            <BottomSheetInput label="マット" value={values.substrate || ""} onChange={(val) => setValues((prev: any) => ({...prev, substrate: val}))} />
            <BottomSheetInput label="容器" value={values.containerSize || ""} onChange={(val) => setValues((prev: any) => ({...prev, containerSize: val}))} />
            <BottomSheetInput label="詰圧" value={values.pressure || ""} onChange={(val) => setValues((prev: any) => ({...prev, pressure: val}))} />
            <MoistureField value={values.moisture ?? 3} onChange={(val) => setValues((prev: any) => ({...prev, moisture: val}))} />
          </div>
        )}
        <BottomSheetInput
          label="メモ / 備考"
          value={values.memo || ""}
          type="textarea"
          placeholder="2回目セットの様子など"
          onChange={(v) => setValues({...values, memo: v})}
        />
        <div className="h-20" />
      </div>
      <div className="p-4 border-t border-gray-100 bg-white">
        <button type="submit" className="w-full py-3 bg-[#2D5A27] text-white rounded-xl font-black">登録</button>
      </div>
    </form>
  );
}
