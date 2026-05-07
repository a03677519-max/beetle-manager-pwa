"use client";

import { useState } from "react";
import { BottomSheetInput, DateRollField, MoistureField } from "@/components/entry-fields";
import type { SpawnSetFormValues } from "@/types/beetle";

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
  const [values, setValues] = useState<SpawnSetFormValues>(initialValues);

  return (
    <form
      id={id}
      className="flex flex-col h-[70dvh] overflow-hidden"
      onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h3 className="font-bold text-gray-700">2回目以降のセット登録</h3>
        <div className="grid grid-cols-2 gap-3">
          <DateRollField label="開始日" value={values.secondSetDate || ""} onChange={(v) => setValues({...values, secondSetDate: v})} />
          <DateRollField label="割出日" value={values.secondSetEndDate || ""} onChange={(v) => setValues({...values, secondSetEndDate: v})} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BottomSheetInput label="卵数" value={values.secondEggCount || ""} onChange={(v) => setValues({...values, secondEggCount: parseInt(v) || 0})} />
          <BottomSheetInput label="幼虫数" value={values.secondLarvaCount || ""} onChange={(v) => setValues({...values, secondLarvaCount: parseInt(v) || 0})} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <input type="checkbox" checked={!!values.useDifferentMethod} onChange={(e) => setValues({...values, useDifferentMethod: e.target.checked})} />
          前回とセット方法が違う
        </label>
        {values.useDifferentMethod && (
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded-lg">
            <BottomSheetInput label="マット" value={values.secondSubstrate || ""} onChange={(v) => setValues({...values, secondSubstrate: v})} />
            <BottomSheetInput label="容器" value={values.secondContainerSize || ""} onChange={(v) => setValues({...values, secondContainerSize: v})} />
            <BottomSheetInput label="詰圧" value={values.secondPressure || ""} onChange={(v) => setValues({...values, secondPressure: v})} />
            <MoistureField value={values.secondMoisture ?? 3} onChange={(v) => setValues({...values, secondMoisture: v})} />
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
