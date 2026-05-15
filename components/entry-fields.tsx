"use client";

import { Thermometer, ChevronRight } from "lucide-react";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import {
  COHABITATION_OPTIONS,
  COUNT_OPTIONS,
  EMERGENCE_TYPES,
  GENERATION_COUNT_OPTIONS,
  GENERATION_PRIMARY,
  GENERATION_SECONDARY,
  GENDERS,
  LOG_STAGES,
  MOISTURE_LEVELS,
  PRESSURE_LEVELS,
  type CohabitationOption,
  type EmergenceType,
  type Gender,
  type GenerationValue,
  type LogStage,
  type EntryType,
} from "@/types/beetle";
import { buildDateFromParts, createDateOptions, splitDate, today } from "@/lib/utils";

const dateOptions = createDateOptions();

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="text-[10px] font-black text-purple-400/70 mb-2 block tracking-[0.2em] uppercase ml-1 italic">{label}</span>
      {children}
    </label>
  );
}


interface DrumrollPickerProps<T> {
  options: readonly T[];
  value: T;
  onChange: (value: string) => void;
  id?: string; // idプロパティを追加
}

function DrumrollPicker<T extends string | number>({ options, value, onChange, id }: DrumrollPickerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 初期表示時に選択値までスクロール
  useEffect(() => {
    const index = options.findIndex(o => String(o) === String(value));
    if (index !== -1 && scrollRef.current) {
      const targetScroll = index * 28;
      if (scrollRef.current.scrollTop !== targetScroll) {
        scrollRef.current.scrollTop = targetScroll;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]); // 初期マウント時のみ。value変更での再スクロールはループを防ぐため除外

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // スクロール干渉を抑えるため、スクロールが止まってから値を確定させる
    if (timerRef.current) clearTimeout(timerRef.current);

    const container = e.currentTarget;
    timerRef.current = setTimeout(() => {
      const index = Math.round(container.scrollTop / 28);
      if (options[index] !== undefined && String(options[index]) !== String(value)) {
        onChange(String(options[index]));
      }
    }, 80); // 80ms に短縮してレスポンスを向上
  };

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      id={id}
      onScroll={handleScroll} // Keep scroll handling
      className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[36px] overscroll-contain touch-pan-y"
    >
      {options.map((option) => (
        <div key={option} className="h-7 flex items-center justify-center snap-center text-sm font-black text-purple-100/90">
          {option}
        </div>
      ))}
    </div>
  );
}

function PickerContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[110px] bg-black/40 rounded-[24px] overflow-hidden border border-purple-500/10 shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)] flex">
      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f17] via-transparent to-[#0f0f17] pointer-events-none z-10" />
      
      {/* Center highlight */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-[94%] h-8 border-y border-purple-500/20 bg-purple-900/10 rounded-xl" />
      </div>
      {children}
    </div>
  );
}

export function WheelSelect({
  label,
  value,
  options,
  onChange,
  id,
  onNext,
}: {
  label: string;
  value: string | number;
  options: readonly (string | number)[];
  onChange: (value: string) => void;
  id?: string;
  onNext?: () => void;
}) {
  return (
    <Field label={label}>
      <PickerContainer>
        <DrumrollPicker options={options} value={value} onChange={onChange} id={id} />
      </PickerContainer>
    </Field>
  );
}

