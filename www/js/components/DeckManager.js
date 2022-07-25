import { html, useRef, useState, useEffect, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { useStateValue } from '/js/StateProvider.js';

import { NoteSection, NoteManager,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';

const BUTTONS_TOGGLE = 'buttons-toggle';
const UPDATE_FORM_TOGGLE = 'update-form-toggle';
const HIDE_FORM = 'hide-form';
const SHOW_SUMMARY_BUTTON = 'show-summary-button-toggle';
const SHOW_REVIEW_BUTTON = 'show-review-button-toggle';

function reducer(state, action) {
    switch(action.type) {
    case BUTTONS_TOGGLE:
        return {
            ...state,
            showButtons: !state.showButtons,
            showUpdateForm: false
        }
    case UPDATE_FORM_TOGGLE:
        return {
            ...state,
            showUpdateForm: !state.showUpdateForm
        }
    case HIDE_FORM:
        return {
            ...state,
            showButtons: false,
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

    useEffect(() => {
        if (deck.notes) {
            if (hasSummarySection) {
                localDispatch(SHOW_SUMMARY_BUTTON, !deck.notes.some(n => n.kind === NOTE_KIND_SUMMARY));
            }
            if (hasReviewSection) {
                localDispatch(SHOW_REVIEW_BUTTON, !deck.notes.some(n => n.kind === NOTE_KIND_REVIEW));
            }
        }
        if(!state.cache.deck[deck.id]) {
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
    }, [deck]);

    const [local, localDispatch] = useLocalReducer(reducer, {
        showButtons: false,
        showUpdateForm: false,
        showShowSummaryButton: hasSummarySection,
        showShowReviewButton: hasReviewSection
    });

    function buildButtons() {
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

        function confirmedDeleteClicked() {
            Net.delete(`/api/${resource}/${deck.id}`).then(() => {
                // remove the resource from the app state
                dispatch({
                    type: 'deleteDeck',
                    id: deck.id
                });
                route(`/${resource}`, true);
            });
        }

        return html`
        <div>
            <button onClick=${ onEditParentClicked }>Edit...</button>
            <${DeleteConfirmation} onDelete=${confirmedDeleteClicked }/>
            ${ local.showShowSummaryButton && html`<button onClick=${ onShowSummaryButtonClicked }>Show Summary Section</button>`}
            ${ local.showShowReviewButton && html`<button onClick=${ onShowReviewButtonClicked }>Show Review Section</button>`}
        </div>`;
    };

    function onShowButtons(e) {
        if (!state.readOnly) {
            e.preventDefault();
            localDispatch(BUTTONS_TOGGLE);
        }
    };

    let res = {};

    res.title = Title(title, onShowButtons);

    res.buttons = function() {
        if (local.showButtons) {
            return buildButtons();
        }
    }

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

    res.buildNoteSections = function() {
        return html`
        <div>
            ${ hasSummarySection && html`
                <${NoteSection} heading='Summary'
                                noteKind=${ NOTE_KIND_SUMMARY }
                                howToShow=${ howToShowNoteSection(NOTE_KIND_SUMMARY) }
                                deck=${ deck }
                                cacheDeck=${ cacheDeck }/>`}
                                ${ hasReviewSection && html`<${NoteSection} heading='Review'
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

function Title(title, onShowButtons) {
    const preMarkerRef = useRef(null); // an element on the page, when it's offscreen apply title-sticky to the h1
    const postMarkerRef = useRef(null); // an element on the page, when it's onscreen remove title-sticky from the h1
    const titleRef = useRef(null);
    const backgroundBandRef = useRef(null);

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
    }, []);

    // there are 2 markers: pre and post so that we get a nice effect in both of these scenarios:
    // 1. the sticky header appearing when the top of the title scrolls off the top of the screen
    // 2. the normal inline title appears when the bottom of the title text should be visible as
    //    the user scrolls up
    return html`
    <div>
        <div ref=${ preMarkerRef }></div>
        <div ref=${ backgroundBandRef }></div>
        <h1 ref=${ titleRef } class="deck-title" onClick=${ onShowButtons }>${ title }</h1>
        <div ref=${ postMarkerRef }></div>
    </div>`;
}

export { DeckManager };
