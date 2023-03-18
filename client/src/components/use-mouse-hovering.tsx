import { useEffect, useState } from "preact/hooks";

export default function useMouseHovering(hoveringRef: any) {
    const [mouseHovering, setMouseHovering] = useState(false);

    function mouseEnter() {
        setMouseHovering(true);
    }
    function mouseLeave() {
        setMouseHovering(false);
    }
    useEffect(() => {
        if (hoveringRef && hoveringRef.current) {
            let hc = hoveringRef.current as HTMLElement;
            hc.addEventListener("mouseenter", mouseEnter, false);
            hc.addEventListener("mouseleave", mouseLeave, false);
            return () => {
                if (hoveringRef && hc) {
                    hc.removeEventListener("mouseenter", mouseEnter);
                    hc.removeEventListener("mouseleave", mouseLeave);
                }
            };
        }
        // added to please tsc
        return () => {};
    }, []);

    return mouseHovering;
}
