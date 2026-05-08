export const today = () => new Date().toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createDateOptions = (startYear = 2018, endYear = new Date().getFullYear() + 2) => ({
  years: ["-"].concat(
    Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index)),
  ),
  months: ["-"].concat(
    Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")),
  ),
  days: ["-", "月"].concat(
    Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")),
  ),
});

export const formatDate = (value: string) => {
  if (!value) return "-";
  if (value.endsWith("-月")) {
    const parts = value.split("-");
    return `${parts[0]}年${parts[1]}月`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const buildDateFromParts = (year: string, month: string, day: string) => {
  if ([year, month].some((value) => !value || value === "-") || day === "-") return "";
  return `${year}-${month}-${day}`;
};

export const splitDate = (value: string) => {
  if (!value) return { year: "-", month: "-", day: "-" };
  // ISO形式 (2024-01-01T...) の場合は日付部分のみを抽出
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const [year = "-", month = "-", day = "-"] = datePart.split("-");
  return { year, month, day };
};

import type { GenerationValue } from "@/types/beetle";

// ...

export const formatGeneration = (value: GenerationValue) => {
  const { primary, count } = value;
  if (primary === "-") return "-";
  return `${primary}${count || ""}`;
};

export const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const daysBetween = (start: string, end: string) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
};

export function debounce<T extends (...args: unknown[]) => void>(
  callback: T,
  wait: number
) {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}

/**
 * 幼虫の状態（孵化・セット期間・割出）に応じた日付表示情報（ラベルと値）を返します。
 */
export const getLarvaDateInfo = (entry: { hatchDate?: string; extractionDate?: string }) => {
  if (entry.hatchDate && entry.extractionDate) {
    return {
      label: "セット期間",
      value: `${formatDate(entry.hatchDate)} 〜 ${formatDate(entry.extractionDate)}`
    };
  }
  if (entry.extractionDate) {
    return {
      label: "割出日",
      value: formatDate(entry.extractionDate)
    };
  }
  return {
    label: "孵化日",
    value: entry.hatchDate ? formatDate(entry.hatchDate) : "-"
  };
};

/**
 * 産卵セットの状態に応じた日付表示情報（ラベルと値）を返します。
 */
export const getSpawnSetDateInfo = (entry: { setDate?: string; setEndDate?: string; sets?: any[] }) => {
  if (entry.sets && entry.sets.length > 0) {
    const latestSet = entry.sets[entry.sets.length - 1];
    return {
      label: "最新セット期間",
      value: `${formatDate(latestSet.setDate)} 〜 ${latestSet.setEndDate ? formatDate(latestSet.setEndDate) : "継続中"}`
    };
  }
  if (entry.setDate && entry.setEndDate) {
    return {
      label: "セット期間",
      value: `${formatDate(entry.setDate)} 〜 ${formatDate(entry.setEndDate)}`
    };
  }
  if (entry.setDate) {
    return {
      label: "セット開始日",
      value: formatDate(entry.setDate)
    };
  }
  return {
    label: "セット情報",
    value: "-"
  };
};

export const isSpawnSetFinished = (entry: any) => {
  // 最新のセットを取得（sets配列があればそれの最後、なければ primary）
  const allSets = [
    { setEndDate: entry.setEndDate },
    ...(entry.sets || [])
  ];
  const latest = allSets[allSets.length - 1];
  return !!latest.setEndDate;
};
