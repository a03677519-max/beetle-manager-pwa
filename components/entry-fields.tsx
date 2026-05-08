"use client";

import { Thermometer, ChevronRight } from "lucide-react";
import { useMemo, useRef, useEffect, useState } from "react";
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
      <span className="text-[12px] font-bold text-[#A67C52] mb-2 block tracking-wider uppercase">{label}</span>
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
    const index = options.indexOf(value);
    if (index !== -1 && scrollRef.current) {
      const targetScroll = index * 28;
      if (scrollRef.current.scrollTop !== targetScroll) {
        scrollRef.current.scrollTop = targetScroll;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]); // 初期マウント時のみ。value変更での再スクロールはループを防ぐため除外

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
      id={id}
      onScroll={handleScroll} // Keep scroll handling
      className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[36px] overscroll-contain touch-pan-y"
    >
      {options.map((option) => (
        <div key={option} className="h-7 flex items-center justify-center snap-center text-sm font-bold text-gray-700">
          {option}
        </div>
      ))}
    </div>
  );
}

function PickerContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[100px] bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-inner flex">
      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-transparent to-white/90 pointer-events-none z-10" />
      
      {/* Center highlight */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-[96%] h-7 border-y border-[#FF9800]/20 bg-[#FF9800]/5 rounded-lg" />
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
}: {
  label: string;
  value: string | number;
  options: readonly (string | number)[];
  onChange: (value: string) => void;
  id?: string;
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
  const currentParts = useMemo(() => splitDate(today()), []);

  // 初期表示時に値が空、または不完全（"-"が含まれる）なら、
  // 現在の年月日を初期値として親に反映させて保存漏れを防ぐ
  useEffect(() => {
    // If the value is explicitly empty, do not try to "fix" it to today's date.
    // This allows forms to have genuinely empty date fields.
    if (value === "") return;

    // If the date is incomplete, try to complete it with current date parts.
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
  onChange,
}: {
  value: GenerationValue;
  onChange: (value: GenerationValue) => void;
}) {
  const preview = useMemo(() => buildGenerationLabel(value), [value]);

  return (
    <div className="field">
      <span className="text-[11px] font-bold text-[#A67C52] mb-1.5 block tracking-wider uppercase">累代</span>
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
      <p className="field-note">表示: {preview}</p>
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
}: {
  label: string;
  value: number;
  values: readonly number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <span className="text-[11px] font-bold text-[#A67C52] mb-1.5 block uppercase tracking-wider">{label}</span>
      <div className="flex bg-[#F5F0EB] rounded-xl p-1 gap-1">
        {values.map((option) => (
          <button // Keep button
            key={option}
            type="button"
            style={{ width: `${100 / values.length}%` }}
            className={`py-1 text-sm font-bold rounded-lg transition-all ${option === value ? "bg-[#FF9800] text-white shadow-sm" : "text-gray-500"}`}
            onClick={() => onChange(option)}
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
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);

  return (
    <div className="field">
      <span className="text-[11px] font-bold text-[#A67C52] mb-1.5 block tracking-wider uppercase">{label}</span>
      <button // Keep button
        type="button"
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-left text-gray-700 min-h-[34px] transition-colors active:bg-gray-50"
        onClick={() => setIsOpen(true)}
      >
        {value || <span className="text-gray-300">{placeholder}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl space-y-4 pointer-events-auto z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-bold text-[#A67C52] uppercase tracking-wider">{label}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="bg-gray-100 text-gray-500 px-4 py-1.5 rounded-full text-xs font-bold"
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
                      className={`w-full text-left px-4 py-3 rounded-2xl font-bold ${ // Keep button
                        value === option ? "bg-[#FF9800] text-white" : "bg-gray-50 text-gray-700"
                      }`}
                      onClick={() => {
                        onChange(option);
                        setIsOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="h-[env(safe-area-inset-bottom,16px)]" />
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
  inputMode,
}: {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: "text" | "textarea" | "password";
  suggestions?: string[];
  enterKeyHint?: "next" | "done" | "send" | "search" | "go";
  id?: string; // Add id prop
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];
    const search = String(value).toLowerCase();
    if (!search) return suggestions.slice(0, 15);
    return suggestions.filter(s => s.toLowerCase().includes(search)).slice(0, 15);
  }, [suggestions, value]);

  return (
    <div className="field">
      <span className="text-[11px] font-bold text-[#A67C52] mb-1.5 block tracking-wider uppercase">{label}</span>
      <button // Keep button
        type="button"
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-left text-gray-700 min-h-[34px] transition-colors active:bg-gray-50"
        onClick={() => setIsOpen(true)}
      >
        {value || <span className="text-gray-300">{placeholder}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl space-y-4 pointer-events-auto z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold text-[#A67C52] uppercase tracking-wider">{label}</span>
                  <button
                    id={`${id}-done-button`} // Add id to done button
                    type="button"
                    className="bg-[#FF9800] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    完了
                  </button>
                </div>
                {type === "textarea" ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    id={id} // Pass id to textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    enterKeyHint={enterKeyHint || "done"}
                    placeholder={placeholder} // Keep placeholder
                    rows={5}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-[16px] focus:bg-white focus:border-[#FF9800] outline-none transition-all"
                  />
                ) : (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    id={id} // Pass id to input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    enterKeyHint={enterKeyHint || "next"}
                    inputMode={inputMode}
                    placeholder={placeholder} // Keep placeholder
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 text-[16px] focus:bg-white focus:border-[#FF9800] outline-none transition-all"
                  />
                )}

                {filteredSuggestions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">辞書・履歴</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion} // Keep key
                          type="button"
                          className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold text-gray-600 active:bg-[#FF9800] active:text-white transition-all"
                          onClick={() => onChange(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="h-[env(safe-area-inset-bottom,16px)]" />
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MoistureField(props: { value: number; onChange: (value: number) => void }) {
  return <LevelButtonGroup label="水分量" values={MOISTURE_LEVELS} value={props.value} onChange={props.onChange} />;
}

export function PressureField(props: { value: number; onChange: (value: number) => void }) {
  return <LevelButtonGroup label="詰圧" values={PRESSURE_LEVELS} value={props.value} onChange={props.onChange} />;
}

export function SwitchBotTemperatureField({
  id, // Add id prop
  value,
  onChange,
  onFetch,
  isFetching,
}: {
  value: string;
  onChange: (value: string) => void;
  onFetch: () => void;
  id?: string; // Add id prop
  isFetching: boolean;
}) {
  return (
    <div className="field">
      <span className="text-[11px] font-bold text-[#A67C52] mb-1 block uppercase tracking-wider">温度 (℃)</span>
      <div className="relative">
        <input 
          id={id} // Pass id to input
          className="w-full h-[36px] px-3 rounded-xl border border-[#DEE2E6] focus:border-[#FF9800] focus:ring-1 focus:ring-[#FF9800] outline-none text-sm placeholder:text-gray-300"
          value={value} // Keep value
          onChange={(event) => onChange(event.target.value)} 
          inputMode="decimal"
          enterKeyHint="next"
          placeholder="例: 22.5 や 21〜23" 
        />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FF9800] p-2" onClick={onFetch}>
          <Thermometer size={18} className={isFetching ? "spin" : undefined} />
        </button>
      </div>
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
}: {
  value: Gender;
  onChange: (value: Gender) => void;
  id?: string;
}) {
  return (
    <WheelSelect
      label="雌雄"
      id={id} // Pass id to WheelSelect
      value={value}
      options={GENDERS}
      onChange={(value) => onChange(value as Gender)}
    />
  );
}

export function LarvaStageField({
  value,
  onChange,
  id, // Add id prop
}: {
  value: LogStage;
  onChange: (value: LogStage) => void;
  id?: string;
}) {
  return (
    <WheelSelect
      label="加齢状況"
      id={id} // Pass id to WheelSelect
      value={value}
      options={LOG_STAGES}
      onChange={(value) => onChange(value as LogStage)}
    />
  );
}

export function CohabitationField({
  value,
  onChange,
  id, // Add id prop
}: {
  value: CohabitationOption;
  onChange: (value: CohabitationOption) => void;
  id?: string;
}) {
  return (
    <WheelSelect
      label="同居の有無"
      id={id} // Pass id to WheelSelect
      value={value}
      options={COHABITATION_OPTIONS}
      onChange={(value) => onChange(value as CohabitationOption)}
    />
  );
}

export const buildGenerationLabel = (value: GenerationValue) =>
  value.primary !== "-" ? `${value.primary}${value.count || ""}` : "-";


interface NextFieldButtonProps {
  formId: string;
  onNext: () => void;
  onDone: () => void;
  isLastField: boolean;
  isModalOpen: boolean;
}

export function NextFieldButton({ formId, onNext, onDone, isLastField, isModalOpen }: NextFieldButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const handleFocusIn = () => {
      setActiveElement(document.activeElement as HTMLElement);
    };

    const handleFocusOut = () => {
      setActiveElement(null);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      setIsVisible(false);
      return;
    }

    const form = document.getElementById(formId);
    if (!form || !activeElement) {
      setIsVisible(false);
      return;
    }

    // フォーム内にあるか、もしくはポータル内の入力フィールドを判定
    const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
    const isInsideForm = form.contains(activeElement);
    const isNavigable = isInput || (activeElement.tagName === 'BUTTON' && isInsideForm);
    
    // テキストエリアの場合は表示しない（改行を優先するため）
    if (activeElement.tagName === 'TEXTAREA') {
      setIsVisible(false);
      return;
    }

    setIsVisible(isNavigable);
  }, [activeElement, formId, isModalOpen]);

  if (!isVisible) return null;

  return (
    <Portal>
      <motion.button
        type="button"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom,16px)+64px)] left-4 bg-white/95 backdrop-blur-md border border-gray-100 text-[#FF9800] px-4 py-2 rounded-2xl shadow-xl z-[100] active:scale-95 transition-all flex items-center gap-1"
        onMouseDown={(e) => e.preventDefault()}
        onClick={isLastField ? onDone : onNext}
      >
        <ChevronRight size={20} strokeWidth={3} />
        <span className="text-[10px] font-black tracking-tighter uppercase">{isLastField ? "完了" : "次へ"}</span>
      </motion.button>
    </Portal>
  );
}

export function useNextFieldNavigation(formId: string, isModalOpen: boolean) {
  const [isLastField, setIsLastField] = useState(false);

  useEffect(() => {
    const handleFocus = () => {
      const form = document.getElementById(formId);
      if (!form) return;
      
      const focusable = Array.from(
        form.querySelectorAll('input:not([type="hidden"]), textarea, button:not([disabled])')
      ) as HTMLElement[];
      
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
      setIsLastField(activeIndex >= focusable.length - 1);
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, [formId]);

  const focusNextField = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const focusable = Array.from(
      form.querySelectorAll('input:not([type="hidden"]), textarea, button:not([disabled])')
    ) as HTMLElement[];
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (activeIndex > -1 && activeIndex < focusable.length - 1) {
      focusable[activeIndex + 1].focus();
    } else {
      // 最後のフィールドの場合、フォームを送信
      form.requestSubmit();
    }
  };

  const focusDone = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (form) form.requestSubmit();
  };

  return { NextFieldButton, focusNextField, focusDone, isLastField };
}
