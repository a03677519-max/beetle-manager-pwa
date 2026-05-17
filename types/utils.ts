import { BeetleEntry, GenerationValue } from "./beetle";

export const createId = () => Math.random().toString(36).substring(2, 11);
// The `today` function was moved to `lib/utils.ts` to unify date handling.
export const today = () => new Date().toISOString().split('T')[0];

export const formatDate = (date?: string) => {
  if (!date || date === "-") return "-";
  return date.split('T')[0];
};

export const formatGeneration = (gen: GenerationValue) => {
  if (!gen || gen.primary === "-") return "-";
  const count = gen.count || "";
  const secondary = gen.secondary !== "-" ? `(${gen.secondary})` : "";
  return `${gen.primary}${count}${secondary}`;
};

export const isSpawnSetFinished = (entry: any) => {
  if (entry.type !== "産卵セット") return false;
  return !!(entry.setEndDate && entry.setEndDate !== "-");
};

export const getShortenedSciName = (sciName: string) => {
  if (!sciName) return "";
  const parts = sciName.trim().split(/\s+/);
  return parts
    .map((p, i) => (i === 0 ? p[0]?.toUpperCase() : p.slice(0, 1).toLowerCase()) || "")
    .join("");
};

export const parseAmbiguousDate = (str: string): Date | null => {
  if (!str || str === "-") return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * 自動採番ロジック
 * 1. テンプレートから「連番の形式（区切り文字と桁数）」を動的に解析。
 * 2. 既存の管理名がある場合、末尾の古い連番を除去。
 * 3. 既存名に現在のテンプレート（日付等）が含まれていない場合、末尾に追加する。
 * 4. 同年内の同じ学名の個体は既存の管理名ごとに連番にする。
 */
export function generateUniqueMName(
  date: string,
  sciName: string,
  entries: BeetleEntry[],
  type: string,
  format: string,
  currentName?: string,
  metadata?: { japaneseName?: string; locality?: string; generation?: string }
) {
  let d = parseAmbiguousDate(date);
  if (!d || isNaN(d.getTime())) d = new Date();
  const yyyy = String(d.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  const serialMatch = format.match(/([_-]?)(N+)$/);
  const separator = serialMatch ? serialMatch[1] : "_";
  const padding = serialMatch ? serialMatch[2].length : 2;

  const resolveTemplate = (tpl: string) => {
    let r = tpl
      .replace(/YYYY/g, yyyy)
      .replace(/YY/g, yy)
      .replace(/MM/g, mm)
      .replace(/DD/g, dd);

    r = r.replace(/{SHORT_SCI}/g, getShortenedSciName(sciName));
    r = r.replace(/{JPN}/g, metadata?.japaneseName || "").replace(/{LOC}/g, metadata?.locality || "").replace(/{GEN}/g, metadata?.generation || "");
    
    // NNなどの連番プレースホルダーを除去したベース部分を返す
    return r.replace(/[_-]?N+$/, "");
  };

  let prefix: string;
  let serialSeparator = separator;
  const templateBase = resolveTemplate(format);

  if (currentName && currentName.trim() !== "" && currentName !== "-") {
    // 既存名から末尾の連番（_01, -1等）を除去
    const existingBase = currentName.replace(/[_-]\d+$/, "").replace(/[_-]?N+$/, "").trim();
    serialSeparator = "_";
    prefix = existingBase || templateBase;
  } else {
    prefix = templateBase;
  }

  // 記号の重複や末尾の記号をクリーンアップ
  prefix = prefix.replace(/[_-]{2,}/g, "_").replace(/^[_-]+|[_-]+$/g, "");

  let count = 1;
  while (true) {
    const nn = String(count).padStart(padding, '0');
    const candidate = `${prefix}${serialSeparator}${nn}`;
    const collision = entries.some(e => e.managementName === candidate && e.type === type);
    if (!collision) return candidate;
    count++;
    if (count > 999) return `${candidate}_overflow`;
  }
}

export const splitDate = (dateStr: string) => {
  if (!dateStr || dateStr === "-") return { year: "-", month: "-", day: "-" };
  const [y, m, d] = dateStr.split("-");
  return { year: y || "-", month: m || "-", day: d || "-" };
};

export const buildDateFromParts = (y: string, m: string, d: string) => {
  if (y === "-" || m === "-" || d === "-") return "-";
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

export const createDateOptions = () => {
  const years = ["-", ...Array.from({ length: 11 }, (_, i) => String(2020 + i))];
  const months = ["-", ...Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))];
  const days = ["-", ...Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), "上", "中", "下"];
  return { years, months, days };
};

export const daysBetween = (date1: string, date2: string): number | null => {
  if (!date1 || date1 === "-" || !date2 || date2 === "-") return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const addDays = (date: string, days: number): string => {
  if (!date || date === "-") return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
