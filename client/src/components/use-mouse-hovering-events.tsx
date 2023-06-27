import { useEffect } from "preact/hooks";

export default function useMouseHoveringEvents(
    hoveringRef: any,
    onEnter: () => void,
    onLeave: () => void
) {
    useEffect(() => {
        if (hoveringRef && hoveringRef.current) {
            let hc = hoveringRef.current as HTMLElement;
            hc.addEventListener("mouseenter", onEnter, false);
            hc.addEventListener("mouseleave", onLeave, false);
            return () => {
                hc.removeEventListener("mouseenter", onEnter);
                hc.removeEventListener("mouseleave", onLeave);
            };
        }
        // added to please tsc
        return () => {};
    });
}
