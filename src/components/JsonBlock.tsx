import {
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type Ref,
} from "react";

type JsonBlockProps = {
	title: string;
	value: unknown;
	/** Editable start-input mode */
	editable?: boolean;
	draft?: string;
	onDraftChange?: (next: string) => void;
	onApply?: () => void;
	parseError?: string | null;
};

type TokenKind = "key" | "string" | "number" | "boolean" | "null" | "punct" | "plain";

function tokenizeJsonLine(line: string): Array<{ kind: TokenKind; text: string }> {
	const tokens: Array<{ kind: TokenKind; text: string }> = [];
	let i = 0;
	while (i < line.length) {
		const ch = line[i];
		if (ch === " " || ch === "\t") {
			let j = i + 1;
			while (j < line.length && (line[j] === " " || line[j] === "\t")) j += 1;
			tokens.push({ kind: "plain", text: line.slice(i, j) });
			i = j;
			continue;
		}
		if (ch === '"' ) {
			let j = i + 1;
			let escaped = false;
			while (j < line.length) {
				const c = line[j];
				if (escaped) {
					escaped = false;
					j += 1;
					continue;
				}
				if (c === "\\") {
					escaped = true;
					j += 1;
					continue;
				}
				if (c === '"') {
					j += 1;
					break;
				}
				j += 1;
			}
			const text = line.slice(i, j);
			const rest = line.slice(j).trimStart();
			const kind: TokenKind = rest.startsWith(":") ? "key" : "string";
			tokens.push({ kind, text });
			i = j;
			continue;
		}
		if (/[-0-9]/.test(ch)) {
			let j = i + 1;
			while (j < line.length && /[0-9.eE+-]/.test(line[j]!)) j += 1;
			tokens.push({ kind: "number", text: line.slice(i, j) });
			i = j;
			continue;
		}
		if (line.startsWith("true", i) || line.startsWith("false", i)) {
			const word = line.startsWith("true", i) ? "true" : "false";
			tokens.push({ kind: "boolean", text: word });
			i += word.length;
			continue;
		}
		if (line.startsWith("null", i)) {
			tokens.push({ kind: "null", text: "null" });
			i += 4;
			continue;
		}
		if ("{}[]:,".includes(ch)) {
			tokens.push({ kind: "punct", text: ch });
			i += 1;
			continue;
		}
		tokens.push({ kind: "plain", text: ch });
		i += 1;
	}
	return tokens;
}

function highlightJson(text: string): ReactNode {
	const lines = text.split("\n");
	return lines.map((line, lineIdx) => (
		<span key={lineIdx} className="qg-json-line">
			{tokenizeJsonLine(line).map((tok, tokIdx) =>
				tok.kind === "plain" ? (
					<span key={tokIdx}>{tok.text}</span>
				) : (
					<span key={tokIdx} className={`qg-json-tok qg-json-tok--${tok.kind}`}>
						{tok.text}
					</span>
				),
			)}
			{lineIdx < lines.length - 1 ? "\n" : null}
		</span>
	));
}

function formatValue(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2) ?? "null";
	} catch {
		return String(value);
	}
}

/** Collapsed inspector walks a small prefix of the tree — never the full payload. */
const PREVIEW_MAX_LEAVES = 64;
const PREVIEW_MAX_DEPTH = 5;
const PREVIEW_MAX_KEYS = 24;
const PREVIEW_MAX_STRING = 160;
/** Per-token highlighting is too expensive for full run payloads. */
const HIGHLIGHT_MAX_CHARS = 24_000;

function truncateForPreview(value: unknown): { value: unknown; truncated: boolean } {
	const state = { leaves: 0, hit: false };
	const seen = new WeakSet<object>();

	function walk(v: unknown, depth: number): unknown {
		if (state.leaves >= PREVIEW_MAX_LEAVES) {
			state.hit = true;
			return "…";
		}
		if (v === null || typeof v === "number" || typeof v === "boolean") {
			state.leaves += 1;
			return v;
		}
		if (typeof v === "string") {
			state.leaves += 1;
			if (v.length > PREVIEW_MAX_STRING) {
				state.hit = true;
				return `${v.slice(0, PREVIEW_MAX_STRING)}…`;
			}
			return v;
		}
		if (typeof v !== "object") {
			state.leaves += 1;
			return String(v);
		}
		if (seen.has(v)) {
			state.hit = true;
			return "[Circular]";
		}
		seen.add(v);
		if (depth <= 0) {
			state.hit = true;
			return Array.isArray(v) ? "[…]" : "{…}";
		}
		if (Array.isArray(v)) {
			const out: unknown[] = [];
			for (let i = 0; i < v.length; i++) {
				if (i >= PREVIEW_MAX_KEYS || state.leaves >= PREVIEW_MAX_LEAVES) {
					state.hit = true;
					out.push("…");
					break;
				}
				out.push(walk(v[i], depth - 1));
			}
			if (v.length > out.length && out[out.length - 1] !== "…") {
				state.hit = true;
				out.push("…");
			}
			return out;
		}
		const obj = v as Record<string, unknown>;
		const keys = Object.keys(obj);
		const out: Record<string, unknown> = {};
		for (let i = 0; i < keys.length; i++) {
			if (i >= PREVIEW_MAX_KEYS || state.leaves >= PREVIEW_MAX_LEAVES) {
				state.hit = true;
				out["…"] = "…";
				break;
			}
			const k = keys[i]!;
			out[k] = walk(obj[k], depth - 1);
		}
		return out;
	}

	return { value: walk(value, PREVIEW_MAX_DEPTH), truncated: state.hit };
}

