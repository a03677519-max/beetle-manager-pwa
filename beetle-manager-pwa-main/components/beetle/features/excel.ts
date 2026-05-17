import type { BeetleEntry, AdultBeetle, LarvaBeetle, SpawnSet, LarvaLog, GenerationValue, EntryType } from "@/types/beetle";
import { createId, today, parseAmbiguousDate } from "@/types/utils";

// Helper to parse a date string into YYYY-MM-DD format
const parseDateToISO = (dateStr: string | number | Date | undefined): string => {
  if (!dateStr || dateStr === "-") return "-";
  const date = parseAmbiguousDate(String(dateStr));
  return date ? date.toISOString().split('T')[0] : "-";
};

// Helper to parse a number string
const parseNumber = (val: string | number | undefined): number | undefined => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = parseFloat(val.replace(/[^\d.-]/g, '')); // Remove non-numeric except . and -
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Helper to parse generation string (e.g., "CBF1(CB)")
const parseGeneration = (genStr: string | undefined): GenerationValue => {
  const defaultGen: GenerationValue = { primary: "-", secondary: "-", count: "" };
  if (!genStr || genStr === "-") return defaultGen;

  const match = String(genStr).match(/^(WD|CB|WF|CBF)(\d+)?(?:\((WD|CBF)\))?$/);
  if (match) {
    return {
      primary: (match[1] || "-") as GenerationValue["primary"],
      count: match[2] || "",
      secondary: (match[3] || "-") as GenerationValue["secondary"],
    };
  }
  return defaultGen;
};

