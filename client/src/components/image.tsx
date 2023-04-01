import { h } from "preact";

type ImageProps = {
    src?: string;
    onRight?: boolean;
};

export default function Image({ src, onRight }: ImageProps) {
    if (onRight) {
        return <ImageComponent src={src} />;
    } else {
        return (
            <p>
                <ImageComponent src={src} />
            </p>
        );
    }
}

function ImageComponent({ src }: ImageProps) {
    function onClick() {
        console.log("clicked on an image");
    }
    return <img class="deck-image" onClick={onClick} src={src} />;
}
