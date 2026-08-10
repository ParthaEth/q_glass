import { useEffect, useState, type ReactNode } from "react";

import JsonBlock from "../components/JsonBlock";
import type { VisualizerResult } from "./types";
import ViewSpecRenderer from "./ViewSpecRenderer";

type JsonEditable = {
	editable: true;
	draft: string;
	onDraftChange: (next: string) => void;
	onApply: () => void;
	parseError: string | null;
};

type JsonReadonly = {
	editable?: false;
};

type Props = {
	jsonTitle: string;
	value: unknown;
	stageId: string;
	nodeId: string;
	side: "in" | "out";
	visualize?: (
		args: {
			stageId: string;
			nodeId: string;
			side: "in" | "out";
			value: unknown;
		},
	) => Promise<VisualizerResult[]>;
} & (JsonEditable | JsonReadonly);

export default function IoPane(props: Props) {
	const { jsonTitle, value, stageId, nodeId, side, visualize } = props;
	const [tab, setTab] = useState<string>("json");
	const [views, setViews] = useState<VisualizerResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!visualize) {
			setViews([]);
			setError(null);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError(null);
		void visualize({ stageId, nodeId, side, value })
			.then((next) => {
				if (cancelled) return;
				setViews(next);
				setTab((prev) => {
					if (prev === "json") return prev;
					if (next.some((v) => v.id === prev)) return prev;
					return "json";
				});
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setViews([]);
				setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [visualize, stageId, nodeId, side, value]);

	const jsonBlock: ReactNode =
		props.editable === true ? (
			<JsonBlock
				title={jsonTitle}
				value={null}
				editable
				draft={props.draft}
				onDraftChange={props.onDraftChange}
				onApply={props.onApply}
				parseError={props.parseError}
			/>
		) : (
			<JsonBlock title={jsonTitle} value={value} />
		);

	if (!visualize || (!loading && views.length === 0 && !error)) {
		return <div className="qg-iopane">{jsonBlock}</div>;
	}

	return (
		<div className="qg-iopane">
			<div className="qg-iopane__tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={tab === "json"}
					className={
						tab === "json" ? "qg-iopane__tab qg-iopane__tab--active" : "qg-iopane__tab"
					}
					onClick={() => setTab("json")}
				>
					JSON
				</button>
				{views.map((viz) => (
					<button
						key={viz.id}
						type="button"
						role="tab"
						aria-selected={tab === viz.id}
						className={
							tab === viz.id
								? "qg-iopane__tab qg-iopane__tab--active"
								: "qg-iopane__tab"
						}
						onClick={() => setTab(viz.id)}
					>
						{viz.title}
					</button>
				))}
				{loading ? <span className="qg-iopane__status qg-muted">…</span> : null}
			</div>
			{error ? <p className="qg-error qg-iopane__error">{error}</p> : null}
			{tab === "json" ? (
				jsonBlock
			) : (
				(() => {
					const active = views.find((v) => v.id === tab);
					if (!active) {
						return <p className="qg-muted">No view selected.</p>;
					}
					return (
						<div className="qg-iopane__view">
							<div className="qg-iopane__view-title">{active.title}</div>
							<ViewSpecRenderer view={active.view} />
						</div>
					);
				})()
			)}
		</div>
	);
}
