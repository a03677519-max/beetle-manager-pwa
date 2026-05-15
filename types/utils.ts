import type { BeetleEntry, EntryType, ManagementNameFormat } from "@/types/beetle";

export const today = () => new Date().toISOString().split("T")[0];

export const createId = () => Math.random().toString(36).substring(2, 15);

export const formatGeneration = (generation: {
  primary: string;
  secondary: string;
  count: string;
}) => {
  if (generation.primary === "-") return "-";
  let label = generation.primary;
  if (generation.count) label += generation.count;
  if (generation.secondary && generation.secondary !== "-")
    label += `(${generation.secondary})`;
  return label;
};

export const isSpawnSetFinished = (entry: any) => {
  if (entry.type !== "産卵セット") return false;
  return !!entry.setEndDate && entry.setEndDate !== "-";
};

export const daysBetween = (date1: string, date2: string) => {
  if (!date1 || !date2 || date1 === "-" || date2 === "-") return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const addDays = (date: string, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

export const createDateOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(
    String
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const days = Array.from({ length: 31 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  return { years: ["-", ...years], months: ["-", ...months], days: ["-", ...days] };
};

export const splitDate = (dateString: string) => {
  if (!dateString || dateString === "-") return { year: "-", month: "-", day: "-" };
  const parts = dateString.split("-");
  return {
    year: parts[0] || "-",
    month: parts[1] || "-",
    day: parts[2] || "-",
  };
};

export const buildDateFromParts = (year: string, month: string, day: string) => {
  if (year === "-" || month === "-" || day === "-") return "-";
  return `${year}-${month}-${day}`;
};

export const formatDate = (dateString?: string) => {
  if (!dateString || dateString === "-") return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Invalid date, return as is
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, ".");
};

export const getLarvaDateInfo = (entry: any) => {
  if (entry.hatchDate && entry.extractionDate && entry.hatchDate !== "-" && entry.extractionDate !== "-") {
    return { label: "セット期間", value: `${formatDate(entry.hatchDate)} 〜 ${formatDate(entry.extractionDate)}` };
  } else if (entry.extractionDate && entry.extractionDate !== "-") {
    return { label: "割出日", value: formatDate(entry.extractionDate) };
  } else if (entry.hatchDate && entry.hatchDate !== "-") {
    return { label: "孵化日", value: formatDate(entry.hatchDate) };
  }
  return { label: "登録日", value: formatDate(entry.createdAt) };
};

export const parseAmbiguousDate = (dateString: string): Date | null => {
  if (!dateString || dateString === "-") return null;
  // YYYY-MM-DD 形式を優先
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(dateString);
  }
  // YYYY/MM/DD 形式
  const slashMatch = dateString.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    return new Date(`${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`);
  }
  // YYYYMMDD 形式
  const compactMatch = dateString.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return new Date(`${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`);
  }
  // その他の形式は Date オブジェクトに任せる
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

export const getDaysRange = (startDateStr: string, endDateStr: string) => {
  const startDate = parseAmbiguousDate(startDateStr);
  const endDate = parseAmbiguousDate(endDateStr);

  if (!startDate || !endDate) return null;

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { min: diffDays, max: diffDays }; // 現状は単一の日数なのでmin/maxは同じ
};

export const generateUniqueMName = (
  date: string,
  sciName: string,
  currentEntries: BeetleEntry[],
  type: EntryType,
  format: ManagementNameFormat, // New parameter
  preferredName?: string
) => {
  const dateObj = parseAmbiguousDate(date);
  const baseDate = dateObj ? dateObj.toISOString().split('T')[0] : today(); // YYYY-MM-DD
  const dateStr = baseDate.replace(/-/g, ""); // YYYYMMDD

  const getSciInitial = (name: string) => {
    return (name || "")
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase())
      .join("");
  };

  let prefix: string;

  if (format === "YYMMDD-NN") {
    prefix = dateStr.substring(2); // YYMMDD
  } else if (format === "YYYYMMDD-SCI-NN") {
    const initial = getSciInitial(sciName) || "X";
    prefix = `${dateStr}-${initial}`;
  } else { // Default to YYYYMMDD_NN
    prefix = dateStr;
  }

  // 優先したい名前（昇格時の幼虫名など）があり、かつ重複していない場合はそれを使用
  if (preferredName) {
    const isDuplicate = currentEntries.some(e => e.managementName === preferredName && e.scientificName === sciName && e.type === type);
    if (!isDuplicate) return preferredName;
  }

  const existingNames = currentEntries
    .filter(e => e.scientificName === sciName && e.type === type)
    .map(e => e.managementName || "");

  let counter = 1;
  let candidate: string;

  if (format === "YYMMDD-NN" || format === "YYYYMMDD-SCI-NN") {
    candidate = `${prefix}-${String(counter).padStart(2, '0')}`;
  } else { // Default to YYYYMMDD_NN
    candidate = `${prefix}_${String(counter).padStart(2, '0')}`;
  }
  
  while (existingNames.includes(candidate)) {
    counter++;
    if (format === "YYMMDD-NN" || format === "YYYYMMDD-SCI-NN") {
      candidate = `${prefix}-${String(counter).padStart(2, '0')}`;
    } else { // Default to YYYYMMDD_NN
      candidate = `${prefix}_${String(counter).padStart(2, '0')}`;
    }
  }
  return candidate;
};