export function DateRollField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = useMemo(() => splitDate(value), [value]);
  const currentParts = useMemo(() => {
    const p = splitDate(today());
    return { ...p, day: "上" };
  }, []);

  // 初期表示時に値が空、または不完全（"-"が含まれる）なら、
  // 現在の年月日を初期値として親に反映させて保存漏れを防ぐ
  useEffect(() => {
    // 値が完全に空（""）の場合は、意図的な未設定（継続中など）として扱い、勝手に補完しない。
    // これにより「産卵終了」チェックボックス解除などの挙動を正常化する。
    if (value === "" || value === "-") {
      return; // "-" も意図的な未設定として扱い、自動補完しない
    }

    // 日付の一部のみが入力されている（"-"が含まれる）場合は、残りを現在のデフォルト値で補完する。
    if (parts.year === "-" || parts.month === "-" || parts.day === "-") {
      const completedDate = buildDateFromParts(
        parts.year !== "-" ? parts.year : currentParts.year, // Use existing part, or current year
        parts.month !== "-" ? parts.month : currentParts.month, // Use existing part, or current month
        parts.day !== "-" ? parts.day : currentParts.day // Use existing part, or current day
      );
      if (completedDate && completedDate !== value) {
        onChange(completedDate);
      }
    }
  }, [value, parts, currentParts, onChange]);

  return (
    <div className="field">
      <div className="mb-2">
        <span className="text-[11px] font-bold text-[var(--secondary)] tracking-wider uppercase">{label}</span>
      </div>
      <PickerContainer>
        <DrumrollPicker
          options={dateOptions.years}
          id={`${id}-year`} // Pass id to DrumrollPicker
          value={parts.year !== "-" ? parts.year : currentParts.year}
          onChange={(v) => {
            const m = parts.month !== "-" ? parts.month : currentParts.month;
            const d = parts.day !== "-" ? parts.day : currentParts.day;
            onChange(buildDateFromParts(v, m, d));
          }}
        />
        <div className="w-[1px] h-full bg-gray-100/50" />
        <DrumrollPicker
          options={dateOptions.months}
          id={`${id}-month`} // Pass id to DrumrollPicker
          value={parts.month !== "-" ? parts.month : currentParts.month}
          onChange={(v) => {
            const y = parts.year !== "-" ? parts.year : currentParts.year;
            const d = parts.day !== "-" ? parts.day : currentParts.day;
            onChange(buildDateFromParts(y, v, d));
          }}
        />
        <div className="w-[1px] h-full bg-gray-100/50" />
        <DrumrollPicker
          options={dateOptions.days}
          id={`${id}-day`} // Pass id to DrumrollPicker
          value={parts.day !== "-" ? parts.day : currentParts.day}
          onChange={(v) => {
            const y = parts.year !== "-" ? parts.year : currentParts.year;
            const m = parts.month !== "-" ? parts.month : currentParts.month;
            onChange(buildDateFromParts(y, m, v));
          }}
        />
      </PickerContainer>
    </div>
  );
}

export function GenerationRollField({
  value,
  labelSuffix = "",
  onChange,
}: {
  value: GenerationValue;
  labelSuffix?: string;
  onChange: (value: GenerationValue) => void;
}) {
  const preview = useMemo(() => buildGenerationLabel(value), [value]);

  return (
    <div className="field">
      <span className="text-[10px] font-black text-purple-400/70 mb-1.5 block tracking-[0.2em] uppercase ml-1 italic">累代 {labelSuffix}</span>
      <PickerContainer>
        <DrumrollPicker
          options={GENERATION_PRIMARY}
          value={value.primary}
          onChange={(v) => onChange({ ...value, primary: v as GenerationValue["primary"] })}
        />
        <div className="w-[1px] h-full bg-gray-100/50" />
        <DrumrollPicker
          options={["-", ...GENERATION_COUNT_OPTIONS]}
          value={value.count || "-"}
          onChange={(v) => onChange({ ...value, count: v === "-" ? "" : v })}
        />
      </PickerContainer>
      <p className="field-note text-purple-400/40 text-[9px] mt-1 ml-1 tracking-widest">Signet: {preview}</p>
    </div>
  );
}

export function CountRollField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <WheelSelect
      label="登録頭数"
      value={value}
      options={COUNT_OPTIONS}
      onChange={(nextValue) => onChange(Number(nextValue))}
    />
  );
}

