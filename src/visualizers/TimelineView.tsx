import { useEffect, useId, useState } from "react";

import type { TimelineViewSpec } from "./types";

type Props = {
	view: TimelineViewSpec;
};

/** Single-rail timeline: dots by time, id labels, description on hover; Expand for width. */
export default function TimelineView({ view }: Props) {
	const [open, setOpen] = useState(false);
	const titleId = useId();
	const duration =
		view.duration ??
		(view.anchors.length ? Math.max(...view.anchors.map((a) => a.t), 0) : 0);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);

	const body = (
		<div className={`qg-viz qg-viz--timeline ${open ? "qg-viz--timeline-modal" : ""}`}>
			<div className="qg-viz-timeline__toolbar">
				<span className="qg-viz-timeline__title" id={titleId}>
					Timeline
					{duration > 0 ? (
						<span className="qg-muted"> · {duration.toFixed(2)}s</span>
					) : null}
				</span>
				<button
					type="button"
					className="qg-json-panel__btn"
					onClick={() => setOpen((v) => !v)}
				>
					{open ? "Close" : "Expand"}
				</button>
			</div>

			{view.anchors.length === 0 ? (
				<p className="qg-muted">No anchors</p>
			) : (
				<div className="qg-viz-timeline-track" role="list" aria-labelledby={titleId}>
					<div className="qg-viz-timeline-track__rail" aria-hidden="true" />
					<div className="qg-viz-timeline-track__ends" aria-hidden="true">
						<span>0s</span>
						<span>{duration.toFixed(2)}s</span>
					</div>
					{[...view.anchors]
						.map((anchor, index) => ({ anchor, index }))
						.sort((a, b) => a.anchor.t - b.anchor.t || a.index - b.index)
						.map(({ anchor }, order) => {
							const pct =
								duration > 0
									? Math.min(100, Math.max(0, (anchor.t / duration) * 100))
									: 0;
							const tip = [anchor.label, `${anchor.t.toFixed(2)}s`]
								.filter(Boolean)
								.join(" · ");
							const side = order % 2 === 0 ? "below" : "above";
							return (
								<button
									key={anchor.id}
									type="button"
									role="listitem"
									className={`qg-viz-timeline-track__mark qg-viz-timeline-track__mark--${side}`}
									style={{ left: `${pct}%` }}
									title={tip || anchor.id}
									aria-label={
										anchor.label
											? `${anchor.id}: ${anchor.label} at ${anchor.t.toFixed(2)}s`
											: `${anchor.id} at ${anchor.t.toFixed(2)}s`
									}
								>
									<span className="qg-viz-timeline-track__dot" />
									<span className="qg-viz-timeline-track__id">{anchor.id}</span>
									{tip ? (
										<span className="qg-viz-timeline-track__hover" role="tooltip">
											{tip}
										</span>
									) : null}
								</button>
							);
						})}
				</div>
			)}
		</div>
	);

	if (!open) return body;

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
			{body}
		</div>
	);
}
