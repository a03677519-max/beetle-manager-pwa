"use client";

import { useState, useEffect, useRef } from "react";
import {
  CohabitationField,
  DateRollField,
  BottomSheetInput,
  MoistureField,
  SwitchBotTemperatureField,
} from "@/components/entry-fields";
import type { BeetleEntry, SpawnSetFormValues } from "@/types/beetle";
import { EntryBaseFields } from "@/components/beetle/shared/entry-base-fields";

export function SpawnSetForm({
  initialValues,
  onSubmit,
  onCancel,
  onFetchTemperature,
  isFetchingTemperature,
  allEntries,
  endDateType = "割出",
  onEndDateTypeChange,
  id,
  className,
}: {
  initialValues: SpawnSetFormValues;
  onSubmit: (value: SpawnSetFormValues) => void;
  onCancel: () => void;
  onFetchTemperature: (setter: (value: string) => void) => void;
  isFetchingTemperature: boolean;
  allEntries: BeetleEntry[];
  endDateType?: "割出" | "掘出";
  onEndDateTypeChange?: (type: "割出" | "掘出") => void;
  id?: string;
  className?: string;
}) {
  const [values, setValues] = useState<SpawnSetFormValues>(initialValues);
  const formRef = useRef<HTMLFormElement>(null);

  // 外部からの初期値変更を同期
  useEffect(() => {
    const fmt = (d?: string) => (d ? d.slice(0, 10) : "");
    setValues({
      ...initialValues,
      setDate: fmt(initialValues.setDate),
      setEndDate: fmt(initialValues.setEndDate),
    });
    // 再編集時に記録に応じてタイプを推定
    if (initialValues.setEndDate) {
      // 必要に応じてロジック追加。デフォルトは割出。
    }
  }, [initialValues.id, initialValues.setDate, initialValues.setEndDate]);

  return (
    <form
      id={id}
      ref={formRef}
      className={`flex flex-col h-full overflow-hidden touch-pan-y ${className || ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="flex-1 overflow-y-auto px-1 space-y-3 mb-2 overscroll-contain">
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm space-y-2">
        <EntryBaseFields
          {...values}
          managementName={values.managementName || ""}
          allEntries={allEntries}
          onChange={(patch) => setValues({ ...values, ...patch })}
        />

        <div className="grid grid-cols-2 gap-3">
          <DateRollField
            label="開始日"
            value={values.setDate}
            onChange={(value) => setValues({ ...values, setDate: value })}
          />
          <DateRollField
            label={endDateType === '割出' ? '割出日' : '掘り出し日'}
            value={values.setEndDate || ""}
            onChange={(value) => setValues({ ...values, setEndDate: value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <BottomSheetInput
            label="使用マット"
            value={values.substrate}
            placeholder="例: クヌギマット"
            onChange={(val) => setValues({ ...values, substrate: val })}
          />
          <BottomSheetInput
            label="容器サイズ"
            value={values.containerSize}
            placeholder="例: 2000cc"
            onChange={(val) => setValues({ ...values, containerSize: val })}
          />
        </div>
        <BottomSheetInput
          label="詰圧"
          value={values.pressure}
          placeholder="例: 硬め / 3"
          onChange={(val) => setValues({ ...values, pressure: val })}
        />
        <MoistureField
          value={values.moisture}
          onChange={(value) => setValues({ ...values, moisture: value })}
        />
      <SwitchBotTemperatureField
        value={values.temperature}
        onChange={(value) => setValues({ ...values, temperature: value })}
        onFetch={() =>
          onFetchTemperature((value) =>
            setValues((current) => ({ ...current, temperature: value }))
          )
        }
        isFetching={isFetchingTemperature}
      />
      <CohabitationField
        value={values.cohabitation}
        onChange={(value) => setValues({ ...values, cohabitation: value })}
      />

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
        <BottomSheetInput
          label="割出卵数"
          value={values.eggCount || ""}
          placeholder="例: 15"
          onChange={(val) => setValues({ ...values, eggCount: parseInt(val) || 0 })}
        />
        <BottomSheetInput
          label="割出幼虫数"
          value={values.larvaCount || ""}
          placeholder="例: 10"
          onChange={(val) => setValues({ ...values, larvaCount: parseInt(val) || 0 })}
        />
      </div>
      <div className="pt-2 border-t border-gray-50 space-y-2">
        <h4 className="text-[10px] font-bold text-gray-400">2回目以降のセット</h4>
        <div className="grid grid-cols-2 gap-3">
          <DateRollField
            label="2回目開始日"
            value={values.secondSetDate || ""}
            onChange={(value) => setValues({ ...values, secondSetDate: value })}
          />
          <DateRollField
            label="2回目割出日"
            value={values.secondSetEndDate || ""}
            onChange={(value) => setValues({ ...values, secondSetEndDate: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BottomSheetInput
            label="2回目卵数"
            value={values.secondEggCount || ""}
            placeholder="例: 5"
            onChange={(val) => setValues({ ...values, secondEggCount: parseInt(val) || 0 })}
          />
          <BottomSheetInput
            label="2回目幼虫数"
            value={values.secondLarvaCount || ""}
            placeholder="例: 3"
            onChange={(val) => setValues({ ...values, secondLarvaCount: parseInt(val) || 0 })}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mt-2">
          <input
            type="checkbox"
            checked={!!values.useDifferentMethod}
            onChange={(e) => setValues({ ...values, useDifferentMethod: e.target.checked })}
          />
          前回とセット方法が違う
        </label>
        {values.useDifferentMethod && (
          <div className="grid grid-cols-2 gap-3 mt-2 bg-gray-50 p-2 rounded-lg">
            <BottomSheetInput
              label="2回目マット"
              value={values.secondSubstrate || ""}
              placeholder="例: 微粒子マット"
              onChange={(val) => setValues({ ...values, secondSubstrate: val })}
            />
            <BottomSheetInput
              label="2回目容器"
              value={values.secondContainerSize || ""}
              placeholder="例: 1500cc"
              onChange={(val) => setValues({ ...values, secondContainerSize: val })}
            />
            <BottomSheetInput
              label="2回目詰圧"
              value={values.secondPressure || ""}
              placeholder="例: 3"
              onChange={(val) => setValues({ ...values, secondPressure: val })}
            />
            <MoistureField
              value={values.secondMoisture ?? 3}
              onChange={(value) => setValues({ ...values, secondMoisture: value })}
            />
          </div>
        )}
      </div>

      <BottomSheetInput
        label="メモ / 備考"
        value={values.memo || ""}
        type="textarea"
        placeholder="セットの様子や親個体の状態など"
        onChange={(val) => setValues({ ...values, memo: val })}
      />

        {/* ナビゲーションバー回避用のスペーサー */}
        <div className="h-32" />
        </div>
      </div>
    </form>
  );
}
