import { h } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";

import { addToolbarSelectableClasses } from "../CivilUtils";

import { getAppState, AppStateChange } from "../AppState";

import { ToolbarMode } from "../types";

export default function Title({
    title,
    isShowingUpdateForm,
    isEditingDeckRefs,
    onRefsToggle,
    onFormToggle,
}: {
    title?: any;
    isShowingUpdateForm?: any;
    isEditingDeckRefs?: any;
    onRefsToggle?: any;
    onFormToggle?: any;
}) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    const [mouseHovering, setMouseHovering] = useState(false);

    function mouseEnterTitle() {
        setMouseHovering(true);
    }
    function mouseLeaveTitle() {
        setMouseHovering(false);
    }

    const preMarkerRef = useRef(null); // an element on the page, when it's offscreen apply title-sticky to the h1
    const postMarkerRef = useRef(null); // an element on the page, when it's onscreen remove title-sticky from the h1
    const titleRef = useRef(null);
    const backgroundBandRef = useRef(null);

    function onTitleClicked(e) {
        if (appState.toolbarMode.value === ToolbarMode.Edit) {
            if (isShowingUpdateForm) {
                AppStateChange.toolbarMode(ToolbarMode.View);
            }
            onFormToggle();
            return;
        }
        if (appState.toolbarMode.value === ToolbarMode.Refs) {
            if (isEditingDeckRefs) {
                AppStateChange.toolbarMode(ToolbarMode.View);
            }
            onRefsToggle();
            return;
        }
    }

    useEffect(() => {
        window.onscroll = function () {
            // when making the h1 sticky, also apply the title-replacement-spacer class to the marker div
            // this prevents the rest of the page from jerking upwards
            const classReplacementSpacer = "title-replacement-spacer";
            const classBackgroundBand = "title-background-band";
            const classSticky = "title-sticky";

            if (
                preMarkerRef.current &&
                postMarkerRef.current &&
                titleRef.current &&
                backgroundBandRef.current
            ) {
                let preMarkerEl = preMarkerRef.current as HTMLElement;
                let titleEl = titleRef.current as HTMLElement;
                let postMarkerEl = postMarkerRef.current as HTMLElement;
                let backgroundBandEl = backgroundBandRef.current as HTMLElement;

                if (preMarkerEl && titleEl && postMarkerEl) {
                    if (window.pageYOffset < postMarkerEl.offsetTop) {
                        if (titleEl.classList.contains(classSticky)) {
                            preMarkerEl.classList.remove(
                                classReplacementSpacer
                            );
                            titleEl.classList.remove(classSticky);
                            backgroundBandEl.classList.remove(
                                classBackgroundBand
                            );
                        }
                    }
                    if (window.pageYOffset > preMarkerEl.offsetTop) {
                        if (!titleEl.classList.contains(classSticky)) {
                            preMarkerEl.classList.add(classReplacementSpacer);
                            titleEl.classList.add(classSticky);
                            backgroundBandEl.classList.add(classBackgroundBand);
                        }
                    }
                }
            }
        };

        if (hoveringRef && hoveringRef.current) {
            let hc = hoveringRef.current as HTMLElement;
            hc.addEventListener("mouseenter", mouseEnterTitle, false);
            hc.addEventListener("mouseleave", mouseLeaveTitle, false);
            return () => {
                if (hoveringRef && hc) {
                    hc.removeEventListener("mouseenter", mouseEnterTitle);
                    hc.removeEventListener("mouseleave", mouseLeaveTitle);
                }
            };
        }
        // todo: added to please tsc
        return () => {};
    }, []);

    let classes = "deck-title selectable-content";
    let containerClasses = "selectable-container";
    const classSticky = "title-sticky";

    if (titleRef.current) {
        let titleEl = titleRef.current as HTMLElement;
        if (titleEl && titleEl.classList.contains(classSticky)) {
            // don't show selectable highlight if the title is sticky
        } else if (mouseHovering) {
            let toolbarMode = appState.toolbarMode.value;
            // only show as selectable if in edit or refs mode
            if (
                toolbarMode === ToolbarMode.Edit ||
                toolbarMode === ToolbarMode.Refs
            ) {
                containerClasses += addToolbarSelectableClasses(toolbarMode);
            }
        }
    }

    // there are 2 markers: pre and post so that we get a nice effect in both of these scenarios:
    // 1. the sticky header appearing when the top of the title scrolls off the top of the screen
    // 2. the normal inline title appears when the bottom of the title text should be visible as
    //    the user scrolls up
    return (
        <div>
            <div
                class={containerClasses}
                ref={hoveringRef}
                onClick={onTitleClicked}
            >
                <div ref={preMarkerRef}></div>
                <div ref={backgroundBandRef}></div>
                <h1 ref={titleRef} class={classes}>
                    {title}
                </h1>
                <div ref={postMarkerRef}></div>
            </div>
        </div>
    );
}
