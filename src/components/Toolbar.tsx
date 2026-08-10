type Props = {
	graphLabel: string;
	adapterName: string;
	supportsControl: boolean;
	busy?: boolean;
	startNodeId: string | null;
	stopAfter: string | null;
	hint: string | null;
	onStart: () => void;
	onSetStart: () => void;
	onClearStart: () => void;
	onSetStop: () => void;
	onClearStop: () => void;
	onStep: () => void;
};

export default function Toolbar({
	graphLabel,
	adapterName,
	supportsControl,
	busy = false,
	startNodeId,
	stopAfter,
	hint,
	onStart,
	onSetStart,
	onClearStart,
	onSetStop,
	onClearStop,
	onStep,
}: Props) {
	const disabled = !supportsControl || busy;
	return (
		<header className="qg-toolbar">
			<div className="qg-toolbar__brand">
				<strong>q_glass</strong>
				<span className="qg-muted">{graphLabel}</span>
			</div>
			<div className="qg-toolbar__actions">
				<span className="qg-chip">adapter: {adapterName}</span>
				{busy ? <span className="qg-chip qg-chip--busy">running…</span> : null}
				{startNodeId ? (
					<span className="qg-chip qg-chip--start" title="Run starts here">
						start: {startNodeId}
					</span>
				) : null}
				{stopAfter ? (
					<span className="qg-chip qg-chip--stop" title="Breakpoint">
						stop: {stopAfter}
					</span>
				) : null}
				<button type="button" disabled={disabled} onClick={onStart}>
					Start
				</button>
				<button type="button" disabled={disabled} onClick={onSetStart}>
					Set start
				</button>
				<button type="button" disabled={disabled} onClick={onClearStart}>
					Clear start
				</button>
				<button type="button" disabled={disabled} onClick={onSetStop}>
					Set stop
				</button>
				<button
					type="button"
					disabled={disabled || !stopAfter}
					onClick={onClearStop}
				>
					Clear stop
				</button>
				<button type="button" disabled={disabled} onClick={onStep}>
					Step next
				</button>
			</div>
			{hint ? <p className="qg-toolbar__hint">{hint}</p> : null}
		</header>
	);
}
