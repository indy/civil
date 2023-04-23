import { h } from "preact";
import { useState } from "preact/hooks";

type ImageProps = {
    src?: string;
};

export default function Image({ src }: ImageProps) {
    let [maximised, setMaximised] = useState(false);

    function onClick() {
        setMaximised(!maximised);
    }

    let c = "deck-image";
    if (maximised) {
        c += " deck-image-maximised";
    }
    return <img class={c} onClick={onClick} src={src} />;
}
