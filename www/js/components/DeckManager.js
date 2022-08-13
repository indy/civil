import { html, useRef, useEffect, useState, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { useStateValue } from '/js/StateProvider.js';

import { NoteSection, NoteManager,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';
import { Ref } from '/js/components/Ref.js';

const UPDATE_FORM_TOGGLE = 'update-form-toggle';
const HIDE_FORM = 'hide-form';
const SHOW_SUMMARY_BUTTON = 'show-summary-button-toggle';
const SHOW_REVIEW_BUTTON = 'show-review-button-toggle';
const DELETE_TOGGLE = 'show-delete';

function reducer(state, action) {
    switch(action.type) {
    case UPDATE_FORM_TOGGLE:
        return {
            ...state,
            showUpdateForm: !state.showUpdateForm
        }
    case DELETE_TOGGLE:
        return {
            ...state,
            showDelete: !state.showDelete
        }
    case HIDE_FORM:
        return {
            ...state,
            showUpdateForm: false
        }
    case SHOW_SUMMARY_BUTTON:
        return {
            ...state,
            showShowSummaryButton: action.data
        }
    case SHOW_REVIEW_BUTTON:
        return {
            ...state,
            showShowReviewButton: action.data
        }
    default: throw new Error(`unknown action: ${action}`);
    }
}

function makeCacheDeckFn(preCacheFn) {
    const [state, dispatch] = useStateValue();

    return function(newdeck) {
        if (preCacheFn) {
            newdeck = preCacheFn(newdeck);
        }

        dispatch({
            type: 'cacheDeck',
            id: newdeck.id,
            newItem: newdeck
        });
    }
}

// preCacheFn performs any one-off calculations before caching the Deck
function DeckManager({ deck, title, resource, updateForm, preCacheFn, hasSummarySection, hasReviewSection }) {
    // returns helper fn that applies preCacheFn and stores deck in AppState

    const [state, appDispatch] = useStateValue();
    const cacheDeck = makeCacheDeckFn(preCacheFn);

    if (title && state.urlName !== title) {
        appDispatch({type: 'setUrlName', urlName: title});
    }

    const [fetchingDeck, setFetchingDeck] = useState(undefined);

    const [local, localDispatch] = useLocalReducer(reducer, {
        showUpdateForm: false,
        showDelete: false,
        showShowSummaryButton: hasSummarySection,
        showShowReviewButton: hasReviewSection
    });

    useEffect(() => {
        if(!state.cache.deck[deck.id]) {
            setFetchingDeck(deck.id);
            if (fetchingDeck != deck.id) {
                // fetch resource from the server
                const url = `/api/${resource}/${deck.id}`;
                Net.get(url).then(deck => {
                    if (deck) {
                        cacheDeck(deck);
                    } else {
                        console.error(`error: fetchDeck for ${url}`);
                    }
                });
            }
        }

        if (deck.notes) {
            if (hasSummarySection) {
                localDispatch(SHOW_SUMMARY_BUTTON, !deck.notes.some(n => n.kind === NOTE_KIND_SUMMARY));
            }
            if (hasReviewSection) {
                localDispatch(SHOW_REVIEW_BUTTON, !deck.notes.some(n => n.kind === NOTE_KIND_REVIEW));
            }
        }
    }, [deck]);

    let res = {};

    res.title = Title(title, local, localDispatch);

    res.buildPointForm = function(onSuccessCallback) {
        function onAddPoint(point) {
            const url = `/api/${resource}/${deck.id}/points`;
            Net.post(url, point).then(updatedDeck => {
                cacheDeck(updatedDeck);
                onSuccessCallback();
            });
        };

        return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
    };


    function howToShowNoteSection(noteKind) {
        if (noteKind === NOTE_KIND_SUMMARY) {
            if (hasSummarySection) {
                return local.showShowSummaryButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
            } else {
                return NOTE_SECTION_HIDE;
            }
        }

        if (noteKind === NOTE_KIND_REVIEW) {
            if (hasReviewSection) {
                return local.showShowReviewButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
            } else {
                return NOTE_SECTION_HIDE;
            }
        }

        if (noteKind === NOTE_KIND_NOTE) {
            var r = NOTE_SECTION_EXCLUSIVE;
            if (hasSummarySection && !local.showShowSummaryButton) {
                r = NOTE_SECTION_SHOW;
            }
            if (hasReviewSection && !local.showShowReviewButton) {
                r = NOTE_SECTION_SHOW;
            }
            return r;
        }

        return NOTE_SECTION_HIDE;
    }

    res.buildDeckRefSection = function() {
        return html`<${DeckRefSection} deckMeta=${ deck.noteDeckMeta } />`;
    }

    res.buildNoteSections = function() {
        return html`
        <div>
            ${ hasSummarySection && html`
                <${NoteSection} heading='Summary'
                                noteKind=${ NOTE_KIND_SUMMARY }
                                howToShow=${ howToShowNoteSection(NOTE_KIND_SUMMARY) }
                                deck=${ deck }
                                cacheDeck=${ cacheDeck }/>`}
            ${ hasReviewSection && html`
                <${NoteSection} heading='Review'
                                noteKind=${ NOTE_KIND_REVIEW }
                                howToShow=${ howToShowNoteSection(NOTE_KIND_REVIEW) }
                                deck=${ deck }
                                cacheDeck=${ cacheDeck } />`}
            <${NoteSection} heading=${ title }
                            noteKind=${ NOTE_KIND_NOTE }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_NOTE) }
                            deck=${ deck }
                            cacheDeck=${ cacheDeck } />
        </div>`;
    }

    if (local.showUpdateForm) {
        res.updateForm = updateForm;
    }

    function hideForm() {
        localDispatch(HIDE_FORM);
    }

    res.buildUpdateForm = function() {
        return local.showUpdateForm && html`<${updateForm} deck=${deck} hideFormFn=${hideForm}/>`;
    }

    function confirmedDeleteClicked() {
        Net.delete(`/api/${resource}/${deck.id}`).then(() => {
            // remove the resource from the app state
            appDispatch({
                type: 'deleteDeck',
                id: deck.id
            });
            route(`/${resource}`, true);
        });
    }

    res.buildDeleteForm = function() {
        return local.showDelete && html`<${DeleteConfirmation} onDelete=${confirmedDeleteClicked }/>`;
    }

    function noteFilterDeckPoint(deck_point) {
        return n => n.point_id === deck_point.id;
    }

    res.noteManagerForDeckPoint = function(deck_point) {
        return NoteManager({ deck,
                             cacheDeck,
                             filterFn: noteFilterDeckPoint(deck_point),
                             optional_deck_point: deck_point,
                             appendLabel: `Append Note to ${ deck_point.title }`,
                             noteKind: NOTE_KIND_NOTE
                           });
    }

    res.pointHasNotes = function(point) {
        return deck.notes.some(n => n.point_id === point.id);
    }

    res.hasNotes = deck.notes && deck.notes.length > 0;

    return res;
}

function Title(title, local, localDispatch) {
    const hoveringRef = useRef(null);
    const [mouseHovering, setMouseHovering] = useState(false);

    function mouseEnter() {
        setMouseHovering(true);
    }
    function mouseLeave() {
        setMouseHovering(false);
    }

    function onRefsClicked(e) {
        e.preventDefault();
        // localDispatch(UPDATE_FORM_TOGGLE);
    };

    function onEditParentClicked(e) {
        e.preventDefault();
        localDispatch(UPDATE_FORM_TOGGLE);
    };

    function onShowSummaryButtonClicked(e) {
        e.preventDefault();
        localDispatch(SHOW_SUMMARY_BUTTON, !local.showShowSummaryButton);
    };
    function onShowReviewButtonClicked(e) {
        e.preventDefault();
        localDispatch(SHOW_REVIEW_BUTTON, !local.showShowReviewButton);
    };

    function onDeleteClicked(e) {
        e.preventDefault();
        localDispatch(DELETE_TOGGLE);
    }

    const preMarkerRef = useRef(null); // an element on the page, when it's offscreen apply title-sticky to the h1
    const postMarkerRef = useRef(null); // an element on the page, when it's onscreen remove title-sticky from the h1
    const titleRef = useRef(null);
    const backgroundBandRef = useRef(null);

    function buildControls(mouseHovering) {
        let itemClasses = "note-control-item";
        if (mouseHovering) {
            itemClasses += " note-control-increased-visibility";
        }

        return html`<div class="note-controls-container">
                        <div class="${itemClasses}" onClick=${ onRefsClicked }>[refs]</div>
                        <div class="${itemClasses}" onClick=${ onEditParentClicked }>[edit]</div>
                        <div class="${itemClasses}" onClick=${ onDeleteClicked }>[delete]</div>
                        ${ local.showShowSummaryButton && html`<div class="${itemClasses}" onClick=${ onShowSummaryButtonClicked }>[show summary]</div>`}
                        ${ local.showShowReviewButton && html`<div class="${itemClasses}" onClick=${ onShowReviewButtonClicked }>[show review]</div>`}
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

    // there are 2 markers: pre and post so that we get a nice effect in both of these scenarios:
    // 1. the sticky header appearing when the top of the title scrolls off the top of the screen
    // 2. the normal inline title appears when the bottom of the title text should be visible as
    //    the user scrolls up
    return html`
    <div>
        ${  buildControls(mouseHovering)}
        <div ref=${ hoveringRef }>
            <div ref=${ preMarkerRef }></div>
            <div ref=${ backgroundBandRef }></div>
            <h1 ref=${ titleRef } class="deck-title">${ title }</h1>
            <div ref=${ postMarkerRef }></div>
        </div>
    </div>`;
}

function DeckRefSection({ deckMeta }) {
    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs

    let entries = '';
    if (deckMeta && deckMeta.decks) {
        entries = deckMeta.decks.map(ref => {
            return html`<${Ref} deckReference=${ref} extraClasses="deck-ref-item"/>`;
        });
    }

    return html`<div class="deck-ref-section">${entries}</div>`;
}

export { DeckManager };
