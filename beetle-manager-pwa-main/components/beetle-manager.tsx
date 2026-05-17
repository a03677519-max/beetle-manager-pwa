"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Search, Clipboard, Camera, Loader2, Crop, Check, X as CloseIcon, Trash2, Edit, CheckSquare, Square, ArrowUpDown, ChevronDown, ChevronUp, Settings, ChevronLeft, ChevronRight, FileSpreadsheet, RefreshCw, Folder, FolderOpen } from "lucide-react";
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
import { importDataFromExcel, exportDataToExcelBuffer } from "./beetle/features/excel"; // インポートパスを修正
import { AnalysisView } from "./beetle/features/analysis-view";
import { TaskView } from "./beetle/features/task-view";
import { SettingsView } from "./beetle/features/settings-view"; // 新設を想定
import { DashboardToolbar } from "./beetle/shared/dashboard-toolbar";
import { BulkSelectionBar } from "./beetle/shared/bulk-selection-bar";
import { DashboardStats } from "./beetle/shared/dashboard-stats";

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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<EntryType[]>(["成虫", "幼虫", "産卵セット"]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

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
      if (!visibleTypes.includes(entry.type)) return false;

      // サブフィルターは単一種別選択時のみ適用（UIの複雑化を防ぐため）
      if (visibleTypes.length === 1) {
        if (entry.type === "幼虫") {
          const isDeceased = !!(entry as any).deathDate && (entry as any).deathDate !== "-";
          const isSold = ((entry as any).soldDate && (entry as any).soldDate !== "-") || (entry as any).status === "販売済み";
          const isEmerged = !!(entry as any).actualEmergenceDate;
          if (larvaFilter === "deceased") return isDeceased;
          if (isDeceased) return false;
          if (larvaFilter === "sold") return isSold;
          if (isSold) return false;
          if (larvaFilter === "emerged") return isEmerged;
          if (larvaFilter === "active") return !isEmerged;
        } else if (entry.type === "成虫") {
          const isDeceased = !!(entry as any).deathDate && (entry as any).deathDate !== "-";
          const isSold = ((entry as any).soldDate && (entry as any).soldDate !== "-") || (entry as any).status === "販売済み";
          if (adultFilter === "deceased") return isDeceased;
          if (adultFilter === "sold") return isSold && !isDeceased;
          if (adultFilter === "active") return !(isDeceased || isSold);
        } else if (entry.type === "産卵セット") {
          const isFinished = isSpawnSetFinished(entry);
          if (spawnSetFilter === "active" && isFinished) return false;
          if (spawnSetFilter === "finished" && !isFinished) return false;
        }
      }

      const matchesQuery =
        normalizedQuery.length === 0 ||
        [entry.japaneseName, entry.scientificName, entry.locality, formatGeneration(entry.generation), entry.managementName]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesQuery;
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
    }, [entries, query, visibleTypes, spawnSetFilter, larvaFilter, adultFilter, mainSortConfig, getSortValue]);

  const availableTypesInView = useMemo(() => {
    const types = new Set<EntryType>();
    filteredEntries.forEach(e => types.add(e.type));
    return Array.from(types);
  }, [filteredEntries]);

  // New: Calculate selected and total counts for each type in view
  const selectedTypeCounts = useMemo(() => {
    const counts: Record<EntryType, { selected: number; total: number }> = {
      "成虫": { selected: 0, total: 0 },
      "幼虫": { selected: 0, total: 0 },
      "産卵セット": { selected: 0, total: 0 },
    };

    filteredEntries.forEach(entry => {
      counts[entry.type].total++;
      if (selectedIds.includes(entry.id)) {
        counts[entry.type].selected++;
      }
    });
    return counts;
  }, [filteredEntries, selectedIds]);

  // 並べ替え（ドラッグ）完了時の処理
  const handleReorder = (newOrder: BeetleEntry[], sciName: string) => {
    const otherEntries = entries.filter(e => e.scientificName !== sciName);
    // 全体の順序を更新（簡易実装: ストアの順序を書き換え）
    importData([...otherEntries, ...newOrder]);
  };

  const [expandedSpecies, setExpandedSpecies] = useState<string[]>([]);

  // 自動スクロール用のRef
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevExpandedCount = useRef(0);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setLastSelectedId(id);
  }, []);

  const handleSelectByType = useCallback((type: EntryType) => {
    const idsOfType = filteredEntries.filter(e => e.type === type).map(e => e.id);
    const currentCounts = selectedTypeCounts[type];

    if (currentCounts.total > 0 && currentCounts.selected === currentCounts.total) {
      // すべて選択されている場合は、その種別の選択を解除
      setSelectedIds(prev => prev.filter(id => !idsOfType.includes(id)));
    } else {
      // 未選択または一部のみ選択されている場合は、すべて選択
      setSelectedIds(prev => Array.from(new Set([...prev, ...idsOfType])));
    }
    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(20);
  }, [filteredEntries, selectedTypeCounts]);

  const startLongPress = useCallback((id: string, currentList: BeetleEntry[]) => {    
    isLongPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressActive.current = true;
      
      if (lastSelectedId && lastSelectedId !== id) {
        const indexA = currentList.findIndex(e => e.id === lastSelectedId);
        const indexB = currentList.findIndex(e => e.id === id);
        
        if (indexA !== -1 && indexB !== -1) {
          const start = Math.min(indexA, indexB);
          const end = Math.max(indexA, indexB);
          const rangeIds = currentList.slice(start, end + 1).map(e => e.id);
          setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
        }
      } else { // 単一の長押しの場合、ここで選択状態をトグルする
        handleToggleSelect(id);
      }
      setLastSelectedId(id);
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600);
  }, [isSelectionMode, lastSelectedId, handleToggleSelect]);

  // なぞり選択用の状態管理
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'add' | 'remove' | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastDragSelectionIdRef = useRef<string | null>(null);
  const suppressNextOpenRef = useRef(false);

  const applyDragSelection = useCallback((id: string) => {
    if (!dragModeRef.current || lastDragSelectionIdRef.current === id) return;

    setSelectedIds(prev => {
      if (dragModeRef.current === 'add') {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      if (!prev.includes(id)) return prev;
      return prev.filter(i => i !== id);
    });
    setLastSelectedId(id);
    lastDragSelectionIdRef.current = id;

    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, id: string, currentList: BeetleEntry[]) => {
    if (!isSelectionMode) return;

    isDraggingRef.current = true;
    activePointerIdRef.current = event.pointerId;
    lastDragSelectionIdRef.current = null;
    suppressNextOpenRef.current = false;

    // 最初に触れたカードが選択済みなら「解除モード」、未選択なら「追加モード」にする
    const isSelected = selectedIds.includes(id);
    dragModeRef.current = isSelected ? 'remove' : 'add';
    applyDragSelection(id);

    startLongPress(id, currentList);
  }, [isSelectionMode, selectedIds, applyDragSelection, startLongPress]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null; // タイマーはクリアするが、isLongPressActiveはhandleEntryClickで処理されるまで残す
    }
  }, []);

  const handlePointerEnter = useCallback((id: string) => {
    if (!isDraggingRef.current || !dragModeRef.current) return;

    // 他の要素に入った（なぞり選択が開始された）場合は長押し判定をキャンセル
    cancelLongPress();
    suppressNextOpenRef.current = true;
    applyDragSelection(id);
  }, [cancelLongPress, applyDragSelection]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragModeRef.current) return;
    if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return;

    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const entryElement = target?.closest<HTMLElement>('[data-selection-entry-id]');
    const id = entryElement?.dataset.selectionEntryId;
    if (!id) return;
    event.preventDefault(); // スクロールを抑制

    suppressNextOpenRef.current = true;
    cancelLongPress();
    applyDragSelection(id);
  }, [applyDragSelection, cancelLongPress]);

  const handleEntryClick = useCallback((entry: BeetleEntry) => { // Short click handler
    if (suppressNextOpenRef.current) {
      suppressNextOpenRef.current = false;
      isLongPressActive.current = false;
      return;
    }
    if (isLongPressActive.current) {
      isLongPressActive.current = false;
      return;
    }
    if (isSelectionMode) {
      handleToggleSelect(entry.id); // 短いタップで選択状態をトグル
    } else {
      setSelectedEntry(entry);
    }
  }, [isSelectionMode, handleToggleSelect]);

  // なぞり選択の終了を検知するグローバルリスナー
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isDraggingRef.current = false;
      dragModeRef.current = null;
      activePointerIdRef.current = null;
      lastDragSelectionIdRef.current = null;
      // ここで reset しない（handleEntryClick で消費・リセットするため）
      cancelLongPress();
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, []);

  const handleBulkCopyToExcel = async (ids?: string[]) => {
    const targetIds = ids || entries.map(e => e.id);
    if (targetIds.length === 0) return;

    setIsSyncing(true); // 処理中インジケータとして利用

    try {
      const targetEntries = ids ? entries.filter(e => ids.includes(e.id)) : entries;
      if (targetEntries.length === 0) return;

      const buffer = await exportDataToExcelBuffer(targetEntries);
        const blob = new Blob([buffer as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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

  const handleRegenerateAllNames = useCallback((onlyEmpty: boolean = false) => {
    const confirmMsg = onlyEmpty 
      ? "管理名が空欄の個体のみに現在のテンプレート規則で採番し、保存します。よろしいですか？"
      : "全個体の管理名を現在のテンプレート規則で一括更新し、保存します。よろしいですか？\n※カスタム名は維持されつつ、連番形式が統一されます。";
    
    if (!window.confirm(confirmMsg)) return;
    
    createBackup(); // 一括更新前にバックアップを作成
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const processed: BeetleEntry[] = [];
    
    sorted.forEach(entry => {
      // 「空欄のみ」モードかつ既に名前がある場合はスキップ
      const hasName = entry.managementName && entry.managementName !== "-" && entry.managementName.trim() !== "";
      if (onlyEmpty && hasName) {
        processed.push(entry);
        return;
      }

      let date: string;
      if (entry.type === "成虫") {
        date = (entry as AdultBeetle).emergenceDate || entry.createdAt || today();
      } else if (entry.type === "幼虫") {
        const larvaEntry = entry as LarvaBeetle;
        // セット開始日(hatchDate)を優先し、無ければ割出日(extractionDate)を使用
        date = (larvaEntry.hatchDate && larvaEntry.hatchDate !== "-" ? larvaEntry.hatchDate : (larvaEntry.extractionDate && larvaEntry.extractionDate !== "-" ? larvaEntry.extractionDate : (larvaEntry.createdAt || today())));
      } else { // SpawnSet
        const ss = entry as SpawnSet;
        // 1回目のセット日と履歴(sets)の中から、最も古い日付を採番基準(初回開始日)とする
        const allDates = [(ss as any).setDate, ...((ss as any).sets || []).map((s: any) => s.setDate)]
          .filter(d => d && d !== "-");
        
        if (allDates.length > 0) {
          // 日付文字列をソートして最小値を取得
          date = [...allDates].sort((a, b) => a.localeCompare(b))[0];
        } else {
          date = ss.createdAt || today();
        }
      }
      
      const newName = generateUniqueMName(
        date, 
        entry.scientificName, 
        processed, 
        entry.type,
        managementNameFormats[entry.type],
        entry.managementName,
        {
          japaneseName: entry.japaneseName,
          locality: entry.locality,
          generation: formatGeneration(entry.generation)
        }
      );
      processed.push({ ...entry, managementName: newName });
    });
    
    importData(processed);
    window.alert("管理名の一括更新が完了しました。");
  }, [entries, managementNameFormats, importData]);

  // 設定画面から呼び出されるクリーンアップ機能の実装
  const handleCleanupManagementNames = useCallback(() => {
    if (!window.confirm("日付（24/25/2026等）で始まる管理名の初期化と、連番（_01等）の除去を一括で行います。よろしいですか？")) return;
    createBackup();
    const processed = entries.map(entry => {
      let mName = entry.managementName || "";
      // 自動採番と思われる形式（日付、または202x/2x等の年号から始まる）またはタグ残骸を消去
      // 完全一致に近い場合のみ削除対象とする
      const isAutoName = /^(\d{2,4})(\d{2,6})?[A-Za-z.]*$/.test(mName);
      const hasArtifacts = mName.includes("NN") || mName.includes("{");

      if (isAutoName || hasArtifacts) {
        mName = "";
      } else {
        // それ以外の名前は、末尾の連番数字（_01等）や記号だけを削ぎ落としてベース名に戻す
        mName = mName.replace(/([_-]?\d+)+$/, "").replace(/[_-]{2,}/g, "_").replace(/^[_-]+|[_-]+$/g, "");
      }
      return { ...entry, managementName: mName };
    });
    importData(processed);
    window.alert("管理名のクリーンアップ（連番除去と特定年リセット）が完了しました。");
  }, [entries, importData, createBackup]);

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
      if (values.japaneseName !== undefined && values.japaneseName.trim() !== "") patch.japaneseName = values.japaneseName;
      if (values.scientificName !== undefined && values.scientificName.trim() !== "") patch.scientificName = values.scientificName;
      if (values.locality !== undefined && values.locality.trim() !== "") patch.locality = values.locality;
      
      if (values.managementName !== undefined) {
        let mName = values.managementName;
        if (mName && /^(\d{2,4})(\d{2,6})?[A-Za-z.]*$/.test(mName)) mName = "";
        patch.managementName = mName;
      }
      
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
    setLastSelectedId(null);
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredEntries.map(e => e.id));
    setLastSelectedId(filteredEntries[filteredEntries.length - 1]?.id ?? null);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
    setLastSelectedId(null);
  };

  const groupedEntries = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, entry) => {
      const sci = (entry.scientificName || "学名未設定").trim() || "学名未設定";
      const jpn = (entry.japaneseName || "和名未設定").trim() || "和名未設定";
      // 区切り文字の衝突を避け、学名×和名の組み合わせで確実にフォルダ分けする
      const key = `${encodeURIComponent(sci)}::${encodeURIComponent(jpn)}`;
      if (!acc[key]) {
        acc[key] = { key, scientificName: sci, japaneseName: jpn, entries: [] as BeetleEntry[] };
      }
      acc[key].entries.push(entry);
      return acc;
    }, {} as Record<string, { key: string; scientificName: string; japaneseName: string; entries: BeetleEntry[] }>);

    return Object.values(grouped).sort((a, b) => {
      const sciCmp = a.scientificName.localeCompare(b.scientificName, "ja", { numeric: true });
      if (sciCmp !== 0) return sciCmp;
      return a.japaneseName.localeCompare(b.japaneseName, "ja", { numeric: true });
    });
  }, [filteredEntries]);

  useEffect(() => {
    setExpandedSpecies((prev) => {
      const keys = new Set(groupedEntries.map((g) => g.key));
      const remain = prev.filter((k) => keys.has(k));
      if (remain.length > 0) return remain;
      return groupedEntries.map((g) => g.key);
    });
  }, [groupedEntries]);

  const toggleSpeciesFolder = useCallback((key: string) => {
    setExpandedSpecies((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

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

    const s = entry as SpawnSet;
    
    // 全てのセット（初回 + 履歴）の日付をチェック
    const allSets = [
      { id: "primary", setDate: (s as any).setDate },
      ...((s as any).sets || []).map((set: any) => ({ id: set.id, setDate: set.setDate }))
    ].filter(set => set.setDate && set.setDate !== "-");

    const sortedSets = [...allSets].sort((a, b) => (a.setDate || "").localeCompare(b.setDate || ""));
    const isDeletingOldest = sortedSets.length > 0 && sortedSets[0].id === setId;

    if (window.confirm("このセット履歴を削除してもよろしいですか？")) {
      let updatedEntry = { ...s } as any;
      
      if (setId === "primary") {
        // 1回目のセット（基本フィールド）をクリア
        updatedEntry.setDate = "";
        updatedEntry.setEndDate = "";
        updatedEntry.eggCount = 0;
        updatedEntry.larvaCount = 0;
        updatedEntry.substrate = "";
        updatedEntry.containerSize = "";
      } else {
        // sets配列から削除
        updatedEntry.sets = (s.sets || []).filter((set: any) => set.id !== setId);
      }

      // 最古のセットを削除する場合、管理名の再計算確認
      if (isDeletingOldest && window.confirm("削除するセットは初回開始日（管理名の採番基準）です。削除後に管理名を新しい初回日に合わせて再計算しますか？")) {
        const remainingSets = [
          { id: "primary", setDate: updatedEntry.setDate },
          ...(updatedEntry.sets || []).map((set: any) => ({ id: set.id, setDate: set.setDate }))
        ].filter(set => set.setDate && set.setDate !== "-");

        let newBaseDate = updatedEntry.createdAt || today();
        if (remainingSets.length > 0) {
          const sortedRemaining = [...remainingSets].sort((a, b) => (a.setDate || "").localeCompare(b.setDate || ""));
          newBaseDate = sortedRemaining[0].setDate || newBaseDate;
        }

        const newName = generateUniqueMName(
          newBaseDate,
          updatedEntry.scientificName,
          entries.filter(e => e.id !== entryId),
          "産卵セット",
          managementNameFormats["産卵セット"],
          undefined, // 既存の名前を維持せず再生成
          {
            japaneseName: updatedEntry.japaneseName,
            locality: updatedEntry.locality,
            generation: formatGeneration(updatedEntry.generation)
          }
        );
        updatedEntry.managementName = newName;
      }

      updateSpawnSet(entryId, updatedEntry);
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
        <DashboardToolbar
          isSyncing={isSyncing}
          isSelectionMode={isSelectionMode}
          onRegenerateNames={() => handleRegenerateAllNames(false)}
          onGitHubSync={handleGitHubSync}
          onExcelExport={() => handleBulkCopyToExcel()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSelection={handleToggleSelectionMode}
        />
        
        {isSelectionMode && (
          <BulkSelectionBar
            selectedCount={selectedIds.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkExport={() => handleBulkCopyToExcel(selectedIds)}
            onBulkDelete={handleBulkDelete}
            onBulkEdit={() => setIsBulkEditing(true)}
            onSelectByType={handleSelectByType}
            availableTypes={availableTypesInView}
            selectedTypeCounts={selectedTypeCounts}
          />
        )}

        <DashboardStats
          stats={stats}
          visibleTypes={visibleTypes}
          onToggleType={(type) => setVisibleTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
          query={query}
          onQueryChange={setQuery}
          larvaFilter={larvaFilter}
          onLarvaFilterChange={setLarvaFilter}
          adultFilter={adultFilter}
          onAdultFilterChange={setAdultFilter}
          spawnSetFilter={spawnSetFilter}
          onSpawnSetFilterChange={setSpawnSetFilter}
        />
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
              const mName = generateUniqueMName(
                value.emergenceDate || today(), 
                value.scientificName, 
                entries, 
                "成虫", 
                managementNameFormats["成虫"], 
                value.managementName,
                {
                  japaneseName: value.japaneseName,
                  locality: value.locality,
                  generation: formatGeneration(value.generation)
                }
              );
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
                // 採番基準をセット開始日(hatchDate)優先に変更
                const targetDate = (values.hatchDate && values.hatchDate !== "-") ? values.hatchDate : (values.extractionDate && values.extractionDate !== "-" ? values.extractionDate : today());
                const mName = generateUniqueMName(
                  targetDate, 
                  values.scientificName, 
                  currentEntries, 
                  "幼虫", 
                  managementNameFormats["幼虫"], 
                  values.managementName,
                  {
                    japaneseName: values.japaneseName,
                    locality: values.locality,
                    generation: formatGeneration(values.generation)
                  }
                );
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
              const mName = generateUniqueMName(
                (value.setDate && value.setDate !== "-") ? value.setDate : today(), 
                value.scientificName, 
                entries, 
                "産卵セット", 
                managementNameFormats["産卵セット"], 
                value.managementName,
                {
                  japaneseName: value.japaneseName,
                  locality: value.locality,
                  generation: formatGeneration(value.generation)
                }
              );
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
                  // 採番基準をセット開始日(hatchDate)優先に変更
                  const targetDate = (value.hatchDate && value.hatchDate !== "-") ? value.hatchDate : (value.extractionDate && value.extractionDate !== "-" ? value.extractionDate : today());
                  const mName = generateUniqueMName(
                    targetDate, 
                    value.scientificName, 
                    currentEntries, 
                    "幼虫", 
                    managementNameFormats["幼虫"],
                    undefined,
                    {
                      japaneseName: value.japaneseName,
                      locality: value.locality,
                      generation: formatGeneration(value.generation)
                    }
                  );
                  
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
                <div className="space-y-4">
                  {groupedEntries.map((group) => {
                    const isExpanded = expandedSpecies.includes(group.key);
                    const selectedCount = group.entries.filter((entry) => selectedIds.includes(entry.id)).length;
                    return (
                      <div key={group.key} className="rounded-2xl border border-[#E8E2DA] bg-white/70 overflow-hidden">
                        <button
                          onClick={() => toggleSpeciesFolder(group.key)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 text-left">
                            {isExpanded ? <FolderOpen size={16} className="text-[#FF9800]" /> : <Folder size={16} className="text-[#B0A495]" />}
                            <div>
                              <div className="text-sm font-black text-[#4A3F35]">{group.japaneseName}</div>
                              <div className="text-[11px] text-gray-500 italic">{group.scientificName}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500">
                              {group.entries.length}件{isSelectionMode ? ` / 選択${selectedCount}` : ""}
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-3 pt-0 space-y-2">
                            {group.entries.map((entry) => (
                              <div
                                key={entry.id}
                                className={`space-y-2 ${isSelectionMode ? 'touch-none select-none' : ''}`}
                                data-selection-entry-id={entry.id}
                                onPointerDown={(event) => handlePointerDown(event, entry.id, filteredEntries)}
                                onPointerMove={handlePointerMove}
                                onPointerEnter={() => handlePointerEnter(entry.id)}
                                onPointerUp={cancelLongPress}
                                onPointerLeave={cancelLongPress}
                                onContextMenu={(e) => { if (isSelectionMode) e.preventDefault(); }}
                              >
                                <EntryCard
                                  entry={entry}
                                  onOpen={() => handleEntryClick(entry)}
                                  isSelected={selectedIds.includes(entry.id)}
                                  isSelectionMode={isSelectionMode}
                                  onDelete={(e, id) => {
                                    e.stopPropagation();
                                    if (window.confirm("本当に削除しますか？")) deleteEntry(id);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : activeTab === "分析" ? (
              <AnalysisView
                entries={entries}
                setSelectedEntry={setSelectedEntry}
                setSelectedType={setSelectedType}
                setActiveTab={setActiveTab}
                handleExport={handleExport}
                handleExcelImport={handleExcelImport}
                handleImport={handleImport}
                isPersisted={isPersisted}
                requestPersistence={requestPersistence}
                handleSync={handleGitHubSync}
                isSyncing={isSyncing}
                onRegenerateNames={() => handleRegenerateAllNames(false)}
                onFillEmptyNames={() => handleRegenerateAllNames(true)}
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
              id: undefined,
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
              const { parentId, sets, useDifferentMethod, ...cleanSet } = submittedSet as any;
              
              // 管理名(managementName)や写真などが消失しないよう、既存データをベースにする
              const baseEntry = { ...entry };

              if (cleanSet.id === "primary") {
                // 1回目のセット内容（メインフィールド）を更新
                updateSpawnSet(parentEntryId, {
                  ...baseEntry,
                  ...cleanSet,
                });
              } else {
                if (editingChildSet && editingChildSet.id) {
                  updatedSets = (entry.sets || []).map((s: any) => 
                    s.id === submittedSet.id ? { ...cleanSet, id: s.id } : s
                  );
                } else {
                  updatedSets = [...(entry.sets || []), { ...cleanSet, id: createId() }];
                }
                if (updatedSets) {
                  updatedSets.sort((a: any, b: any) => (a.setDate || "").localeCompare(b.setDate || ""));
                  updateSpawnSet(parentEntryId, { ...baseEntry, sets: updatedSets });
                }
              }
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
          onCleanupManagementNames={handleCleanupManagementNames}
          onRegenerateNames={() => handleRegenerateAllNames(false)}
          onSaveManagementNameFormats={() => window.alert("管理名テンプレートが保存されました。")}
        />
      )}
    </div>
  );
}
