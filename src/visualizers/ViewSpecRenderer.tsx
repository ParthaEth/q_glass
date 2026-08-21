import type { ViewSpec } from "./types";
import { apiBase } from "../adapters/http";
import TracksTimelineView from "./TracksTimelineView";
import TimelineView from "./TimelineView";

function cellText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/** Very small markdown: paragraphs + `code` + **bold** + line breaks. */
function renderLiteMarkdown(text: string): string {
	const escaped = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
	const withInline = escaped
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/`([^`]+)`/g, "<code>$1</code>");
	return withInline
		.split(/\n\n+/)
		.map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
		.join("");
}

type Props = { view: ViewSpec };

function videoSource(source: string): string {
	return source.startsWith("/") ? `${apiBase()}${source}` : source;
}

export default function ViewSpecRenderer({ view }: Props) {
	if (view.kind === "table") {
		return (
			<div className="qg-viz qg-viz--table">
				<table>
					<thead>
						<tr>
							{view.columns.map((col) => (
								<th key={col}>{col}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{view.rows.length === 0 ? (
							<tr>
								<td colSpan={Math.max(view.columns.length, 1)} className="qg-muted">
									No rows
								</td>
							</tr>
						) : (
							view.rows.map((row, ri) => (
								<tr key={ri}>
									{view.columns.map((_, ci) => (
										<td key={ci}>{cellText(row[ci])}</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		);
	}

	if (view.kind === "timeline") {
		return <TimelineView view={view} />;
	}

	if (view.kind === "tracks_timeline") {
		return <TracksTimelineView view={view} />;
	}

	if (view.kind === "markdown") {
		return (
			<div
				className="qg-viz qg-viz--markdown"
				dangerouslySetInnerHTML={{ __html: renderLiteMarkdown(view.text) }}
			/>
		);
	}

	if (view.kind === "html") {
		return (
			<iframe
				className="qg-viz qg-viz--html"
				title="Host HTML visualizer"
				sandbox=""
				srcDoc={view.html}
			/>
		);
	}

	if (view.kind === "video") {
		return (
			<figure className="qg-viz qg-viz--video">
				<video controls preload="metadata" src={videoSource(view.source)}>
					Your browser cannot play this video.
				</video>
				{view.label ? <figcaption>{view.label}</figcaption> : null}
			</figure>
		);
	}

	return <p className="qg-muted">Unknown view kind</p>;
}
