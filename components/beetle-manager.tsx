"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Search, Clipboard, Camera, Loader2, Crop, Check, X as CloseIcon, Trash2, Edit, CheckSquare, Square, ArrowUpDown, ChevronDown, ChevronUp, Settings, ChevronLeft, ChevronRight, FileSpreadsheet, Hash } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Modal } from "./ui/modal"; // Ensure Modal is imported
import { useSwitchBot } from "@/components/use-switchbot";
import { formatGeneration, today, isSpawnSetFinished, createId, generateUniqueMName, formatDate } from "@/types/utils";
import { pushDataToGitHub } from "@/lib/github";
import {
  emptyAdultForm,
  emptyLarvaForm,
  emptySpawnSetForm,
  useBeetleStore,
} from "@/store/use-beetle-store";
import type {
  BeetleEntry,
  EntryType,
  LarvaBeetle,
  AdultBeetle,
  SpawnSet,
} from "@/types/beetle";
import { ENTRY_TYPES } from "@/types/beetle";

import { AdultForm } from "./beetle/adult/adult-form";
import { LarvaForm } from "./beetle/larva/larva-form";
import { SpawnSetForm } from "./beetle/spawn-set/spawn-set-form";
import { SpawnSetSecondForm } from "./beetle/spawn-set/spawn-set-second-form";
import { EntryCard } from "./beetle/shared/entry-card";
import { EmptyState } from "./beetle/shared/empty-state";
import { EntryDetail } from "./beetle/shared/entry-detail";
import { importDataFromExcel } from "./beetle/features/excel"; // インポートパスを修正
import { AnalysisView } from "./beetle/features/analysis-view";
import { TaskView } from "./beetle/features/task-view";
import { SettingsView } from "./beetle/features/settings-view"; // 新設を想定

