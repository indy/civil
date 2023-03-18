import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { ToolbarMode } from "types";
import { getAppState, AppStateChange } from "app-state";

import { addToolbarSelectableClasses } from "utils/civil";

import useMouseHovering from "components/use-mouse-hovering";

type Props = {
    title: string;
    isShowingUpdateForm: boolean;
    onRefsToggle: () => void;
    onFormToggle: () => void;
};

export default function Title({
    title,
    isShowingUpdateForm,
    onRefsToggle,
    onFormToggle,
}: Props) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    const mouseHovering = useMouseHovering(hoveringRef);

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
            AppStateChange.toolbarMode(ToolbarMode.View);
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
