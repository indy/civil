import { html, useRef, useEffect, useState, route } from '/lib/preact/mod.js';

import { dmsUpdateFormToggle, dmsDeleteToggle, dmsRefsToggle, dmsShowSummaryButtonToggle, dmsShowReviewButtonToggle } from '/js/AppState.js';
import { useStateValue } from '/js/StateProvider.js';

export default function Title({title}) {
    const [state, appDispatch] = useStateValue();

    const hoveringRef = useRef(null);
    const [mouseHovering, setMouseHovering] = useState(false);
    const [mouseHoveringChild, setMouseHoveringChild] = useState(false);

    function mouseEnterTitle() {
        setMouseHovering(true);
    }
    function mouseLeaveTitle() {
        setMouseHovering(false);
    }

    function mouseEnterChild() {
        setMouseHoveringChild(true);
    }
    function mouseLeaveChild() {
        setMouseHoveringChild(false);
    }

    function onRefsClicked(e) {
        dmsRefsToggle(state);
    };

    function onEditParentClicked(e) {
        dmsUpdateFormToggle(state);
    };

    function onShowSummaryButtonClicked(e) {
        dmsShowSummaryButtonToggle(state, !state.sigs.deckManagerState.value.showShowSummaryButton);
    };
    function onShowReviewButtonClicked(e) {
        dmsShowReviewButtonToggle(state, !state.sigs.deckManagerState.value.showShowReviewButton);
    };

    function onDeleteClicked(e) {
        dmsDeleteToggle(state);
    }

    const preMarkerRef = useRef(null); // an element on the page, when it's offscreen apply title-sticky to the h1
    const postMarkerRef = useRef(null); // an element on the page, when it's onscreen remove title-sticky from the h1
    const titleRef = useRef(null);
    const backgroundBandRef = useRef(null);

    function buildControls(mouseHovering) {
        return html`<div class="note-controls-container">
                        <${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onRefsClicked } label="[refs]"/>
                        <${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onEditParentClicked } label="[edit]"/>
                        <${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onDeleteClicked } label="[delete]"/>
                        ${ state.sigs.deckManagerState.value.showShowSummaryButton && html`<${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onShowSummaryButtonClicked } label="[show summary]"/>`}
                        ${ state.sigs.deckManagerState.value.showShowReviewButton && html`<${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onShowReviewButtonClicked } label="[show review]"/>`}
                    </div>`;
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

    let classes = "deck-title";

    let titleEl = titleRef.current;
    const classSticky = "title-sticky";
    if(titleEl && titleEl.classList.contains(classSticky)) {
        // don't add the deck-title-fade if the title is sticky
    } else if (mouseHovering || mouseHoveringChild) {
        classes += " deck-title-fade";
    }

    // there are 2 markers: pre and post so that we get a nice effect in both of these scenarios:
    // 1. the sticky header appearing when the top of the title scrolls off the top of the screen
    // 2. the normal inline title appears when the bottom of the title text should be visible as
    //    the user scrolls up
    return html`
    <div>
        ${ buildControls(mouseHovering) }
        <div ref=${ hoveringRef }>
            <div ref=${ preMarkerRef }></div>
            <div ref=${ backgroundBandRef }></div>
            <h1 ref=${ titleRef } class=${classes}>${ title }</h1>
            <div ref=${ postMarkerRef }></div>
        </div>
    </div>`;
}

function DeckControl({ moreVisible, onEnter, onLeave, onClick, label}) {
    let hoveringRef = useRef(null);

    function mouseEnter() {
        onEnter();
    }
    function mouseLeave() {
        onLeave();
    }

    useEffect(() => {
        if (hoveringRef && hoveringRef.current) {
            hoveringRef.current.addEventListener("mouseenter", mouseEnter, false);
            hoveringRef.current.addEventListener("mouseleave", mouseLeave, false);
            return () => {
                if (hoveringRef && hoveringRef.current) {
                    hoveringRef.current.removeEventListener("mouseenter", mouseEnter);
                    hoveringRef.current.removeEventListener("mouseleave", mouseLeave);
                }
            }
        }
    }, []);


    let classes = "note-control-item"
    if (moreVisible) {
        classes += " note-control-increased-visibility";
    }
    return html`<div ref=${hoveringRef} class=${classes} onClick=${onClick}>${label}</div>`;
}
