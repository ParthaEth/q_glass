import { useEffect, useId, useMemo, useState } from "react";

import type { TrackSegment, TracksTimelineViewSpec } from "./types";

type Props = {
	view: TracksTimelineViewSpec;
};

function infer_duration(view: TracksTimelineViewSpec): number {
	if (typeof view.duration === "number" && view.duration > 0) return view.duration;
	let max_t = 0;
	for (const track of view.tracks) {
		for (const segment of track.segments) {
			max_t = Math.max(max_t, segment.end);
		}
	}
	for (const anchor of view.anchors ?? []) {
		max_t = Math.max(max_t, anchor.t);
	}
	return max_t;
}

function segment_title(segment: TrackSegment): string {
	const bits = [
		segment.label ?? segment.id,
		`${segment.start.toFixed(2)}s -> ${segment.end.toFixed(2)}s`,
		segment.resource_id ? `resource=${segment.resource_id}` : null,
		segment.kind ? `kind=${segment.kind}` : null,
		segment.source_from ? `from=${segment.source_from}` : null,
		segment.source_until ? `until=${segment.source_until}` : null,
	].filter(Boolean);
	return bits.join(" | ");
}

export default function TracksTimelineView({ view }: Props) {
	const [open, setOpen] = useState(false);
	const titleId = useId();
	const duration = useMemo(() => infer_duration(view), [view]);

	useEffect(() => {
		if (!open) return;
		const on_key = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", on_key);
		return () => window.removeEventListener("keydown", on_key);
	}, [open]);

	const body = (
		<div className={`qg-viz qg-viz--tracks ${open ? "qg-viz--tracks-modal" : ""}`}>
			<div className="qg-viz-tracks__toolbar">
				<span className="qg-viz-tracks__title" id={titleId}>
					Tracks timeline
					{duration > 0 ? <span className="qg-muted"> · {duration.toFixed(2)}s</span> : null}
				</span>
				<button type="button" className="qg-json-panel__btn" onClick={() => setOpen((v) => !v)}>
					{open ? "Close" : "Expand"}
				</button>
			</div>

			{view.tracks.length === 0 ? (
				<p className="qg-muted">No tracks</p>
			) : (
				<div className="qg-viz-tracks" role="list" aria-labelledby={titleId}>
					<div className="qg-viz-tracks__ruler" aria-hidden="true">
						<span>0s</span>
						<span>{duration.toFixed(2)}s</span>
					</div>
					{view.tracks.map((track) => (
						<div key={track.id} className="qg-viz-track" role="listitem">
							<div className="qg-viz-track__label">{track.label}</div>
							<div className="qg-viz-track__lane">
								{track.segments.map((segment) => {
									const safe_start = Math.max(0, segment.start);
									const safe_end = Math.max(safe_start, segment.end);
									const left = duration > 0 ? (safe_start / duration) * 100 : 0;
									const width = duration > 0 ? ((safe_end - safe_start) / duration) * 100 : 100;
									return (
										<div
											key={segment.id}
											className="qg-viz-segment"
											style={{
												left: `${Math.min(100, left)}%`,
												width: `${Math.max(1.2, Math.min(100, width))}%`,
												background: segment.color ?? undefined,
											}}
											title={segment_title(segment)}
										>
											<span>{segment.label ?? segment.id}</span>
										</div>
									);
								})}
							</div>
						</div>
					))}
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
