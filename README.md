# dsh-revive — 会话回放、复刻与录制

DSH 会话视图切换器里新增**「回放」**视图（与「对话」「轨迹」并列）：

- **流式回放动效**：⏮ ◀ ▶ ⏭ 游标控制 + 自动播放，内容按字符逐个"打"出来（带光标、视口自动跟随实时边缘），而不是整段 append；
- **一键复刻**：把当前会话的全部原始用户请求按顺序重放到一个**新会话**（走官方 `uiWorkspace.connectWorkspace` + `session.prompt`），工具由新会话重新执行——真正的"重跑"；
- **会话输出录屏**：把回放画面（会话内容本身）逐帧绘制到 1280×720 canvas，用 `MediaRecorder` 录成 `.webm`（VP9），可自动下载；不依赖窗口/屏幕录制权限。

## 回放动效（0.1.3）

- **代价预算时钟（分类变速）**：一轮内所有文本被拍平成 `segments`（用户/思考/正文/工具调用/工具输出），共享一个「代价预算」游标；**每类内容每个字符消耗的代价不同**，于是同一时钟下快慢不同：

  | 内容 | 权重（代价/字符） | 效果 |
  |---|---|---|
  | 用户输入 `user` / `steer` | 1.00 | 基准阅读速度（60cps ≈ 每秒 60 字） |
  | 助手正文 `assistant` | 1.00 | 基准阅读速度 |
  | 思考 `reasoning` | 0.06 | ≈16 倍速刷过 |
  | 工具调用 `toolCall` | 0.04 | ≈25 倍速 |
  | 工具输出 `toolResult` | 0.12 | ≈8 倍速 |

- **输入后停顿**：用户/steer 内容播完后，时钟在边界上冻结 **1 秒**（期间显示「⋯ 思考中」），再开始出思考/正文——模拟真实的"发出去后等首字"，避免输入一结束就立刻刷屏；
- **skim 封顶**：思考/工具类内容即使超长也只占最多 **3.5 秒/段**（权重按当前速度自动抬高），避免一轮几万字的思考把观众晾在那里；而输入与正文永远保持完整阅读节奏。
- **视口跟随**：内容不再撑高容器，而是沿用宿主的会话滚动容器；流式期间自动 `scrollTop = scrollHeight`，用户手动上滚超过 64px 即暂停跟随，滚回底部自动恢复。
- **速度档**：慢 25 / 标准 60 / 快 160 / 极速 400 字符/秒（localStorage 记忆）。
- **默认可见**：打开视图即完整显示当前轮；按 ▶ 播放才从该轮开头重新流式播放并跨轮连续推进。

## 录制（0.1.2）

- 画布按「片段预排版」（换行切片保留字符偏移），每帧只画已揭示部分，实时边缘随内容下滚，底部有渐隐提示仍在输出；
- **时长档** 30 / 60 / 120 秒 / 不限：选定时会自动抬高揭示速率把整段会话塞进目标时长（不限时按 240 秒硬上限加速），避免长会话录出十几分钟；
- 录制结束时自动生成 blob 并触发下载，按钮旁保留「⬇ 下载视频」可再次保存；录制中传输控件与两个下拉均锁定，避免画面被打断；
- 依赖 `canvas.captureStream()` + `MediaRecorder`（桌面版 rc.3 实测可用，`video/webm;codecs=vp9`）。

## 形态

纯 client 插件，但**必须以 bundle 形式声明**（见「安装」——这是 0.1.1 的关键修复）：

- 无 Node 路由、无文件写入，`lib/index.js` 只有空 `apply()`，仅作为 loader 行的挂载点；
- 会话视图注册：`slots.inject("conversation.view", () => slots.register(def, Component))`（与官方 ui-chat / ui-trajectory 同款）；
- 数据：`uiConversation.binding(sessionId).target("chat")` 投影 + `session.loadOlder()` 补全历史；
- 复刻：`uiWorkspace.connectWorkspace(workspaceId)` + `sessions.binding(sid).session.prompt([...], "queue")`。

## 安装

profile 的 `package.json`：

```jsonc
"dependencies": { "dsh-revive": "link:/path/to/dsh-revive" },
"dsh": { "profile": { "bundles": [ /* ... */, "dsh-revive" ] } }
```

然后 `pnpm install`（link 依赖会建符号链接）+ **完全重启应用**（boot 时才会重新组装 loader 行与 client 模块）。

## 为什么必须是 bundle：0.1.0 的「没有按钮」根因

1. **package.json 缺 `dsh.bundle.patch`**。插件目录里虽然有 `cordis.patch.yml`，但没有声明它，宿主就永远不会把这条 insert 行并入 loader 树 → 没有 loader 行 → 没有 Node 半边 fiber → `plugins/??` 里根本没有 `dsh-revive/client.js` → 视图切换器自然没有「回放」。dshmarket 自己的校验也会报同一句话：`bundle declares no dsh.bundle.patch — the profile will fail to boot`。
2. 纯 client 插件（`dsh.client` 但无 `dsh.bundle`）在 market 里只能**热挂载一个 shim**，重启即失效——所以它曾经"装上了"却重启后消失。
3. 另外两处真实的运行时缺陷（0.1.0 即使加载成功也点不出内容）：
   - `require("react/jsx-runtime")` 返回的是**命名空间对象**，不能直接当函数调用（应取 `.jsx` / `.jsxs`）；
   - rc.3 的 `chat` 快照不是 `{timeline, byId}`，而是 `{ order: string[], nodes: { get(key) }, timeline: { turnOrder, turns: Map } }`，节点形如 `{ key, kind, location, data }`；用户文本在 `data.content` 的分片里，助手文本在 `data.blocks` 里（`kind:"text" | "reasoning" | "tool-call"`）。

## 兼容性（对照 DSH 0.2.1-rc.3 桌面版产物核对）

- `slots.register({name:"conversation.view",...}, Component)` ✓（ui-chat 的 id=chat order=0、ui-trajectory 的 id=trajectory order=10 同款）
- `slots.entries("conversation.view")` 会收集所有注册项并渲染成切换器标签（`label` 经 `resolveSlotLabel`）✓
- `uiConversation.binding(source)` 接受 **sessionId 或 session binding** ✓；`.target("chat")` → `{ getSnapshot, subscribe }` ✓
- `ctx.locale.register(ns, { zh, en })` ✓（值可以是函数，服务端不校验字符串）
- `session.loadOlder()` ✓
- `uiWorkspace.connectWorkspace(workspaceId)` → `Promise<SessionId>` ✓（服务名 `uiWorkspace`）
- `session.prompt([{type:"text",text}], "queue")` → `{ ok }` ✓
- 运行期 cordis 注入用**服务名**：`["slots","sessions","uiSession","uiConversation","locale"]`（与 ui-trajectory 一致）；`workspaces`/`uiWorkspace` 用 `ctx.get(...)` 兜底读取。
