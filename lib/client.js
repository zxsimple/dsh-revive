window.__ModuleLoader__.load({
	id: "dsh-revive",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const jsxRuntime = require("react/jsx-runtime");
		const jsx = jsxRuntime.jsx;
		const jsxs = jsxRuntime.jsxs;
		const { useState, useEffect, useMemo, useCallback, useRef } = react;

		//#region locale
		const NS = "revive";
		const DICT = {
			zh: {
				"view.revive": "回放",
				"toolbar.first": "⏮ 开头",
				"toolbar.prev": "◀ 上一轮",
				"toolbar.next": "下一轮 ▶",
				"toolbar.last": "最新 ⏭",
				"toolbar.play": "▶ 播放",
				"toolbar.pause": "⏸ 暂停",
				"toolbar.revive": "⚡ 复刻到新会话",
				"toolbar.speed": "速度",
				"toolbar.record": "● 录制",
				"toolbar.recording": "■ 停止录制",
				"toolbar.download": "⬇ 下载视频",
				"toolbar.length": "时长",
				"length.free": "不限",
				"length.short": "30 秒",
				"length.mid": "60 秒",
				"length.long": "120 秒",
				"toolbar.loadingOlder": "加载更早历史…",
				"speed.slow": "慢",
				"speed.normal": "标准",
				"speed.fast": "快",
				"speed.ultra": "极速",
				"progress": (a, b) => `第 ${a} / ${b} 轮`,
				"revive.confirm": (n) => `将把 ${n} 条原始请求复刻到新会话并自动开始运行，继续？`,
				"revive.running": "复刻中…",
				"revive.done": (id) => `已复刻到新会话 ${String(id).slice(0, 8)}…（会话列表中查看）`,
				"revive.failed": (e) => "复刻失败：" + e,
				"record.running": (p) => `录制中 ${p}% …（画面＝会话输出画布，1280×720）`,
				"record.runningFast": (p, x) => `录制中 ${p}% …（正文按 ${x}× 加速以塞进所选时长；想按原速阅读请把「时长」改为「不限」）`,
				"record.done": (kb, sec) => `已生成视频 ${kb} KB / ${sec} 秒，可点「下载视频」保存（.webm）`,
				"record.failed": (e) => "录制失败：" + e,
				"record.unsupported": "当前环境不支持 MediaRecorder 画布录制",
				"empty": "本会话还没有可回放的内容",
				"noWorkspace": "未找到所属工作区，无法复刻",
				"hold": "⋯ 思考中",
				"end": "— 已到末尾 —",
				"role.user": "用户",
				"role.assistant": "助手",
				"role.reasoning": "思考",
				"role.tool": "工具",
				"role.other": "事件",
				"tool.failed": "失败"
			},
			en: {
				"view.revive": "Replay",
				"toolbar.first": "⏮ First",
				"toolbar.prev": "◀ Prev",
				"toolbar.next": "Next ▶",
				"toolbar.last": "Latest ⏭",
				"toolbar.play": "▶ Play",
				"toolbar.pause": "⏸ Pause",
				"toolbar.revive": "⚡ Revive into new session",
				"toolbar.speed": "Speed",
				"toolbar.record": "● Record",
				"toolbar.recording": "■ Stop recording",
				"toolbar.download": "⬇ Download video",
				"toolbar.length": "Length",
				"length.free": "Free",
				"length.short": "30s",
				"length.mid": "60s",
				"length.long": "120s",
				"toolbar.loadingOlder": "Loading older history…",
				"speed.slow": "Slow",
				"speed.normal": "Normal",
				"speed.fast": "Fast",
				"speed.ultra": "Turbo",
				"progress": (a, b) => `Turn ${a} / ${b}`,
				"revive.confirm": (n) => `Revive ${n} original request(s) into a new session and start running. Continue?`,
				"revive.running": "Reviving…",
				"revive.done": (id) => `Revived into new session ${String(id).slice(0, 8)}…`,
				"revive.failed": (e) => "Revive failed: " + e,
				"record.running": (p) => `Recording ${p}% … (canvas of the conversation output, 1280×720)`,
				"record.runningFast": (p, x) => `Recording ${p}% … (prose sped up ${x}× to fit the chosen length; pick “Free” to keep reading pace)`,
				"record.done": (kb, sec) => `Video ready: ${kb} KB / ${sec}s — press “Download video” (.webm)`,
				"record.failed": (e) => "Recording failed: " + e,
				"record.unsupported": "This environment cannot record a canvas (MediaRecorder unavailable)",
				"empty": "Nothing to replay in this session yet",
				"noWorkspace": "No workspace found; cannot revive",
				"hold": "⋯ thinking",
				"end": "— end —",
				"role.user": "User",
				"role.assistant": "Assistant",
				"role.reasoning": "Reasoning",
				"role.tool": "Tool",
				"role.other": "Event",
				"tool.failed": "failed"
			}
		};
		const LANG = (typeof navigator !== "undefined" && navigator.language || "zh").startsWith("zh") ? "zh" : "en";
		const t = (k, ...args) => {
			const v = (DICT[LANG] && DICT[LANG][k]) ?? DICT.zh[k] ?? k;
			return typeof v === "function" ? v(...args) : v;
		};
		//#endregion

		//#region chat projection helpers (dsh 0.2.1-rc.3 `chat` target snapshot)
		//
		// The rc.3 `chat` target snapshot is NOT a flat {timeline, byId} map. Its shape is
		//   { order: string[], nodes: { get(key) }, timeline: { turnOrder, turns: Map }, ... }
		// and each node is
		//   { key, kind, id, target, anchorSeq, location, visibility, groupTree, data }
		// Human text lives in data.content parts; assistant text in data.blocks.
		function snapshotOf(chat) {
			try {
				const snap = chat && typeof chat.getSnapshot === "function" ? chat.getSnapshot() : void 0;
				return snap ?? {};
			} catch {
				return {};
			}
		}
		function listNodes(snap) {
			const nodes = [];
			const order = Array.isArray(snap && snap.order) ? snap.order : [];
			const store = snap && snap.nodes;
			if (store && typeof store.get === "function") {
				for (const key of order) {
					const node = store.get(key);
					if (node) nodes.push(node);
				}
			}
			return nodes;
		}
		function partText(part) {
			if (typeof part === "string") return part;
			if (!part || typeof part !== "object") return "";
			if (typeof part.text === "string") return part.text;
			if (typeof part.content === "string") return part.content;
			return "";
		}
		function contentText(content) {
			if (typeof content === "string") return content;
			if (!Array.isArray(content)) return "";
			return content.map(partText).filter(Boolean).join("\n").trim();
		}
		function blocksOf(blocks, kind) {
			if (!Array.isArray(blocks)) return [];
			return blocks.filter((block) => block && block.kind === kind);
		}
		function joinBlocks(blocks, kind) {
			return blocksOf(blocks, kind).map((block) => block.text ?? "").filter(Boolean).join("\n").trim();
		}
		/** Whether the node is a human input (regular prompt or steering message). */
		function isUserNode(node) {
			return Boolean(node) && (node.kind === "user" || node.kind === "steering");
		}
		/** Human input text of a user/steering node. */
		function userNodeText(node) {
			return contentText(node && node.data && node.data.content);
		}
		/** Turn number the node belongs to, when the projection located it. */
		function nodeTurn(node) {
			const location = node && node.location;
			const turn = location && location.turn;
			return turn && typeof turn.turn === "number" ? turn.turn : void 0;
		}
		/** Group ordered chat nodes into turns (one entry per projected turn). */
		function groupTurns(nodes) {
			const turns = [];
			let current;
			for (const node of nodes) {
				const turn = nodeTurn(node);
				if (turns.length === 0 || turn !== void 0 && turn !== current) {
					turns.push([]);
					current = turn;
				}
				turns[turns.length - 1].push(node);
			}
			return turns;
		}
		/** Every original human request, in projection order. */
		function userTexts(nodes) {
			const texts = [];
			for (const node of nodes) {
				if (!isUserNode(node)) continue;
				const text = userNodeText(node).trim();
				if (text) texts.push(text);
			}
			return texts;
		}
		/**
		 * Seconds-worth of "normal text" charged per character. Lower spends the clock faster,
		 * so `reasoning`/`toolCall`/`toolResult` are revealed at high speed and never hold up
		 * reading pace where it matters: the user's prompt and the assistant's answer.
		 */
		const SEGMENT_WEIGHT = {
			user: 1,
			steer: 1,
			assistant: 1,
			reasoning: 0.06,
			toolCall: 0.04,
			toolResult: 0.12
		};

		/**
		 * Kinds allowed to be skimmed get a wall-clock cap per segment, so one enormous
		 * reasoning block cannot hold the viewer: its weight is raised just enough to
		 * finish within this many seconds at the current speed.
		 */
		const SKIM_KINDS = new Set(["reasoning", "toolCall", "toolResult"]);
		const SKIM_MAX_SECONDS = 3.5;

		/** Beat held after the human input finishes, before the answer begins. */
		const PAUSE_AFTER_INPUT_MS = 1000;

		/** The next input boundary the budget has not passed yet, or null. */
		function nextPause(model, cost) {
			if (!model || !model.pauses) return null;
			for (const pause of model.pauses) {
				if (pause > cost + 0.001) return pause;
			}
			return null;
		}

		/** How many characters of a segment the cost budget has reached. */
		function revealedCount(segment, cost) {
			const span = cost - segment.costStart;
			if (span <= 0) return 0;
			if (span >= segment.costEnd - segment.costStart) return segment.chars;
			return Math.min(segment.chars, Math.floor(span / segment.weight));
		}

		/** Long tool output is truncated for display and recording; the replayed text stays readable. */
		const MAX_TOOL_TEXT = 1600;
		function clampText(text, max) {
			return text.length > max ? text.slice(0, max) + "\n…" : text;
		}
		/**
		 * Flatten one turn into stream segments. Each segment is one contiguous run of
		 * characters with a shared playback cursor, so the replay reads like a live
		 * stream instead of pasting whole blocks at once.
		 */
		function turnSegments(nodes, cps) {
			const segments = [];
			for (const node of nodes) {
				const kind = node && node.kind || "";
				if (kind === "user" || kind === "steering") {
					const text = userNodeText(node);
					if (text) segments.push({ key: node.key + ":user", kind: kind === "steering" ? "steer" : "user", text });
					continue;
				}
				if (kind === "assistant-step") {
					const blocks = node.data && node.data.blocks;
					const reasoning = joinBlocks(blocks, "reasoning");
					if (reasoning) segments.push({ key: node.key + ":reason", kind: "reasoning", text: reasoning });
					const text = joinBlocks(blocks, "text");
					if (text) segments.push({ key: node.key + ":text", kind: "assistant", text });
					for (const call of blocksOf(blocks, "tool-call")) {
						const name = String(call.name ?? "tool");
						segments.push({ key: node.key + ":call:" + String(call.callId ?? name), kind: "toolCall", text: `${t("role.tool")} · ${name}`, name });
					}
					continue;
				}
				if (kind === "tool-result") {
					const data = node.data || {};
					const detail = contentText(data.content) || (data.error ? String(data.error.message ?? data.error) : "");
					if (!detail) continue;
					segments.push({
						key: node.key + ":result",
						kind: "toolResult",
						text: clampText(detail, MAX_TOOL_TEXT),
						name: String(data.name || "tool"),
						failed: data.isError === true
					});
				}
			}
			// Cost-based pacing: the clock advances COST, and each kind of content spends a
			// different amount per character. Human input and assistant prose stay readable
			// (weight 1), while reasoning / tool calls / tool output fly by (weight < 1).
			let chars = 0;
			let cost = 0;
			const pauses = [];
			for (const segment of segments) {
				let weight = SEGMENT_WEIGHT[segment.kind] ?? 1;
				if (SKIM_KINDS.has(segment.kind) && segment.text.length > 0) {
					// weight × chars / cps <= SKIM_MAX_SECONDS  =>  weight <= seconds × cps / chars
					const cap = (SKIM_MAX_SECONDS * cps) / segment.text.length;
					weight = Math.min(weight, cap);
				}
				segment.weight = weight;
				segment.chars = segment.text.length;
				segment.start = chars;
				segment.costStart = cost;
				segment.costEnd = cost + segment.text.length * weight;
				chars += segment.text.length;
				cost = segment.costEnd;
				// A human turn gets a beat before the answer starts, like a real request.
				if (segment.kind === "user" || segment.kind === "steer") pauses.push(segment.costEnd);
			}
			return { segments, chars, cost, pauses };
		}
		/** Reveal `count` code units, without splitting a surrogate pair. */
		function reveal(text, count) {
			if (count <= 0) return "";
			if (count >= text.length) return text;
			let limit = count;
			const code = text.charCodeAt(limit - 1);
			if (code >= 0xd800 && code <= 0xdbff) limit += 1;
			return text.slice(0, limit);
		}
		//#endregion

		//#region styles
		const S = {
			root: { display: "flex", flexDirection: "column", minHeight: 0, fontFamily: "inherit" },
			toolbar: { position: "sticky", top: 0, zIndex: 3, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 16px", borderBottom: "1px solid rgba(128,128,128,0.2)", background: "var(--dsh-bg, Canvas)", backdropFilter: "blur(6px)" },
			btn: { padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.3)", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 13 },
			btnPrimary: { background: "#4f6ef2", borderColor: "transparent", color: "#fff", fontWeight: 600 },
			btnRecord: { background: "#e11d48", borderColor: "transparent", color: "#fff", fontWeight: 600 },
			btnDisabled: { opacity: 0.45, cursor: "not-allowed" },
			select: { fontSize: 12, padding: "4px 6px", borderRadius: 7, border: "1px solid rgba(128,128,128,0.3)", background: "transparent", color: "inherit" },
			progress: { fontSize: 12, opacity: 0.7, margin: "0 6px" },
			body: { padding: "16px 20px 48px", display: "flex", flexDirection: "column", gap: 10 },
			turnTag: { fontSize: 11, opacity: 0.55, margin: "10px 0 2px" },
			bubbleUser: { alignSelf: "flex-end", maxWidth: "85%", background: "#4f6ef2", color: "#fff", borderRadius: 12, padding: "10px 14px", fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 },
			bubbleSteer: { alignSelf: "flex-end", maxWidth: "85%", background: "rgba(79,110,242,0.16)", border: "1px dashed rgba(79,110,242,0.5)", borderRadius: 12, padding: "10px 14px", fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 },
			card: { alignSelf: "stretch", background: "rgba(128,128,128,0.07)", border: "1px solid rgba(128,128,128,0.18)", borderRadius: 10, padding: "10px 14px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" },
			cardTool: { alignSelf: "stretch", background: "rgba(128,128,128,0.05)", border: "1px dashed rgba(128,128,128,0.3)", borderRadius: 10, padding: "8px 12px", fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" },
			reasoning: { alignSelf: "stretch", borderLeft: "2px solid rgba(128,128,128,0.35)", padding: "2px 0 2px 10px", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: 0.75, fontStyle: "italic" },
			toolLine: { fontSize: 11, opacity: 0.7, whiteSpace: "pre-wrap", wordBreak: "break-word" },
			dim: { opacity: 0.6, fontSize: 12 },
			failed: { color: "#dc3c3c" },
			caret: { opacity: 0.75 },
			hold: { alignSelf: "flex-start", fontSize: 12, opacity: 0.55, padding: "2px 0 2px 2px" },
			end: { textAlign: "center", opacity: 0.45, fontSize: 12, padding: 16 }
		};
		//#endregion

		//#region stream rendering
		/** A blinking caret marks the live edge of the stream. */
		function Caret({ on }) {
			return on ? jsx("span", { style: S.caret, children: "▌" }) : null;
		}

		function SegmentView({ segment, count, typing }) {
			const text = reveal(segment.text, count);
			if (!text) return null;
			const testId = { "data-seg": segment.kind };
			const live = typing && count < segment.text.length;
			if (segment.kind === "user" || segment.kind === "steer") {
				return jsxs("div", { ...testId, style: segment.kind === "steer" ? S.bubbleSteer : S.bubbleUser, children: [text, jsx(Caret, { on: live, key: "caret" })] });
			}
			if (segment.kind === "reasoning") {
				return jsxs("div", { ...testId, style: S.reasoning, children: ["🤔 ", text, jsx(Caret, { on: live, key: "caret" })] });
			}
			if (segment.kind === "toolCall") {
				return jsxs("div", { ...testId, style: S.toolLine, children: ["🔧 ", text, jsx(Caret, { on: live, key: "caret" })] });
			}
			if (segment.kind === "toolResult") {
				return jsxs("div", { ...testId, style: { ...S.cardTool, ...(segment.failed ? S.failed : {}), opacity: 0.85 }, children: [
					jsx("div", { style: { opacity: 0.7 }, children: `🔧 ${t("role.tool")} · ${segment.name}${segment.failed ? " · " + t("tool.failed") : ""}` }, "label"),
					jsxs("div", { children: [text, jsx(Caret, { on: live, key: "caret" })] }, "body")
				] });
			}
			return jsxs("div", { ...testId, style: S.card, children: [text, jsx(Caret, { on: live, key: "caret" })] });
		}
		//#endregion

		//#region canvas recorder (session output -> video)
		const REC = {
			width: 1280,
			height: 720,
			pad: 40,
			header: 88,
			line: 30,
			font: "20px -apple-system, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
			small: "16px -apple-system, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
			tiny: "15px -apple-system, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
			bg: "#ffffff",
			ink: "#111827",
			turn: "#9aa4b2",
			user: "#1d4ed8",
			reason: "#6b7280",
			tool: "#7c3aed",
			result: "#4b5563"
		};

		/** Wrap one segment into contiguous slices (sum of slices === text length). */
		function wrapSlices(ctx, text, maxWidth) {
			const slices = [];
			let start = 0;
			let lastSpace = -1;
			let width = 0;
			let index = 0;
			while (index < text.length) {
				const ch = text[index];
				if (ch === "\n") {
					slices.push({ start, end: index + 1 });
					start = index + 1;
					width = 0;
					lastSpace = -1;
					index += 1;
					continue;
				}
				const advance = ctx.measureText(ch).width;
				if (width + advance > maxWidth && index > start) {
					const breakAt = lastSpace > start ? lastSpace + 1 : index;
					slices.push({ start, end: breakAt });
					start = breakAt;
					width = 0;
					lastSpace = -1;
					index = breakAt;
					continue;
				}
				width += advance;
				if (ch === " ") lastSpace = index;
				index += 1;
			}
			if (start < text.length || slices.length === 0) slices.push({ start, end: text.length });
			return slices;
		}

		function fontFor(kind) {
			if (kind === "turn") return REC.tiny;
			if (kind === "toolResult") return REC.small;
			if (kind === "reasoning" || kind === "toolCall") return REC.small;
			return REC.font;
		}
		function colorFor(kind) {
			if (kind === "turn") return REC.turn;
			if (kind === "user") return REC.user;
			if (kind === "reasoning") return REC.reason;
			if (kind === "toolCall") return REC.tool;
			if (kind === "toolResult") return REC.result;
			return REC.ink;
		}

		/**
		 * Lay every turn out once into absolute-positioned lines. Each line records the
		 * global character offset it starts at, so a single budget reveals the video
		 * exactly like the on-screen stream.
		 */
		function createPainter(turnModels) {
			const canvas = document.createElement("canvas");
			canvas.width = REC.width;
			canvas.height = REC.height;
			const ctx = canvas.getContext("2d");
			const maxWidth = REC.width - REC.pad * 2;
			const lines = [];
			let y = REC.header + 24;
			let cost = 0;
			for (let turnIndex = 0; turnIndex < turnModels.length; turnIndex++) {
				lines.push({ kind: "turn", text: t("progress", turnIndex + 1, turnModels.length), costStart: cost, len: 0, weight: 1, y });
				y += REC.line + 4;
				for (const segment of turnModels[turnIndex].segments) {
					ctx.font = fontFor(segment.kind);
					const slices = wrapSlices(ctx, segment.text, maxWidth);
					let local = 0;
					for (const slice of slices) {
						const text = segment.text.slice(slice.start, slice.end);
						// Each line spends cost at its segment's rate, so reasoning and tool rows
						// stream past quickly while prose keeps reading pace.
						lines.push({
							kind: segment.kind,
							text,
							costStart: cost + local * segment.weight,
							len: text.length,
							weight: segment.weight,
							y
						});
						local += text.length;
						y += REC.line;
					}
					cost += segment.text.length * segment.weight;
					y += 10;
				}
				y += 12;
			}
			const totalChars = Math.max(cost, 1);
			const totalHeight = y;

			function draw(budget, cursor) {
				ctx.fillStyle = REC.bg;
				ctx.fillRect(0, 0, REC.width, REC.height);

				// Header: title + turn counter + progress bar.
				ctx.font = REC.small;
				ctx.fillStyle = "#6b7280";
				ctx.textBaseline = "alphabetic";
				ctx.fillText("DSH 会话回放", REC.pad, 44);
				const counter = t("progress", Math.min(cursor, turnModels.length || 1), turnModels.length || 1);
				ctx.textAlign = "right";
				ctx.fillText(counter, REC.width - REC.pad, 44);
				ctx.textAlign = "left";
				ctx.fillStyle = "#e5e7eb";
				ctx.fillRect(REC.pad, 58, REC.width - REC.pad * 2, 3);
				ctx.fillStyle = "#4f6ef2";
				ctx.fillRect(REC.pad, 58, (REC.width - REC.pad * 2) * Math.min(1, budget / totalChars), 3);

				// Follow the live edge: scroll once the revealed text passes the viewport.
				// Only lines the stream has actually reached count towards the live edge —
				// a future turn's separator must not drag the viewport down to the bottom.
				let revealedBottom = REC.header + 24;
				for (const line of lines) {
					if (line.costStart > budget) break;
					revealedBottom = Math.max(revealedBottom, line.y);
				}
				const viewport = REC.height - REC.header - REC.pad;
				const offset = Math.max(0, revealedBottom - (REC.header + viewport + 26));
				ctx.save();
				ctx.translate(0, -offset);
				ctx.textBaseline = "alphabetic";
				for (const line of lines) {
					if (line.y < offset + REC.header - REC.line || line.y > offset + REC.height) continue;
					if (line.kind === "turn") {
						if (budget <= line.costStart) continue;
						ctx.font = REC.tiny;
						ctx.fillStyle = REC.turn;
						ctx.fillText(`—— ${line.text} ——`, REC.pad, line.y);
						continue;
					}
					if (line.len === 0) continue;
					if (line.costStart > budget) break;
					const span = budget - line.costStart;
					if (span <= 0) continue;
					const shown = Math.min(line.len, Math.floor(span / (line.weight || 1)));
					if (shown <= 0) continue;
					const text = shown >= line.len ? line.text : line.text.slice(0, shown);
					ctx.font = fontFor(line.kind);
					ctx.fillStyle = colorFor(line.kind);
					ctx.fillText(text, REC.pad, line.y);
					if (line.kind === "user") {
						ctx.fillStyle = "rgba(29,78,216,0.55)";
						ctx.fillRect(REC.pad - 14, line.y - 18, 3, 24);
					}
				}
				ctx.restore();

				// Bottom fade, so the live edge reads as "still streaming".
				if (budget < totalChars) {
					const gradient = ctx.createLinearGradient(0, REC.height - 60, 0, REC.height);
					gradient.addColorStop(0, "rgba(255,255,255,0)");
					gradient.addColorStop(1, "rgba(255,255,255,0.9)");
					ctx.fillStyle = gradient;
					ctx.fillRect(0, REC.height - 60, REC.width, 60);
				}
			}

			return { canvas, draw, totalChars, totalHeight };
		}

		function pickMime() {
			const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
			for (const candidate of candidates) {
				try {
					if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) return candidate;
				} catch {
					/* keep probing */
				}
			}
			return "";
		}
		//#endregion

		//#region ReviveView
		const SPEEDS = [
			{ id: "slow", cps: 25, label: () => t("speed.slow") },
			{ id: "normal", cps: 60, label: () => t("speed.normal") },
			{ id: "fast", cps: 160, label: () => t("speed.fast") },
			{ id: "ultra", cps: 400, label: () => t("speed.ultra") }
		];
		const SPEED_KEY = "dsh-revive:speed";
		/** Hard ceiling for one take; longer sessions speed up instead of stalling. */
		const REC_MAX_SECONDS = 240;
		/** Target video length: the reveal rate is raised to fit the session into it. */
		const REC_LENGTHS = [
			{ id: "30", seconds: 30, label: () => t("length.short") },
			{ id: "60", seconds: 60, label: () => t("length.mid") },
			{ id: "120", seconds: 120, label: () => t("length.long") },
			{ id: "free", seconds: null, label: () => t("length.free") }
		];
		const LENGTH_KEY = "dsh-revive:length";

		function readLength() {
			try {
				const stored = typeof localStorage !== "undefined" ? localStorage.getItem(LENGTH_KEY) : null;
				if (stored && REC_LENGTHS.some((entry) => entry.id === stored)) return stored;
			} catch {
				/* storage unavailable */
			}
			return "60";
		}

		function readSpeed() {
			try {
				const stored = typeof localStorage !== "undefined" ? localStorage.getItem(SPEED_KEY) : null;
				if (stored && SPEEDS.some((speed) => speed.id === stored)) return stored;
			} catch {
				/* storage unavailable */
			}
			return "normal";
		}

		function ReviveView(props) {
			const { session, chat, workspaceId, uiWorkspace, sessions } = props;
			const [snap, setSnap] = useState(() => snapshotOf(chat));
			const [cursor, setCursor] = useState(1);
			const [budget, setBudget] = useState(0);
			const [playing, setPlaying] = useState(false);
			const [holding, setHolding] = useState(false);
			const [recording, setRecording] = useState(false);
			const [speedId, setSpeedId] = useState(readSpeed);
			const [lengthId, setLengthId] = useState(readLength);
			const [recordInfo, setRecordInfo] = useState(null);
			const [status, setStatus] = useState(null);
			const [loadingOlder, setLoadingOlder] = useState(false);
			const loadedOnce = useRef(false);
			const initedRef = useRef(false);
			const atEndRef = useRef(true);
			const bodyRef = useRef(null);
			const followRef = useRef(true);
			const machine = useRef({ cursor: 1, budget: 0, playing: false, autoAdvance: false, last: 0, raf: 0, rec: null, painter: null, stopping: false, pushedAt: 0, pushedCursor: 1 });
			const speedRef = useRef(60);

			const speedCps = useMemo(() => (SPEEDS.find((speed) => speed.id === speedId) ?? SPEEDS[1]).cps, [speedId]);
			const lengthSeconds = useMemo(() => (REC_LENGTHS.find((entry) => entry.id === lengthId) ?? REC_LENGTHS[1]).seconds, [lengthId]);
			useEffect(() => {
				try {
					if (typeof localStorage !== "undefined") localStorage.setItem(LENGTH_KEY, lengthId);
				} catch {
					/* storage unavailable */
				}
			}, [lengthId]);
			useEffect(() => {
				speedRef.current = speedCps;
				try {
					if (typeof localStorage !== "undefined") localStorage.setItem(SPEED_KEY, speedId);
				} catch {
					/* storage unavailable */
				}
			}, [speedCps, speedId]);

			useEffect(() => {
				setSnap(snapshotOf(chat));
				setCursor(1);
				setBudget(0);
				setPlaying(false);
				machine.current.cursor = 1;
				machine.current.budget = 0;
				machine.current.playing = false;
				machine.current.holdUntil = 0;
				machine.current.holding = false;
				setHolding(false);
				loadedOnce.current = false;
				followRef.current = true;
				initedRef.current = false;
			}, [chat]);

			useEffect(() => {
				if (!chat || typeof chat.subscribe !== "function") return void 0;
				return chat.subscribe(() => setSnap(snapshotOf(chat)));
			}, [chat]);

			const loadAll = useCallback(async () => {
				if (!session || typeof session.loadOlder !== "function" || loadedOnce.current) return;
				loadedOnce.current = true;
				setLoadingOlder(true);
				try {
					for (let i = 0; i < 12; i++) {
						const before = listNodes(snapshotOf(chat)).length;
						try {
							await session.loadOlder();
						} catch {
							break;
						}
						const after = listNodes(snapshotOf(chat)).length;
						if (after <= before) break;
					}
				} finally {
					setLoadingOlder(false);
				}
			}, [chat, session]);
			useEffect(() => { loadAll(); }, [loadAll]);

			const nodes = useMemo(() => listNodes(snap), [snap]);
			const turns = useMemo(() => groupTurns(nodes), [nodes]);
			const speedCpsForModel = useMemo(() => (SPEEDS.find((speed) => speed.id === speedId) ?? SPEEDS[1]).cps, [speedId]);
			const turnModels = useMemo(
				() => turns.map((turnNodes) => turnSegments(turnNodes, speedCpsForModel)),
				[turns, speedCpsForModel]
			);
			const total = turnModels.length;
			const clamped = Math.min(Math.max(cursor, 1), Math.max(total, 1));
			const currentModel = turnModels[clamped - 1];
			const currentChars = currentModel ? currentModel.cost : 0;
			const visibleTurns = useMemo(() => turnModels.slice(0, clamped), [turnModels, clamped]);

			// "Close enough to the end" counts as finished: `loadOlder()` keeps growing the
			// turn under a view that was already fully revealed, and an exact `>=` test
			// would then refuse to restart playback.
			const nearEnd = (value, chars) => chars === 0 || value >= chars - Math.max(2, chars * 0.02);

			// Keep the machine in sync when the projection changes under us.
			useEffect(() => {
				const m = machine.current;
				if (m.cursor > total) m.cursor = Math.max(total, 1);
				const chars = turnModels[m.cursor - 1] ? turnModels[m.cursor - 1].cost : 0;
				if (m.budget > chars) m.budget = chars;
				// History paging can grow a finished turn: stay fully revealed instead of
				// silently truncating the tail the user was just reading.
				if (!m.playing && !m.recording && atEndRef.current && m.budget < chars) {
					m.budget = chars;
					setBudget(chars);
				}
				atEndRef.current = nearEnd(m.budget, chars);
			}, [turnModels, total]);

			// First paint shows the current turn in full; pressing play restarts it as a
			// stream, so opening the view is never a blank screen.
			useEffect(() => {
				if (initedRef.current || total === 0) return;
				initedRef.current = true;
				const chars = turnModels[0] ? turnModels[0].cost : 0;
				machine.current.budget = chars;
				setBudget(chars);
			}, [total, turnModels]);

			// The replay content flows inside the host conversation scroller, so following the
			// live edge means driving that scroller (our own node has no fixed height).
			const scrollerOf = (el) => {
				let node = el;
				while (node && node !== document.body) {
					const style = getComputedStyle(node);
					if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 4) return node;
					node = node.parentElement;
				}
				return null;
			};

			useEffect(() => {
				const el = bodyRef.current;
				if (!el) return void 0;
				const scroller = scrollerOf(el);
				if (!scroller) return void 0;
				const onScroll = () => {
					const gap = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
					followRef.current = gap < 64;
				};
				scroller.addEventListener("scroll", onScroll, { passive: true });
				return () => scroller.removeEventListener("scroll", onScroll);
			}, []);

			// Keep the viewport pinned to the live edge while the stream is running.
			useEffect(() => {
				const el = bodyRef.current;
				if (!el || !followRef.current) return;
				const scroller = scrollerOf(el);
				if (scroller) scroller.scrollTop = scroller.scrollHeight;
			}, [budget, clamped, playing]);

			const stopMachine = useCallback(() => {
				const m = machine.current;
				m.playing = false;
				m.autoAdvance = false;
				setPlaying(false);
			}, []);

			const jumpTo = useCallback((next, animate) => {
				const m = machine.current;
				const target = Math.min(Math.max(next, 1), Math.max(total, 1));
				const chars = turnModels[target - 1] ? turnModels[target - 1].cost : 0;
				m.cursor = target;
				m.budget = animate ? 0 : chars;
				m.autoAdvance = false;
				m.playing = Boolean(animate);
				m.holdUntil = 0;
				m.holding = false;
				m.last = 0;
				setHolding(false);
				setCursor(target);
				setBudget(m.budget);
				setPlaying(Boolean(animate));
				followRef.current = true;
			}, [total, turnModels]);

			const togglePlay = useCallback(() => {
				const m = machine.current;
				if (m.playing) {
					stopMachine();
					return;
				}
				const chars = turnModels[m.cursor - 1] ? turnModels[m.cursor - 1].cost : 0;
				if (nearEnd(m.budget, chars)) m.budget = 0;
				m.autoAdvance = true;
				m.playing = true;
				m.holdUntil = 0;
				m.holding = false;
				m.last = 0;
				setBudget(m.budget);
				setPlaying(true);
				setHolding(false);
				followRef.current = true;
			}, [stopMachine, turnModels]);

			// One clock drives the on-screen stream and the recorded canvas.
			useEffect(() => {
				if (!playing && !recording) return void 0;
				const m = machine.current;
				m.last = 0;
				let cancelled = false;
				const step = (ts) => {
					if (cancelled) return;
					const model = turnModels[m.cursor - 1];
					const chars = model ? model.cost : 0;
					const dt = m.last === 0 ? 0 : Math.min(80, ts - m.last);
					m.last = ts;
					if (m.playing) {
						const cps = m.recording && m.recCps ? m.recCps : speedRef.current;
						// Holding after a human input: the clock is frozen at the boundary.
						if (m.holdUntil && ts < m.holdUntil) {
							m.holding = true;
						} else {
							m.holdUntil = 0;
							m.holding = false;
							const stop = nextPause(model, m.budget);
							const advanced = m.budget + (dt * cps) / 1000;
							if (stop !== null && advanced >= stop && stop <= chars) {
								// Land exactly on the boundary, then wait there.
								m.budget = stop;
								m.holdUntil = ts + PAUSE_AFTER_INPUT_MS;
								m.holding = true;
							} else {
								m.budget = Math.min(chars, advanced);
							}
							if (m.budget >= chars && !m.holding) {
								if (m.autoAdvance && m.cursor < turnModels.length) {
									m.cursor += 1;
									m.budget = 0;
									m.holdUntil = 0;
								} else {
									m.playing = false;
									setPlaying(false);
								}
							}
						}
					}
					if (ts - m.pushedAt > 32 || m.cursor !== m.pushedCursor || m.holding !== m.pushedHolding) {
						m.pushedAt = ts;
						m.pushedCursor = m.cursor;
						m.pushedHolding = m.holding;
						setCursor(m.cursor);
						setBudget(m.budget);
						setHolding(Boolean(m.holding));
					}
					if (m.recording && m.painter) {
						let prefix = 0;
						for (let i = 0; i < m.cursor - 1; i++) prefix += turnModels[i] ? turnModels[i].cost : 0;
						m.painter.draw(prefix + m.budget, m.cursor);
						const done = !m.playing && m.cursor >= turnModels.length && m.budget >= chars;
						if (done && !m.stopping) {
							m.stopping = true;
							setTimeout(() => finishRecording(), 900);
						}
					}
					m.raf = requestAnimationFrame(step);
				};
				m.raf = requestAnimationFrame(step);
				return () => {
					cancelled = true;
					cancelAnimationFrame(m.raf);
					m.last = 0;
				};
			}, [playing, recording, turnModels]);

			const downloadRecording = useCallback((info) => {
				if (!info || !info.url) return;
				try {
					const link = document.createElement("a");
					link.href = info.url;
					link.download = info.name;
					document.body.appendChild(link);
					link.click();
					link.remove();
				} catch (error) {
					setStatus({ kind: "error", text: t("record.failed", error?.message ?? String(error)) });
				}
			}, []);

			const finishRecording = useCallback(() => {
				const m = machine.current;
				if (m.rec && m.rec.state !== "inactive") m.rec.stop();
				m.stopping = false;
				m.recording = false;
				setRecording(false);
			}, []);

			const startRecording = useCallback(() => {
				if (recording) return;
				if (typeof MediaRecorder === "undefined") {
					setStatus({ kind: "error", text: t("record.unsupported") });
					return;
				}
				if (total === 0) {
					setStatus({ kind: "error", text: t("empty") });
					return;
				}
				const m = machine.current;
				try {
					const painter = createPainter(turnModels);
					const stream = painter.canvas.captureStream(30);
					const mimeType = pickMime();
					const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 4000000 } : { videoBitsPerSecond: 4000000 });
					const chunks = [];
					const startedAt = performance.now();
					rec.ondataavailable = (event) => {
						if (event.data && event.data.size > 0) chunks.push(event.data);
					};
					rec.onstop = () => {
						try {
							stream.getTracks().forEach((track) => track.stop());
						} catch {
							/* already stopped */
						}
						const blob = new Blob(chunks, { type: mimeType || "video/webm" });
						const seconds = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
						const extension = (mimeType || "").includes("mp4") ? "mp4" : "webm";
						const info = {
							size: blob.size,
							seconds,
							name: `dsh-revive-${String(Date.now()).slice(-6)}.${extension}`,
							url: URL.createObjectURL(blob)
						};
						setRecordInfo(info);
						setStatus({ kind: "done", text: t("record.done", Math.max(1, Math.round(blob.size / 1024)), seconds) });
						downloadRecording(info);
					};
					// Prose pacing wins: the take is fitted to the target length using the
					// reading-pace cost only (user prompts + assistant answers), so skimming
					// content compresses instead of the text people actually read.
					let proseCost = 0;
					let totalCost = 0;
					for (const model of turnModels) {
						totalCost += model.cost;
						for (const segment of model.segments) {
							if (segment.weight >= 1) proseCost += segment.text.length;
						}
					}
					// "不限" keeps the reading pace as-is; a fixed target shortens the take, and
					// how much the prose is sped up is reported back to the user below.
					m.recCps = lengthSeconds ? Math.max(speedRef.current, proseCost / lengthSeconds, 1) : speedRef.current;
					m.recTotalCost = Math.max(totalCost, 1);
					m.recProse = proseCost;
					m.recFit = lengthSeconds ? m.recCps / Math.max(speedRef.current, 1) : 1;
					// Start from a clean playback so the video always shows the whole session.
					m.cursor = 1;
					m.budget = 0;
					m.painter = painter;
					m.rec = rec;
					m.recording = true;
					m.stopping = false;
					m.autoAdvance = true;
					m.playing = true;
					m.holdUntil = 0;
					m.holding = false;
					m.last = 0;
					setCursor(1);
					setBudget(0);
					setRecordInfo(null);
					setStatus({ kind: "running", text: t("record.running", 0) });
					setRecording(true);
					setPlaying(true);
					followRef.current = true;
					rec.start(200);
				} catch (error) {
					setStatus({ kind: "error", text: t("record.failed", error?.message ?? String(error)) });
					setRecording(false);
					m.recording = false;
				}
			}, [downloadRecording, lengthSeconds, recording, total, turnModels]);

			// Recording progress readout, refreshed from the clock.
			useEffect(() => {
				if (!recording) return void 0;
				const timer = setInterval(() => {
					const m = machine.current;
					if (!m.painter) return;
					let prefix = 0;
					for (let i = 0; i < m.cursor - 1; i++) prefix += turnModels[i] ? turnModels[i].cost : 0;
					const revealedChars = Math.min(m.painter.totalChars, prefix + m.budget);
					const percent = Math.round((revealedChars / m.painter.totalChars) * 100);
					const fit = m.recFit ?? 1;
					setStatus({
						kind: "running",
						text: fit >= 1.5 ? t("record.runningFast", percent, fit.toFixed(1)) : t("record.running", percent)
					});
				}, 400);
				return () => clearInterval(timer);
			}, [recording, turnModels]);

			const revive = useCallback(async () => {
				if (recording) return;
				const texts = userTexts(nodes);
				if (texts.length === 0) {
					setStatus({ kind: "error", text: t("empty") });
					return;
				}
				if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("revive.confirm", texts.length))) return;
				if (!uiWorkspace || typeof uiWorkspace.connectWorkspace !== "function") {
					setStatus({ kind: "error", text: t("noWorkspace") });
					return;
				}
				setStatus({ kind: "running", text: t("revive.running") });
				try {
					const sid = await uiWorkspace.connectWorkspace(workspaceId);
					let driver;
					for (let i = 0; i < 24 && !driver; i++) {
						driver = sessions && typeof sessions.binding === "function" ? sessions.binding(sid)?.session : void 0;
						if (!driver) await new Promise((resolve) => setTimeout(resolve, 250));
					}
					if (!driver) throw new Error("session is not ready");
					const head = texts.length > 1 ? `【会话复刻】以下是从历史会话复刻的 ${texts.length} 轮原始请求，请按顺序逐轮执行：\n\n` : "";
					const body = texts.length > 1 ? texts.map((text, index) => `── 第 ${index + 1} 轮 ──\n${text}`).join("\n\n") : texts[0];
					const accepted = await driver.prompt([{ type: "text", text: head + body }], "queue");
					if (!accepted || accepted.ok !== true) throw new Error(accepted && accepted.error !== void 0 ? String(accepted.error) : "prompt rejected");
					setStatus({ kind: "done", text: t("revive.done", String(sid)) });
				} catch (error) {
					setStatus({ kind: "error", text: t("revive.failed", error?.message ?? String(error)) });
				}
			}, [nodes, recording, uiWorkspace, workspaceId, sessions]);

			const btn = (label, onClick, extra, disabled) => jsx("button", {
				style: { ...S.btn, ...(extra || {}), ...(disabled ? S.btnDisabled : {}) },
				onClick: disabled ? void 0 : onClick,
				disabled: Boolean(disabled),
				children: label
			});

			return jsxs("div", { style: S.root, children: [
				jsxs("div", { style: S.toolbar, children: [
					btn(t("toolbar.first"), () => jumpTo(1, true), null, recording),
					btn(t("toolbar.prev"), () => jumpTo(clamped - 1, false), null, recording),
					btn(playing ? t("toolbar.pause") : t("toolbar.play"), togglePlay, playing ? {} : S.btnPrimary, recording),
					btn(t("toolbar.next"), () => jumpTo(clamped + 1, true), null, recording),
					btn(t("toolbar.last"), () => jumpTo(total, false), null, recording),
					jsx("span", { style: S.progress, children: total > 0 ? t("progress", clamped, total) : "" }),
					loadingOlder ? jsx("span", { style: S.dim, children: t("toolbar.loadingOlder") }) : null,
					jsx("span", { style: { flex: 1 } }),
					jsxs("label", { style: { ...S.dim, display: "flex", alignItems: "center", gap: 4 }, children: [
						t("toolbar.speed"),
						jsx("select", {
							style: S.select,
							value: speedId,
							disabled: recording,
							onChange: (event) => setSpeedId(event.target.value),
							children: SPEEDS.map((speed) => jsx("option", { value: speed.id, children: speed.label() }, speed.id))
						}, "speed")
					] }),
					jsxs("label", { style: { ...S.dim, display: "flex", alignItems: "center", gap: 4 }, children: [
						t("toolbar.length"),
						jsx("select", {
							style: S.select,
							value: lengthId,
							disabled: recording,
							onChange: (event) => setLengthId(event.target.value),
							children: REC_LENGTHS.map((entry) => jsx("option", { value: entry.id, children: entry.label() }, entry.id))
						}, "length")
					] }),
					recording
						? btn(t("toolbar.recording"), () => finishRecording(), S.btnRecord)
						: btn(t("toolbar.record"), startRecording, S.btnRecord),
					recordInfo ? btn(t("toolbar.download"), () => downloadRecording(recordInfo)) : null,
					btn(t("toolbar.revive"), revive, { ...S.btnPrimary, opacity: workspaceId ? 1 : 0.5 })
				] }),
				status ? jsx("div", { style: { padding: "8px 16px", fontSize: 12, color: status.kind === "error" ? "#dc3c3c" : status.kind === "done" ? "#2a9d5c" : "inherit", borderBottom: "1px solid rgba(128,128,128,0.15)" }, children: status.text }) : null,
				jsx("div", {
					style: S.body,
					ref: bodyRef,
					"data-revive-body": "1",
					onScroll: (event) => {
						const el = event.currentTarget;
						const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
						followRef.current = distance < 48;
					},
					children: total === 0
						? jsx("div", { style: { ...S.dim, textAlign: "center", padding: 32 }, children: t("empty") })
						: [
							...visibleTurns.flatMap((model, turnIndex) => {
								const isCurrent = turnIndex === clamped - 1;
								const limit = isCurrent ? budget : model.cost;
								const typing = isCurrent && playing;
								const rows = [jsx("div", { style: S.turnTag, children: `── ${t("progress", turnIndex + 1, total)} ──` }, "turn-" + turnIndex)];
								for (const segment of model.segments) {
									const count = revealedCount(segment, limit);
									if (count <= 0) continue;
									rows.push(jsx(SegmentView, { segment, count, typing }, segment.key));
								}
								if (isCurrent && holding) rows.push(jsx("div", { style: S.hold, children: t("hold") }, "hold"));
								return rows;
							}),
							clamped >= total && budget >= currentChars ? jsx("div", { style: S.end, children: t("end") }, "end") : null
						]
				})
			] });
		}
		//#endregion

		//#region apply
		// Runtime fiber inject: cordis SERVICE names (official trajectory precedent:
		// uiSession/uiConversation are services; package names belong in the
		// manifest's dsh.client.inject module-dependency list only).
		const INJECT = ["slots", "sessions", "uiSession", "uiConversation", "locale"];

		/**
		 * Read another cordis service without assuming it is safe to touch: a service
		 * outside the fiber's inject list may be absent, and direct property access on
		 * an absent service throws in strict cordis contexts.
		 */
		function service(ctx, name) {
			try {
				if (ctx && typeof ctx.get === "function") {
					const viaGet = ctx.get(name);
					if (viaGet !== void 0) return viaGet;
				}
			} catch {
				/* fall through to the property probe */
			}
			try {
				return ctx ? ctx[name] : void 0;
			} catch {
				return void 0;
			}
		}

		function resolveWorkspaceId(ctx, sessionId) {
			try {
				const registry = service(ctx, "workspaces");
				const items = registry && registry.list ? registry.list.getSnapshot().items ?? [] : [];
				const hit = items.find((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId));
				const picked = hit ?? items[0];
				return picked ? picked.workspaceId : void 0;
			} catch {
				return void 0;
			}
		}

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), "revive: dictionaries");
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "revive",
				order: 11,
				locale: NS,
				label: () => t("view.revive"),
				inject: (sessionId) => {
					let session;
					let chat;
					try {
						session = ctx.sessions.binding(sessionId)?.session;
					} catch {
						session = void 0;
					}
					try {
						const conversation = service(ctx, "uiConversation");
						chat = conversation && typeof conversation.binding === "function" ? conversation.binding(sessionId).target("chat") : void 0;
					} catch {
						chat = void 0;
					}
					return {
						session,
						chat,
						workspaceId: resolveWorkspaceId(ctx, sessionId),
						uiWorkspace: service(ctx, "uiWorkspace"),
						sessions: ctx.sessions
					};
				}
			}, ReviveView));
		}

		exports.apply = apply;
		exports.inject = INJECT;
		return module.exports;
	}
});
