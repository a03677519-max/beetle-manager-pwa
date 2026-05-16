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
  if (parts.length >= 2) {
    return parts.map(p => p[0].toUpperCase()).join(".");
  }
  return sciName.slice(0, 3).toUpperCase();
};

export const parseAmbiguousDate = (str: string): Date | null => {
  if (!str || str === "-") return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * 自動採番ロジック
 * 1. 既存の管理名(currentName)がある場合:
 *    - 末尾の連番(_01等)を検知して削除し、ベース名とする。
 *    - 新しい連番を末尾に付与する。
 * 2. 既存の管理名がない場合:
 *    - テンプレートを解析してベース名を生成する。
 *    - 連番を末尾に付与する。
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
  const d = date ? new Date(date) : new Date();
  const yyyy = String(d.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  const resolve = (tpl: string) => {
    let r = tpl.replace(/YYYY/g, yyyy).replace(/YY/g, yy).replace(/MM/g, mm).replace(/DD/g, dd);
    r = r.replace(/{SHORT_SCI}/g, getShortenedSciName(sciName));
    if (metadata) {
      r = r.replace(/{JPN}/g, metadata.japaneseName || "");
      r = r.replace(/{LOC}/g, metadata.locality || "");
      r = r.replace(/{GEN}/g, metadata.generation || "");
    }
    return r;
  };

  let prefix: string;
  // 既存の管理名がある場合はそれを活かす（末尾の数字は上書き対象として除去）
  if (currentName && currentName.trim() !== "" && currentName !== "-") {
    const base = currentName.split('_')[0];
    // 日付パターン(6桁 or 8桁)で始まる場合は、自動採番されたものとみなしてテンプレートから再生成を優先する
    if (/^\d{6,8}/.test(base)) {
        prefix = resolve(format).replace(/[_-]?NN$/, "");
    } else {
        // それ以外（ユーザー入力のベース名など）は最初のアンダースコア以前をベースとする
        prefix = base;
    }
  } else {
    // テンプレートから生成。連番部分は後で付けるので除去。
    prefix = resolve(format).replace(/[_-]?NN$/, "");
  }

  // 重複しない連番を見つける
  let count = 1;
  while (true) {
    const nn = String(count).padStart(2, '0');
    const candidate = `${prefix}_${nn}`;
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