function renderJsonText(text: string): ReactNode {
	if (text.length > HIGHLIGHT_MAX_CHARS) {
		return text;
	}
	return highlightJson(text);
}

function selectElementContents(el: HTMLElement): void {
	const selection = window.getSelection();
	if (!selection) return;
	const range = document.createRange();
	range.selectNodeContents(el);
	selection.removeAllRanges();
	selection.addRange(range);
}

/** Pretty JSON panel with wrap, color tokens, and expand-to-modal. */
export default function JsonBlock({
	title,
	value,
	editable = false,
	draft,
	onDraftChange,
	onApply,
	parseError,
}: JsonBlockProps) {
	const [open, setOpen] = useState(false);
	const [fullText, setFullText] = useState<string | null>(null);
	const titleId = useId();
	const bodyRef = useRef<HTMLPreElement | HTMLTextAreaElement | null>(null);
	const text = editable ? (draft ?? "") : "";
	const preview = useMemo(() => {
		if (editable) return null;
		const truncated = truncateForPreview(value);
		return {
			shown: JSON.stringify(truncated.value, null, 2) ?? "null",
			truncated: truncated.truncated,
		};
	}, [editable, value]);
	const collapsedHint =
		preview?.truncated
			? "Preview truncated — Expand to view all"
			: null;

	useEffect(() => {
		if (!open || editable) {
			setFullText(null);
			return;
		}
		let cancelled = false;
		setFullText(null);
		const id = window.setTimeout(() => {
			if (!cancelled) setFullText(formatValue(value));
		}, 0);
		return () => {
			cancelled = true;
			window.clearTimeout(id);
		};
	}, [open, editable, value]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpen(false);
				return;
			}
			const selectAll =
				(e.key === "a" || e.key === "A") && (e.metaKey || e.ctrlKey);
			if (!selectAll) return;
			const target = bodyRef.current;
			if (!target) return;
			// Keep select-all inside this modal body (not the whole page / graph).
			e.preventDefault();
			e.stopPropagation();
			if (target instanceof HTMLTextAreaElement) {
				target.focus();
				target.select();
				return;
			}
			selectElementContents(target);
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		// Focus body so copy/select shortcuts apply here immediately.
		bodyRef.current?.focus({ preventScroll: true });
	}, [open]);

	const panel = (
		<div className={`qg-json-panel ${open ? "qg-json-panel--modal" : ""}`}>
			<div className="qg-json-panel__toolbar">
				<span className="qg-json-panel__title" id={titleId}>
					{title}
				</span>
				<div className="qg-json-panel__actions">
					{editable && onApply ? (
						<button type="button" className="qg-json-panel__btn" onClick={onApply}>
							Apply
						</button>
					) : null}
					<button
						type="button"
						className="qg-json-panel__btn"
						onClick={() => setOpen((v) => !v)}
					>
						{open ? "Close" : "Expand"}
					</button>
				</div>
			</div>
			{editable ? (
				<textarea
					ref={bodyRef as Ref<HTMLTextAreaElement>}
					className="qg-json-edit"
					value={text}
					spellCheck={false}
					aria-labelledby={titleId}
					onChange={(e) => onDraftChange?.(e.target.value)}
					onBlur={() => onApply?.()}
					rows={open ? 28 : 14}
				/>
			) : (
				<pre
					ref={bodyRef as Ref<HTMLPreElement>}
					className="qg-json"
					aria-labelledby={titleId}
					tabIndex={open ? 0 : undefined}
				>
					{open
						? fullText === null
							? "Formatting JSON…"
							: renderJsonText(fullText)
						: (preview?.shown ?? "null")}
				</pre>
			)}
			{!open && collapsedHint ? (
				<p className="qg-muted qg-json-panel__hint">{collapsedHint}</p>
			) : null}
			{parseError ? <p className="qg-error">{parseError}</p> : null}
			{!parseError && editable ? (
				<p className="qg-muted qg-json-panel__hint">JSON · blur or Apply</p>
			) : null}
		</div>
	);

	if (!open) return panel;

	return (
		<div
			className="qg-json-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			onClick={(e) => {
				if (e.target === e.currentTarget) setOpen(false);
			}}
		>
			{panel}
		</div>
	);
}
