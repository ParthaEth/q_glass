import { useEffect, useId, useState } from "react";

import type { HtmlViewSpec } from "./types";

type Props = {
	view: HtmlViewSpec;
};

/** Sandboxed host HTML with an expandable reading area. */
export default function HtmlView({ view }: Props) {
	const [open, setOpen] = useState(false);
	const titleId = useId();

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);

	const body = (
		<div className={`qg-viz-html ${open ? "qg-viz-html--modal" : ""}`}>
			<div className="qg-viz-html__toolbar">
				<span id={titleId}>Details</span>
				<button
					type="button"
					className="qg-json-panel__btn"
					onClick={() => setOpen((value) => !value)}
				>
					{open ? "Close" : "Expand"}
				</button>
			</div>
			<iframe
				className="qg-viz qg-viz--html"
				title="Host HTML visualizer"
				sandbox=""
				srcDoc={view.html}
			/>
		</div>
	);

	if (!open) return body;

	return (
		<div
			className="qg-json-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			onClick={(event) => {
				if (event.target === event.currentTarget) setOpen(false);
			}}
		>
			{body}
		</div>
	);
}
