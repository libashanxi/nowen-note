import { Hono } from "hono";
import { getDb } from "../db/schema";
import { v4 as uuid } from "uuid";

const app = new Hono();

// 获取所有笔记本（树形结构）
app.get("/", (c) => {
  const db = getDb();
  const userId = c.req.header("X-User-Id") || "demo";
  const notebooks = db.prepare(`
    SELECT nb.*, COALESCE(nc.noteCount, 0) AS noteCount
    FROM notebooks nb
    LEFT JOIN (
      SELECT notebookId, COUNT(*) AS noteCount
      FROM notes
      WHERE userId = ? AND isTrashed = 0
      GROUP BY notebookId
    ) nc ON nb.id = nc.notebookId
    WHERE nb.userId = ?
    ORDER BY nb.sortOrder ASC
  `).all(userId, userId);
  return c.json(notebooks);
});

// 创建笔记本
app.post("/", async (c) => {
  const db = getDb();
  const userId = c.req.header("X-User-Id") || "demo";
  const body = await c.req.json();
  const id = uuid();
  db.prepare(`
    INSERT INTO notebooks (id, userId, parentId, name, icon, color, sortOrder)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, body.parentId || null, body.name, body.icon || "📒", body.color || null, body.sortOrder || 0);
  const notebook = db.prepare("SELECT * FROM notebooks WHERE id = ?").get(id);
  return c.json(notebook, 201);
});

// 移动笔记本（支持修改 parentId，允许置为 null 回到根级）
// 必须在 /:id 路由之前注册
app.put("/:id/move", async (c) => {
  const db = getDb();
  const userId = c.req.header("X-User-Id") || "demo";
  const id = c.req.param("id");
  const body = await c.req.json();

  // body.parentId: string | null | undefined
  //   undefined -> 不修改父级（仅用于排序）
  //   null     -> 移动到根级
  //   string   -> 移动到指定父笔记本下
  const newParentId: string | null | undefined = body.parentId;
  const newSortOrder: number | undefined = typeof body.sortOrder === "number" ? body.sortOrder : undefined;

  // 权限校验：笔记本必须属于当前用户
  const target = db.prepare("SELECT id, userId, parentId FROM notebooks WHERE id = ?").get(id) as
    | { id: string; userId: string; parentId: string | null }
    | undefined;
  if (!target) return c.json({ error: "notebook not found" }, 404);
  if (target.userId !== userId) return c.json({ error: "forbidden" }, 403);

  if (newParentId !== undefined && newParentId !== null) {
    if (newParentId === id) {
      return c.json({ error: "cannot move notebook into itself" }, 400);
    }
    const parent = db.prepare("SELECT id, userId FROM notebooks WHERE id = ?").get(newParentId) as
      | { id: string; userId: string }
      | undefined;
    if (!parent) return c.json({ error: "target parent not found" }, 404);
    if (parent.userId !== userId) return c.json({ error: "forbidden" }, 403);

    // 循环引用防护：不能把笔记本移动到自己的子孙下
    // 从 newParentId 向上溯源，若链路中出现 id 则拒绝
    let cursor: string | null = newParentId;
    const visited = new Set<string>();
    while (cursor) {
      if (visited.has(cursor)) break; // 防御：数据已存在环
      visited.add(cursor);
      if (cursor === id) {
        return c.json({ error: "cannot move notebook into its own descendant" }, 400);
      }
      const row = db.prepare("SELECT parentId FROM notebooks WHERE id = ?").get(cursor) as
        | { parentId: string | null }
        | undefined;
      cursor = row?.parentId ?? null;
    }
  }

  // 需要显式区分 null 与 undefined，COALESCE 做不到，因此手动拼 SQL
  const sets: string[] = [];
  const args: any[] = [];
  if (newParentId !== undefined) {
    sets.push("parentId = ?");
    args.push(newParentId); // null 会被 better-sqlite3 正确绑定为 NULL
  }
  if (newSortOrder !== undefined) {
    sets.push("sortOrder = ?");
    args.push(newSortOrder);
  }
  sets.push("updatedAt = datetime('now')");
  args.push(id);

  db.prepare(`UPDATE notebooks SET ${sets.join(", ")} WHERE id = ?`).run(...args);
  const notebook = db.prepare("SELECT * FROM notebooks WHERE id = ?").get(id);
  return c.json(notebook);
});

// 批量更新笔记本排序（必须在 /:id 路由之前注册，否则 'reorder' 会被当作 :id 参数匹配）
app.put("/reorder/batch", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const items: { id: string; sortOrder: number }[] = body.items;
  if (!Array.isArray(items)) return c.json({ error: "items is required" }, 400);

  const stmt = db.prepare("UPDATE notebooks SET sortOrder = ? WHERE id = ?");
  const updateMany = db.transaction((list: { id: string; sortOrder: number }[]) => {
    for (const item of list) {
      stmt.run(item.sortOrder, item.id);
    }
  });
  updateMany(items);
  return c.json({ success: true });
});

// 更新笔记本
app.put("/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json();
  db.prepare(`
    UPDATE notebooks SET name = COALESCE(?, name), icon = COALESCE(?, icon),
    color = COALESCE(?, color), parentId = COALESCE(?, parentId),
    sortOrder = COALESCE(?, sortOrder), isExpanded = COALESCE(?, isExpanded),
    updatedAt = datetime('now')
    WHERE id = ?
  `).run(body.name, body.icon, body.color, body.parentId, body.sortOrder, body.isExpanded, id);
  const notebook = db.prepare("SELECT * FROM notebooks WHERE id = ?").get(id);
  return c.json(notebook);
});

// 删除笔记本
app.delete("/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  db.prepare("DELETE FROM notebooks WHERE id = ?").run(id);
  return c.json({ success: true });
});

export default app;