export function BeetleManager() {
  const entries = useBeetleStore((state) => state.entries);
  const selectedType = useBeetleStore((state) => state.selectedType);
  const setSelectedType = useBeetleStore((state) => state.setSelectedType);
  const editingId = useBeetleStore((state) => state.editingId);
  const startEditing = useBeetleStore((state) => state.startEditing);
  const addAdult = useBeetleStore((state) => state.addAdult);
  const updateAdult = useBeetleStore((state) => state.updateAdult);
  const addLarva = useBeetleStore((state) => state.addLarva);
  const updateLarva = useBeetleStore((state) => state.updateLarva);
  const addSpawnSet = useBeetleStore((state) => state.addSpawnSet);
  const updateSpawnSet = useBeetleStore((state) => state.updateSpawnSet);
  const addLarvaLog = useBeetleStore((state) => state.addLarvaLog);
  const deleteEntry = useBeetleStore((state) => state.deleteEntry);
  const importData = useBeetleStore((state) => state.importData);
  const switchBot = useBeetleStore((state) => state.switchBot);
  const gitHub = useBeetleStore((state) => state.gitHub);
  const mainSortConfig = useBeetleStore((state) => state.mainSortConfig);
  const managementNameFormats = useBeetleStore((state) => state.managementNameFormats);
  const backupEntries = useBeetleStore((state) => state.backupEntries);
  const createBackup = useBeetleStore((state) => state.createBackup);
  const restoreBackup = useBeetleStore((state) => state.restoreBackup);
  const clearBackup = useBeetleStore((state) => state.clearBackup);
  const setMainSortConfig = useBeetleStore((state) => state.setMainSortConfig);
  const { fetchTemperature, isFetching } = useSwitchBot();
  const setManagementNameFormat = useBeetleStore((state) => state.setManagementNameFormat);

  const editingEntry = entries.find((entry) => entry.id === editingId) ?? null;

  const [selectedEntry, setSelectedEntry] = useState<BeetleEntry | null>(null);
  const [isAddingSecondSet, setIsAddingSecondSet] = useState(false);
  const [editingChildSet, setEditingChildSet] = useState<any>(null); // 産卵セットの2回目以降の編集用
  
  // クロップ用のステート
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isCropping, setIsCropping] = useState(false);
  const cropImageRef = useRef<HTMLImageElement>(null);

  const handleCropComplete = async () => {
    if (!cropImageRef.current || !cropSrc) return;
    
    const canvas = document.createElement("canvas");
    const img = cropImageRef.current;
    
    // cropAreaはパーセント単位(0-100)のため、自然解像度に換算する
    canvas.width = (cropArea.width / 100) * img.naturalWidth;
    canvas.height = (cropArea.height / 100) * img.naturalHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(
      img,
      (cropArea.x / 100) * img.naturalWidth,
      (cropArea.y / 100) * img.naturalHeight,
      (cropArea.width / 100) * img.naturalWidth,
      (cropArea.height / 100) * img.naturalHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );
    
    const croppedDataUrl = canvas.toDataURL("image/jpeg");
    
    // 状態をリセット
    setCropSrc(null);
    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    setIsCropping(false);
    processOCR(croppedDataUrl);
  };

  const [activeTab, setActiveTab] = useState("成虫");
  const [spawnSetFilter, setSpawnSetFilter] = useState<"active" | "finished">("active");
  const [larvaFilter, setLarvaFilter] = useState<"active" | "emerged" | "deceased" | "sold">("active");
  const [adultFilter, setAdultFilter] = useState<"active" | "deceased" | "sold">("active");
  const [query, setQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [createType, setCreateType] = useState<EntryType>("幼虫");
  const [pastedData, setPastedData] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isAutoFillEnabled, setIsAutoFillEnabled] = useState(false);
  const [spawnTemplate, setSpawnTemplate] = useState<any>(null);

  // サブタイプ（日付区分）用のステート
  const [larvaDateType, setLarvaDateType] = useState<"hatch" | "set" | "extraction">("hatch");

  // 再編集時に既存データから日付区分を復元
  useEffect(() => {
    if (!editingEntry) {
      setLarvaDateType("hatch");
      return;
    }

    if (editingEntry.type === "幼虫") {
      // 両方の日付がある場合は「セット」と判定
      if (editingEntry.hatchDate && editingEntry.extractionDate) setLarvaDateType("set");
      else if (editingEntry.extractionDate) setLarvaDateType("extraction");
      else setLarvaDateType("hatch");
    }
  }, [editingEntry, editingEntry?.id]);
  
  // フォームが閉じられた時に残っている入力ボトムシートをすべて強制終了する
  useEffect(() => {
    const isAnyFormOpen = isCreating || !!editingId || isAddingSecondSet || !!selectedEntry;
    if (!isAnyFormOpen) {
      window.dispatchEvent(new CustomEvent('app:close-all-sheets'));
      // syncイベント経由でも念のため
      window.dispatchEvent(new CustomEvent('app:close-bottom-sheets', { detail: { forceClose: true } }));
    }
  }, [isCreating, editingId, isAddingSecondSet, selectedEntry]);

  // 詳細画面などからの個体遷移（ジャンプ）用リスナー
  useEffect(() => {
    const handleNavigate = (e: any) => {
      const target = entries.find((item) => item.id === e.detail.id);
      if (target) setSelectedEntry(target);
    };
    window.addEventListener('app:navigate-entry', handleNavigate);
    return () => window.removeEventListener('app:navigate-entry', handleNavigate);
  }, [entries]);

  // 一括操作用のステート
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  // ソート値取得ヘルパー関数 (useMemo/useCallback の外で定義し、依存配列から参照可能にする)
  const getSortValue = useCallback((e: BeetleEntry, key: string): string | number => {
    if (key === "date") {
      if (e.type === "成虫") return (e as any).actualEmergenceDate || (e as any).emergenceDate || e.createdAt || "";
      if (e.type === "幼虫") return (e as any).hatchDate || (e as any).extractionDate || e.createdAt || "";
      if (e.type === "産卵セット") return (e as any).setDate || (e as any).createdAt || "";
      return (e as any).createdAt || "";
    }
    if (key === "weight") {
      if (e.type === "幼虫" && (e as LarvaBeetle).logs?.length > 0) return (e as LarvaBeetle).logs[0].weight;
      if (e.type === "産卵セット") return ((e as any).eggCount || 0) + ((e as any).larvaCount || 0);
      if (e.type === "成虫") return parseFloat((e as any).size || "0") || 0;
      return 0;
    }
    if (key === "gender") {
      const val = e.type === "成虫" ? (e as any).gender : (e.type === "幼虫" ? (e as any).logs?.[0]?.gender : "不明");
      if (val === "オス" || val === "♂") return "0";
      if (val === "メス" || val === "♀") return "1";
      return "2";
    }
    if (key === "managementName") return e.managementName || "";
    if (key === "japaneseName") return e.japaneseName || "";
    if (key === "scientificName") return e.scientificName || "";
    if (key === "locality") return e.locality || "";
    if (key === "type") return e.type || "";
    return (e as any)[key] || "";
  }, []);


  const sortKeys = [
    { id: 'japaneseName', label: '和名' },
    { id: 'scientificName', label: '学名' },
    { id: 'locality', label: '産地' },
    { id: 'gender', label: '性別' },
    { id: 'type', label: '種別' },
    { id: 'managementName', label: '管理名' },
    { id: 'date', label: '日付' },
  ];

  const bulkEntryType = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const firstEntry = entries.find(e => e.id === selectedIds[0]);
    if (!firstEntry) return null;
    return selectedIds.every(id => entries.find(e => e.id === id)?.type === firstEntry.type) ? firstEntry.type : null;
  }, [selectedIds, entries]);

  const bulkFormId = "bulk-edit-form";

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
     const list = entries.filter((entry) => {
       if (activeTab === "幼虫") {
         if (entry.type !== "幼虫") return false;
         const isDeceased = !!(entry as any).deathDate && (entry as any).deathDate !== "-";
         const isSold = ((entry as any).soldDate && (entry as any).soldDate !== "-") || (entry as any).status === "販売済み";
         const isEmerged = !!(entry as any).actualEmergenceDate;

         if (larvaFilter === "deceased") return isDeceased;
         if (isDeceased) return false;

         if (larvaFilter === "sold") return isSold;
         if (isSold) return false;

         if (larvaFilter === "emerged") return isEmerged;
         if (larvaFilter === "active") return !isEmerged;
       } else if (activeTab === "成虫") {
         if (entry.type !== "成虫") return false;
         const isDeceased = !!(entry as any).deathDate && (entry as any).deathDate !== "-";
         const isSold = ((entry as any).soldDate && (entry as any).soldDate !== "-") || (entry as any).status === "販売済み";
         const isFinished = isDeceased || isSold;

         if (adultFilter === "deceased") return isDeceased;
         if (adultFilter === "sold") return isSold && !isDeceased;
         if (adultFilter === "active") return !isFinished;
       } else if (activeTab === "産卵セット") {
         if (entry.type !== "産卵セット") return false;
         const isFinished = isSpawnSetFinished(entry);
         if (spawnSetFilter === "active" && isFinished) return false;
         if (spawnSetFilter === "finished" && !isFinished) return false;
       }

       const matchesType = selectedType === "すべて" || entry.type === selectedType;
       const matchesQuery =
         normalizedQuery.length === 0 ||
         [entry.japaneseName, entry.scientificName, entry.locality, formatGeneration(entry.generation), entry.managementName]
           .join(" ")
           .toLowerCase()
           .includes(normalizedQuery);
       return matchesType && matchesQuery;
     });

     return [...list].sort((a, b) => {
       const compare = (key: string, direction: "asc" | "desc") => {
         const vA = getSortValue(a, key);
         const vB = getSortValue(b, key);
         const res = typeof vA === "string" ? String(vA).localeCompare(String(vB), "ja", { numeric: true }) : ((vA as number) - (vB as number));
         return direction === "asc" ? res : -res;
       };
       
       const primaryCmp = compare(mainSortConfig.primary.key, mainSortConfig.primary.direction);
       if (primaryCmp !== 0) return primaryCmp;
       
       return compare(mainSortConfig.secondary.key, mainSortConfig.secondary.direction);
     });
   }, [entries, query, selectedType, activeTab, spawnSetFilter, larvaFilter, adultFilter, mainSortConfig, getSortValue]);

  // 並べ替え（ドラッグ）完了時の処理
  const handleReorder = (newOrder: BeetleEntry[], sciName: string) => {
    const otherEntries = entries.filter(e => e.scientificName !== sciName);
    // 全体の順序を更新（簡易実装: ストアの順序を書き換え）
    importData([...otherEntries, ...newOrder]);
  };

  const groupedEntries = useMemo(() => {
    const groups: Record<string, BeetleEntry[]> = {};
    filteredEntries.forEach(entry => {
      const key = entry.scientificName || "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const [expandedSpecies, setExpandedSpecies] = useState<string[]>([]);

  // 自動スクロール用のRef
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevExpandedCount = useRef(0);

  useEffect(() => {
    if (expandedSpecies.length > prevExpandedCount.current) {
      const lastOpened = expandedSpecies[expandedSpecies.length - 1];
      const element = groupRefs.current[lastOpened];
      if (element) {
        // アニメーションによるレイアウト変更を考慮して少し遅延させてからスクロール実行
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
    prevExpandedCount.current = expandedSpecies.length;
  }, [expandedSpecies]);

  const toggleSpecies = (sciName: string) => {
    setExpandedSpecies(prev => 
      prev.includes(sciName) ? prev.filter(s => s !== sciName) : [...prev, sciName]
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkCopyToExcel = async (ids?: string[]) => {
    const targetIds = ids || entries.map(e => e.id);
    if (targetIds.length === 0) return;

    setIsSyncing(true); // 処理中インジケータとして利用

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      const targetEntries = ids ? entries.filter(e => ids.includes(e.id)) : entries;
        if (targetEntries.length === 0) return;

        // 最大ログ数/履歴数の算出
        let maxLarvaLogs = 0;
        let maxSpawnSets = 0;
        targetEntries.forEach(entry => {
          if (entry.type === "幼虫") maxLarvaLogs = Math.max(maxLarvaLogs, (entry as any).logs?.length || 0);
          if (entry.type === "産卵セット") maxSpawnSets = Math.max(maxSpawnSets, (entry as any).sets?.length || 0);
        });

        const groups = targetEntries.reduce((acc, e) => {
          const key = e.scientificName || "Unknown";
          if (!acc[key]) acc[key] = [];
          acc[key].push(e);
          return acc;
        }, {} as Record<string, BeetleEntry[] >);

        for (const [sciName, speciesEntries] of Object.entries(groups)) {
          const sheetName = sciName.replace(/[\\/*?[\]]/g, "").slice(0, 31);
          const sheet = workbook.addWorksheet(sheetName);
          let currentRow = 1;

          const types: EntryType[] = ["成虫", "幼虫", "産卵セット"];
          for (const type of types) {
            const typeEntries = speciesEntries.filter(e => e.type === type);
            if (typeEntries.length === 0) continue;

            // ヘッダー作成
            let headers: string[] = ["管理名", "和名", "学名", "累代"];
            if (type === "成虫") {
              headers.push("性別", "サイズ", "羽化日", "後食日", "区分", "メモ");
            } else if (type === "幼虫") {
              headers.push("孵化/割出日");
              for (let i = 1; i <= maxLarvaLogs; i++) {
                headers.push(`${i}回目計測日`, `${i}回目体重`, `${i}回目令数`);
              }
              headers.push("メモ");
            } else if (type === "産卵セット") {
              headers.push("セット開始日");
              for (let i = 1; i <= maxSpawnSets + 1; i++) {
                headers.push(`${i}回目日付`, `${i}回目回収`);
              }
              headers.push("メモ");
            }

            const headerRow = sheet.getRow(currentRow++);
            headers.forEach((h, i) => {
              const cell = headerRow.getCell(i + 1);
              cell.value = h;
              cell.font = { bold: true };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9E2DA' } };
              cell.border = { bottom: { style: 'thin' } };
            });

            // データ書き込み
            for (const entry of typeEntries) {
              const dataRow = sheet.getRow(currentRow++);
              const e = entry as any;
              let rowData: any[] = [e.managementName || "-", e.japaneseName, e.scientificName, formatGeneration(e.generation)];

              if (type === "成虫") {
                rowData.push(e.gender, e.size ? `${e.size}mm` : "-", formatDate(e.emergenceDate), formatDate(e.feedingDate), e.emergenceType, e.memo || "");
              } else if (type === "幼虫") {
                rowData.push(formatDate(e.hatchDate || e.extractionDate));
                // 計測ログを日付の昇順（古い順）にソートして出力
                const logs = [...(e.logs || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
                for (let i = 0; i < maxLarvaLogs; i++) {
                  const log = logs[i];
                  rowData.push(log ? formatDate(log.date) : "", log ? `${log.weight}g` : "", log ? log.stage : "");
                }
                rowData.push(e.memo || "");
              } else {
                rowData.push(formatDate(e.setDate));
                // 産卵セットの履歴（メインフィールドを1回目とする）
                rowData.push(formatDate(e.setEndDate || e.setDate), (e.eggCount || 0) + (e.larvaCount || 0));
                // 産卵セットの履歴を日付の昇順（古い順）にソートして出力
                const sets = [...(e.sets || [])].sort((a, b) => (a.setDate || "").localeCompare(b.setDate || ""));
                for (let i = 0; i < maxSpawnSets; i++) {
                  const s = sets[i];
                  rowData.push(s ? formatDate(s.setEndDate || s.setDate) : "", s ? (s.eggCount || 0) + (s.larvaCount || 0) : "");
                }
                rowData.push(e.memo || "");
              }

              rowData.forEach((val, i) => {
                dataRow.getCell(i + 1).value = val;
              });
            }
            currentRow++; // セクション間の空行
          }

          // セルの幅を自動調整（全角2、半角1として計算）
          const colCount = sheet.columnCount;
          for (let i = 1; i <= colCount; i++) {
            const column = sheet.getColumn(i);
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
              const str = cell.value ? String(cell.value) : "";
              let len = 0;
              for (let j = 0; j < str.length; j++) {
                len += str.charCodeAt(j) > 255 ? 2 : 1;
              }
              if (len > maxLength) maxLength = len;
            });
            column.width = Math.min(50, Math.max(10, maxLength + 2));
          }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `beetle_manager_${today().replace(/-/g, "")}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      window.alert("エクセルファイルの生成に失敗しました。");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRegenerateAllNames = useCallback(() => {
    if (!window.confirm("全個体の管理名を現在の規則（設定画面で変更可能）で一括更新します。よろしいですか？")) return;
    
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const processed: BeetleEntry[] = [];
    
    sorted.forEach(entry => {
      let date: string;
      if (entry.type === "成虫") {
        date = (entry as AdultBeetle).emergenceDate || entry.createdAt || today();
      } else if (entry.type === "幼虫") {
        const larvaEntry = entry as LarvaBeetle;
        date = (larvaEntry.extractionDate && larvaEntry.extractionDate !== "-" ? larvaEntry.extractionDate : (larvaEntry.hatchDate || larvaEntry.createdAt || today()));
      } else { // SpawnSet
        date = (entry as SpawnSet).setDate || entry.createdAt || today();
      }
      
      const newName = generateUniqueMName(
        date, 
        entry.scientificName, 
        processed, 
        entry.type,
        managementNameFormats[entry.type]
      );
      processed.push({ ...entry, managementName: newName });
    });
    
    importData(processed);
    window.alert("管理名の一括更新が完了しました。");
  }, [entries, managementNameFormats, importData]);


  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`${selectedIds.length}件のデータを一括削除しますか？`)) {
      createBackup();
      selectedIds.forEach(id => deleteEntry(id));
      setSelectedIds([]);
      setIsSelectionMode(false);
    }
  };

  const handleBulkEditSubmit = (values: any) => {
    createBackup();
    // 変更された項目のみを一括適用
    selectedIds.forEach(id => {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      
      const patch: any = {};
      if (values.japaneseName && values.japaneseName.trim() !== "") patch.japaneseName = values.japaneseName;
      if (values.scientificName && values.scientificName.trim() !== "") patch.scientificName = values.scientificName;
      if (values.locality && values.locality.trim() !== "") patch.locality = values.locality;
      
      // 累代: デフォルトの状態（- / - / 空）でない場合のみ更新対象にする
      if (values.generation && (
        values.generation.primary !== "-" || 
        values.generation.secondary !== "-" || 
        (values.generation.count && values.generation.count !== "")
      )) {
        patch.generation = values.generation;
      }

      if (values.hatchDate && values.hatchDate !== "") patch.hatchDate = values.hatchDate;
      if (values.extractionDate && values.extractionDate !== "") patch.extractionDate = values.extractionDate;
      if (values.memo && values.memo.trim() !== "") patch.memo = values.memo;

      if (entry.type === "成虫") updateAdult(id, { ...entry, ...patch });
      else if (entry.type === "幼虫") updateLarva(id, { ...entry, ...patch });
      else if (entry.type === "産卵セット") updateSpawnSet(id, { ...entry, ...patch });
    });
    
    setIsBulkEditing(false);
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredEntries.map(e => e.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const [taskSortConfig, setTaskSortConfig] = useState<{ primary: "urgency" | "type" | "days" | "name"; secondary: "urgency" | "type" | "days" | "name" }>({ primary: "urgency", secondary: "name" });
  const [skippedTaskIds, setSkippedTaskIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isPersisted, setIsPersisted] = useState(false);

  // マウント時に localStorage からデータを読み込む
  useEffect(() => {
    const saved = localStorage.getItem("skippedTaskIds");
    if (saved) {
      try {
        setSkippedTaskIds(JSON.parse(saved));
      } catch {}
    }
    setIsMounted(true);

    if (typeof window !== "undefined" && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted);
    }
  }, []);

  // スキップ状態が更新されるたびに localStorage に保存する
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("skippedTaskIds", JSON.stringify(skippedTaskIds));
    }
  }, [skippedTaskIds, isMounted]);

  const requestPersistence = async () => {
    if (typeof window !== "undefined" && navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      setIsPersisted(persisted);
      if (persisted) {
        window.alert("データ保護（永続化ストレージ）が有効になりました。ブラウザによる自動削除を防ぎます。");
      } else {
        window.alert("データ保護を有効にできませんでした。ホーム画面に追加（PWAインストール）してから再度お試しください。");
      }
    }
  };

  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [speciesSortConfig, setSpeciesSortConfig] = useState<{
    primary: { key: string, direction: "asc" | "desc" },
    secondary: { key: string, direction: "asc" | "desc" }
  }>({
    primary: { key: "managementName", direction: "asc" },
    secondary: { key: "date", direction: "desc" }
  });

  const speciesSortKeys = [
    { id: 'managementName', label: '管理名' },
    { id: 'date', label: '日付' },
    { id: 'weight', label: '計測値' },
    { id: 'gender', label: '性別' },
  ];

  const stats = useMemo(() => {
    const adults = entries.filter(e => e.type === "成虫");
    const larvae = entries.filter(e => e.type === "幼虫");
    const spawnSets = entries.filter(e => e.type === "産卵セット");

    const isDeceased = (e: any) => !!e.deathDate && e.deathDate !== "-";
    const isSold = (e: any) => ((e.soldDate && e.soldDate !== "-") || e.status === "販売済み");

    return {
      adults: adults.length,
      adultsActive: adults.filter(e => !isDeceased(e) && !isSold(e)).length,
      adultsDeceased: adults.filter(isDeceased).length,
      adultsSold: adults.filter(e => isSold(e) && !isDeceased(e)).length,
      larvae: larvae.length,
      larvaeActive: larvae.filter(e => !isDeceased(e) && !isSold(e) && !(e as any).actualEmergenceDate).length,
      larvaeEmerged: larvae.filter(e => !isDeceased(e) && !isSold(e) && !!(e as any).actualEmergenceDate).length,
      larvaeDeceased: larvae.filter(isDeceased).length,
      larvaeSold: larvae.filter(e => isSold(e) && !isDeceased(e)).length,
      spawnSets: spawnSets.length,
      spawnSetsActive: spawnSets.filter(e => !isSpawnSetFinished(e)).length,
    };
  }, [entries]);

  const fetchCurrentTemperature = async (setter: (value: string) => void) => {
    try {
      const value = await fetchTemperature(switchBot.token, switchBot.secret, switchBot.deviceId);
      setter(String(value));
    } catch {
      window.alert("SwitchBot温度を取得できませんでした。");
    }
  };

  const handleQuickExchange = (e: React.MouseEvent, entry: LarvaBeetle) => {
    const latestLog = entry.logs[0];
    addLarvaLog(entry.id, {
      date: today(),
      substrate: latestLog?.substrate ?? "",
      pressure: latestLog?.pressure ?? 3,
      moisture: latestLog?.moisture ?? 3,
      bottleSize: latestLog?.bottleSize ?? "",
      stage: latestLog?.stage ?? "L1",
      weight: latestLog?.weight ?? 0,
      gender: latestLog?.gender ?? "不明",
      temperature: latestLog?.temperature ?? "",
    });
  };

  const handlePromoteToAdult = (e: React.MouseEvent, entry: LarvaBeetle) => {
    e.stopPropagation();
    const confirm = window.confirm(`${entry.japaneseName}を成虫として登録し、幼虫データを移行しますか？`);
    if (!confirm) return;

    // 幼虫の管理名を適用。重複していれば日付ベースで新採番
    const emergenceDate = entry.actualEmergenceDate || today();
    const mName = generateUniqueMName(
      emergenceDate, 
      entry.scientificName, 
      entries, 
      "成虫", 
      managementNameFormats["成虫"],
      entry.managementName
    );

    addAdult({
      type: "成虫",
      managementName: mName,
      gender: "不明",
      japaneseName: entry.japaneseName,
      scientificName: entry.scientificName,
      locality: entry.locality,
      generation: entry.generation,
      linkedEntryIds: entry.linkedEntryIds ? [...entry.linkedEntryIds, entry.id] : [entry.id], // 元の幼虫を紐付け
      photos: entry.photos,
      emergenceDate: emergenceDate,
      emergenceType: entry.emergenceType || "羽化",
      feedingDate: "",
      deathDate: "",
      larvaMemo: entry.logs.length > 0 ? `幼虫時ログ: ${entry.logs.length}件。最終体重: ${entry.logs[0].weight}g` : "幼虫データより移行",
    });
    deleteEntry(entry.id);
  };

  const handleDeleteSet = (entryId: string, setId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || entry.type !== "産卵セット") return;

    const s = entry as any;
    if (setId === "primary") {
      // 1回目のセット（基本フィールド）をクリア
      updateSpawnSet(entryId, {
        ...s,
        setDate: "",
        setEndDate: "",
        eggCount: 0,
        larvaCount: 0,
        substrate: "",
        containerSize: "",
      });
    } else {
      // sets配列から削除
      const updatedSets = (s.sets || []).filter((set: any) => set.id !== setId);
      updateSpawnSet(entryId, { ...s, sets: updatedSets });
    }
  };

  const handleEditSet = (entryId: string, set: any) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || entry.type !== "産卵セット") return;

    // 1回目(primary)も2回目以降も、履歴専用フォーム(SpawnSetSecondForm)を開くように統合
    // これにより、個体情報全体を開かずにセット内容だけを素早く修正可能になります
    setEditingChildSet({ ...set, id: set.id, parentId: entryId });
    setIsAddingSecondSet(true);
  };


  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (entries.length > 0 && !window.confirm("既存のデータが上書きされます。よろしいですか？")) {
      event.target.value = "";
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const data = parsed.entries ?? parsed.beetles;
      if (!data || !Array.isArray(data)) throw new Error("Invalid format");
      importData(data);
    } catch {
      window.alert("バックアップファイルを読み込めませんでした。");
    } finally {
      event.target.value = "";
    }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsSyncing(true);
      const importedEntries = await importDataFromExcel(file);
      if (importedEntries.length === 0) {
        window.alert("読み込めるデータが見つかりませんでした。");
        return;
      }

      let finalEntries: BeetleEntry[] = [];

      // 1. 既存データがある場合の処理モード選択
      const isMerge = entries.length > 0 && window.confirm(
        "既存のデータに『追加・統合』しますか？\n\n「キャンセル」を押すと既存データをすべて削除して『入れ替え』ます。"
      );

      if (!isMerge) {
        // 入れ替えモード
        finalEntries = importedEntries;
      } else {
        // 追加・統合モード: 重複チェック (管理名 + 学名)
        const duplicates = importedEntries.filter(imp => 
          entries.some(ext => ext.managementName === imp.managementName && ext.scientificName === imp.scientificName)
        );

        if (duplicates.length > 0) {
          const overwrite = window.confirm(
            `${duplicates.length}件の重複する管理名が見つかりました。\n\n` +
            `・「OK」を選択：重複した個体を【上書き】してインポートします。\n` +
            `・「キャンセル」を選択：重複した個体は【スキップ】して新規個体のみインポートします。`
          );

          if (overwrite) {
            // 上書き：既存データから重複分を除去し、インポートデータを結合
            const impKeys = new Set(importedEntries.map(e => `${e.managementName}-${e.scientificName}`));
            const nonDuplicates = entries.filter(e => !impKeys.has(`${e.managementName}-${e.scientificName}`));
            finalEntries = [...nonDuplicates, ...importedEntries];
          } else {
            // スキップ：インポートデータから重複分を除去し、既存データに結合
            const extKeys = new Set(entries.map(e => `${e.managementName}-${e.scientificName}`));
            const onlyNew = importedEntries.filter(e => !extKeys.has(`${e.managementName}-${e.scientificName}`));
            finalEntries = [...entries, ...onlyNew];
          }
        } else {
          finalEntries = [...entries, ...importedEntries];
        }
      }

      importData(finalEntries);
      window.alert(`インポートが完了しました。`);
    } catch (error) {
      window.alert(`Excelファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSyncing(false);
      event.target.value = "";
    }
  };

  const handleExport = () => {
    const payload = { version: 2, exportedAt: new Date().toISOString(), entries, switchBot };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `beetle-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGitHubSync = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      window.alert("オフラインのためGitHubに同期できません。インターネット接続を確認してください。");
      return;
    }

    if (!gitHub.token || !gitHub.repo) {
      window.alert("GitHubの設定（トークンやリポジトリ名）が完了していません。設定画面から設定を行ってください。");
      return;
    }

    const confirmSync = window.confirm(
      "ローカルの全データをGitHub上のバックアップファイルに上書きします。よろしいですか？\n(GitHub側の既存データは更新されます)"
    );
    if (!confirmSync) return;

    setIsSyncing(true);
    try {
      const payload = { version: 2, exportedAt: new Date().toISOString(), entries };
      const success = await pushDataToGitHub(gitHub, payload);
      if (success) {
        window.alert("GitHubへのデータ同期が完了しました。");
      } else {
        throw new Error("Sync failed");
      }
    } catch (error) {
      console.error("GitHub Sync Error:", error);
      window.alert("GitHubへの同期に失敗しました。トークンの権限、リポジトリ名、または通信環境を確認してください。");
    } finally {
      setIsSyncing(false);
    }
  }, [gitHub, entries]);

  const getInitialValues = (type: EntryType, emptyForm: any) => {
    if (!isAutoFillEnabled) return emptyForm;
    const last = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((e) => e.type === type);
    if (!last) return emptyForm;

    const base = {
      ...emptyForm,
      japaneseName: last.japaneseName,
      scientificName: last.scientificName,
      locality: last.locality,
      generation: { ...last.generation },
      linkedEntryIds: last.linkedEntryIds ? [...last.linkedEntryIds] : [],
    };

    if (type === "成虫") {
      const l = last as any;
      return { ...base, gender: l.gender, emergenceType: l.emergenceType };
    }
    if (type === "幼虫") {
      const l = last as any;
      const lastLog = l.logs?.[0];
      return {
        ...base,
        logs: lastLog ? [{
          ...lastLog,
          id: "temp-id",
          date: today(),
          weight: 0, // LarvaLogの定義に合わせて数値型を維持
        }] : base.logs
      };
    }
    if (type === "産卵セット") {
      const l = last as any;
      return {
        ...base,
        substrate: l.substrate,
        containerSize: l.containerSize,
        pressure: l.pressure,
        moisture: l.moisture,
        temperature: l.temperature,
        cohabitation: l.cohabitation,
      };
    }
    return base;
  };

  const parsePastedText = (text: string) => {
    // 日付の揺らぎ（2024.01.01 や 2024 01 01、誤字など）を補正する
    const fixOcrDate = (d: string) => {
      if (!d) return "";
      // OCR特有の誤字や区切り文字を正規化
      const clean = d.replace(/[Oo]/g, "0").replace(/[I|il]/g, "1").replace(/[^0-9/.-]/g, "-").replace(/[./]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const match = clean.match(/(\d{2,4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        let year = match[1];
        if (year.length === 2) year = "20" + year;
        return `${year}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      }
      return "";
    };

    const lines = text.split('\n');
    const patch: any = { logs: [] };
    lines.forEach((line) => {
      const l = line.trim();
      if (!l) return;

      // ラベルに基づいた抽出
      if (l.match(/^(和名|和各)/)) {
        patch.japaneseName = l.replace(/^(和名|和各)\s*/, "");
      } else if (l.match(/^学名/)) {
        patch.scientificName = l.replace(/^学名\s*/, "");
      } else if (l.match(/^産地/)) {
        patch.locality = l.replace(/^産地\s*/, "");
      } else if (l.match(/^累代/)) {
        const content = l.replace(/^累代\s*/, "");
        const parts = content.split(/\s+/);
        const genStr = parts[0] || "";
        let primary: any = "-";
        let count = "";
        if (genStr.startsWith("CB")) { primary = "CB"; count = genStr.replace("CB", ""); }
        else if (genStr.startsWith("WF")) { primary = "WF"; count = genStr.replace("WF", ""); }
        else if (genStr.startsWith("F")) { primary = "F"; count = genStr.replace("F", ""); }
        else if (genStr === "WD") { primary = "WD"; count = ""; }
        patch.generation = { primary, secondary: "-", count };
        
        // 管理名と日付の分離（日付パターンを探す）
        const dateIndex = parts.findIndex((p, idx) => idx > 0 && p.match(/\d{4}[^\d]\d{1,2}/));
        if (dateIndex !== -1) {
          const parsedDate = fixOcrDate(parts[dateIndex]);
          patch.hatchDate = parsedDate;
          patch.setDate = parsedDate; // 産卵セット用にも予備保持
          patch.emergenceDate = parsedDate; // 成虫用にも予備保持
          if (dateIndex > 1) patch.managementName = parts.slice(1, dateIndex).join(" ");
        } else if (parts.length > 1) {
          patch.managementName = parts.slice(1).join(" ");
        }
      } 
      
      // 飼育ログのパターンマッチ (日付 + マット + 水/圧など)
      const logMatch = l.match(/(\d{4}[^\d]\d{1,2}[^\d]\d{1,2})\s+(.*?)\s+水(\d+)圧(\d+)\s+(.*?)\s+(\S+)\s+(\S+)/);
      if (logMatch) {
        patch.logs.push({
          id: Math.random().toString(36).substr(2, 9),
          type: "幼虫",
          date: fixOcrDate(logMatch[1]),
          substrate: logMatch[2],
          moisture: parseInt(logMatch[3]),
          pressure: parseInt(logMatch[4]),
          bottleSize: logMatch[5],
          stage: logMatch[6],
          gender: logMatch[7],
          weight: 0,
          temperature: ""
        });
      }

      // 羽化・掘り出しの抽出
      const eDateMatch = l.match(/(\d{4}[^\d]\d{1,2}[^\d]\d{1,2})\s+(羽化|掘り出し|堀)/);
      if (eDateMatch) {
        patch.actualEmergenceDate = fixOcrDate(eDateMatch[1]);
        patch.emergenceType = eDateMatch[2] === "堀" ? "掘り出し" : eDateMatch[2];
        patch.emergenceDate = patch.actualEmergenceDate;
      }

      // 産卵セット開始日・期間の抽出
      const sDateMatch = l.match(/^(最新セット期間|セット期間|セット開始日|セット情報)\s*(\d{4}[^\d]\d{1,2}[^\d]\d{1,2})/);
      if (sDateMatch) {
        patch.setDate = fixOcrDate(sDateMatch[2]);
        patch.type = "産卵セット";
      }
      
      // 後食の抽出
      const fDateMatch = l.match(/(\d{4}[^\d]\d{1,2}[^\d]\d{1,2})\s+後食/);
      if (fDateMatch) {
        patch.feedingDate = fixOcrDate(fDateMatch[1]);
        if (!patch.emergenceDate) patch.emergenceDate = patch.actualEmergenceDate || "";
      }
    });

    // キーワードによる種別判定の強化
    const hasLarvaKeywords = text.includes("体重") || text.includes("マット") || text.includes("ボトル") || /L[123]/.test(text) || text.includes("割出日") || text.includes("孵化日");
    const hasSpawnSetKeywords = text.includes("セット期間") || text.includes("セット開始") || text.includes("卵数") || text.includes("幼虫数") || text.includes("回収");
    const hasAdultKeywords = text.includes("サイズ") || text.includes("後食") || text.includes("羽化") || text.includes("掘り出し") || text.includes("性別") || text.includes("死亡");

    if (patch.logs.length > 0 || hasLarvaKeywords) {
      patch.type = "幼虫";
      // 幼虫の場合は累代行の日付を孵化日に割り当て
      if (patch.setDate && !patch.hatchDate) patch.hatchDate = patch.setDate;
    } else if (hasSpawnSetKeywords || text.includes("産卵セット")) {
      patch.type = "産卵セット";
    } else if (hasAdultKeywords || patch.feedingDate || patch.actualEmergenceDate) {
      patch.type = "成虫";
      // 成虫の場合は累代行の日付を羽化日に割り当て
      if (patch.setDate && !patch.emergenceDate) patch.emergenceDate = patch.setDate;
    } else {
      patch.type = "成虫"; // 判定不能な場合のデフォルト
    }

    return patch;
  };

  const handlePasteAndFill = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const patch = parsePastedText(text);
      setPastedData(patch);
      if (patch.type) setCreateType(patch.type);
      window.alert("クリップボードからデータを反映しました");
    } catch (err) {
      window.alert("ペーストに失敗しました。クリップボードへのアクセスを許可してください。");
    }
  };

  const preprocessImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context not available");

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 平均輝度を計算して、背景が暗い場合に反転が必要か判断
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        const avgBrightness = totalBrightness / (data.length / 4);
        const shouldInvert = avgBrightness < 120; // 閾値より暗ければ反転フラグを立てる

        const contrast = 2.0; // コントラスト強調係数
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          // グレースケール化
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // コントラスト調整
          let v = contrast * gray + intercept;
          v = Math.min(255, Math.max(0, v));

          // 白黒反転（ライトオンダークのラベル対策）
          if (shouldInvert) v = 255 - v;

          data[i] = data[i + 1] = data[i + 2] = v;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCameraOCR = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    if (event.target) event.target.value = "";
  };

  const processOCR = async (imageUrl: string) => {
    setIsOcrProcessing(true);
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data: { text } } = await Tesseract.recognize(imageUrl, 'jpn+eng');
      
      const patch = parsePastedText(text);
      setPastedData(patch);
      if (patch.type) setCreateType(patch.type);
      window.alert("画像から文字を読み取り、データを反映しました");
    } catch (err) {
      console.error(err);
      window.alert("文字の読み取りに失敗しました。tesseract.jsがインストールされているか確認してください。");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  return (
    <div className="app-container font-cute bg-[#F8F5F2] min-h-screen pb-[calc(120px+env(safe-area-inset-bottom,16px))] leading-[1.7] text-[#3C3631]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTabChange={(tab) => {
          // モーダルや詳細画面が開いていればすべて閉じる
          setIsCreating(false);
          startEditing(null);
          setSelectedEntry(null);
          setIsSettingsOpen(false);

          if (tab === "設定") { setIsSettingsOpen(true); return; }
          if (ENTRY_TYPES.includes(tab as EntryType)) setSelectedType(tab as EntryType);
        }}
        onAdd={() => setIsCreating(true)}
        showAddButton={!isCreating && !editingId && !selectedEntry && !isSettingsOpen}
      />
      {/* 固定ヘッダーセクション */}
      <section className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl pt-4 pb-2 px-4 border-b border-[#E8E2DA] mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[11px] font-black text-[#B0A495] uppercase tracking-[0.3em]">Breeding Dashboard</p>
          <div className="flex gap-2 items-center">
            <button 
              onClick={handleRegenerateAllNames}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E8E2DA] rounded-full text-[10px] font-black text-gray-500 hover:text-[#FF9800] transition-all shadow-sm active:scale-95"
              title="規則に従って全個体の名前を付け直します"
            >
              <Hash size={12} />
              <span>一括採番</span>
            </button>
            <button
              onClick={() => handleBulkCopyToExcel()}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E8E2DA] rounded-full text-[10px] font-black text-gray-500 hover:text-green-600 transition-all shadow-sm active:scale-95"
              title="全データをExcelファイルで書き出します"
            >
              <FileSpreadsheet size={12} />
              <span>Excel出力</span>
            </button>

            <div className="w-px h-4 bg-gray-200 mx-1" />

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 bg-white border border-[#E8E2DA] rounded-full text-gray-400 hover:text-[#FF9800] transition-all shadow-sm active:scale-95"
            >
              <Settings size={16} />
            </button>

            <button 
              onClick={() => setShowSort(!showSort)}
              className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all ${showSort ? "bg-[#FF9800] text-white shadow-lg shadow-orange-200" : "bg-[#EFE9E2] text-[#8B7D7B]"}`}
            >
              ソート
            </button>

            <button 
              onClick={handleToggleSelectionMode}
              className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all ${isSelectionMode ? "bg-[#F4511E] text-white shadow-lg shadow-red-200" : "bg-[#EFE9E2] text-[#8B7D7B]"}`}
            >
              一括
            </button>
          </div>
        </div>
        
        {(isSelectionMode || showSort) && (
          <div className="bg-gray-50/50 p-3 rounded-[24px] border border-gray-100 mb-6 space-y-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort & Selection</span>
              {isSelectionMode && (
                <div className="flex gap-2">
                  <button 
                    onClick={handleSelectAll}
                    className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black text-[#FF9800] shadow-sm active:scale-95 transition-all"
                  >
                    すべて選択
                  </button>
                  <button 
                    onClick={handleDeselectAll}
                    className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black text-gray-400 shadow-sm active:scale-95 transition-all"
                  >
                    解除
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <div className="flex flex-col items-start min-w-[50px]">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Primary</span>
                  <button 
                    onClick={() => setMainSortConfig({ ...mainSortConfig, primary: { ...mainSortConfig.primary, direction: mainSortConfig.primary.direction === "asc" ? "desc" : "asc" } })}
                    className="text-[8px] font-black text-[#F4511E] flex items-center gap-0.5"
                  >
                    <ArrowUpDown size={8} /> {mainSortConfig.primary.direction === "asc" ? "昇" : "降"}
                  </button>
                </div>
                {sortKeys.map(k => (
                  <button key={`p-${k.id}`} onClick={() => setMainSortConfig({ ...mainSortConfig, primary: { ...mainSortConfig.primary, key: k.id } })} className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${mainSortConfig.primary.key === k.id ? "bg-[#FF9800] text-white shadow-sm" : "bg-white text-gray-400 border border-gray-100"}`}>{k.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <div className="flex flex-col items-start min-w-[50px]">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Secondary</span>
                  <button 
                    onClick={() => setMainSortConfig({ ...mainSortConfig, secondary: { ...mainSortConfig.secondary, direction: mainSortConfig.secondary.direction === "asc" ? "desc" : "asc" } })}
                    className="text-[8px] font-black text-[#F4511E] flex items-center gap-0.5"
                  >
                    <ArrowUpDown size={8} /> {mainSortConfig.secondary.direction === "asc" ? "昇" : "降"}
                  </button>
                </div>
                {sortKeys.map(k => (
                  <button key={`s-${k.id}`} onClick={() => setMainSortConfig({ ...mainSortConfig, secondary: { ...mainSortConfig.secondary, key: k.id } })} className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${mainSortConfig.secondary.key === k.id ? "bg-[#FF9800] text-white shadow-sm" : "bg-white text-gray-400 border border-gray-100"}`}>{k.label}</button>
                ))}
              </div>
            </div>
            {isSelectionMode && (
              <div className="flex gap-2 pt-2 border-t border-gray-200/50">
                <button onClick={() => handleBulkCopyToExcel(selectedIds)} disabled={selectedIds.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-[11px] font-bold disabled:opacity-30 transition-all active:scale-95">
                  <FileSpreadsheet size={14} /> Excelコピー
                </button>
                <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-500 rounded-xl text-[11px] font-bold disabled:opacity-30 transition-all active:scale-95">
                  <Trash2 size={14} /> 削除 ({selectedIds.length})
                </button>
                <button onClick={() => setIsBulkEditing(true)} disabled={selectedIds.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-500 rounded-xl text-[11px] font-bold disabled:opacity-30 transition-all active:scale-95">
                  <Edit size={14} /> 編集 ({selectedIds.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* 統計ボタン */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button 
            onClick={() => { setActiveTab("成虫"); setSelectedType("成虫"); }}
            className={`p-2 rounded-[18px] border transition-all text-left ${activeTab === "成虫" && selectedType === "成虫" ? "bg-[#FF9800] border-[#FF9800] text-white shadow-[0_8px_20px_rgba(255,152,0,0.2)] scale-[1.02]" : "bg-white/60 border-white/80 text-[#4A3F35] shadow-sm"}`}
          >
            <p className="text-[10px] font-black opacity-80 mb-0.5">成虫</p>
            <p className="text-xl font-black leading-none">{stats.adults}<span className="text-xs ml-0.5 font-bold">頭</span></p>
          </button>
          <button 
            onClick={() => { setActiveTab("幼虫"); setSelectedType("幼虫"); }}
            className={`p-2 rounded-[18px] border transition-all text-left ${activeTab === "幼虫" && selectedType === "幼虫" ? "bg-[#FF9800] border-[#FF9800] text-white shadow-[0_8px_20px_rgba(255,152,0,0.2)] scale-[1.02]" : "bg-white/60 border-white/80 text-[#4A3F35] shadow-sm"}`}
          >
            <p className="text-[10px] font-black opacity-80 mb-0.5">幼虫</p>
            <p className="text-xl font-black leading-none">{stats.larvae}<span className="text-xs ml-0.5 font-bold">頭</span></p>
          </button>
          <button 
            onClick={() => { setActiveTab("産卵セット"); setSelectedType("産卵セット"); }}
            className={`p-2 rounded-[18px] border transition-all text-left ${activeTab === "産卵セット" && selectedType === "産卵セット" ? "bg-[#FF9800] border-[#FF9800] text-white shadow-[0_8px_20px_rgba(255,152,0,0.2)] scale-[1.02]" : "bg-white/60 border-white/80 text-[#4A3F35] shadow-sm"}`}
          >
            <p className="text-[10px] font-black opacity-80 mb-0.5">セット</p>
            <p className="text-xl font-black leading-none">{stats.spawnSets}<span className="text-xs ml-0.5 font-bold">件</span></p>
          </button>
        </div>

        <label className="flex items-center bg-white/90 rounded-[16px] px-4 py-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border border-white focus-within:border-[#FF9800] transition-all mb-3">
          <Search size={16} className="text-[#B0A495] mr-2" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="検索..."
            className="flex-1 text-sm text-[#4A3F35] outline-none bg-transparent placeholder-[#D7CCC8]"
          />
        </label>

        {/* 種別ごとのサブフィルター */}
        <div className="mt-4">
          {activeTab === "幼虫" && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setLarvaFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                飼育中 ({stats.larvaeActive})
              </button>
              <button 
                onClick={() => setLarvaFilter("emerged")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "emerged" ? "bg-[#795548] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                羽化済み ({stats.larvaeEmerged})
              </button>
              <button 
                onClick={() => setLarvaFilter("deceased")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "deceased" ? "bg-[#F4511E] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                死亡 ({stats.larvaeDeceased})
              </button>
              <button 
                onClick={() => setLarvaFilter("sold")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${larvaFilter === "sold" ? "bg-blue-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                販売済み ({stats.larvaeSold})
              </button>
            </div>
          )}

          {activeTab === "成虫" && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setAdultFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${adultFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                飼育中 ({stats.adultsActive})
              </button>
              <button 
                onClick={() => setAdultFilter("deceased")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${adultFilter === "deceased" ? "bg-[#F4511E] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                死亡 ({stats.adultsDeceased})
              </button>
              <button 
                onClick={() => setAdultFilter("sold")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${adultFilter === "sold" ? "bg-blue-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                販売済み ({stats.adultsSold})
              </button>
            </div>
          )}

          {activeTab === "産卵セット" && (
            <div className="flex gap-2">
              <button 
                onClick={() => setSpawnSetFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${spawnSetFilter === "active" ? "bg-[#FF9800] text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                継続中 ({stats.spawnSetsActive})
              </button>
              <button 
                onClick={() => setSpawnSetFilter("finished")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${spawnSetFilter === "finished" ? "bg-gray-500 text-white shadow-md" : "bg-white/60 text-gray-400 border border-white"}`}
              >
                終了 ({stats.spawnSets - stats.spawnSetsActive})
              </button>
            </div>
          )}
        </div>
      </section>

      {/* クロップモーダル */}
      <Modal isOpen={isCropping} onClose={() => setIsCropping(false)} title="Select Ritual Range">
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden bg-black rounded-2xl aspect-square flex items-center justify-center">
            {cropSrc && (
              <>
                <img 
                  ref={cropImageRef}
                  src={cropSrc} 
                  alt="Crop Target" 
                  className="max-w-full max-h-full object-contain"
                />
                {/* 簡易的なドラッグ不可の範囲表示（実際はライブラリ導入推奨だが、ここではUIのみ） */}
                <div 
                  className="absolute border-2 border-purple-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.width}%`,
                    height: `${cropArea.height}%`
                  }}
                />
              </>
            )}
          </div>
          <p className="text-[10px] text-gray-500 text-center font-bold">※ 全体が収まるように調整して確定してください</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsCropping(false)}
              className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500"
            >
              キャンセル
            </button>
            <button 
              onClick={handleCropComplete}
              className="flex-[2] py-3 bg-[#FF9800] text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Check size={18} /> 範囲を確定して解析
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {selectedEntry && (
          <EntryDetail
            entry={entries.find((item) => item.id === selectedEntry.id) ?? selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onFetchTemperature={fetchCurrentTemperature} // Pass the function
            isFetchingTemperature={isFetching} // Pass the state
            onAddSecondSet={() => setIsAddingSecondSet(true)} // Pass the function
            onDeleteSet={(setId) => handleDeleteSet(selectedEntry.id, setId)} // Pass the function
            onEditSet={(set) => handleEditSet(selectedEntry.id, set)} // Pass the function
          />
        )}
      </AnimatePresence>

      <Modal
        isOpen={isCreating || !!editingEntry}
        centered={!!editingEntry && editingEntry.type === '産卵セット'}
        onClose={() => {
          setIsCreating(false);
          startEditing(null);
          setPastedData(null);
          setSpawnTemplate(null);
        }}
        title={editingEntry ? "編集" : "新規登録"}
      >
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md -mx-6 px-6 pt-1 pb-1 border-b border-gray-100 mb-2">
          {/* Row 1: Actions & Auto-fill (縮小版) */}
          <div className="flex items-center justify-between gap-4 mb-1">
            <button 
              onClick={() => { setIsCreating(false); startEditing(null); }}
              className="text-gray-400 font-bold text-[10px] px-1 hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap"
            >
              閉じる
            </button>

            {!editingEntry && (
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className={`text-[9px] font-black transition-colors ${isAutoFillEnabled ? 'text-[#FF9800]' : 'text-gray-400'} uppercase tracking-tighter`}>自動反映</span>
                <div 
                  onClick={() => setIsAutoFillEnabled(!isAutoFillEnabled)}
                  className={`w-6 h-3 rounded-full transition-colors relative border ${isAutoFillEnabled ? 'bg-[#FF9800] border-[#FF9800]' : 'bg-gray-100 border-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-1.5 h-1.5 bg-white rounded-full transition-all shadow-sm ${isAutoFillEnabled ? 'left-[0.875rem]' : 'left-0.5'}`} />
                </div>
              </label>
            )}

            <button 
              type="submit" 
              form={editingEntry ? "edit-form" : "create-form"}
              className="bg-[#2D5A27] text-white px-4 py-1 rounded-lg font-black text-[10px] shadow-sm hover:brightness-110 active:scale-95 transition-all select-none whitespace-nowrap"
            >
              保存
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePasteAndFill} className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-sm text-[9px] font-black text-[#FF9800] active:scale-95 transition-all"><Clipboard size={10} />貼付</button>
            <label className={`flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-sm text-[9px] font-black text-[#FF9800] active:scale-95 transition-all cursor-pointer ${isOcrProcessing ? 'opacity-50 pointer-events-none' : ''}`}>{isOcrProcessing ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}OCR<input type="file" accept="image/*" capture="environment" hidden onChange={handleCameraOCR} disabled={isOcrProcessing} /></label>
          </div>
          
          {!editingEntry && (
            <div className="mt-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1 bg-gray-50 rounded-lg text-gray-400 active:text-[#FF9800] active:bg-[#FF9800]/5 transition-all"
              onClick={() => {
                const idx = ENTRY_TYPES.indexOf(createType);
                const prevIdx = (idx - 1 + ENTRY_TYPES.length) % ENTRY_TYPES.length;
                setCreateType(ENTRY_TYPES[prevIdx]);
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 flex bg-gray-50 shadow-inner rounded-lg p-0.5 gap-0.5">
          {ENTRY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              data-ignore-click-outside="true"
              style={{ width: `${100 / ENTRY_TYPES.length}%` }}
              className={`py-1 text-[11px] font-bold rounded-md transition-all select-none ${
                createType === type ? "bg-[#FF9800] text-white shadow-sm" : "text-gray-500"
              }`}
              onClick={() => {
                setCreateType(type);
                if (!editingEntry) return;
                setPastedData(null);
                startEditing(null);
                setIsCreating(true);
              }}
            >
              {type}
            </button>
          ))}
          </div>
            <button
              type="button"
              className="p-1 bg-gray-50 rounded-lg text-gray-400 active:text-[#FF9800] active:bg-[#FF9800]/5 transition-all"
              onClick={() => {
                const idx = ENTRY_TYPES.indexOf(createType);
                const nextIdx = (idx + 1) % ENTRY_TYPES.length;
                setCreateType(ENTRY_TYPES[nextIdx]);
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
          )}

          {/* 幼虫の場合の日付区分セレクター (固定表示) */}
          {(createType === "幼虫" || editingEntry?.type === "幼虫") && (
            <div className="mt-2 pt-2 border-t border-white/5">
              <div className="text-[9px] font-black text-gray-400 block tracking-widest uppercase mb-1 px-1">日付区分</div>
              <div className="flex bg-gray-50 shadow-inner rounded-xl p-1 gap-1">
                {(['hatch', 'set', 'extraction'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${larvaDateType === type ? "bg-white shadow-sm text-[#FF9800]" : "text-gray-400"}`}
                    onClick={() => setLarvaDateType(type)}
                  >
                    {type === 'hatch' ? '孵化日' : type === 'set' ? 'セット' : '割出日'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isCreating && !editingEntry && createType === "成虫" ? (
          <AdultForm
            id="create-form"
            initialValues={pastedData && pastedData.type === "成虫" ? { ...emptyAdultForm, ...pastedData } : getInitialValues("成虫", emptyAdultForm)}
            onSubmit={(value) => {
              const mName = generateUniqueMName(value.emergenceDate || today(), value.scientificName, entries, "成虫", managementNameFormats["成虫"], value.managementName);
              addAdult({ ...value, managementName: mName });
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        ) : null}

        {isCreating && !editingEntry && createType === "幼虫" ? (
          <LarvaForm
            id="create-form"
            initialValues={pastedData && pastedData.type === "幼虫" ? { ...emptyLarvaForm, ...pastedData } : getInitialValues("幼虫", emptyLarvaForm)}
            dateType={larvaDateType}
            onDateTypeChange={setLarvaDateType}
            allEntries={entries}
            onSubmit={(values, count) => {
              let currentEntries = [...entries];
              for (let index = 0; index < count; index += 1) {
                const targetDate = values.extractionDate && values.extractionDate !== "-" ? values.extractionDate : (values.hatchDate || today());
                const mName = generateUniqueMName(targetDate, values.scientificName, currentEntries, "幼虫", managementNameFormats["幼虫"], values.managementName);
                // IDや作成日などのメタデータを除去して新規登録
                const { id, createdAt, ...cleanValues } = values as any;
                addLarva({ ...cleanValues, managementName: mName });
              // 次のループの判定用に管理名だけ仮追加した配列を作る
              currentEntries.push({ managementName: mName, scientificName: values.scientificName, type: "幼虫" } as any);
              }
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        ) : null}
        {isCreating && !editingEntry && createType === "産卵セット" ? (
          <SpawnSetForm
            id="create-form"
            initialValues={pastedData && pastedData.type === "産卵セット" ? { ...emptySpawnSetForm, ...pastedData } : (spawnTemplate ? { ...emptySpawnSetForm, ...spawnTemplate } : getInitialValues("産卵セット", emptySpawnSetForm))}
            allEntries={entries}
            onSubmit={(value) => {
              const mName = generateUniqueMName(value.setDate || today(), value.scientificName, entries, "産卵セット", managementNameFormats["産卵セット"], value.managementName);
              addSpawnSet({ ...value, managementName: mName });
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
            onFetchTemperature={fetchCurrentTemperature}
            isFetchingTemperature={isFetching}
          />
        ) : null}

        {editingEntry?.type === "成虫" ? (
          <AdultForm
            id="edit-form"
            initialValues={editingEntry}
            onSubmit={(value) => {
              updateAdult(editingEntry.id, value);
              startEditing(null);
            }}
            onCancel={() => startEditing(null)}
          />
        ) : null}
        {editingEntry?.type === "幼虫" ? (
          <LarvaForm
            id="edit-form"
            initialValues={editingEntry}
            dateType={larvaDateType}
            onDateTypeChange={setLarvaDateType}
            allEntries={entries}
            onSubmit={(value, count) => {
              updateLarva(editingEntry.id, value);
              if (count > 1) {
                let currentEntries = [...entries];
                for (let i = 1; i < count; i++) {
                  const targetDate = value.extractionDate && value.extractionDate !== "-" ? value.extractionDate : (value.hatchDate || today());
                  const mName = generateUniqueMName(targetDate, value.scientificName, currentEntries, "幼虫", managementNameFormats["幼虫"]);
                  
                  const { id, photos, createdAt, ...rest } = value;
                  addLarva({ ...rest as any, managementName: mName, photos: [] });
                  currentEntries.push({ managementName: mName, scientificName: value.scientificName, type: "幼虫" } as any);
                }
              }
              startEditing(null);
            }}
            onCancel={() => startEditing(null)}
          />
        ) : null}
        {editingEntry?.type === "産卵セット" ? (
          <SpawnSetForm
            id="edit-form"
            initialValues={editingEntry}
            allEntries={entries}
            onSubmit={(value) => {
              updateSpawnSet(editingEntry.id, value);
              startEditing(null);
            }}
            onCancel={() => startEditing(null)}
            onFetchTemperature={fetchCurrentTemperature}
            isFetchingTemperature={isFetching}
          />
        ) : null}
      </Modal>

      {/* 一括編集モーダル */}
      <Modal isOpen={isBulkEditing} onClose={() => setIsBulkEditing(false)} title={`一括編集 (${selectedIds.length}件)`}>
        <div className="p-1 h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1">
            {bulkEntryType === "幼虫" ? (
              <LarvaForm
                id={bulkFormId}
                initialValues={{ ...emptyLarvaForm, id: 'bulk', hatchDate: '' }}
                dateType={larvaDateType}
                onDateTypeChange={setLarvaDateType}
                allEntries={entries}
                onSubmit={(values) => handleBulkEditSubmit(values)}
                onCancel={() => setIsBulkEditing(false)}
              />
            ) : bulkEntryType === "成虫" ? (
              <AdultForm
                id={bulkFormId}
                initialValues={{ ...emptyAdultForm, id: 'bulk' }}
                onSubmit={(values) => handleBulkEditSubmit(values)}
                onCancel={() => setIsBulkEditing(false)}
              />
            ) : (
              <p className="text-center p-4 text-gray-400">一括編集は同じ種別の個体のみ可能です。</p>
            )}
          </div>
          <button 
             type="submit"
             form={bulkFormId}
             className="w-full bg-[#2D5A27] text-white py-3 rounded-xl font-black mt-4"
          >
            保存
          </button>
        </div>
      </Modal>

      <section className="px-6">
        <AnimatePresence>
          {selectedSpecies ? (
            <motion.div
              key="species-view"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                // 右にスワイプ、または素早いフリックで前の画面に戻る
                if (info.offset.x > 80 || info.velocity.x > 500) {
                  setSelectedSpecies(null);
                }
              }}
              transition={{ type: "spring", damping: 30, stiffness: 450, mass: 0.8 }}
              className="fixed inset-0 z-80 bg-[#F5F0EB] overflow-y-auto pb-32"
            >
              <div className="sticky top-0 z-30 bg-[#F5F0EB]/90 backdrop-blur-xl px-6 pt-4 pb-3 border-b border-gray-200/50 shadow-sm mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <button 
                    onClick={() => setSelectedSpecies(null)}
                    className="p-2 bg-white rounded-xl shadow-sm text-gray-500 active:scale-95 transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-[#4A3F35] truncate">{groupedEntries[selectedSpecies]?.[0]?.japaneseName || "不明"}</h2>
                    <p className="text-[10px] italic text-gray-400 truncate tracking-tight">{selectedSpecies}</p>
                  </div>
                </div>

                {/* 種別内ソート項目 (固定ヘッダー内) */}
                <div className="bg-white/60 rounded-[20px] p-2 px-3 border border-white/80 space-y-2 shadow-inner">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex flex-col items-start min-w-[45px]">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">1st</span>
                      <button onClick={() => setSpeciesSortConfig(s => ({ ...s, primary: { ...s.primary, direction: s.primary.direction === "asc" ? "desc" : "asc" } }))} className="text-[8px] font-black text-[#F4511E] flex items-center gap-0.5"><ArrowUpDown size={8} />{speciesSortConfig.primary.direction === "asc" ? "昇" : "降"}</button>
                    </div>
                    {speciesSortKeys.map(k => (
                      <button key={`sp-p-${k.id}`} onClick={() => setSpeciesSortConfig(s => ({...s, primary: { ...s.primary, key: k.id }}))} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${speciesSortConfig.primary.key === k.id ? "bg-[#FF9800] text-white shadow-sm" : "bg-white/50 text-gray-400 border border-gray-100"}`}>{k.label}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex flex-col items-start min-w-[45px]">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">2nd</span>
                      <button onClick={() => setSpeciesSortConfig(s => ({ ...s, secondary: { ...s.secondary, direction: s.secondary.direction === "asc" ? "desc" : "asc" } }))} className="text-[8px] font-black text-[#F4511E] flex items-center gap-0.5"><ArrowUpDown size={8} />{speciesSortConfig.secondary.direction === "asc" ? "昇" : "降"}</button>
                    </div>
                    {speciesSortKeys.map(k => (
                      <button key={`sp-s-${k.id}`} onClick={() => setSpeciesSortConfig(s => ({...s, secondary: { ...s.secondary, key: k.id }}))} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all ${speciesSortConfig.secondary.key === k.id ? "bg-[#FF9800] text-white shadow-sm" : "bg-white/50 text-gray-400 border border-gray-100"}`}>{k.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 space-y-4">
                {[...groupedEntries[selectedSpecies]].sort((a, b) => {
                  const compare = (key: string, direction: "asc" | "desc") => {
                    const vA = getSortValue(a, key);
                    const vB = getSortValue(b, key);
                    const res = typeof vA === "string" ? String(vA).localeCompare(String(vB), "ja", { numeric: true }) : ((vA as number) - (vB as number));
                    return direction === "asc" ? res : -res;
                  };

                  const primaryCmp = compare(speciesSortConfig.primary.key, speciesSortConfig.primary.direction);
                  if (primaryCmp !== 0) return primaryCmp;
                  
                  return compare(speciesSortConfig.secondary.key, speciesSortConfig.secondary.direction);
                }).map((entry) => (
                  <div key={entry.id} className="space-y-2">
                    <EntryCard
                      entry={entry}
                      onOpen={setSelectedEntry}
                      onDelete={(e, id) => {
                        e.stopPropagation();
                        if (window.confirm("本当に削除しますか？")) deleteEntry(id);
                      }}
                    />
                    {entry.type === "産卵セット" && (
                      <div className="px-2 space-y-2">
                        {/* 履歴のリスト表示 */}
                        {(entry as SpawnSet).sets && (entry as SpawnSet).sets.length > 0 && (
                          <div className="space-y-1.5">
                            {(entry as SpawnSet).sets.map((s, idx) => (
                              <div key={s.id} className="text-[10px] font-bold text-[#8B7D7B] bg-white/40 rounded-lg p-2 border border-white/60 flex justify-between items-center shadow-sm">
                                <span>セット{idx + 2}: {s.setDate}〜 (回収: {(s.eggCount || 0) + (s.larvaCount || 0)})</span>
                                <ChevronRight size={12} className="opacity-40" />
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                            setIsAddingSecondSet(true);
                          }}
                          className="w-full py-2 bg-[#FF9800]/10 text-[#FF9800] text-[11px] font-black rounded-xl border border-[#FF9800]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Clipboard size={12} />
                          履歴を追加登録
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                const categories = ["成虫", "幼虫", "産卵セット"];
                const currentIndex = categories.indexOf(activeTab);
                if (currentIndex === -1) return;

                const swipeThreshold = 50;
                const velocityThreshold = 400;

                if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                  // 左にスワイプ -> 次のカテゴリ（タブ）へ
                  if (currentIndex < categories.length - 1) {
                    const next = categories[currentIndex + 1];
                    setActiveTab(next);
                    setSelectedType(next as any);
                  }
                } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
                  // 右にスワイプ -> 前のカテゴリ（タブ）へ
                  if (currentIndex > 0) {
                    const prev = categories[currentIndex - 1];
                    setActiveTab(prev);
                    setSelectedType(prev as any);
                  }
                }
              }}
              transition={{ duration: 0.2 }}
            >
              {activeTab !== "分析" && activeTab !== "タスク" && activeTab !== "設定" ? (
                filteredEntries.length === 0 ? (
                  <EmptyState />
                ) : (
                  Object.entries(groupedEntries).map(([sciName, group]) => {
                    const japaneseName = group[0]?.japaneseName || "不明";
                    
                    return (
                      <div 
                        key={sciName} 
                        ref={(el) => { groupRefs.current[sciName] = el; }}
                        className="mb-3 scroll-mt-80"
                      >
                        <button 
                          onClick={() => setSelectedSpecies(sciName)}
                          className="w-full flex items-center justify-between p-4 bg-white/40 rounded-2xl mb-2 border border-white/60 active:scale-[0.98] transition-all"
                        >
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#4A3F35]">{japaneseName}</span>
                              <span className="text-[10px] font-bold bg-[#FF9800] text-white px-2 py-0.5 rounded-full">{group.length}</span>
                            </div>
                            <div className="text-[10px] italic text-gray-400 truncate">{sciName}</div>
                          </div>
                          <div className="text-gray-300">
                            <ChevronRight size={18} />
                          </div>
                        </button>
                      </div>
                    );
                  })
                )
              ) : activeTab === "分析" ? (
                <AnalysisView
                  entries={entries}
                  setSelectedEntry={setSelectedEntry}
                  setSelectedType={setSelectedType}
                  setActiveTab={setActiveTab}
                  handleExport={handleExport}
                  handleExcelImport={handleExcelImport} // Pass the new handler
                  handleImport={handleImport}
                  isPersisted={isPersisted}
                  requestPersistence={requestPersistence}
                  handleSync={handleGitHubSync}
                  isSyncing={isSyncing}
                  onRegenerateNames={handleRegenerateAllNames}
                  onExcelExportAll={() => handleBulkCopyToExcel()}
                  onAddSpawnTemplate={(template) => {
                    setSpawnTemplate(template);
                    setCreateType("産卵セット");
                    setIsCreating(true);
                  }}
                />
              ) : activeTab === "タスク" ? (
                <TaskView
                  entries={entries}
                  skippedTaskIds={skippedTaskIds}
                  setSkippedTaskIds={setSkippedTaskIds}
                  taskSortConfig={taskSortConfig}
                  setTaskSortConfig={setTaskSortConfig}
                  setSelectedEntry={setSelectedEntry}
                  handleQuickExchange={handleQuickExchange}
                  handlePromoteToAdult={handlePromoteToAdult}
                />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Modal 
        isOpen={isAddingSecondSet} 
        onClose={() => { setIsAddingSecondSet(false); setEditingChildSet(null); }} 
        title={editingChildSet ? "履歴の編集" : "追加のセット登録"}
      >
        {(selectedEntry || editingChildSet) && (
          <SpawnSetSecondForm
            initialValues={editingChildSet ? editingChildSet : { 
              ...emptySpawnSetForm, 
              // 親のIDを渡さない（新規登録であることを明示）
              id: undefined,
              // 日付計算用に親の情報を渡す
              sets: (selectedEntry as any)?.sets,
              setDate: (selectedEntry as any)?.setDate,
              setEndDate: (selectedEntry as any)?.setEndDate
            }}
            allEntries={entries}
            onSubmit={(submittedSet) => {
              const parentEntryId = editingChildSet ? editingChildSet.parentId : selectedEntry?.id;
              if (!parentEntryId) return;
              const entry = entries.find(e => e.id === parentEntryId) as any;
              if (!entry) return;

              let updatedSets;
              const { parentId, sets, useDifferentMethod, ...cleanSet } = submittedSet as any; // Remove useDifferentMethod as it's a UI flag

              if (cleanSet.id === "primary") {
                // Update the main SpawnSet entry's fields
                updateSpawnSet(parentEntryId, {
                  ...entry, // Keep existing base fields
                  setDate: cleanSet.setDate,
                  setEndDate: cleanSet.setEndDate,
                  eggCount: cleanSet.eggCount,
                  larvaCount: cleanSet.larvaCount,
                  substrate: cleanSet.substrate,
                  containerSize: cleanSet.containerSize,
                  pressure: cleanSet.pressure,
                  moisture: cleanSet.moisture,
                  temperature: cleanSet.temperature,
                  cohabitation: cleanSet.cohabitation,
                  memo: cleanSet.memo,
                } as any);
              }
              else if (editingChildSet && editingChildSet.id) { // Editing an existing child set
                // 編集の場合
                updatedSets = (entry.sets || []).map((s: any) => 
                  s.id === submittedSet.id ? { ...cleanSet, id: s.id } : s
                );
              } else {
                // 新規追加の場合
                updatedSets = [...(entry.sets || []), { ...cleanSet, id: createId() }];
              }
              
              // 日付でソート
              updatedSets.sort((a: any, b: any) => (a.setDate || "").localeCompare(b.setDate || ""));
              updateSpawnSet(parentEntryId, { ...entry, sets: updatedSets } as any);
              setIsAddingSecondSet(false);
              setEditingChildSet(null);
            }}
            onCancel={() => {
              setIsAddingSecondSet(false);
              setEditingChildSet(null);
            }}
          />
        )}
      </Modal>
      {isSettingsOpen && (
        <SettingsView
          onClose={() => setIsSettingsOpen(false)}
          sortKeys={sortKeys}
          backupEntries={backupEntries}
          onRestoreBackup={restoreBackup}
          onClearBackup={clearBackup}
          managementNameFormats={managementNameFormats}
          onUpdateManagementNameFormat={setManagementNameFormat}
        />
      )}
    </div>
  );
}
