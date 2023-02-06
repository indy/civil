import { h } from "preact";
// import { useEffect, useState, useRef } from "preact/hooks";

// import { getAppState, AppStateChange } from '../AppState';
// import { svgX } from '../svgIcons';

export default function Image({ src }: { src?: any }) {
    function onClick() {
        console.log("clicked on an image");
    }

    return <img onClick={onClick} src={src} />;
}
