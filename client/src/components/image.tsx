import { h } from "preact";

type ImageProps = {
    src?: string;
};

export default function Image({ src }: ImageProps) {
    function onClick() {
        console.log("clicked on an image");
    }
    return <img class="deck-image" onClick={onClick} src={src} />;
}
