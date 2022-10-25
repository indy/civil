import { html, useRef, useEffect, useState } from '/lib/preact/mod.js';

import { getAppState, AppStateChange, DELUXE_TOOLBAR_VIEW, DELUXE_TOOLBAR_EDIT, DELUXE_TOOLBAR_REFS } from '/js/AppState.js';

export default function Title({ title, isShowingUpdateForm, isEditingDeckRefs, onRefsToggle, onFormToggle }) {
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
        if (appState.toolbarMode.value === DELUXE_TOOLBAR_EDIT) {
            if (isShowingUpdateForm) {
                AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW)
            }
            onFormToggle();
            return;
        }
        if (appState.toolbarMode.value === DELUXE_TOOLBAR_REFS) {
            if (isEditingDeckRefs) {
                AppStateChange.toolbarMode(DELUXE_TOOLBAR_VIEW)
            }
            onRefsToggle();
            return;
        }
    }

    useEffect(() => {
        window.onscroll = function() {
            // when making the h1 sticky, also apply the title-replacement-spacer class to the marker div
            // this prevents the rest of the page from jerking upwards
            const classReplacementSpacer = "title-replacement-spacer";
            const classBackgroundBand = "title-background-band";
            const classSticky = "title-sticky";

            let preMarkerEl = preMarkerRef.current;
            let titleEl = titleRef.current;
            let postMarkerEl = postMarkerRef.current;
            let backgroundBandEl = backgroundBandRef.current;

            if (preMarkerEl && titleEl && postMarkerEl) {
                if (window.pageYOffset < postMarkerEl.offsetTop) {
                    if(titleEl.classList.contains(classSticky)) {
                        preMarkerEl.classList.remove(classReplacementSpacer);
                        titleEl.classList.remove(classSticky);
                        backgroundBandEl.classList.remove(classBackgroundBand);
                    }
                }
                if (window.pageYOffset > preMarkerEl.offsetTop) {
                    if(!titleEl.classList.contains(classSticky)) {
                        preMarkerEl.classList.add(classReplacementSpacer);
                        titleEl.classList.add(classSticky);
                        backgroundBandEl.classList.add(classBackgroundBand);
                    }
                }
            }
        };

        if (hoveringRef && hoveringRef.current) {
            hoveringRef.current.addEventListener("mouseenter", mouseEnterTitle, false);
            hoveringRef.current.addEventListener("mouseleave", mouseLeaveTitle, false);
            return () => {
                if (hoveringRef && hoveringRef.current) {
                    hoveringRef.current.removeEventListener("mouseenter", mouseEnterTitle);
                    hoveringRef.current.removeEventListener("mouseleave", mouseLeaveTitle);
                }
            }
        }

    }, []);

    let classes = "deck-title selectable-content";
    let containerClasses = "selectable-container";
    let titleEl = titleRef.current;
    const classSticky = "title-sticky";

    if(titleEl && titleEl.classList.contains(classSticky)) {
        // don't show selectable highlight if the title is sticky
    } else if (mouseHovering) {
        // only show as selectable if in edit or refs mode
        if (appState.toolbarMode.value === DELUXE_TOOLBAR_EDIT ||
            appState.toolbarMode.value === DELUXE_TOOLBAR_REFS) {
            containerClasses += " selectable-container-hovering";
        }

    }

    // there are 2 markers: pre and post so that we get a nice effect in both of these scenarios:
    // 1. the sticky header appearing when the top of the title scrolls off the top of the screen
    // 2. the normal inline title appears when the bottom of the title text should be visible as
    //    the user scrolls up
    return html`
    <div>
        <div class=${containerClasses} ref=${ hoveringRef } onClick=${onTitleClicked}>
            <div ref=${ preMarkerRef }></div>
            <div ref=${ backgroundBandRef }></div>
            <h1 ref=${ titleRef } class=${classes}>${ title }</h1>
            <div ref=${ postMarkerRef }></div>
        </div>
    </div>`;
}
