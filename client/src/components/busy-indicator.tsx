import { WaitingFor } from "../types";

import { getAppState } from "../app-state";

import { visibleClass } from "../shared/css";

export default function BusyIndicator() {
    const appState = getAppState();

    const show = appState.waitingFor.value === WaitingFor.Server;

    let classes = "c-busy-indicator";
    classes += visibleClass("busy-indicator", show);

    return <div class={classes}>{show && svgClock()}</div>;
}

// https://codepen.io/nikhil8krishnan/pen/rVoXJa
function svgClock() {
    return (
        <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            enable-background="new 0 0 100 100"
        >
            <circle
                fill="none"
                stroke="var(--fg2)"
                stroke-width="var(--busy-indicator-dial-thickness)"
                stroke-miterlimit="10"
                cx="50"
                cy="50"
                r="48"
            />
            <line
                fill="none"
                stroke-linecap="round"
                stroke="var(--fg2)"
                stroke-width="var(--busy-indicator-hand-thickness)"
                stroke-miterlimit="10"
                x1="50"
                y1="50"
                x2="85"
                y2="50.5"
            >
                <animateTransform
                    attributeName="transform"
                    dur="2s"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    repeatCount="indefinite"
                />
            </line>
            <line
                fill="none"
                stroke-linecap="round"
                stroke="var(--fg2)"
                stroke-width="var(--busy-indicator-hand-thickness)"
                stroke-miterlimit="10"
                x1="50"
                y1="50"
                x2="49.5"
                y2="74"
            >
                <animateTransform
                    attributeName="transform"
                    dur="15s"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    repeatCount="indefinite"
                />
            </line>
        </svg>
    );
}
