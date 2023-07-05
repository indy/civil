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

    let style = "";
    let sliderClasses = "deck-image-slider";
    let rollupClasses = "rollupable-500ms";

    if (zoomable) {
        style = `width: ${zoomValue}%; height: ${zoomValue}%; max-width: ${appState.imageZoomMax}%; max-height: ${appState.imageZoomMax}%;`;
        sliderClasses += " deck-image-slider-active";
        rollupClasses += " rollupable-active-5rem";
    }

    return (
        <div>
            <div class={rollupClasses}>
                <input
                    type="range"
                    class={sliderClasses}
                    value={zoomValue}
                    min={appState.imageZoomMin}
                    max={appState.imageZoomMax}
                    onInput={onInput}
                />
            </div>
            <img class="deck-image" onClick={onClick} src={src} style={style} />
        </div>
    );
}
