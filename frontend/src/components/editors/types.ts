/**
 * 笔记编辑器统一契约（Tiptap / Markdown 两个引擎共用）
 * ----------------------------------------------------
 * 任何新编辑器引擎都应实现 `NoteEditorProps` 和可选的 `NoteEditorHandle`，
 * 保证 `EditorPane` 可以通过 `resolveEditorMode()` 无差别切换。
 *
 * 为何要集中定义：
 *   - 历史上两个编辑器的 props 形状靠"人工约定"保持一致，
 *     一旦一边改动忘了同步，就会出现类型正常但运行行为分裂的问题。
 *   - 通过显式共享类型，TS 编译期即可发现不对齐。
 */

import type { Note, Tag } from "@/types";

/** 标题项（大纲/跳转用） */
export interface NoteEditorHeading {
  id: string;
  level: number;
  text: string;
  /**
   * Tiptap：ProseMirror 位置
   * Markdown：文档字符偏移
   * 调用方只需把它透传回编辑器的 `scrollTo`。
   */
  pos: number;
}

/** 编辑器更新回调载荷 */
export interface NoteEditorUpdatePayload {
  content: string;
  contentText: string;
  title: string;
}

/** 两个编辑器引擎统一的 props 契约 */
export interface NoteEditorProps {
  note: Note;
  onUpdate: (data: NoteEditorUpdatePayload) => void;
  onTagsChange?: (tags: Tag[]) => void;
  onHeadingsChange?: (headings: NoteEditorHeading[]) => void;
  onEditorReady?: (scrollTo: (pos: number) => void) => void;
  editable?: boolean;
  /** 访客模式（分享页）：禁用依赖登录态的能力（TagInput、AI 助手等） */
  isGuest?: boolean;
}

/**
 * 通过 `useImperativeHandle` 暴露给父组件的命令式 API。
 * 目前只有 flushSave 一项，用于切换编辑器 / 切换笔记 / 窗口关闭前
 * 把 debounce 中的 pending 更新立即落盘。
 */
export interface NoteEditorHandle {
  /** 立即触发一次 onUpdate（跳过 debounce）。无 pending 更新时为 no-op。 */
  flushSave: () => void;
}
