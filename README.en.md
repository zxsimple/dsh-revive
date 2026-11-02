# dsh-revive — session replay, re-run and recording

[中文](README.md) | **English**

Adds a **Replay** view to the DSH conversation view switcher, alongside **Chat** and **Trajectory**:

- **Streaming replay**: cursor controls (⏮ ◀ ▶ ⏭) plus autoplay; text is revealed character by character with a caret and a viewport that follows the live edge, instead of pasting whole blocks;
- **One-click re-run**: sends the session's original user prompts, in order, into a **new session** through the official `uiWorkspace.connectWorkspace` + `session.prompt` path, so tools execute again for real;
- **Conversation recording**: paints the replay (the conversation content itself) frame by frame onto a 1280×720 canvas and captures it with `MediaRecorder` into a `.webm` (VP9), downloaded automatically — no window or screen-recording permission involved.

## Replay pacing (0.1.3)

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

## Recording (0.1.2)

- The canvas is laid out ahead of time ("slice pre-layout", wrapping keeps character offsets), and each frame draws only the revealed part; the live edge scrolls down and a bottom fade signals the stream is still running;
- **Length presets** 30 / 60 / 120 seconds / free: a fixed length raises the reveal rate so the whole session fits inside it (free keeps the reading pace, with a 240-second hard ceiling) — long sessions do not produce fifteen-minute videos;
- When recording ends a blob is produced and a download is triggered; the **⬇ Download video** button keeps the file re-downloadable, and the transport controls plus both dropdowns are locked during a take so the picture cannot be interrupted;
- Requires `canvas.captureStream()` + `MediaRecorder` (verified on desktop rc.3 with `video/webm;codecs=vp9`).

## Shape

A pure client plugin, but it **must be declared as a bundle** (see Install — this is the 0.1.1 fix):

- No host routes and no file writes; `lib/index.js` is an empty `apply()`, existing only as a loader-row anchor;
- View registration: `slots.inject("conversation.view", () => slots.register(def, Component))` (the same shape as the official ui-chat / ui-trajectory);
- Data: the `uiConversation.binding(sessionId).target("chat")` projection plus `session.loadOlder()` to page in history;
- Re-run: `uiWorkspace.connectWorkspace(workspaceId)` + `sessions.binding(sid).session.prompt([...], "queue")`.

## Install

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

## Platform support

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

## Why it must be a bundle: the 0.1.0 "no button" root cause

1. **`package.json` was missing `dsh.bundle.patch`.** The plugin shipped a `cordis.patch.yml` but never declared it, so the host never merged that insert row into the loader tree → no loader row → no Node-side fiber → `plugins/??` never served `dsh-revive/client.js` → the view switcher had no "Replay". dshmarket's own validation reports the same thing: `bundle declares no dsh.bundle.patch — the profile will fail to boot`.
2. A pure client plugin (`dsh.client` without `dsh.bundle`) can only be **hot-mounted as a shim** by the market, which is lost on restart — that is why it once "installed fine" and then vanished.
3. Two further real runtime defects (0.1.0 would have shown nothing even if loaded):
   - `require("react/jsx-runtime")` returns a **namespace object**, not a function (use `.jsx` / `.jsxs`);
   - The rc.3 `chat` snapshot is not `{timeline, byId}` but `{ order: string[], nodes: { get(key) }, timeline: { turnOrder, turns: Map } }`, with nodes shaped `{ key, kind, location, data }`; user text lives in the parts of `data.content`, assistant text in `data.blocks` (`kind:"text" | "reasoning" | "tool-call"`).

## Compatibility (checked against the DSH 0.2.1-rc.3 desktop build)

- `slots.register({name:"conversation.view",...}, Component)` ✓ (same shape as ui-chat's id=chat order=0 and ui-trajectory's id=trajectory order=10)
- `slots.entries("conversation.view")` collects every registration and renders it as a switcher tab (the `label` goes through `resolveSlotLabel`) ✓
- `uiConversation.binding(source)` accepts **a sessionId or a session binding** ✓; `.target("chat")` → `{ getSnapshot, subscribe }` ✓
- `ctx.locale.register(ns, { zh, en })` ✓ (values may be functions; the service does not require strings)
- `session.loadOlder()` ✓
- `uiWorkspace.connectWorkspace(workspaceId)` → `Promise<SessionId>` ✓ (service name `uiWorkspace`)
- `session.prompt([{type:"text",text}], "queue")` → `{ ok }` ✓
- Runtime cordis injection uses **service names**: `["slots","sessions","uiSession","uiConversation","locale"]` (same as ui-trajectory); `workspaces` / `uiWorkspace` are read defensively through `ctx.get(...)`.
