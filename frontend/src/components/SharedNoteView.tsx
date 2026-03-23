import React, { useState, useEffect, useCallback, useRef } from "react";
import { Globe, Lock, Eye, AlertCircle, Loader2, FileText, MessageCircle, Send, RefreshCw, X, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ShareInfo, SharedNoteContent, ShareComment } from "@/types";
import { cn } from "@/lib/utils";

interface SharedNoteViewProps {
  shareToken: string;
}

export default function SharedNoteView({ shareToken }: SharedNoteViewProps) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [content, setContent] = useState<SharedNoteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Phase 4: 同步轮询
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 3: 评论
  const [comments, setComments] = useState<ShareComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // 加载分享信息
  useEffect(() => {
    const load = async () => {
      try {
        const info = await api.getShareInfo(shareToken);
        setShareInfo(info);
        if (info.needPassword) {
          setNeedPassword(true);
          setLoading(false);
        } else {
          // 无密码保护，直接加载内容
          const data = await api.getSharedContent(shareToken);
          setContent(data);
          setCurrentVersion(data.version || null);
          setLoading(false);
          // 加载评论
          if (info.permission !== "view") {
            const cmts = await api.getSharedComments(shareToken);
            setComments(cmts);
          }
        }
      } catch (e: any) {
        setError(e.message || "加载失败");
        setLoading(false);
      }
    };
    load();
  }, [shareToken]);

  // 密码验证
  const handleVerify = async () => {
    if (!password.trim() || verifying) return;
    setVerifying(true);
    setPasswordError("");
    try {
      const result = await api.verifySharePassword(shareToken, password.trim());
      setAccessToken(result.accessToken);
      setNeedPassword(false);

      // 加载内容
      const data = await api.getSharedContent(shareToken, result.accessToken);
      setContent(data);
      setCurrentVersion(data.version || null);
      // 加载评论
      if (shareInfo?.permission !== "view") {
        const cmts = await api.getSharedComments(shareToken, result.accessToken);
        setComments(cmts);
      }
    } catch (e: any) {
      setPasswordError(e.message || "验证失败");
    } finally {
      setVerifying(false);
    }
  };

  // 处理回车提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerify();
  };

  // Phase 4: 同步轮询（每 5 秒检测一次更新）
  useEffect(() => {
    if (!content || loading || needPassword) return;

    const poll = async () => {
      try {
        const data = await api.pollSharedNote(shareToken, accessToken || undefined);
        if (currentVersion !== null && data.version > currentVersion) {
          setHasUpdate(true);
        }
      } catch {
        // 轮询失败不处理（可能过期等）
      }
    };

    pollIntervalRef.current = setInterval(poll, 5000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [shareToken, accessToken, content, loading, needPassword, currentVersion]);

  // 手动刷新内容
  const handleRefresh = async () => {
    try {
      const data = await api.getSharedContent(shareToken, accessToken || undefined);
      setContent(data);
      setCurrentVersion(data.version || null);
      setHasUpdate(false);
    } catch (e: any) {
      console.error("刷新内容失败:", e);
    }
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const comment = await api.addSharedComment(shareToken, { content: newComment.trim() }, accessToken || undefined);
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (e: any) {
      console.error("提交评论失败:", e);
    } finally {
      setSubmittingComment(false);
    }
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
          <p className="text-sm text-zinc-400">加载分享内容...</p>
        </div>
      </div>
    );
  }

  // 错误
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">无法访问</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
          </div>
          <a
            href="/"
            className="text-sm text-indigo-500 hover:text-indigo-600 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  // 密码验证页
  if (needPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-sm mx-auto px-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-3">
                <Lock size={28} className="text-amber-500" />
              </div>
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">需要密码访问</h2>
              {shareInfo && (
                <p className="text-xs text-zinc-500 mt-1">
                  <span className="font-medium">{shareInfo.ownerName}</span> 分享的笔记
                </p>
              )}
              {shareInfo?.noteTitle && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[240px]">「{shareInfo.noteTitle}」</p>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入访问密码"
                autoFocus
                className="w-full h-10 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
              {passwordError && (
                <p className="text-xs text-red-500 text-center">{passwordError}</p>
              )}
              <Button
                onClick={handleVerify}
                disabled={!password.trim() || verifying}
                className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl"
              >
                {verifying ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
                {verifying ? "验证中..." : "确认访问"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 显示分享内容
  if (!content) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* 顶部信息栏 */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-indigo-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {content.title || "无标题笔记"}
              </h1>
              {shareInfo && (
                <p className="text-[11px] text-zinc-400">
                  由 <span className="text-zinc-500 dark:text-zinc-400">{shareInfo.ownerName}</span> 分享
                  {content.updatedAt && (
                    <> · 更新于 {new Date(content.updatedAt).toLocaleDateString("zh-CN")}</>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* 更新提示 */}
            {hasUpdate && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors font-medium"
              >
                <RefreshCw size={11} />
                有新版本，点击刷新
              </button>
            )}
            {/* 评论按钮 */}
            {shareInfo && shareInfo.permission !== "view" && (
              <button
                onClick={() => setShowComments(!showComments)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-[10px] rounded-md transition-colors",
                  showComments ? "bg-blue-500/10 text-blue-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <MessageCircle size={12} />
                {comments.length > 0 && <span>{comments.length}</span>}
              </button>
            )}
            <span className="px-2 py-1 text-[10px] rounded-md bg-indigo-500/10 text-indigo-500 font-medium">
              {content.permission === "view" ? "仅查看" : content.permission === "edit" ? "可编辑" : "可评论"}
            </span>
          </div>
        </div>
      </header>

      {/* 笔记内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div
          className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:text-zinc-800 dark:prose-headings:text-zinc-200
            prose-p:text-zinc-600 dark:prose-p:text-zinc-300
            prose-a:text-indigo-500
            prose-code:text-indigo-600 dark:prose-code:text-indigo-400
            prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800
            prose-blockquote:border-indigo-300 dark:prose-blockquote:border-indigo-700"
          dangerouslySetInnerHTML={{ __html: renderContent(content.content) }}
        />
      </main>

      {/* 评论区域 */}
      {showComments && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-500" />
              评论 ({comments.length})
            </h3>

            {/* 评论列表 */}
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-400 mb-4">暂无评论，来说点什么吧</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-medium text-indigo-500">
                        {(comment.username || "?")[0]?.toUpperCase()}
                      </div>
                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{comment.username || "匿名"}</span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(comment.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 评论输入 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                placeholder="输入评论..."
                className="flex-1 h-9 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submittingComment}
                size="icon"
                className="h-9 w-9 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shrink-0"
              >
                {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 底部 */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center">
        <p className="text-xs text-zinc-400">
          <Globe size={12} className="inline mr-1" />
          通过 Nowen Note 分享
        </p>
      </footer>
    </div>
  );
}

/**
 * 将编辑器的 JSON content 渲染为 HTML
 * 如果 content 是 JSON 格式（Tiptap），尝试简单渲染
 * 如果是纯 HTML 字符串，直接返回
 */
function renderContent(content: string): string {
  if (!content) return "";

  // 尝试解析 JSON (Tiptap editor JSON format)
  try {
    const json = JSON.parse(content);
    if (json.type === "doc" && json.content) {
      return renderTiptapJSON(json);
    }
  } catch {
    // 不是 JSON，当作 HTML 处理
  }

  return content;
}

/** 简单的 Tiptap JSON → HTML 渲染器 */
function renderTiptapJSON(doc: any): string {
  if (!doc.content) return "";
  return doc.content.map((node: any) => renderNode(node)).join("");
}

function renderNode(node: any): string {
  if (!node) return "";

  switch (node.type) {
    case "paragraph":
      return `<p>${renderChildren(node)}</p>`;
    case "heading": {
      const level = node.attrs?.level || 1;
      return `<h${level}>${renderChildren(node)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderChildren(node)}</ul>`;
    case "orderedList":
      return `<ol>${renderChildren(node)}</ol>`;
    case "listItem":
      return `<li>${renderChildren(node)}</li>`;
    case "taskList":
      return `<ul class="task-list">${renderChildren(node)}</ul>`;
    case "taskItem": {
      const checked = node.attrs?.checked ? "checked" : "";
      return `<li class="task-item"><input type="checkbox" ${checked} disabled />${renderChildren(node)}</li>`;
    }
    case "codeBlock": {
      const lang = node.attrs?.language || "";
      return `<pre><code class="language-${lang}">${escapeHtml(renderChildren(node))}</code></pre>`;
    }
    case "blockquote":
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    case "horizontalRule":
      return "<hr />";
    case "image": {
      const src = node.attrs?.src || "";
      const alt = node.attrs?.alt || "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
    }
    case "table":
      return `<table>${renderChildren(node)}</table>`;
    case "tableRow":
      return `<tr>${renderChildren(node)}</tr>`;
    case "tableHeader":
      return `<th>${renderChildren(node)}</th>`;
    case "tableCell":
      return `<td>${renderChildren(node)}</td>`;
    case "text": {
      let text = escapeHtml(node.text || "");
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case "bold":
              text = `<strong>${text}</strong>`;
              break;
            case "italic":
              text = `<em>${text}</em>`;
              break;
            case "strike":
              text = `<del>${text}</del>`;
              break;
            case "code":
              text = `<code>${text}</code>`;
              break;
            case "link":
              text = `<a href="${escapeHtml(mark.attrs?.href || "")}" target="_blank" rel="noopener">${text}</a>`;
              break;
            case "highlight":
              text = `<mark>${text}</mark>`;
              break;
          }
        }
      }
      return text;
    }
    case "hardBreak":
      return "<br />";
    default:
      return renderChildren(node);
  }
}

function renderChildren(node: any): string {
  if (!node.content) return node.text || "";
  return node.content.map((child: any) => renderNode(child)).join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
