import { h } from "preact";

export default function Image({ src }: { src?: string }) {
    function onClick() {
        console.log("clicked on an image");
    }

    return <img onClick={onClick} src={src} />;
}
