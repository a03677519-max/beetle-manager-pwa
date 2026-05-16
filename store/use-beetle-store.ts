"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createId, today, generateUniqueMName } from "@/types/utils";
import type {
  AdultFormValues,
  AdultBeetle,
  BeetleEntry,
  EntryType,
  GenerationValue,
  LarvaFormValues,
  LarvaBeetle,
  LarvaLog,
  ManagementNameFormat,
  ManagementNameFormatMap,
  SpawnSetFormValues,
  SwitchBotSettings,
  GitHubSettings,
} from "@/types/beetle";
import { COHABITATION_OPTIONS } from "@/types/beetle";
import { normalizeEntries } from "./beetle-store-utils";

export type SortConfig = {
  primary: { key: string, direction: "asc" | "desc" },
  secondary: { key: string, direction: "asc" | "desc" }
};

type BeetleState = {
  entries: BeetleEntry[];
  selectedType: EntryType | "すべて";
  editingId: string | null;
  switchBot: SwitchBotSettings;
  gitHub: GitHubSettings;
  mainSortConfig: SortConfig;
  managementNameFormats: ManagementNameFormatMap;
  setManagementNameFormat: (type: EntryType, format: ManagementNameFormat) => void;
  setMainSortConfig: (config: SortConfig) => void;
  backupEntries: BeetleEntry[] | null;
  createBackup: () => void;
  restoreBackup: () => void;
  clearBackup: () => void;
  setSelectedType: (stage: EntryType | "すべて") => void;
  startEditing: (id: string | null) => void;
  updateSwitchBot: (input: Partial<SwitchBotSettings>) => void;
  updateGitHub: (input: Partial<GitHubSettings>) => void;
  addAdult: (input: AdultFormValues) => void;
  updateAdult: (id: string, input: AdultFormValues) => void;
  addLarva: (input: LarvaFormValues) => void;
  updateLarva: (id: string, input: LarvaFormValues) => void;
  addSpawnSet: (input: SpawnSetFormValues) => void;
  updateSpawnSet: (id: string, input: SpawnSetFormValues) => void;
  deleteEntry: (id: string) => void;
  addLarvaLog: (id: string, input: Omit<LarvaLog, "id">) => void;
  updateLarvaLog: (entryId: string, logId: string, input: Omit<LarvaLog, "id">) => void;
  deleteLarvaLog: (entryId: string, logId: string) => void;
  addPhotos: (id: string, photos: string[]) => void;
  deletePhoto: (entryId: string, photoIndex: number) => void;
  importData: (entries: BeetleEntry[]) => void;
  promoteLarvaToAdult: (
    larvaId: string,
    adultInput: AdultFormValues,
    options?: { adultId?: string; larvaMemo?: string },
  ) => void;
};

const emptyGeneration = {
  primary: "-",
  secondary: "-",
  count: "",
} as const;

export const emptyAdultForm: AdultFormValues = {
  type: "成虫",
  japaneseName: "",
  scientificName: "",
  locality: "",
  generation: { ...emptyGeneration },
  emergenceDate: "",
  emergenceType: "羽化",
  feedingDate: "-",
  deathDate: "",
  soldDate: "",
  status: "飼育中",
  larvaMemo: "",
  gender: "不明",
} as any;

export const emptyLarvaForm: LarvaFormValues = {
  type: "幼虫",
  japaneseName: "",
  scientificName: "",
  locality: "",
  generation: { ...emptyGeneration },
  linkedEntryIds: [],
  extractionDate: "-",
  logs: [],
  plannedEmergenceDate: "",
  actualEmergenceDate: "",
  emergenceType: "羽化",
  deathDate: "-",
  soldDate: "-",
  status: "飼育中",
  hatchDate: today(),
} as any;

export const emptySpawnSetForm: SpawnSetFormValues = {
  type: "産卵セット",
  japaneseName: "",
  scientificName: "",
  locality: "",
  generation: { ...emptyGeneration },
  setEndDate: "-",
  setDate: "", // 1回目のセットの開始日
  sets: [],
  emergenceDate: "",
  feedingDate: "",
  temperature: "",
  cohabitation: "なし",
};

// Moved to types/utils.ts
// /**
//  * 管理名のプリセットテンプレート定義
//  * 以下のプレースホルダーが利用可能であることを想定:
/**
 * 管理名のプリセットテンプレート定義
 * 以下のプレースホルダーが利用可能であることを想定:
 * {SHORT_SCI}: 学名略称 (例: D.H.H)
 * {JPN}: 和名
 * {LOC}: 産地
 * {GEN}: 累代
 * YYYY/MM/DD: 日付
 * NN: 連番
 */
