import { h } from "preact";
import { useState } from "preact/hooks";

import { immutableState } from "app-state";

type ImageProps = {
    src?: string;
};

export default function Image({ src }: ImageProps) {
    let [zoomable, setZoomable] = useState(false);
    let [zoomValue, setZoomValue] = useState(immutableState.imageZoomDefault);

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
        style = `width: ${zoomValue}%; height: ${zoomValue}%; max-width: ${immutableState.imageZoomMax}%; max-height: ${immutableState.imageZoomMax}%;`;
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
                    min={immutableState.imageZoomMin}
                    max={immutableState.imageZoomMax}
                    onInput={onInput}
                />
            </div>
            <img class="deck-image" onClick={onClick} src={src} style={style} />
        </div>
    );
}
