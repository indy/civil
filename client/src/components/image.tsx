import { h } from "preact";
import { useState } from "preact/hooks";

import { getAppState } from "app-state";

type ImageProps = {
    src?: string;
};

export default function Image({ src }: ImageProps) {
    const appState = getAppState();

    let [zoomable, setZoomable] = useState(false);
    let [zoomValue, setZoomValue] = useState(appState.imageZoomDefault);

    function onClick() {
        setZoomable(!zoomable);
    }

    function onInput(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            setZoomValue(event.target.valueAsNumber);
        }
    }

    if (zoomable) {
        return (
            <div>
                <input
                    type="range"
                    class="deck-image-slider"
                    value={zoomValue}
                    min={appState.imageZoomMin}
                    max={appState.imageZoomMax}
                    onInput={onInput}
                />
                <img
                    class="deck-image"
                    onClick={onClick}
                    src={src}
                    style={`width: ${zoomValue}%; height: ${zoomValue}%; max-width: ${appState.imageZoomMax}%; max-height: ${appState.imageZoomMax}%;`}
                />
            </div>
        );
    } else {
        return <img class="deck-image" onClick={onClick} src={src} />;
    }
}