export async function importDataFromExcel(file: File): Promise<BeetleEntry[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const allImportedEntries: BeetleEntry[] = [];
  // For linked entries, we'll need to map old managementName+scientificName to new IDs
  // This is a simplified approach; a more robust solution might involve a temporary ID in Excel or a more complex matching logic.
  // For now, linkedEntryIds will not be directly imported from Excel's hyperlink format.

  workbook.eachSheet((sheet) => {
    const sheetName = sheet.name;
    let currentScientificName = sheetName; // Fallback for scientific name

    let currentEntryType: EntryType | null = null;
    let currentHeaders: string[] = [];
    let sectionStartRow = 0;

    sheet.eachRow((row, rowNumber) => {
      const rowValues = row.values as (string | number | Date)[];
      const firstCell = String(rowValues[1] || "").trim();

      // Detect section headers (e.g., "■ 成虫一覧")
      if (firstCell.startsWith("■ ")) {
        if (firstCell.includes("成虫")) {
          currentEntryType = "成虫";
        } else if (firstCell.includes("幼虫")) {
          currentEntryType = "幼虫";
        } else if (firstCell.includes("産卵セット")) {
          currentEntryType = "産卵セット";
        }
        currentHeaders = []; // Reset headers for new section
        sectionStartRow = rowNumber + 1; // Headers are on the next row
        return;
      }

      // Read headers for the current section
      if (rowNumber === sectionStartRow && currentEntryType) {
        currentHeaders = rowValues.map(v => String(v || "").trim());
        return;
      }

      // Read data rows
      if (currentEntryType && currentHeaders.length > 0 && rowNumber > sectionStartRow) {
        const entryData: Record<string, any> = {};
        currentHeaders.forEach((header, index) => {
          const value = rowValues[index + 1]; // ExcelJS row.values is 1-indexed
          entryData[header] = value;
        });

        // Skip empty rows that might appear after sections
        if (!entryData["管理名"] && !entryData["和名"] && !entryData["学名"]) {
          return;
        }

        const newId = createId();
        const managementName = String(entryData["管理名"] || "");
        const japaneseName = String(entryData["和名"] || "");
        const scientificName = String(entryData["学名"] || currentScientificName);
        const locality = String(entryData["産地"] || "");
        const generation = parseGeneration(String(entryData["累代"] || ""));
        const memo = String(entryData["メモ"] || "");

        // Status mapping from Excel's "状態" column
        const statusText = String(entryData["状態"] || "");
        let deathDate: string = "-";
        let soldDate: string = "-";
        let status: string | undefined = statusText; // Directly use the status from Excel

        // If status is "死亡" or "販売済み", set the corresponding date to today() as a fallback
        // since the export doesn't include specific death/sold dates as columns.
        if (statusText === "死亡") {
          deathDate = today();
        } else if (statusText === "販売済み") {
          soldDate = today();
        }

        if (currentEntryType === "成虫") {
          const adult: AdultBeetle = {
            id: newId,
            type: "成虫",
            managementName,
            japaneseName,
            scientificName,
            locality,
            generation,
            photos: [],
            createdAt: today(),
            updatedAt: today(),
            emergenceDate: parseDateToISO(entryData["羽化日"]),
            emergenceType: (String(entryData["羽化区分"] || "羽化") as AdultBeetle["emergenceType"]),
            feedingDate: parseDateToISO(entryData["後食日"]),
            deathDate: deathDate,
            gender: (String(entryData["性別"] || "不明") as AdultBeetle["gender"]),
            size: String(parseNumber(entryData["サイズ"]) || ""),
            status: status || "飼育中",
            larvaMemo: String(entryData["幼虫時データ"] || ""),
            memo,
            linkedEntryIds: [],
          };
          allImportedEntries.push(adult);
        } else if (currentEntryType === "幼虫") {
          const larva: LarvaBeetle = {
            id: newId,
            type: "幼虫",
            managementName,
            japaneseName,
            scientificName,
            locality,
            generation,
            photos: [],
            createdAt: today(),
            updatedAt: today(),
            logs: [],
            plannedEmergenceDate: "-",
            actualEmergenceDate: parseDateToISO(entryData["羽化(実績)"]),
            emergenceType: (String(entryData["羽化区分"] || "羽化") as LarvaBeetle["emergenceType"]),
            hatchDate: parseDateToISO(entryData["孵化/割出日"]),
            extractionDate: parseDateToISO(entryData["孵化/割出日"]),
            memo,
            linkedEntryIds: [],
          };

          // Reconstruct logs from flattened headers
          // Assuming log headers are like "1回目_日付", "1回目_体重", etc.
          // We need to find the maximum log number present in the headers.
          const maxLogNum = Math.max(...currentHeaders.map(h => {
            const match = h.match(/^(\d+)回目_日付$/);
            return match ? parseInt(match[1]) : 0;
          }));

          for (let i = 1; i <= maxLogNum; i++) {
            const logDate = parseDateToISO(entryData[`${i}回目_日付`]);
            if (logDate !== "-") {
              const log: LarvaLog = {
                id: createId(),
                date: logDate,
                substrate: String(entryData[`${i}回目_マット`] || ""),
                moisture: parseNumber(entryData[`${i}回目_水分`]) || 3,
                pressure: parseNumber(entryData[`${i}回目_詰圧`]) || 3,
                bottleSize: String(entryData[`${i}回目_ボトル`] || ""),
                stage: (String(entryData[`${i}回目_ステージ`] || "L1") as LarvaLog["stage"]),
                weight: parseNumber(entryData[`${i}回目_体重`]) || 0,
                gender: (String(entryData[`${i}回目_性別`] || "不明") as LarvaLog["gender"]),
                temperature: String(entryData[`${i}回目_温度`] || ""),
              };
              larva.logs.push(log);
            }
          }
          larva.logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
          allImportedEntries.push(larva);
        } else if (currentEntryType === "産卵セット") {
          const spawnSet: SpawnSet = {
            id: newId,
            type: "産卵セット",
            managementName,
            japaneseName,
            scientificName,
            locality,
            generation,
            photos: [],
            createdAt: today(),
            updatedAt: today(),
            setDate: parseDateToISO(entryData["開始日"]),
            setEndDate: parseDateToISO(entryData["終了日"]),
            eggCount: parseNumber(entryData["合計回収"]) || 0, // Assuming "合計回収" goes into eggCount if individual counts not present
            larvaCount: 0, // Larva count is not explicitly exported in the main table
            substrate: String(entryData["使用マット"] || ""),
            containerSize: String(entryData["容器サイズ"] || ""),
            pressure: String(entryData["詰圧"] || ""),
            moisture: parseNumber(entryData["水分"]) || 3,
            temperature: String(entryData["温度"] || ""),
            cohabitation: (String(entryData["同居"] || "なし") as SpawnSet["cohabitation"]),
            memo,
            sets: [], // For now, only primary set is imported directly. Multi-sets are complex.
            emergenceDate: "-", // Not applicable
            feedingDate: "-", // Not applicable
            linkedEntryIds: [],
          };

          // Handle second set data if present (flattened in export)
          const secondSetStartDate = parseDateToISO(entryData["セット2_開始日"]);
          if (secondSetStartDate !== "-") {
            spawnSet.sets.push({
              id: createId(),
              setDate: secondSetStartDate,
              setEndDate: parseDateToISO(entryData["セット2_割出日"]),
              eggCount: parseNumber(entryData["セット2_卵数"]),
              larvaCount: parseNumber(entryData["セット2_幼虫数"]),
              substrate: String(entryData["セット2_マット"] || ""),
              containerSize: String(entryData["セット2_容器"] || ""),
              pressure: String(entryData["セット2_詰圧"] || ""),
              moisture: parseNumber(entryData["セット2_水分"]) || 3,
              memo: "", // Not explicitly exported for second set memo
            });
          }
          allImportedEntries.push(spawnSet);
        }
      }
    });
  });

  // Linked entries are not directly imported from Excel's hyperlink format.
  // If the user wants to import linked entries, they would need to manually re-link them in the app.

  return allImportedEntries;
}