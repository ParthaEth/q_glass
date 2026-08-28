/** Declarative view specs from Python ``q_glass.visualizers``. */

export type IoSide = "in" | "out";

export type TableViewSpec = {
	kind: "table";
	columns: string[];
	rows: unknown[][];
};

export type TimelineAnchor = {
	id: string;
	t: number;
	label?: string | null;
};

export type TimelineViewSpec = {
	kind: "timeline";
	anchors: TimelineAnchor[];
	duration?: number | null;
};

export type TrackSegment = {
	id: string;
	start: number;
	end: number;
	label?: string | null;
	resource_id?: string | null;
	kind?: string | null;
	source_from?: string | null;
	source_until?: string | null;
	color?: string | null;
};

export type TimelineTrack = {
	id: string;
	label: string;
	segments: TrackSegment[];
	kind?: string | null;
};

export type TracksTimelineViewSpec = {
	kind: "tracks_timeline";
	tracks: TimelineTrack[];
	duration?: number | null;
	anchors?: TimelineAnchor[] | null;
};

export type MarkdownViewSpec = {
	kind: "markdown";
	text: string;
};

export type HtmlViewSpec = {
	kind: "html";
	html: string;
};

export type VideoViewSpec = {
	kind: "video";
	/** An HTTP(S) URL or a q_glass `/api/media/<token>` path. */
	source: string;
	label?: string | null;
};

export type ImageViewSpec = {
	kind: "image";
	/** An HTTP(S) URL or a q_glass `/api/media/<token>` path. */
	source: string;
	label?: string | null;
};

export type ViewSpec =
	| TableViewSpec
	| TimelineViewSpec
	| TracksTimelineViewSpec
	| MarkdownViewSpec
	| HtmlViewSpec
	| VideoViewSpec
	| ImageViewSpec;

export type VisualizerResult = {
	id: string;
	title: string;
	view: ViewSpec;
};

export type VisualizeResponse = {
	visualizers: VisualizerResult[];
};
