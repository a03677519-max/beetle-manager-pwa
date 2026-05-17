"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { CountRollField, Field, DateRollField, BottomSheetInput, MoistureField, PressureField, GenderField, useNextFieldNavigation } from "@/components/entry-fields";
import type { BeetleEntry, AdultBeetle, LarvaFormValues, LarvaLog, LogStage, Gender } from "@/types/beetle";
import { EntryBaseFields } from "@/components/beetle/shared/entry-base-fields";
import { today, daysBetween, createId } from "@/types/utils";
import { useBeetleStore, emptyAdultForm } from "@/store/use-beetle-store";

/**
 * 幼虫登録・編集用フォーム
 * 羽化ステータスによる動的表示、羽化までの日数計算、管理名入力をサポート
 */
export function LarvaForm({
  initialValues,
  onSubmit,
  onCancel,
  allEntries,
  dateType = "hatch",
  onDateTypeChange,
  id,
  className,
}: {
  initialValues: LarvaFormValues;
  onSubmit: (value: LarvaFormValues, count: number) => void;
  onCancel: () => void;
  allEntries: BeetleEntry[];
  dateType?: "hatch" | "set" | "extraction";
  onDateTypeChange?: (type: "hatch" | "set" | "extraction") => void;
  id?: string;
  className?: string;
}) {
  const [values, setValues] = useState<LarvaFormValues>(initialValues);
  const valuesRef = useRef(values);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  
  const [count, setCount] = useState(1);
  const [setStartDate, setSetStartDate] = useState(today());
  const [setEndDate, setSetEndDate] = useState(today());
  const formId = id || "larva-form"; // Keep formId for onSubmit
  const { focusNextField } = useNextFieldNavigation(formId, true);
  const entries = useBeetleStore((state) => state.entries);
  const promoteLarvaToAdult = useBeetleStore((state) => state.promoteLarvaToAdult);

  const formRef = useRef<HTMLFormElement>(null);
  const isEmerged = !!values.actualEmergenceDate;

  useEffect(() => {
    // 日付文字列を YYYY-MM-DD に正規化
    const fmt = (d?: string) => d ? d.slice(0, 10) : "";
    const hatch = fmt(initialValues.hatchDate);
    const extraction = fmt(initialValues.extractionDate);
    
    setValues({
      ...initialValues,
      hatchDate: hatch,
      extractionDate: extraction,
      actualEmergenceDate: fmt(initialValues.actualEmergenceDate),
    });

    // セット期間用の日付を初期化（既存の日付があれば優先、なければ作成日や今日）
    setSetStartDate(hatch || (initialValues.createdAt ? fmt(initialValues.createdAt) : today()));
    setSetEndDate(extraction || (initialValues.extractionDate === "-" ? "-" : today()));
  }, [initialValues.id, initialValues.hatchDate, initialValues.extractionDate, initialValues.actualEmergenceDate, initialValues.createdAt]);

  // タブ切り替え時に日付データを同期する
  useEffect(() => {
    const fmt = (d?: string) => (d ? d.slice(0, 10) : "");
    
    if (dateType === "hatch") {
      if (!values.hatchDate || values.hatchDate === "-") {
        const backupDate = values.extractionDate || (initialValues.createdAt ? fmt(initialValues.createdAt) : today());
        setValues(prev => ({ ...prev, hatchDate: backupDate }));
      }
    } else if (dateType === "extraction") {
      if (!values.extractionDate || values.extractionDate === "-") {
        const backupDate = values.hatchDate || (initialValues.createdAt ? fmt(initialValues.createdAt) : today());
        setValues(prev => ({ ...prev, extractionDate: backupDate }));
      }
    } else if (dateType === "set") {
      // セット期間タブでは値をクリアせず、開始・終了日ピッカーに同期させる
      setSetStartDate(prev => prev || (values.hatchDate !== "-" ? values.hatchDate : "") || (initialValues.createdAt ? fmt(initialValues.createdAt) : today()));
      setSetEndDate(prev => prev || (values.extractionDate !== "-" ? values.extractionDate : "") || "-");
    }
  }, [dateType, values.hatchDate, values.extractionDate, initialValues.createdAt, setSetStartDate, setSetEndDate]);

  useEffect(() => {
    if (!initialValues.id && (!values.logs || values.logs.length === 0)) {
      addRecord();
    }
  }, [initialValues.id]);

  // 過去のログからマット名とボトルサイズの履歴を抽出（オートコンプリート用）
  const suggestions = useMemo(() => {
    const sSet = new Set<string>();
    const bSet = new Set<string>();
    const tSet = new Set<string>();

    allEntries.forEach((entry) => {
      if (entry.type === "成虫" && entry.status) tSet.add(entry.status);
      if (entry.type === "幼虫") {
        if ((entry as any).status) tSet.add((entry as any).status);
        entry.logs.forEach((log) => {
          if (log.substrate) sSet.add(log.substrate);
          if (log.bottleSize) bSet.add(log.bottleSize);
          if (log.temperature) tSet.add(String(log.temperature));
        });
      }
    });

    return {
      substrate: Array.from(sSet).sort(),
      status: Array.from(new Set([...Array.from(tSet), "飼育中", "販売済み"])).sort(),
      bottleSize: Array.from(bSet).sort(),
      temperature: Array.from(tSet).sort(),
    };
  }, [allEntries]);

  // 飼育ログの追加処理
  const addRecord = () => {
    const latestLog = values.logs?.[0];
    const newRecord: LarvaLog = {
      id: createId(),
      date: today(),
      stage: latestLog?.stage || "L1",
      weight: 0,
      substrate: latestLog?.substrate || "",
      pressure: latestLog?.pressure || 3,
      moisture: latestLog?.moisture || 3,
      bottleSize: latestLog?.bottleSize || "",
      gender: latestLog?.gender || "不明",
      temperature: latestLog?.temperature || "",
    };
    setValues({ ...values, logs: [newRecord, ...(values.logs || [])] });
  };

  // 孵化日から羽化までの日数を計算
  const daysUntilEmergence = useMemo(() => {
    const hatchDate = values.hatchDate;
    if (!hatchDate || !values.actualEmergenceDate) return null;
    return daysBetween(hatchDate, values.actualEmergenceDate);
  }, [values.actualEmergenceDate, values.hatchDate]);

  const adultCandidates = useMemo(
    () => entries.filter((entry): entry is AdultBeetle => entry.type === "成虫" && entry.scientificName === values.scientificName),
    [entries, values.scientificName],
  );

  // 入力されたデータから体重と温度の推移を計算（簡易グラフ用データ）
  const logStats = useMemo(() => {
    const logs = values.logs || [];
    if (logs.length === 0) return null;
    const weights = logs.map(r => r.weight).filter(w => w > 0);
    const temps = logs.map(r => parseFloat(r.temperature)).filter(t => !isNaN(t) && t > 0);
    return {
      maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
      avgTemp: temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0
    };
  }, [values.logs]);

  return (
    <form
      id={formId}
      ref={formRef}
      className={`flex flex-col h-full overflow-hidden ${className || ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        const finalValues = { ...valuesRef.current };
        
        if (dateType === "hatch") {
          // 値が空の場合はフォールバックを適用してリセットを防ぐ
          finalValues.hatchDate = finalValues.hatchDate || (initialValues.createdAt ? initialValues.createdAt.slice(0, 10) : today());
          finalValues.extractionDate = ""; // 孵化データとして保存
        } else if (dateType === "extraction") {
          finalValues.extractionDate = finalValues.extractionDate || (initialValues.createdAt ? initialValues.createdAt.slice(0, 10) : today());
          finalValues.hatchDate = ""; // 割出データとして保存
        } else if (dateType === "set") {
          const isStartValid = setStartDate && setStartDate !== "-";
          const isEndValid = setEndDate && setEndDate !== "-";

          if (isStartValid && isEndValid && new Date(setStartDate) > new Date(setEndDate)) {
            finalValues.extractionDate = setStartDate;
            finalValues.hatchDate = setEndDate;
          } else {
            finalValues.extractionDate = setEndDate;
            finalValues.hatchDate = setStartDate;
          }
        }
        onSubmit(finalValues, count);
      }}
    >
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm space-y-2 flex-1 overflow-y-auto mb-2">
        <EntryBaseFields
          japaneseName={values.japaneseName}
          scientificName={values.scientificName}
          locality={values.locality}
          generation={values.generation}
          managementName={values.managementName || ""}
          allEntries={allEntries}
          autoNumberingDate={dateType === "set" ? setStartDate : (values.hatchDate || values.extractionDate)}
          onNext={focusNextField}
          onChange={(patch) => setValues({ ...values, ...patch })}
        />

        <div className="pt-2 border-t border-gray-50 space-y-3">
          {dateType === "hatch" ? (
            <DateRollField
              label="孵化日"
              value={values.hatchDate || ""}
              onChange={(value) => setValues({ ...values, hatchDate: value })}
            />
          ) : dateType === "set" ? (
            <div className="grid grid-cols-2 gap-4">
              <DateRollField label="開始日" value={setStartDate} onChange={setSetStartDate} />
              <DateRollField label="終了日" value={setEndDate} onChange={setSetEndDate} />
            </div>
          ) : (
            <DateRollField
              label="割出日"
              value={values.extractionDate || ""}
              onChange={(value) => setValues({ ...values, extractionDate: value })}
            />
          )}

          <BottomSheetInput
            label="状態"
            value={(values as any).status || ""}
            placeholder="例: 飼育中 / 販売済み"
            suggestions={suggestions.status}
            onNext={focusNextField}
            enterKeyHint="next"
            onChange={(val) => setValues({ ...values, status: val } as any)}
          />

          <BottomSheetInput
            label="備考"
            value={values.memo || ""}
            type="textarea"
            placeholder="一括適用するメモ・備考"
            enterKeyHint="next"
            onNext={focusNextField}
            onChange={(val) => setValues({ ...values, memo: val })}
          />

          <div className="scale-90 origin-left"><CountRollField value={count} onChange={setCount} /></div>
        </div>

        <div className="pt-2 border-t border-gray-50">
          <div className="space-y-1 mb-2">
            <label className="flex items-center gap-3 py-1 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded-lg border-gray-300 text-[#FF9800] focus:ring-[#FF9800]"
                checked={!!(((values as any).soldDate && (values as any).soldDate !== "-") || (values as any).status === "販売済み")}
                onChange={(e) => setValues({ 
                  ...values, 
                  soldDate: e.target.checked ? today() : "-",
                  status: e.target.checked ? "販売済み" : (values as any).status === "販売済み" ? "飼育中" : (values as any).status 
                } as any)}
              />
              <span className="text-sm font-bold text-gray-700">販売済みとして登録</span>
            </label>
            {(((values as any).soldDate && (values as any).soldDate !== "-") || (values as any).status === "販売済み") && (
              <DateRollField
                label="販売日"
                value={(values as any).soldDate}
                onChange={(val) => setValues({ ...values, soldDate: val } as any)}
              />
            )}

            <label className="flex items-center gap-3 py-1 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded-lg border-gray-300 text-[#FF9800] focus:ring-[#FF9800]"
                checked={!!((values as any).deathDate && (values as any).deathDate !== "-")}
                onChange={(e) => setValues({ ...values, deathDate: e.target.checked ? today() : "-" } as any)}
              />
              <span className="text-sm font-bold text-gray-700">死亡済みとして登録</span>
            </label>
            {((values as any).deathDate && (values as any).deathDate !== "-") && (
              <DateRollField
                label="死亡日"
                value={(values as any).deathDate}
                onChange={(val) => setValues({ ...values, deathDate: val } as any)}
              />
            )}
          </div>

        <div className="field">
          <label className="flex items-center gap-3 py-0.5">
            <input
              type="checkbox"
              className="w-4 h-4 rounded-lg border-gray-300 text-[#FF9800] focus:ring-[#FF9800] select-none"
              checked={isEmerged} // Keep checked
              onChange={(e) =>
                setValues({
                  ...values,
                  actualEmergenceDate: e.target.checked ? today() : "",
                })
              }
            />
            <span className="text-sm font-bold text-gray-700">羽化済みとして登録</span>
          </label>
        </div> {/* Keep div */}

          {isEmerged && (
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <DateRollField
                label="羽化日"
                value={values.actualEmergenceDate}
              onChange={(value) =>
                setValues({ ...values, actualEmergenceDate: value })
              }
            />
            {/* 羽化時の性別選択を追加 */}
            <GenderField
              value={values.logs?.[0]?.gender || "不明"}
              onChange={(g) => {
                const newLogs = [...(values.logs || [])];
                if (newLogs.length > 0) {
                  newLogs[0] = { ...newLogs[0], gender: g };
                } else {
                  // ログがない場合は最小限の構成で作成
                  newLogs.push({ id: 'temp', gender: g, date: today(), weight: 0, substrate: "", pressure: 3, moisture: 3, bottleSize: "", stage: "L3", temperature: "" });
                }
                setValues({ ...values, logs: newLogs });
              }}
            />
            {daysUntilEmergence !== null && (
              <div className="flex items-baseline gap-2 px-3 py-2 bg-[#FF9800]/5 rounded-xl border border-[#FF9800]/10">
                <span className="text-[10px] font-black text-[#EF6C00] uppercase tracking-wider">羽化までの日数:</span>
                <span className="text-xl font-black text-[#EF6C00] leading-none">{daysUntilEmergence}</span>
                <span className="text-xs font-bold text-[#EF6C00]">日</span>
              </div>
            )}
            <Field label="成虫への紐づけ / 移動">
              <div className="space-y-2">
                {adultCandidates.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                      {adultCandidates.map((adult) => (
                        <button
                          key={adult.id}
                          type="button"
                          className="text-left px-3 py-2 rounded-xl border border-gray-200 bg-white/80 hover:bg-[#FF9800]/5 active:scale-[0.99] transition-all"
                          onClick={() => {
                            const memo = values.logs?.length
                              ? `幼虫時ログを紐づけ済み\n${values.logs.map((log) => `${log.date} / ${log.stage} / ${log.weight}g / ${log.temperature || "-"}℃`).join("\n")}`
                              : "幼虫時ログなし";
                            promoteLarvaToAdult(values.id || "", {
                              ...adult, // 既存の成虫データを引き継ぐ（サイズ、状態、後食日などを保持）
                              id: adult.id,
                              japaneseName: values.japaneseName,
                              scientificName: values.scientificName,
                              locality: values.locality,
                              // managementName: values.managementName, // This will be handled by promoteLarvaToAdult
                              generation: values.generation,
                              linkedEntryIds: Array.from(new Set([...((adult as AdultBeetle).linkedEntryIds || []), values.id || ""])),
                              emergenceDate: values.actualEmergenceDate || today(),
                              emergenceType: values.emergenceType,
                              feedingDate: (adult as AdultBeetle).feedingDate || "",
                              deathDate: (adult as AdultBeetle).deathDate || "",
                              larvaMemo: memo,
                              gender: values.logs?.[0]?.gender || "不明",
                              photos: adult.photos,
                            }, { adultId: adult.id, larvaMemo: memo });
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-bold text-gray-800">{adult.japaneseName}</div>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{adult.gender}</span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            羽化: {adult.emergenceDate || "不明"} {adult.managementName ? `/ ${adult.managementName}` : ""}
                          </div>
                          <div className="text-[10px] text-[#FF9800] mt-1 font-bold">この個体に幼虫データを統合</div>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="w-full px-3 py-2 rounded-xl bg-[#FF9800] text-white font-black text-sm shadow-sm active:scale-[0.99] transition-all"
                      onClick={() => {
                        const memo = values.logs?.length
                          ? `幼虫時ログ\n${values.logs.map((log) => `${log.date} / ${log.stage} / ${log.weight}g / ${log.temperature || "-"}℃`).join("\n")}`
                          : "幼虫時ログなし";
                        promoteLarvaToAdult(values.id || "", {
                          ...emptyAdultForm,
                          japaneseName: values.japaneseName,
                          scientificName: values.scientificName,
                          locality: values.locality,
                          generation: values.generation,
                          emergenceDate: values.actualEmergenceDate || today(),
                          emergenceType: values.emergenceType,
                          feedingDate: "",
                          deathDate: "",
                          larvaMemo: memo,
                          gender: values.logs?.[0]?.gender || "不明",
                          photos: values.photos,
                        }, { larvaMemo: memo });
                      }}
                    >
                      新規成虫として登録して移動
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full px-3 py-2 rounded-xl bg-[#FF9800] text-white font-black text-sm shadow-sm active:scale-[0.99] transition-all"
                    onClick={() => {
                      const memo = values.logs?.length
                        ? `幼虫時ログ\n${values.logs.map((log) => `${log.date} / ${log.stage} / ${log.weight}g / ${log.temperature || "-"}℃`).join("\n")}`
                        : "幼虫時ログなし";
                      promoteLarvaToAdult(values.id || "", {
                        ...emptyAdultForm,
                        japaneseName: values.japaneseName,
                        scientificName: values.scientificName,
                        locality: values.locality,
                        generation: values.generation,
                        emergenceDate: values.actualEmergenceDate || today(),
                        emergenceType: values.emergenceType,
                        feedingDate: "",
                        deathDate: "",
                        larvaMemo: memo,
                        gender: values.logs?.[0]?.gender || "不明",
                        photos: values.photos,
                      }, { larvaMemo: memo });
                    }}
                  >
                    新規成虫として登録して移動
                  </button>
                )}
              </div>
            </Field>
            <Field label="羽化/掘り出し">
              <div className="flex space-x-2">
                <button
                  type="button"
                  className={`flex-1 px-4 py-1.5 rounded-xl border font-bold text-sm transition-all select-none ${
                    values.emergenceType === "羽化" // Keep condition
                      ? "bg-[#FF9800] text-white border-[#FF9800] shadow-md shadow-[#FF9800]/20 scale-[1.02]"
                      : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white/80 active:scale-95"
                  }`}
                  onClick={() => setValues({ ...values, emergenceType: "羽化" })}
                >
                  羽化
                </button>
                <button
                  type="button"
                  className={`flex-1 px-4 py-1.5 rounded-xl border font-bold text-sm transition-all select-none ${
                    values.emergenceType === "掘り出し" // Keep condition
                      ? "bg-[#FF9800] text-white border-[#FF9800] shadow-md shadow-[#FF9800]/20 scale-[1.02]"
                      : "bg-white/60 border-gray-200 text-gray-600 hover:bg-white/80 active:scale-95"
                  }`}
                  onClick={() => setValues({ ...values, emergenceType: "掘り出し" })}
                >
                  掘り出し
                </button>
              </div>
            </Field>
          </div>
        )}
        </div>

        <div className="pt-2 border-t border-gray-50">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] font-black text-[#BCAAA4] uppercase tracking-widest border-l-4 border-[#FF9800] pl-3">飼育ログ</div>
          <button // Keep button
            type="button"
            onClick={addRecord}
            className="text-[10px] bg-[#FF9800] text-white px-4 py-1.5 rounded-full font-black shadow-sm active:scale-95 transition-all select-none"
          >
            + ログを追加
          </button>
        </div>

        {logStats && (
          <div className="bg-[#FF9800]/5 rounded-2xl p-2 border border-[#FF9800]/10 flex justify-around">
            <div className="text-center">
              <div className="text-[9px] font-black text-[#EF6C00] uppercase">最大体重</div>
              <div className="text-xl font-black text-[#EF6C00]">{logStats.maxWeight}<span className="text-xs ml-0.5">g</span></div>
            </div>
            <div className="w-px bg-[#FF9800]/20 my-1" />
            <div className="text-center">
              <div className="text-[9px] font-black text-[#EF6C00] uppercase">平均管理温度</div>
              <div className="text-xl font-black text-[#EF6C00]">{logStats.avgTemp}<span className="text-xs ml-0.5">℃</span></div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {values.logs?.map((record, index) => (
            <div key={index} className="relative p-2 bg-white rounded-xl border border-gray-100 shadow-sm space-y-1.5">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-xs font-black text-gray-400">LOG #{(values.logs?.length || 0) - index}</span>
                <button
                  type="button"
                  className="text-red-400 p-1 select-none"
                  onClick={() => {
                    const newLogs = [...(values.logs || [])];
                    newLogs.splice(index, 1);
                    setValues({ ...values, logs: newLogs });
                  }}
                >
                  <span className="text-[10px] font-bold">削除</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DateRollField
                  label="計測日"
                  id={`log-${index}-date`}
                  value={record.date}
                  onChange={(val) => {
                    const newLogs = [...(values.logs || [])];
                    newLogs[index] = { ...record, date: val };
                    setValues({ ...values, logs: newLogs });
                  }}
                />
                <Field label="体重 (g)">
                  <input
                    type="number"
                    step="0.1" // Keep step
                    value={record.weight}
                    inputMode="decimal"
                    enterKeyHint="next"
                    onKeyDown={(e) => e.key === 'Enter' && focusNextField()}
                      className="w-full bg-white/80 border border-gray-200 rounded-xl px-2 py-1.5 text-sm font-bold focus:border-[#FF9800] focus:ring-2 focus:ring-[#FF9800]/20 outline-none"
                    onChange={(e) => {
                      const newLogs = [...(values.logs || [])];
                      newLogs[index] = { ...record, weight: parseFloat(e.target.value) || 0 };
                      setValues({ ...values, logs: newLogs });
                    }}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="加齢状況">
                  <div className="flex bg-gray-100/50 p-1 rounded-xl">
                    {['L1', 'L2', 'L3'].map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all select-none ${record.stage === stage ? 'bg-white shadow-sm text-[#FF9800]' : 'text-gray-400'}`}
                        onClick={() => {
                          const newLogs = [...(values.logs || [])];
                          newLogs[index] = { ...record, stage: stage as LogStage };
                          setValues({ ...values, logs: newLogs });
                        }}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="雌雄">
                  <div className="flex bg-gray-100/50 p-1 rounded-xl">
                    {['♂', '♀', '不明'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all select-none ${record.gender === s ? 'bg-white shadow-sm text-[#FF9800]' : 'text-gray-400'}`}
                        onClick={() => {
                          const newLogs = [...(values.logs || [])];
                          newLogs[index] = { ...record, gender: s as Gender };
                          setValues({ ...values, logs: newLogs });
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <BottomSheetInput
                    id={`log-${index}-substrate`}
                    label="マット名"
                    value={record.substrate}
                    placeholder="マットの種類"
                    suggestions={suggestions.substrate}
                    onNext={focusNextField}
                    onChange={(val) => {
                      const newLogs = [...(values.logs || [])];
                      newLogs[index] = { ...record, substrate: val };
                      setValues({ ...values, logs: newLogs });
                    }}
                  />
                  <BottomSheetInput
                    id={`log-${index}-bottle`}
                    label="ボトルサイズ"
                    value={record.bottleSize}
                    placeholder="例: 800cc"
                    suggestions={suggestions.bottleSize}
                    onNext={focusNextField}
                    onChange={(val) => {
                      const newLogs = [...(values.logs || [])];
                      newLogs[index] = { ...record, bottleSize: val };
                      setValues({ ...values, logs: newLogs });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MoistureField
                    value={record.moisture}
                    onNext={focusNextField}
                    onChange={(val) => {
                      const newLogs = [...(values.logs || [])];
                      newLogs[index] = { ...record, moisture: val };
                      setValues({ ...values, logs: newLogs });
                    }}
                  />
                  <PressureField
                    value={record.pressure}
                    onNext={focusNextField}
                    onChange={(val) => {
                      const newLogs = [...(values.logs || [])];
                      newLogs[index] = { ...record, pressure: val };
                      setValues({ ...values, logs: newLogs });
                    }}
                  />
                </div>
                <BottomSheetInput
                  id={`log-${index}-temp`}
                  label="温度 (℃)"
                    value={record.temperature}
                    inputMode="decimal"
                    enterKeyHint="next"
                    onNext={focusNextField}
                    placeholder="温度"
                    suggestions={suggestions.temperature}
                    onChange={(val) => {
                      const newLogs = [...(values.logs || [])];
                      newLogs[index] = { ...record, temperature: val };
                      setValues({ ...values, logs: newLogs });
                    }}
                  />
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* ナビゲーションバー回避用のスペーサー */}
        <div className="h-32" />
      </div>
    </form>
  );
}
