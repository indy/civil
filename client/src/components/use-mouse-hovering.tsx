import type { RefObject } from "preact";
import { useState } from "preact/hooks";

import useMouseHoveringEvents from "./use-mouse-hovering-events";

export default function useMouseHovering(hoveringRef: RefObject<HTMLElement>) {
    const [mouseHovering, setMouseHovering] = useState(false);

    function mouseEnter() {
        setMouseHovering(true);
    }
    function mouseLeave() {
        setMouseHovering(false);
    }

    useMouseHoveringEvents(hoveringRef, mouseEnter, mouseLeave);

    return mouseHovering;
}