export const MANAGEMENT_NAME_PRESETS = [
  { label: "日付_連番 (20240101_01)", value: "YYYYMMDD_NN" },
  { label: "学名略称_日付_連番 (D.H.H_20240101_01)", value: "{SHORT_SCI}_YYYYMMDD_NN" },
  { label: "日付_学名略称_連番 (20240101_D.H.H_01)", value: "YYYYMMDD_{SHORT_SCI}_NN" },
  // generateUniqueMName (utils.ts) で {SHORT_SCI}, {JPN}, {LOC}, {GEN} などのプレースホルダーを実際の値に置換するロジックが必要です。
  { label: "和名_日付_連番 (ヘラクレス_20240101_01)", value: "{JPN}_YYYYMMDD_NN" },
  { label: "産地_累代_連番 (グアドループ_CBF1_01)", value: "{LOC}_{GEN}_NN" },
  { label: "自由入力 (カスタム)", value: "CUSTOM" },
];

export const useBeetleStore = create<BeetleState>()(
  persist(
    (set) => ({
      entries: [],
      selectedType: "すべて",
      editingId: null,
      switchBot: { token: "", secret: "", deviceId: "", deviceName: "" },
      gitHub: { token: "", owner: "", repo: "", path: "data.json", branch: "main" },
      mainSortConfig: {
        primary: { key: "japaneseName", direction: "asc" },
        secondary: { key: "date", direction: "desc" }
      },
      backupEntries: null,
      createBackup: () => set((state) => ({ backupEntries: [...state.entries] })),
      restoreBackup: () => set((state) => {
        if (!state.backupEntries) return state;
        return { entries: state.backupEntries, backupEntries: null };
      }),
      clearBackup: () => set({ backupEntries: null }),
      setMainSortConfig: (mainSortConfig) => set({ mainSortConfig }),
      setSelectedType: (selectedType) => set({ selectedType }),
      startEditing: (editingId) => set({ editingId }),
      managementNameFormats: {
        "成虫": "YYYYMMDD_NN",
        "幼虫": "YYYYMMDD_NN",
        "産卵セット": "YYYYMMDD_NN",
      },
      setManagementNameFormat: (type, format) => set((state) => ({ 
        managementNameFormats: {
          ...state.managementNameFormats,
          [type]: format
        }
      })),
      updateSwitchBot: (input) =>
        set((state) => ({ switchBot: { ...state.switchBot, ...input } })),
      updateGitHub: (input) =>
        set((state) => ({ gitHub: { ...state.gitHub, ...input } })),
      addAdult: (input) =>
        set((state) => {
          const nextNumber = Math.max(0, ...state.entries.filter(e => e.scientificName === input.scientificName && e.type === "成虫").map(e => e.entryNumber || 0)) + 1;
          return {
            entries: [{ id: createId(), ...input, entryNumber: nextNumber, photos: input.photos || [], createdAt: today(), updatedAt: today() }, ...state.entries],
            editingId: null,
          };
        }),
      updateAdult: (id, input) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id && entry.type === "成虫" ? { ...entry, ...input, updatedAt: today() } : entry,
          ),
          editingId: null,
        })),
      addLarva: (input) =>
        set((state) => {
          const nextNumber = Math.max(0, ...state.entries.filter(e => e.scientificName === input.scientificName && e.type === "幼虫").map(e => e.entryNumber || 0)) + 1;
          return {
            entries: [{ id: createId(), ...input, entryNumber: nextNumber, photos: input.photos || [], createdAt: today(), updatedAt: today() }, ...state.entries],
            editingId: null,
          };
        }),
      updateLarva: (id, input) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id && entry.type === "幼虫" ? { ...entry, ...input, updatedAt: today() } : entry,
          ),
          editingId: null,
        })),
      addSpawnSet: (input) =>
        set((state) => {
          const nextNumber = Math.max(0, ...state.entries.filter(e => e.scientificName === input.scientificName && e.type === "産卵セット").map(e => e.entryNumber || 0)) + 1;
          return {
            entries: [{ id: createId(), ...input, entryNumber: nextNumber, photos: [], createdAt: today(), updatedAt: today() }, ...state.entries],
            editingId: null,
          };
        }),
      updateSpawnSet: (id, input) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id && entry.type === "産卵セット" ? { ...entry, ...input, updatedAt: today() } : entry,
          ),
          editingId: null,
        })),
      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
          editingId: state.editingId === id ? null : state.editingId,
        })),
      addLarvaLog: (id, input) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id && entry.type === "幼虫"
              ? {
                  ...entry,
                  logs: [{ id: createId(), ...input }, ...entry.logs],
                  updatedAt: today(),
                }
              : entry,
          ),
        })),
      promoteLarvaToAdult: (larvaId, adultInput, options) =>
        set((state) => {
          const larva = state.entries.find((entry): entry is LarvaBeetle => entry.id === larvaId && entry.type === "幼虫");
          if (!larva) return state;

          // 管理名の決定ロジック
          const emergenceDate = adultInput.emergenceDate || today();
          const mName = generateUniqueMName(
            emergenceDate,
            adultInput.scientificName,
            state.entries.filter(e => e.id !== larvaId), // Filter out the current larva to avoid self-collision
            "成虫",
            state.managementNameFormats["成虫"],
            adultInput.managementName || larva.managementName
          );

          const nextNumber = Math.max(0, ...state.entries.filter(e => e.scientificName === adultInput.scientificName && e.type === "成虫").map(e => e.entryNumber || 0)) + 1;
          const larvaLogSummary = larva.logs.length > 0
            ? larva.logs.map((log) => `${log.date} / ${log.stage} / ${log.weight}g / ${log.temperature || "-"}℃`).join("\n")
            : "ログなし";

          const adultId = options?.adultId ?? createId();
          const { id: _adultInputId, photos: adultPhotos, linkedEntryIds: adultLinks, larvaMemo: adultMemo, ...adultBase } = adultInput as AdultFormValues & { larvaMemo?: string };
          const mergedAdult: AdultBeetle = {
            id: adultId,
            ...adultBase,
            type: "成虫",
            managementName: mName,
            entryNumber: nextNumber,
            photos: adultPhotos || larva.photos || [],
            createdAt: today(),
            updatedAt: today(),
            larvaMemo: adultMemo || options?.larvaMemo || `幼虫時ログ\n${larvaLogSummary}`,
            linkedEntryIds: Array.from(new Set([...(adultLinks || []), larvaId])),
          };

          const remainingEntries = state.entries.map((entry) =>
            entry.id === larvaId
              ? {
                  ...entry,
                  actualEmergenceDate: larva.actualEmergenceDate || adultInput.emergenceDate || today(),
                  emergenceType: larva.emergenceType || adultInput.emergenceType || "羽化",
                  linkedEntryIds: Array.from(new Set([...(entry.linkedEntryIds || []), adultId])),
                  updatedAt: today(),
                }
              : entry,
          );

          return {
            entries: [mergedAdult, ...remainingEntries],
            editingId: null,
          };
        }),
      updateLarvaLog: (entryId, logId, input) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === entryId && entry.type === "幼虫"
              ? {
                  ...entry,
                  logs: entry.logs.map((log) => (log.id === logId ? { id: logId, ...input } : log)),
                  updatedAt: today(),
                }
              : entry,
          ),
        })),
      deleteLarvaLog: (entryId, logId) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === entryId && entry.type === "幼虫"
              ? {
                  ...entry,
                  logs: entry.logs.filter((log) => log.id !== logId),
                  updatedAt: today(),
                }
              : entry,
          ),
        })),
      addPhotos: (id, photos) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, photos: [...entry.photos, ...photos], updatedAt: today() } : entry,
          ),
        })),
      deletePhoto: (entryId, photoIndex) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  photos: entry.photos.filter((_, index) => index !== photoIndex),
                  updatedAt: today(),
                }
              : entry,
          ),
        })),
      importData: (entries) => set((state) => ({ 
        backupEntries: [...state.entries], 
        entries: normalizeEntries(entries), 
        editingId: null 
      })),
    }),
    {
      name: "beetle-manager-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        entries: state.entries,
        selectedType: state.selectedType,
        switchBot: state.switchBot,
        gitHub: state.gitHub,
        mainSortConfig: state.mainSortConfig,
        managementNameFormats: state.managementNameFormats,
        backupEntries: state.backupEntries,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<BeetleState> & { beetles?: unknown };
        return {
          ...currentState,
          ...persisted,
          entries: normalizeEntries(persisted.entries ?? persisted.beetles),
          selectedType: persisted.selectedType ?? currentState.selectedType,
          switchBot: persisted.switchBot ?? currentState.switchBot,
          gitHub: persisted.gitHub ?? currentState.gitHub,
          managementNameFormats: persisted.managementNameFormats ?? currentState.managementNameFormats,
          mainSortConfig: persisted.mainSortConfig ?? currentState.mainSortConfig,
          backupEntries: persisted.backupEntries ?? currentState.backupEntries,
        };
      },
    },
  ),
);
