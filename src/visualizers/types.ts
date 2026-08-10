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

export type MarkdownViewSpec = {
	kind: "markdown";
	text: string;
};

export type HtmlViewSpec = {
	kind: "html";
	html: string;
};

export type ViewSpec =
	| TableViewSpec
	| TimelineViewSpec
	| MarkdownViewSpec
	| HtmlViewSpec;

export type VisualizerResult = {
	id: string;
	title: string;
	view: ViewSpec;
};

export type VisualizeResponse = {
	visualizers: VisualizerResult[];
};