export function LevelButtonGroup({
  label,
  value,
  values,
  onChange,
  onNext,
}: {
  label: string;
  value: number;
  values: readonly number[];
  onChange: (value: number) => void;
  onNext?: () => void;
}) {
  return (
    <div className="field">
      <span className="text-[10px] font-black text-purple-400/70 mb-1.5 block tracking-[0.2em] uppercase ml-1 italic">{label}</span>
      <div className="flex bg-white/5 rounded-xl p-1 gap-1 border border-white/5">
        {values.map((option) => (
          <button // Keep button
            key={option}
            type="button"
            style={{ width: `${100 / values.length}%` }}
            className={`py-1 text-xs font-black rounded-lg transition-all ${option === value ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "text-gray-500 hover:text-gray-300"}`}
            onClick={() => {
              onChange(option);
              if (onNext) {
                setTimeout(onNext, 10);
              }
            }}
          >
            {option}
          </button>
        ))}
      </div> {/* Keep div */}
    </div>
  );
}

export function BottomSheetSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  id,
  onNext,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onNext?: () => void;
  placeholder?: string;
  id?: string;
}) {
  const internalId = useMemo(() => id || `select-${label.replace(/\s+/g, '-')}`, [id, label]);
  const [isOpen, setIsOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center' });
    }

    const handleViewport = () => {
      if (!window.visualViewport || !isOpen || !containerRef.current) return;
      containerRef.current.style.height = `${window.visualViewport.height}px`;
      containerRef.current.style.top = `${window.visualViewport.offsetTop}px`;
    };

    const handleFocusOut = (e: FocusEvent) => {
      setTimeout(() => {
        const nextFocus = document.activeElement;
        const trigger = document.getElementById(`${internalId}-trigger`);
        if (
          containerRef.current && 
          !containerRef.current.contains(nextFocus) && 
          nextFocus !== trigger
        ) {
          setIsOpen(false);
        }
      }, 100);
    };

    const handleSync = (e: any) => {
      if (e.detail.sourceId !== internalId || e.detail.forceClose) {
        setIsOpen(false);
      }
    };

    window.dispatchEvent(new CustomEvent('app:close-bottom-sheets', { detail: { sourceId: internalId } }));
    window.addEventListener('app:close-bottom-sheets', handleSync);
    // フォーム全体が閉じられた時のためのグローバルクリーンアップ
    const handleGlobalClose = () => setIsOpen(false);
    window.addEventListener('app:close-all-sheets', handleGlobalClose);

    window.visualViewport?.addEventListener('resize', handleViewport);
    window.visualViewport?.addEventListener('scroll', handleViewport);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('app:close-bottom-sheets', handleSync);
      window.removeEventListener('app:close-all-sheets', handleGlobalClose);
      window.visualViewport?.removeEventListener('resize', handleViewport);
      window.visualViewport?.removeEventListener('scroll', handleViewport);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [isOpen, internalId]);

  return (
    <div className="field">
      <span className="text-[10px] font-black text-purple-400/70 mb-1.5 block tracking-[0.2em] uppercase ml-1 italic">{label}</span>
      <input
        type="text"
        readOnly
        inputMode="none"
        id={`${internalId}-trigger`}
        value={String(value)}
        autoComplete="off"
        placeholder={placeholder}
        className={`w-full bg-white/5 border rounded-xl px-3 py-1.5 text-sm text-left text-gray-300 min-h-[34px] transition-all outline-none cursor-pointer ${
          isOpen 
            ? "border-purple-500/50 ring-4 ring-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
            : "border-white/10 active:bg-white/10"
        }`}
        onFocus={() => setIsOpen(true)}
        onClick={() => {
          window.dispatchEvent(new CustomEvent('app:close-bottom-sheets', { detail: { sourceId: internalId } }));
          setIsOpen(true);
        }}
      />

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <div 
              ref={containerRef}
              className="fixed inset-0 z-[110] flex items-start justify-center pointer-events-none overscroll-none"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ y: "-100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#1a1a24]/95 backdrop-blur-2xl w-full max-w-md rounded-b-[40px] p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-6 pointer-events-auto z-10 border-b border-purple-500/10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] italic">{label} Selection</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="bg-white/5 border border-white/10 text-gray-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase"
                      onClick={() => setIsOpen(false)}
                    >
                      閉じる
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {options.map((option) => (
                    <button
                      key={option}
                      ref={value === option ? selectedRef : null}
                      type="button"
                      className={`w-full text-left px-5 py-4 rounded-[20px] font-black text-sm transition-all border ${ 
                        value === option ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[1.02]" : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10"
                      }`}
                      onMouseDown={(e) => e.preventDefault()} // フォーカス移動を防いでキーボードを維持
                      onClick={(e) => {
                        e.preventDefault();
                        onChange(option);
                        if (onNext) {
                          onNext(); // 次の項目へ（syncイベントで自分は閉じる）
                        } else {
                          setIsOpen(false);
                        }
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BottomSheetInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  suggestions,
  enterKeyHint,
  id,
  onNext,
  inputMode,
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: "text" | "textarea" | "password";
  suggestions?: string[];
  enterKeyHint?: "next" | "done" | "send" | "search" | "go";
  onNext?: () => void;
  id?: string; // Add id prop
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
}) {
  const internalId = useMemo(() => id || `input-${label.replace(/\s+/g, '-')}`, [id, label]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 入力ボトムシートが開いた際に自動でフォーカスを当て、キーボードを即座に表示する
    const focusTimer = setTimeout(() => {
      if (isOpen && inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }
    }, 150);

    // キーボード展開時のレイアウト固定
    const handleViewport = () => {
      if (!window.visualViewport || !isOpen) return;
      
      if (containerRef.current) {
        containerRef.current.style.height = `${window.visualViewport.height}px`;
        containerRef.current.style.top = `${window.visualViewport.offsetTop}px`;
      }

    };

    const handleSync = (e: any) => {
      if (e.detail.sourceId !== internalId || e.detail.forceClose) {
        setIsOpen(false);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if (!isOpen) return;
      // モーダル外（かつトリガー以外）にフォーカスが移った場合にモーダルを閉じる
      // これにより、キーボードの「次へ」「完了」での遷移時や、
      // キーボードを閉じた際にモーダルが残留するのを防ぐ
      setTimeout(() => {
        const nextFocus = document.activeElement;
        const trigger = document.getElementById(`${internalId}-trigger`);
        if (
          containerRef.current && 
          !containerRef.current.contains(nextFocus) && 
          nextFocus !== trigger
        ) {
          setIsOpen(false);
        }
      }, 100);
    };

    if (isOpen) {
      window.dispatchEvent(new CustomEvent('app:close-bottom-sheets', { detail: { sourceId: internalId } }));
    }

    window.addEventListener('app:close-bottom-sheets', handleSync);
    // フォーム全体が閉じられた時のためのグローバルクリーンアップ
    const handleGlobalClose = () => setIsOpen(false);
    window.addEventListener('app:close-all-sheets', handleGlobalClose);

    window.visualViewport?.addEventListener('resize', handleViewport);
    window.visualViewport?.addEventListener('scroll', handleViewport);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('app:close-bottom-sheets', handleSync);
      window.removeEventListener('app:close-all-sheets', handleGlobalClose);
      window.visualViewport?.removeEventListener('resize', handleViewport);
      window.visualViewport?.removeEventListener('scroll', handleViewport);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [isOpen, internalId]);

  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];
    const search = String(value).toLowerCase();
    if (!search) return suggestions.slice(0, 15);
    return suggestions.filter(s => s.toLowerCase().includes(search)).slice(0, 15);
  }, [suggestions, value]);

  return (
    <div className="field">
      <span className="text-[10px] font-black text-purple-400/70 mb-1.5 block tracking-[0.2em] uppercase ml-1 italic">{label}</span>
      <input
        type="text"
        readOnly
        id={`${internalId}-trigger`}
        inputMode="none"
        value={value}
        placeholder={placeholder}
        className={`w-full bg-white/5 border rounded-xl px-3 py-1.5 text-sm text-left text-gray-300 min-h-[34px] transition-all outline-none cursor-pointer ${
          isOpen 
            ? "border-purple-500/50 ring-4 ring-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
            : "border-white/10 active:bg-white/10"
        }`}
        onFocus={() => {
          window.dispatchEvent(new CustomEvent('app:close-bottom-sheets', { detail: { sourceId: internalId } }));
          setIsOpen(true);
        }}
        onClick={() => {
          window.dispatchEvent(new CustomEvent('app:close-bottom-sheets', { detail: { sourceId: internalId } }));
          setIsOpen(true);
        }}
      />

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <div 
              ref={containerRef}
              className="fixed inset-0 z-[110] flex items-start justify-center pointer-events-none overscroll-none"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ y: "-100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#1a1a24] border-b border-purple-500/10 w-full max-w-md rounded-b-3xl p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] shadow-[0_20px_60px_rgba(0,0,0,0.6)] space-y-4 pointer-events-auto z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] italic">{label} Entry</span>
                  <button
                    id={id ? `${id}-done-button` : undefined} // Add id to done button
                    type="button"
                    className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    onClick={() => {
                      setIsOpen(false);
                      // モーダルを閉じた後に必要なら次へ
                      if (onNext) setTimeout(onNext, 50);
                    }}
                  >
                    完了
                  </button>
                </div>
                {type === "textarea" ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    id={internalId} // Pass id to textarea
                    tabIndex={0} // Explicitly make focusable
                    value={value}
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(e) => onChange(e.target.value)}
                    enterKeyHint={enterKeyHint || "done"}
                    placeholder={placeholder} // Keep placeholder
                    rows={5}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-[16px] text-gray-200 focus:bg-black/60 focus:border-purple-500/50 outline-none transition-all shadow-inner"
                  />
                ) : (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    id={internalId} // Pass id to input
                    tabIndex={0} // Explicitly make focusable
                    type={type}
                    value={value !== undefined ? value : ""}
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                      // Enterキー（次へ/完了）が押されたらモーダルを閉じる
                      // その後、useNextFieldNavigation がフォーカス移動を処理する
                      if (e.key === 'Enter') {
                        setIsOpen(false);
                      }
                    }}
                    enterKeyHint={enterKeyHint || "next"}
                    inputMode={inputMode}
                    placeholder={placeholder} // Keep placeholder
                    className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-[16px] text-gray-200 focus:bg-black/60 focus:border-purple-500/50 outline-none transition-all shadow-inner"
                  />
                )}

                {filteredSuggestions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">辞書・履歴</p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 py-1">
                      {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion} // Keep key
                          type="button"
                          className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-black text-gray-500 active:bg-purple-600 active:text-white transition-all hover:bg-white/10 hover:text-gray-300"
                          onMouseDown={(e) => e.preventDefault()} // フォーカス移動を防いでキーボードを維持
                          onClick={() => {
                            onChange(suggestion);
                            if (onNext) {
                              onNext(); // 次の項目へ（syncイベントで自分は閉じる）
                            } else {
                              setIsOpen(false);
                            }
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MoistureField(props: { value: number; onChange: (value: number) => void; onNext?: () => void }) {
  return <LevelButtonGroup label="水分量" values={MOISTURE_LEVELS} value={props.value} onChange={props.onChange} onNext={props.onNext} />;
}

export function PressureField(props: { value: number; onChange: (value: number) => void; onNext?: () => void }) {
  return <LevelButtonGroup label="詰圧" values={PRESSURE_LEVELS} value={props.value} onChange={props.onChange} onNext={props.onNext} />;
}

export function SwitchBotTemperatureField({
  id, // Add id prop
  value,
  onChange,
  onFetch,
  isFetching,
  suggestions,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  onFetch: () => void;
  id?: string; // Add id prop
  isFetching: boolean;
  suggestions?: string[];
  onNext?: () => void;
}) {
  return (
    <div className="field">
      <BottomSheetInput
        label="温度 (℃)"
        value={value}
        inputMode="decimal"
        enterKeyHint="next"
        placeholder="例: 22.5 や 21〜23"
        suggestions={suggestions}
        onNext={onNext}
        onChange={onChange}
      />
      <button type="button" className="relative -mt-9 ml-auto mr-12 block text-[#FF9800] p-2 z-10" onClick={onFetch}>
        <Thermometer size={18} className={isFetching ? "spin" : undefined} />
      </button>
    </div>
  );
}

export function EmergenceTypeField({
  value,
  onChange,
  id, // Add id prop
}: {
  value: EmergenceType;
  onChange: (value: EmergenceType) => void;
  id?: string;
}) {
  return (
    <div className="field">
      <span className="text-[12px] font-bold text-[#A67C52] mb-2 block uppercase tracking-wider">羽化区分</span>
      <div className="flex bg-[#F5F0EB] rounded-xl p-1 gap-1">
        {(EMERGENCE_TYPES as unknown as string[]).map((option) => (
          <button
            id={`${id}-${option}`} // Add id to button
            key={option} // Keep key
            type="button"
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${option === value ? "bg-[#FF9800] text-white shadow-sm" : "text-gray-500"}`}
            onClick={() => onChange(option as EmergenceType)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GenderField({
  value,
  onChange,
  id, // Add id prop
  onNext,
}: {
  value: Gender;
  onChange: (value: Gender) => void;
  id?: string;
  onNext?: () => void;
}) {
  return (
    <WheelSelect
      label="雌雄"
      id={id} // Pass id to WheelSelect
      value={value}
      onNext={onNext}
      options={GENDERS}
      onChange={(value) => onChange(value as Gender)}
    />
  );
}

export function LarvaStageField({
  value,
  onChange,
  id, // Add id prop
  onNext,
}: {
  value: LogStage;
  onChange: (value: LogStage) => void;
  id?: string;
  onNext?: () => void;
}) {
  return (
    <WheelSelect
      label="加齢状況"
      id={id} // Pass id to WheelSelect
      value={value}
      onNext={onNext}
      options={LOG_STAGES}
      onChange={(value) => onChange(value as LogStage)}
    />
  );
}

export function CohabitationField({
  value,
  onChange,
  id, // Add id prop
  onNext,
}: {
  value: CohabitationOption;
  onChange: (value: CohabitationOption) => void;
  id?: string;
  onNext?: () => void;
}) {
  return (
    <WheelSelect
      label="同居の有無"
      id={id} // Pass id to WheelSelect
      value={value}
      onNext={onNext}
      options={COHABITATION_OPTIONS}
      onChange={(value) => onChange(value as CohabitationOption)}
    />
  );
}

export const buildGenerationLabel = (value: GenerationValue) =>
  value.primary !== "-" ? `${value.primary}${value.count || ""}` : "-";

export function useNextFieldNavigation(formId: string, isModalOpen: boolean) {
  const [isLastField, setIsLastField] = useState(false);

  const focusDone = useCallback(() => {
    (document.activeElement as HTMLElement)?.blur();
  }, []);

  const focusNextField = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    
    const focusable = Array.from(
      form.querySelectorAll('input:not([type="hidden"]), textarea, button:not([disabled]):not([type="submit"]), div[tabIndex="0"]')
    ) as HTMLElement[];
    
    let activeIndex = focusable.indexOf(activeElement);

    // 現在の要素がポータル内（IDに -trigger がない）の場合、トリガー側を探す
    if (activeIndex === -1 && activeElement?.id) {
      const triggerId = `${activeElement.id}-trigger`;
      activeIndex = focusable.findIndex(el => el.id === triggerId);
    }

    if (activeIndex > -1) {
      if (activeIndex < focusable.length - 1) {
        // ボトムシート内からの遷移、または次の項目への移動時に既存のシートをすべて閉じる
        window.dispatchEvent(new CustomEvent('app:close-bottom-sheets', { detail: { sourceId: 'navigation', forceClose: true } }));

        const nextElement = focusable[activeIndex + 1];
        // iOSのキーボードレイアウト崩れを防ぐために微小な遅延を入れる
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (nextElement instanceof HTMLElement) {
              nextElement.focus();
              if (nextElement.tagName === 'INPUT' && (nextElement as HTMLInputElement).readOnly) {
                nextElement.click();
              }
            }
          }, 10);
        });
      } else {
        // 最後の項目の場合はキーボードを閉じる
        focusDone();
      }
    }
  }, [formId, focusDone]);

  const focusPreviousField = useCallback(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const focusable = Array.from(
      form.querySelectorAll('input:not([type="hidden"]), textarea, button:not([disabled]):not([type="submit"]), div[tabIndex="0"]')
    ) as HTMLElement[];

    const activeElement = document.activeElement as HTMLElement;
    let activeIndex = focusable.indexOf(activeElement);

    // Current element might be in a Portal, find its trigger
    if (activeIndex === -1 && activeElement?.id) {
      const triggerId = `${activeElement.id}-trigger`;
      activeIndex = focusable.findIndex(el => el.id === triggerId);
    }

    if (activeIndex > 0) { // Move to previous, if not the first
      const prevElement = focusable[activeIndex - 1];
      if (prevElement) {
        prevElement.focus();
        // If previous is a trigger, click it to open its modal
        if (prevElement.tagName === 'INPUT' && (prevElement as HTMLInputElement).readOnly) {
          prevElement.click();
        }
      }
    }
  }, [formId]);

  useEffect(() => {
    const handleFocus = () => {
      const form = document.getElementById(formId);
      if (!form) return;
      
      const focusable = Array.from(
        form.querySelectorAll('input:not([type="hidden"]), textarea, button:not([disabled]):not([type="submit"]), div[tabIndex="0"]')
      ) as HTMLElement[];
      
      const activeElement = document.activeElement as HTMLElement;
      let activeIndex = focusable.indexOf(activeElement);

      // ポータル内の要素も考慮して判定
      if (activeIndex === -1 && activeElement?.id) {
        const triggerId = `${activeElement.id}-trigger`;
        activeIndex = focusable.findIndex(el => el.id === triggerId);
      }

      setIsLastField(activeIndex >= focusable.length - 1);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA') return; // メモ欄での改行は許可

        const form = document.getElementById(formId);
        if (!form) return;

        // フォーム内またはID紐付けされたポータル入力からのEnterを検知
        const isInside = form.contains(target);
        const isPortalInput = target.id && !!document.getElementById(`${target.id}-trigger`);

        if (isInside || isPortalInput) {
          e.preventDefault();
          focusNextField();
        }
      } else if (e.key === 'ArrowDown') {
        const form = document.getElementById(formId);
        if (!form) return;
        const target = e.target as HTMLElement;
        const isInside = form.contains(target);
        const isPortalInput = target.id && !!document.getElementById(`${target.id}-trigger`);
        if (isModalOpen && (isInside || isPortalInput)) {
          e.preventDefault();
          focusNextField();
        }
      } else if (e.key === 'ArrowUp') {
        const form = document.getElementById(formId);
        if (!form) return;
        const target = e.target as HTMLElement;
        const isInside = form.contains(target);
        const isPortalInput = target.id && !!document.getElementById(`${target.id}-trigger`);
        if (isModalOpen && (isInside || isPortalInput)) {
          e.preventDefault();
          focusPreviousField();
        }
      }
    };

    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('focusin', handleFocus);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocus);
    };
  }, [formId, isModalOpen, focusNextField, focusPreviousField]);

  return { isLastField, focusNextField, focusDone, focusPreviousField };
}
