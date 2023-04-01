import { useEffect } from "preact/hooks";

export default function useMouseHoveringEvents(
    hoveringRef: any,
    onEnter: () => void,
    onLeave: () => void
) {
    function mouseEnter() {
        onEnter();
    }
    function mouseLeave() {
        onLeave();
    }
    useEffect(() => {
        if (hoveringRef && hoveringRef.current) {
            let hc = hoveringRef.current as HTMLElement;
            hc.addEventListener("mouseenter", mouseEnter, false);
            hc.addEventListener("mouseleave", mouseLeave, false);
            return () => {
                hc.removeEventListener("mouseenter", mouseEnter);
                hc.removeEventListener("mouseleave", mouseLeave);
            };
        }
        // added to please tsc
        return () => {};
    }, []);
}
