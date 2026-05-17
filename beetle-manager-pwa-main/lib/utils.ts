export const today = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-上`;
};

export const addDays = (date: string, days: number) => {
  const d = parseAmbiguousDate(date) || new Date();
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
  days: ["-", "月", "上", "中", "下"].concat(
    Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")),
  ),
});

/**
 * 曖昧な日付（2024-05-上など）から、その期間の開始日と終了日のDateオブジェクトを返します。
 */
export const getAmbiguousDateRange = (value: string): { start: Date; end: Date } | null => {
  if (!value) return null;
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const parts = datePart.split("-");
  if (parts.length !== 3 || parts[0] === "-" || parts[1] === "-") return null;

  const y = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const d = parts[2];

  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);

  if (d === "月" || d === "-") return { start: firstDay, end: lastDay };
  if (d === "上") return { start: firstDay, end: new Date(y, m - 1, 10) };
  if (d === "中") return { start: new Date(y, m - 1, 11), end: new Date(y, m - 1, 20) };
  if (d === "下") return { start: new Date(y, m - 1, 21), end: lastDay };

  const exact = new Date(y, m - 1, parseInt(d));
  if (isNaN(exact.getTime())) return null;
  return { start: exact, end: exact };
};

/**
 * 曖昧な日付（2024-05-上など）を計算用のDateオブジェクトに変換します。
 * 上旬→5日、中旬・月→15日、下旬→25日として近似値を返します。
 */
export const parseAmbiguousDate = (value: string): Date | null => {
  if (!value) return null;
  // ISO形式の場合は日付部分のみ抽出
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const parts = datePart.split("-");

  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year !== "-" && month !== "-") {
      let resolvedDay = day;
      if (day === "上") resolvedDay = "05";
      else if (day === "中" || day === "月" || day === "-") resolvedDay = "15";
      else if (day === "下") resolvedDay = "25";
      
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(resolvedDay));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value: string) => {
  if (!value) return "-";
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const parts = datePart.split("-");
  if (parts.length === 3) {
    if (parts[2] === "月") return `${parts[0]}年${parts[1]}月`;
    if (["上", "中", "下"].includes(parts[2])) return `${parts[0]}年${parts[1]}月${parts[2]}旬`;
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
  const startDate = parseAmbiguousDate(start);
  const endDate = parseAmbiguousDate(end);
  if (!startDate || !endDate) return null;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
};

/**
 * 2つの日付間の最小日数と最大日数を計算します。
 */
export const getDaysRange = (startStr: string, endStr: string) => {
  const startRange = getAmbiguousDateRange(startStr);
  const endRange = getAmbiguousDateRange(endStr);
  if (!startRange || !endRange) return null;

  /**
   * 通知や分析において「最悪のケース（最長）」を想定できるよう
   * 最小と最大の期間をミリ秒単位で計算して日数に変換します。
   * 期間 = 終了日(end) - 開始日(start)
   */
  const maxMs = endRange.end.getTime() - startRange.start.getTime();
  const minMs = endRange.start.getTime() - startRange.end.getTime();

  return {
    min: Math.max(0, Math.ceil(minMs / 86400000)),
    max: Math.max(0, Math.ceil(maxMs / 86400000)),
  };
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
  // 2回目セットが入力されている場合は、2回目の終了日で判定
  if (entry.secondSetDate) {
    return !!entry.secondSetEndDate;
  }
  // 配列形式のセットデータがある場合の互換性対応
  if (entry.sets && entry.sets.length > 0) {
    const latest = entry.sets[entry.sets.length - 1];
    return !!latest.setEndDate;
  }
  // 1回目セットの終了日
  return !!entry.setEndDate;
};
