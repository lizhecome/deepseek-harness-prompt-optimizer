window.__ModuleLoader__.load({ id: "@lizhecome/dsh-prompt-optimizer", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region src/client/index.tsx
/** Simplified Chinese dictionary and key-set source of truth. */
const zh = {
	"button.label": "优化提示词",
	"button.title": "用 AI 优化当前提示词",
	"status.running": "正在优化提示词",
	"status.success": "提示词已优化",
	"status.stale": "输入内容已变化，未覆盖当前草稿",
	"error.empty": "优化器没有返回文本",
	"error.unknown-command": "宿主未注册提示词优化命令"
};
/** English dictionary checked against the Chinese key set. */
const en = {
	"button.label": "Optimize prompt",
	"button.title": "Optimize the current prompt with AI",
	"status.running": "Optimizing prompt",
	"status.success": "Prompt optimized",
	"status.stale": "The draft changed, so the current text was not replaced",
	"error.empty": "The optimizer returned no text",
	"error.unknown-command": "The host did not register the prompt optimizer command"
};
const NS = "prompt-optimizer";
const STYLE_ID = "dsh-prompt-optimizer-style";
/** Install the button's self-contained styles and return their disposer. */
function installStyles() {
	if (document.getElementById(STYLE_ID) !== null) return () => {};
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = `
.dsh-prompt-optimizer-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 7px;
  color: var(--dsw-text-tertiary, #71717a);
  cursor: pointer;
  display: inline-flex;
  height: 28px;
  justify-content: center;
  padding: 0;
  transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;
  width: 28px;
}
.dsh-prompt-optimizer-button:hover:not(:disabled) {
  background: var(--dsw-bg-hover, rgba(127, 127, 127, 0.12));
  color: var(--dsw-accent, #6366f1);
}
.dsh-prompt-optimizer-button:active:not(:disabled) { transform: scale(0.93); }
.dsh-prompt-optimizer-button:focus-visible {
  outline: 2px solid var(--dsw-focus-ring, #6366f1);
  outline-offset: 2px;
}
.dsh-prompt-optimizer-button:disabled { cursor: default; opacity: 0.38; }
.dsh-prompt-optimizer-button[data-state='running'] { color: var(--dsw-accent, #6366f1); }
.dsh-prompt-optimizer-button[data-state='success'] { color: var(--dsw-success, #16a34a); }
.dsh-prompt-optimizer-button[data-state='error'] { color: var(--dsw-danger, #dc2626); }
.dsh-prompt-optimizer-button[data-state='running'] svg { animation: dsh-prompt-optimizer-spin 900ms linear infinite; }
.dsh-prompt-optimizer-status {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
@keyframes dsh-prompt-optimizer-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .dsh-prompt-optimizer-button { transition: none; }
  .dsh-prompt-optimizer-button[data-state='running'] svg { animation: none; }
}
`;
	document.head.append(style);
	return () => style.remove();
}
/** Sparkle icon shared by idle, progress, and result states. */
function SparklesIcon() {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		"aria-hidden": "true",
		width: "16",
		height: "16",
		viewBox: "0 0 24 24",
		fill: "none",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			d: "M12 2l1.35 4.15L17.5 7.5l-4.15 1.35L12 13l-1.35-4.15L6.5 7.5l4.15-1.35L12 2Z",
			fill: "currentColor"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			d: "M18.5 13l.92 2.58L22 16.5l-2.58.92L18.5 20l-.92-2.58L15 16.5l2.58-.92L18.5 13ZM5 12l.72 2.28L8 15l-2.28.72L5 18l-.72-2.28L2 15l2.28-.72L5 12Z",
			fill: "currentColor"
		})]
	});
}
/** Optimize the current draft without overwriting edits made while the request is running. */
function PromptOptimizerButton({ input, inputActions, optimizePrompt, t }) {
	const [status, setStatus] = (0, react.useState)({ kind: "idle" });
	const latestInput = (0, react.useRef)(input);
	const alive = (0, react.useRef)(true);
	latestInput.current = input;
	(0, react.useEffect)(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	const disabled = input.phase !== "plain" || input.draft.trim().length === 0 || status.kind === "running";
	const title = status.kind === "error" ? status.text : t("button.title");
	const run = () => {
		const draft = input.draft;
		const draftRev = input.draftRev;
		setStatus({
			kind: "running",
			text: t("status.running")
		});
		optimizePrompt(draft).then((optimized) => {
			if (!alive.current) return;
			const latest = latestInput.current;
			if (latest.draftRev !== draftRev || latest.draft !== draft) {
				setStatus({
					kind: "error",
					text: t("status.stale")
				});
				return;
			}
			inputActions.setDraft(optimized);
			setStatus({
				kind: "success",
				text: t("status.success")
			});
		}, (reason) => {
			if (!alive.current) return;
			setStatus({
				kind: "error",
				text: reason instanceof Error ? reason.message : String(reason)
			});
		});
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		type: "button",
		className: "dsh-prompt-optimizer-button",
		"data-prompt-optimizer": "button",
		"data-state": status.kind,
		"aria-label": t("button.label"),
		"aria-busy": status.kind === "running",
		title,
		disabled,
		onMouseDown: (event) => event.preventDefault(),
		onClick: run,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SparklesIcon, {})
	}), status.kind !== "idle" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		className: "dsh-prompt-optimizer-status",
		role: "status",
		children: status.text
	})] });
}
/** Required client services: slot, command Remote, and locale registries. */
const inject = [
	"slots",
	"remote",
	"remote.commands",
	"locale"
];
/** Register the composer button and its localized dictionaries. */
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "prompt-optimizer: dictionaries");
	ctx.effect(installStyles, "prompt-optimizer: styles");
	ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
		name: "conversation.input.right",
		id: "prompt-optimizer",
		order: 20,
		locale: NS,
		inject: (sessionId) => ({ optimizePrompt: async (draft) => {
			const result = await ctx.remote.commands.execute(sessionId, `/optimize-prompt --button\n${draft}`);
			if (!result.ok) throw new Error(`${result.error.message} (${result.error.code})`);
			if (result.value === void 0) throw new Error(ctx.locale.bind(NS)("error.unknown-command"));
			if (result.value.result.kind === "error") throw new Error(result.value.result.text);
			const optimized = result.value.result.text?.trim();
			if (optimized === void 0 || optimized.length === 0) throw new Error(ctx.locale.bind(NS)("error.empty"));
			return optimized;
		} })
	}, PromptOptimizerButton));
}

//#endregion
exports.PromptOptimizerButton = PromptOptimizerButton;
exports.apply = apply;
exports.en = en;
exports.inject = inject;
exports.zh = zh;
return module.exports; } });