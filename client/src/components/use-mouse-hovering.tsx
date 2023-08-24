import { Ref, useState } from "preact/hooks";

import useMouseHoveringEvents from "components/use-mouse-hovering-events";

export default function useMouseHovering(hoveringRef: Ref<HTMLElement>) {
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
