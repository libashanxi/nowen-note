import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, History, RotateCcw, ChevronRight, FileText, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { NoteVersion } from "@/types";
import { cn } from "@/lib/utils";

interface VersionHistoryPanelProps {
  noteId: string;
  noteTitle: string;
  onRestore: (note: any) => void;
  onClose: () => void;
}

export default function VersionHistoryPanel({ noteId, noteTitle, onRestore, onClose }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const data = await api.getNoteVersions(noteId);
      setVersions(data.versions);
      setTotal(data.total);
    } catch (e) {
      console.error("加载版本历史失败:", e);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // 预览版本内容
  const handlePreview = async (version: NoteVersion) => {
    if (selectedVersion?.id === version.id) {
      setSelectedVersion(null);
      setPreviewContent(null);
      return;
    }
    setSelectedVersion(version);
    setLoadingPreview(true);
    try {
      const data = await api.getNoteVersion(noteId, version.id);
      setPreviewContent(data.contentText || "");
    } catch (e) {
      console.error("加载版本内容失败:", e);
      setPreviewContent("加载失败");
    } finally {
      setLoadingPreview(false);
    }
  };

  // 恢复版本
  const handleRestore = async (versionId: string) => {
    if (restoring) return;
    setRestoring(true);
    try {
      const updated = await api.restoreNoteVersion(noteId, versionId);
      onRestore(updated);
      setConfirmRestore(null);
      onClose();
    } catch (e: any) {
      console.error("恢复版本失败:", e);
    } finally {
      setRestoring(false);
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 7) return `${diffDay}天前`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const changeTypeLabels: Record<string, { label: string; color: string }> = {
    edit: { label: "编辑", color: "bg-blue-500/10 text-blue-500" },
    restore: { label: "恢复", color: "bg-amber-500/10 text-amber-500" },
    comment: { label: "评论", color: "bg-green-500/10 text-green-500" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl mx-4 bg-app-elevated rounded-xl shadow-2xl border border-app-border overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <History size={16} className="text-violet-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-tx-primary">版本历史</h2>
              <p className="text-[11px] text-tx-tertiary truncate max-w-[300px]">{noteTitle} · {total} 个版本</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-app-hover text-tx-tertiary hover:text-tx-secondary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* 版本列表 */}
          <div className="w-1/2 border-r border-app-border flex flex-col">
            <ScrollArea className="flex-1">
              <div className="py-2">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="animate-spin text-tx-tertiary" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={28} className="mx-auto mb-2 text-tx-tertiary/30" />
                    <p className="text-xs text-tx-tertiary">暂无版本历史</p>
                    <p className="text-[10px] text-tx-tertiary/60 mt-0.5">编辑保存后会自动记录</p>
                  </div>
                ) : (
                  versions.map((v) => {
                    const ct = changeTypeLabels[v.changeType] || changeTypeLabels.edit;
                    return (
                      <button
                        key={v.id}
                        onClick={() => handlePreview(v)}
                        className={cn(
                          "w-full text-left px-4 py-3 transition-colors border-b border-app-border/50 hover:bg-app-hover",
                          selectedVersion?.id === v.id && "bg-accent-primary/5"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("px-1.5 py-0.5 text-[9px] rounded font-medium", ct.color)}>{ct.label}</span>
                          <span className="text-[10px] text-tx-tertiary">v{v.version}</span>
                          <span className="text-[10px] text-tx-tertiary/60 ml-auto">{formatTime(v.createdAt)}</span>
                        </div>
                        <p className="text-xs text-tx-secondary truncate">{v.title || "无标题"}</p>
                        {v.changeSummary && (
                          <p className="text-[10px] text-tx-tertiary mt-0.5 truncate">{v.changeSummary}</p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 预览区域 */}
          <div className="w-1/2 flex flex-col">
            {selectedVersion ? (
              <>
                <div className="px-4 py-3 border-b border-app-border bg-app-bg/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-tx-primary">{selectedVersion.title}</p>
                      <p className="text-[10px] text-tx-tertiary">版本 {selectedVersion.version} · {formatTime(selectedVersion.createdAt)}</p>
                    </div>
                    {confirmRestore === selectedVersion.id ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmRestore(null)}
                          className="h-7 text-xs"
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRestore(selectedVersion.id)}
                          disabled={restoring}
                          className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          {restoring ? <Loader2 size={12} className="animate-spin mr-1" /> : <RotateCcw size={12} className="mr-1" />}
                          确认恢复
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmRestore(selectedVersion.id)}
                        className="h-7 text-xs text-amber-500 hover:bg-amber-500/10"
                      >
                        <RotateCcw size={12} className="mr-1" />
                        恢复此版本
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="px-4 py-3">
                    {loadingPreview ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={16} className="animate-spin text-tx-tertiary" />
                      </div>
                    ) : (
                      <pre className="text-xs text-tx-secondary whitespace-pre-wrap break-words font-mono leading-relaxed">
                        {previewContent || "（空内容）"}
                      </pre>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText size={28} className="mx-auto mb-2 text-tx-tertiary/30" />
                  <p className="text-xs text-tx-tertiary">选择一个版本查看内容</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
