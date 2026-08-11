import {
	useEffect,
	useId,
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
	const titleId = useId();
	const bodyRef = useRef<HTMLPreElement | HTMLTextAreaElement | null>(null);
	const text = editable ? (draft ?? "") : formatValue(value);

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
					{highlightJson(text)}
				</pre>
			)}
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
