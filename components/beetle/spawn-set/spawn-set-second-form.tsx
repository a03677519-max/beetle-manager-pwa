"use client";

import { useState } from "react";
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
  const [values, setValues] = useState<SpawnSetFormValues>(initialValues);
  const v = values as any;

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
        <h3 className="font-bold text-gray-700">2回目以降のセット登録</h3>
        <div className="grid grid-cols-2 gap-3">
          <DateRollField label="開始日" value={v.secondSetDate || ""} onChange={(val) => setValues((prev: any) => ({...prev, secondSetDate: val}))} />
          <DateRollField label="割出日" value={v.secondSetEndDate || ""} onChange={(val) => setValues((prev: any) => ({...prev, secondSetEndDate: val}))} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <input type="checkbox" checked={!!v.secondSetEndDate} onChange={(e) => setValues((prev: any) => ({...prev, secondSetEndDate: e.target.checked ? today() : ""}))} />
          産卵を終了する（本日）
        </label>
        <div className="grid grid-cols-2 gap-3">
          <BottomSheetInput label="卵数" value={v.secondEggCount || ""} onChange={(val) => setValues((prev: any) => ({...prev, secondEggCount: parseInt(val) || 0}))} />
          <BottomSheetInput label="幼虫数" value={v.secondLarvaCount || ""} onChange={(val) => setValues((prev: any) => ({...prev, secondLarvaCount: parseInt(val) || 0}))} />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <input type="checkbox" checked={!!v.useDifferentMethod} onChange={(e) => setValues((prev: any) => ({...prev, useDifferentMethod: e.target.checked}))} />
          前回とセット方法が違う
        </label>
        {v.useDifferentMethod && (
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded-lg">
            <BottomSheetInput label="マット" value={v.secondSubstrate || ""} onChange={(val) => setValues((prev: any) => ({...prev, secondSubstrate: val}))} />
            <BottomSheetInput label="容器" value={v.secondContainerSize || ""} onChange={(val) => setValues((prev: any) => ({...prev, secondContainerSize: val}))} />
            <BottomSheetInput label="詰圧" value={v.secondPressure || ""} onChange={(val) => setValues((prev: any) => ({...prev, secondPressure: val}))} />
            <MoistureField value={v.secondMoisture ?? 3} onChange={(val) => setValues((prev: any) => ({...prev, secondMoisture: val}))} />
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
