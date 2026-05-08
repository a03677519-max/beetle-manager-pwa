"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  CohabitationField,
  DateRollField,
  BottomSheetInput,
  MoistureField,
  SwitchBotTemperatureField,
  useNextFieldNavigation,
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
  const formId = id || "spawn-set-form"; // Keep formId for onSubmit
  const { focusNextField } = useNextFieldNavigation(formId, true);
  const formRef = useRef<HTMLFormElement>(null);

  const suggestions = useMemo(() => {
    const cSet = new Set<string>();
    const tSet = new Set<string>();
    allEntries.forEach((e) => {
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

  // 外部からの初期値変更を同期
  useEffect(() => {
    const fmt = (d?: string) => (d ? d.slice(0, 10) : "");
    
    // 最新の産卵セットの終了日を取得
    const latestSpawnSet = allEntries
      .map(e => e as any)
      .filter((e) => e.type === "産卵セット" && e.managementName === initialValues.managementName && e.scientificName === initialValues.scientificName && e.id !== initialValues.id)
      .sort((a, b) => new Date(b.setDate || 0).getTime() - new Date(a.setDate || 0).getTime())[0];

    const initialSetEndDate = initialValues.setEndDate || (latestSpawnSet?.setEndDate ? fmt(latestSpawnSet.setEndDate) : "");

    setValues(prev => ({
      ...initialValues,
      setDate: prev.setDate || fmt(initialValues.setDate),
      setEndDate: prev.setEndDate || fmt(initialSetEndDate),
    }));
  }, [initialValues.id, initialValues.setDate, initialValues.setEndDate, allEntries]);

  return (
    <form
      id={formId}
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
          generationLabelSuffix="(次世代)"
          onChange={(patch) => setValues({ ...values, ...patch })}
        />

        <div className="grid grid-cols-2 gap-3">
          <DateRollField
            label="開始日"
            value={values.setDate || ""}
            onChange={(value) => setValues((prev) => ({ ...prev, setDate: value }))}
          />
          <DateRollField
            label={endDateType === '割出' ? '割出日' : '掘り出し日'}
            value={values.setEndDate || ""}
            onChange={(value) => setValues((prev) => ({ ...prev, setEndDate: value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <BottomSheetInput
            label="使用マット"
            value={values.substrate || ""}
            placeholder="例: クヌギマット"
            onChange={(val) => setValues((prev) => ({ ...prev, substrate: val }))}
          />
          <BottomSheetInput
            label="容器サイズ"
            value={values.containerSize || ""}
            placeholder="例: 2000cc"
            suggestions={suggestions.container}
            onChange={(val) => setValues((prev) => ({ ...prev, containerSize: val }))}
          />
        </div>
        <BottomSheetInput
          label="詰圧"
          value={values.pressure || ""}
          placeholder="例: 硬め / 3"
          onChange={(val) => setValues((prev) => ({ ...prev, pressure: val }))}
        />
        <MoistureField
          value={values.moisture || 3}
          onChange={(value) => setValues((prev) => ({ ...prev, moisture: value }))}
        />
      <SwitchBotTemperatureField
        value={values.temperature}
        suggestions={suggestions.temperature}
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
          value={values.eggCount ?? ""}
          placeholder="例: 15"
          onChange={(val) => setValues((prev) => ({ ...prev, eggCount: parseInt(val) || 0 }))}
        />
        <BottomSheetInput
          label="割出幼虫数"
          value={values.larvaCount ?? ""}
          placeholder="例: 10"
          onChange={(val) => setValues((prev) => ({ ...prev, larvaCount: parseInt(val) || 0 }))}
        />
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
