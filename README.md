# dsh-revive — 会话回放、复刻与录制 · session replay, re-run and recording

**中文** | [English](#english)

## 中文

DSH 会话视图切换器里新增**「回放」**视图（与「对话」「轨迹」并列）：

- **流式回放动效**：⏮ ◀ ▶ ⏭ 游标控制 + 自动播放，内容按字符逐个"打"出来（带光标、视口自动跟随实时边缘），而不是整段 append；
- **一键复刻**：把当前会话的全部原始用户请求按顺序重放到一个**新会话**（走官方 `uiWorkspace.connectWorkspace` + `session.prompt`），工具由新会话重新执行——真正的"重跑"；
- **会话输出录屏**：把回放画面（会话内容本身）逐帧绘制到 1280×720 canvas，用 `MediaRecorder` 录成 `.webm`（VP9），可自动下载；不依赖窗口/屏幕录制权限。

### 界面

复用宿主自带的 UI 组件库渲染，尽量贴近原生观感并在此之上做信息分层：

- **正文与用户消息**走宿主同款 Markdown 渲染（表格、列表、链接、行内代码、代码块语法高亮都可正常显示），流式揭示时也不破坏格式；
- **思考与工具调用默认折叠**成一行：思考显示「● 思考 · N 字 · 首句预览」，工具显示「⚒ 工具名 · 实际执行参数」（例如 `bash` 后面直接是命令），点一下展开看全文；
- **工具结果**折叠行带状态：`✓ 已完成` / `✕ 失败` / `运行中`，折叠时显示输出首行预览；
- 折叠时仍在**实时增长**：思考/工具那行会边播边显示尾部文字，所以打字机效果不会因为折叠而消失；
- 轮次分隔改成细线 + 居中标签，正文最大宽度 900px，光标带呼吸闪烁。

如果宿主的组件库不可用（例如换到其它 DSH 版本），会自动降级为纯文本渲染，不会白屏。

### 回放动效

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

### 录制

- 画布按「片段预排版」（换行切片保留字符偏移），每帧只画已揭示部分，实时边缘随内容下滚，底部有渐隐提示仍在输出；
- **时长档** 30 / 60 / 120 秒 / 不限：选定时会自动抬高揭示速率把整段会话塞进目标时长（不限时按 240 秒硬上限加速），避免长会话录出十几分钟；
- 录制结束时自动生成 blob 并触发下载，按钮旁保留「⬇ 下载视频」可再次保存；录制中传输控件与两个下拉均锁定，避免画面被打断；
- 依赖 `canvas.captureStream()` + `MediaRecorder`（桌面版 rc.3 实测可用，`video/webm;codecs=vp9`）。

### 形态

纯 client 插件，但**必须以 bundle 形式声明**（见「安装」——这是 0.1.1 的关键修复）：

- 无 Node 路由、无文件写入，`lib/index.js` 只有空 `apply()`，仅作为 loader 行的挂载点；
- 会话视图注册：`slots.inject("conversation.view", () => slots.register(def, Component))`（与官方 ui-chat / ui-trajectory 同款）；
- 数据：`uiConversation.binding(sessionId).target("chat")` 投影 + `session.loadOlder()` 补全历史；
- 复刻：`uiWorkspace.connectWorkspace(workspaceId)` + `sessions.binding(sid).session.prompt([...], "queue")`。

### 安装

已收录到 DSH 插件目录（分类 **Sessions & Messages**），在 dsh 的**插件市场**里搜 `dsh-revive` 即可安装；目录条目页：<https://awesome-dsh-plugin.com/p/zxsimple/dsh-revive/>

也可以一条命令从仓库装：

```bash
dsh plugin --profile web add github:zxsimple/dsh-revive
```

手工挂载（本地开发）则改 profile 的 `package.json`：

```jsonc
"dependencies": { "dsh-revive": "link:/path/to/dsh-revive" },
"dsh": { "profile": { "bundles": [ /* ... */, "dsh-revive" ] } }
```

然后 `pnpm install`（link 依赖会建符号链接）+ **完全重启应用**（boot 时才会重新组装 loader 行与 client 模块）。

也可以直接从仓库安装：

```bash
git clone https://github.com/zxsimple/dsh-revive.git
# 然后把上面的 link: 指向 clone 下来的目录
```

> 关键点：纯 client 插件也必须声明 `dsh.bundle.patch` 并出现在 `dsh.profile.bundles` 里，否则宿主不会为它生成 loader 行（详见下一节）。

### 平台支持

纯 client 插件，运行在 DSH 的 Web 前端里，**不含任何与操作系统相关的代码**：没有 `fs` / `path` / `child_process`，没有 `process` / `__dirname`，没有绝对路径拼接，也没有构建脚本与原生依赖（`pnpm install` 对它只是建一个符号链接）。所以平台跟随 DSH 的 Web 客户端。

| 平台 | 状态 |
|---|---|
| macOS（DSH 桌面版 0.2.1-rc.3） | **已实测**：视图注册、流式变速、输入后停顿、canvas 录制全部验证通过 |
| Windows | 预期可用（**未实测**）。DSH 随包提供 `node.cmd` 与 `command-path.ps1`，插件市场也有完整的 `win32` 分支（`link:` 依赖走 junction、`npm.cmd` / `pnpm.cmd`）；插件侧没有需要移植的部分 |
| Linux | 同理，未实测 |

用到的浏览器能力都是 Chromium 内置的，Windows 上的 Electron / Chromium 同样具备：

- `MediaRecorder` + `canvas.captureStream()` —— 录制走 VP9/VP8 WebM，Windows 的 Chromium 支持；产物用系统播放器或浏览器都能播；
- `localStorage`（速度与时长记忆）、`navigator.language`（中英文案）；
- 录制画布的字体栈包含 `Microsoft YaHei`，中文在 Windows 上不会掉字；
- 滚动容器靠 `getComputedStyle` 向上查找，不依赖任何平台布局常量。

Windows 上唯一的注意点：`link:` 依赖建的是 junction，如果手改过 profile 的 `package.json`，重启前先确认 `node_modules/dsh-revive` 指向正确。

如果你在 Windows 上跑出了问题（比如录制拿不到 `video/webm`，只剩 `video/mp4`），把控制台报错贴到 issue 里即可。

### 为什么必须是 bundle：「没有按钮」的根因

1. **package.json 缺 `dsh.bundle.patch`**。插件目录里虽然有 `cordis.patch.yml`，但没有声明它，宿主就永远不会把这条 insert 行并入 loader 树 → 没有 loader 行 → 没有 Node 半边 fiber → `plugins/??` 里根本没有 `dsh-revive/client.js` → 视图切换器自然没有「回放」。dshmarket 自己的校验也会报同一句话：`bundle declares no dsh.bundle.patch — the profile will fail to boot`。
2. 纯 client 插件（`dsh.client` 但无 `dsh.bundle`）在 market 里只能**热挂载一个 shim**，重启即失效——所以它曾经"装上了"却重启后消失。
3. 另外两处真实的运行时缺陷（0.1.0 即使加载成功也点不出内容）：
   - `require("react/jsx-runtime")` 返回的是**命名空间对象**，不能直接当函数调用（应取 `.jsx` / `.jsxs`）；
   - rc.3 的 `chat` 快照不是 `{timeline, byId}`，而是 `{ order: string[], nodes: { get(key) }, timeline: { turnOrder, turns: Map } }`，节点形如 `{ key, kind, location, data }`；用户文本在 `data.content` 的分片里，助手文本在 `data.blocks` 里（`kind:"text" | "reasoning" | "tool-call"`）。

### 兼容性（对照 DSH 0.2.1-rc.3 桌面版产物核对）

- `slots.register({name:"conversation.view",...}, Component)` ✓（ui-chat 的 id=chat order=0、ui-trajectory 的 id=trajectory order=10 同款）
- `slots.entries("conversation.view")` 会收集所有注册项并渲染成切换器标签（`label` 经 `resolveSlotLabel`）✓
- `uiConversation.binding(source)` 接受 **sessionId 或 session binding** ✓；`.target("chat")` → `{ getSnapshot, subscribe }` ✓
- `ctx.locale.register(ns, { zh, en })` ✓（值可以是函数，服务端不校验字符串）
- `session.loadOlder()` ✓
- `uiWorkspace.connectWorkspace(workspaceId)` → `Promise<SessionId>` ✓（服务名 `uiWorkspace`）
- `session.prompt([{type:"text",text}], "queue")` → `{ ok }` ✓
- 运行期 cordis 注入用**服务名**：`["slots","sessions","uiSession","uiConversation","locale"]`（与 ui-trajectory 一致）；`workspaces`/`uiWorkspace` 用 `ctx.get(...)` 兜底读取。

---

## English

Adds a **Replay** view to the DSH conversation view switcher, alongside **Chat** and **Trajectory**:

- **Streaming replay**: cursor controls (⏮ ◀ ▶ ⏭) plus autoplay; text is revealed character by character with a caret and a viewport that follows the live edge, instead of pasting whole blocks;
- **One-click re-run**: sends the session's original user prompts, in order, into a **new session** through the official `uiWorkspace.connectWorkspace` + `session.prompt` path, so tools execute again for real;
- **Conversation recording**: paints the replay (the conversation content itself) frame by frame onto a 1280×720 canvas and captures it with `MediaRecorder` into a `.webm` (VP9), downloaded automatically — no window or screen-recording permission involved.

### Interface

Rendered with the host's own UI kit so it reads like the native surface, with clearer information layering on top:

- **Assistant prose and user messages** go through the same Markdown renderer the host uses (tables, lists, links, inline code and syntax-highlighted code blocks all render), and stay well-formed while streaming;
- **Reasoning and tool calls fold into one row by default**: reasoning shows `● Reasoning · N chars · first line`, a tool call shows `⚒ tool · the arguments it actually ran` (e.g. `bash` followed by the command); click to expand;
- **Tool results** carry a status in the folded row — `✓ done` / `✕ failed` / `running` — with a one-line preview of the output;
- Folding does **not** stop the stream: the folded line keeps growing with the tail of the text, so the typewriter effect survives collapsing;
- Turn separators became a hairline with a centred label, prose is capped at 900px, and the caret blinks.

If the host kit is unavailable (a different DSH version), rendering falls back to plain text instead of going blank.

### Replay pacing

- **Cost-budget clock (per-kind speed)**: every text in a turn is flattened into `segments` (user / reasoning / prose / tool call / tool output) that share one "cost budget" cursor. **Each kind spends a different amount of cost per character**, so one clock produces different speeds:

  | Content | Weight (cost per character) | Effect |
  |---|---|---|
  | User input `user` / `steer` | 1.00 | Base reading speed (60cps ≈ 60 characters per second) |
  | Assistant prose `assistant` | 1.00 | Base reading speed |
  | Reasoning `reasoning` | 0.06 | ≈16× |
  | Tool call `toolCall` | 0.04 | ≈25× |
  | Tool output `toolResult` | 0.12 | ≈8× |

- **Pause after input**: when the user/`steer` content finishes, the clock freezes at that boundary for **one second** (showing "⋯ thinking"), then reasoning and prose begin — the real "sent it, waiting for the first token" beat, instead of flooding the screen the moment the prompt ends;
- **Skim cap**: reasoning and tool content occupy at most **3.5 s per segment** however long it is (its weight is raised to fit the current speed), so one huge reasoning block cannot strand the viewer; input and prose always keep the full reading pace;
- **Viewport follows**: content no longer stretches its container — it uses the host's conversation scroller. While streaming, `scrollTop = scrollHeight`; scrolling up more than 64px stops following, returning to the bottom resumes it;
- **Speed presets**: Slow 25 / Normal 60 / Fast 160 / Turbo 400 characters per second (remembered in `localStorage`);
- **Visible on open**: opening the view shows the current turn in full; pressing ▶ replays it as a stream from that turn's start and continues across turns.

### Recording

- The canvas is laid out ahead of time ("slice pre-layout", wrapping keeps character offsets), and each frame draws only the revealed part; the live edge scrolls down and a bottom fade signals the stream is still running;
- **Length presets** 30 / 60 / 120 seconds / free: a fixed length raises the reveal rate so the whole session fits inside it (free keeps the reading pace, with a 240-second hard ceiling) — long sessions do not produce fifteen-minute videos;
- When recording ends a blob is produced and a download is triggered; the **⬇ Download video** button keeps the file re-downloadable, and the transport controls plus both dropdowns are locked during a take so the picture cannot be interrupted;
- Requires `canvas.captureStream()` + `MediaRecorder` (verified on desktop rc.3 with `video/webm;codecs=vp9`).

### Shape

A pure client plugin, but it **must be declared as a bundle** (see Install — this is the 0.1.1 fix):

- No host routes and no file writes; `lib/index.js` is an empty `apply()`, existing only as a loader-row anchor;
- View registration: `slots.inject("conversation.view", () => slots.register(def, Component))` (the same shape as the official ui-chat / ui-trajectory);
- Data: the `uiConversation.binding(sessionId).target("chat")` projection plus `session.loadOlder()` to page in history;
- Re-run: `uiWorkspace.connectWorkspace(workspaceId)` + `sessions.binding(sid).session.prompt([...], "queue")`.

### Install

Listed in the DSH plugin catalog (category **Sessions & Messages**) — search `dsh-revive` in dsh's **plugin market**, or open the catalog entry: <https://awesome-dsh-plugin.com/p/zxsimple/dsh-revive/>

One command from the repository:

```bash
dsh plugin --profile web add github:zxsimple/dsh-revive
```

Manual mount (local development) — edit the profile's `package.json`:

```jsonc
"dependencies": { "dsh-revive": "link:/path/to/dsh-revive" },
"dsh": { "profile": { "bundles": [ /* ... */, "dsh-revive" ] } }
```

Then `pnpm install` (the `link:` dependency is just a symlink) and **restart the app completely** (loader rows and client modules are only assembled at boot).

Or clone first and point the `link:` at the clone:

```bash
git clone https://github.com/zxsimple/dsh-revive.git
# then point the link: above at the cloned directory
```

> Key point: even a pure client plugin must declare `dsh.bundle.patch` and appear in `dsh.profile.bundles`, otherwise the host never emits a loader row for it (see the next section).

### Platform support

A pure client plugin running inside DSH's web front end, with **no OS-specific code**: no `fs` / `path` / `child_process`, no `process` / `__dirname`, no absolute path joining, and no build scripts or native dependencies (`pnpm install` merely creates a symlink for it). Platforms therefore follow DSH's web client.

| Platform | Status |
|---|---|
| macOS (DSH desktop 0.2.1-rc.3) | **Verified**: view registration, per-kind pacing, pause after input, canvas recording all exercised |
| Windows | Expected to work (**not tested**). DSH ships `node.cmd` and `command-path.ps1`, and the plugin market has full `win32` handling (`link:` dependencies become junctions, `npm.cmd` / `pnpm.cmd`); nothing on the plugin side needs porting |
| Linux | Same reasoning, not tested |

Every browser capability used is built into Chromium, which Electron / Chromium on Windows provides as well:

- `MediaRecorder` + `canvas.captureStream()` — recording produces VP9/VP8 WebM, supported by Chromium on Windows and playable in system players or browsers;
- `localStorage` (speed and length memory) and `navigator.language` (Chinese/English copy);
- The recording font stack includes `Microsoft YaHei`, so Chinese text does not fall back to tofu on Windows;
- The scroll container is found with `getComputedStyle`, relying on no platform layout constants.

One Windows caveat: a `link:` dependency is a junction there — if you hand-edited the profile's `package.json`, confirm `node_modules/dsh-revive` points at the right place before restarting.

If something breaks on Windows (for example recording only offers `video/mp4` instead of `video/webm`), paste the console error into an issue.

### Why it must be a bundle: the "no button" root cause

1. **`package.json` was missing `dsh.bundle.patch`.** The plugin shipped a `cordis.patch.yml` but never declared it, so the host never merged that insert row into the loader tree → no loader row → no Node-side fiber → `plugins/??` never served `dsh-revive/client.js` → the view switcher had no "Replay". dshmarket's own validation reports the same thing: `bundle declares no dsh.bundle.patch — the profile will fail to boot`.
2. A pure client plugin (`dsh.client` without `dsh.bundle`) can only be **hot-mounted as a shim** by the market, which is lost on restart — that is why it once "installed fine" and then vanished.
3. Two further real runtime defects (0.1.0 would have shown nothing even if loaded):
   - `require("react/jsx-runtime")` returns a **namespace object**, not a function (use `.jsx` / `.jsxs`);
   - The rc.3 `chat` snapshot is not `{timeline, byId}` but `{ order: string[], nodes: { get(key) }, timeline: { turnOrder, turns: Map } }`, with nodes shaped `{ key, kind, location, data }`; user text lives in the parts of `data.content`, assistant text in `data.blocks` (`kind:"text" | "reasoning" | "tool-call"`).

### Compatibility (checked against the DSH 0.2.1-rc.3 desktop build)

- `slots.register({name:"conversation.view",...}, Component)` ✓ (same shape as ui-chat's id=chat order=0 and ui-trajectory's id=trajectory order=10)
- `slots.entries("conversation.view")` collects every registration and renders it as a switcher tab (the `label` goes through `resolveSlotLabel`) ✓
- `uiConversation.binding(source)` accepts **a sessionId or a session binding** ✓; `.target("chat")` → `{ getSnapshot, subscribe }` ✓
- `ctx.locale.register(ns, { zh, en })` ✓ (values may be functions; the service does not require strings)
- `session.loadOlder()` ✓
- `uiWorkspace.connectWorkspace(workspaceId)` → `Promise<SessionId>` ✓ (service name `uiWorkspace`)
- `session.prompt([{type:"text",text}], "queue")` → `{ ok }` ✓
- Runtime cordis injection uses **service names**: `["slots","sessions","uiSession","uiConversation","locale"]` (same as ui-trajectory); `workspaces` / `uiWorkspace` are read defensively through `ctx.get(...)`.
