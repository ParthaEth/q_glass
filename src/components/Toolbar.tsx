type Props = {
	graphLabel: string;
	adapterName: string;
	supportsControl: boolean;
	hint: string | null;
	onStart: () => void;
	onSetStop: () => void;
	onStep: () => void;
};

export default function Toolbar({
	graphLabel,
	adapterName,
	supportsControl,
	hint,
	onStart,
	onSetStop,
	onStep,
}: Props) {
	return (
		<header className="qg-toolbar">
			<div className="qg-toolbar__brand">
				<strong>q_glass</strong>
				<span className="qg-muted">{graphLabel}</span>
			</div>
			<div className="qg-toolbar__actions">
				<span className="qg-chip">adapter: {adapterName}</span>
				<button type="button" disabled={!supportsControl} onClick={onStart}>
					Start
				</button>
				<button type="button" disabled={!supportsControl} onClick={onSetStop}>
					Set stop
				</button>
				<button type="button" disabled={!supportsControl} onClick={onStep}>
					Step next
				</button>
			</div>
			{hint ? <p className="qg-toolbar__hint">{hint}</p> : null}
		</header>
	);
}
