import type { RefObject } from "preact";
import { useEffect } from "preact/hooks";

export default function useMouseHoveringEvents(
    hoveringRef: RefObject<HTMLElement>,
    onEnter: () => void,
    onLeave: () => void,
) {
    useEffect(() => {
        if (hoveringRef && hoveringRef.current) {
            let hc = hoveringRef.current;
            hc.addEventListener("mouseenter", onEnter, false);
            hc.addEventListener("mouseleave", onLeave, false);
            return () => {
                hc.removeEventListener("mouseenter", onEnter);
                hc.removeEventListener("mouseleave", onLeave);
            };
        }
        // added to please tsc
        return () => { };
    });
}
