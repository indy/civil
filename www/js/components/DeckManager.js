import { html, useRef, useEffect, useState, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { useStateValue } from '/js/StateProvider.js';

import CivilSelect from '/js/components/CivilSelect.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';
import { NoteSection, NoteManager,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';
import { Ref } from '/js/components/Ref.js';

const UPDATE_FORM_TOGGLE = 'update-form-toggle';
const HIDE_FORM = 'hide-form';
const SHOW_SUMMARY_BUTTON = 'show-summary-button-toggle';
const SHOW_REVIEW_BUTTON = 'show-review-button-toggle';
const DELETE_TOGGLE = 'delete-toggle';
const REFS_TOGGLE = 'refs-toggle';

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
    case REFS_TOGGLE:
        return {
            ...state,
            isEditingDeckRefs: !state.isEditingDeckRefs
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
        isEditingDeckRefs: false,
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

    function findNoteWithId(id, modifyFn) {
        const notes = deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);
        cacheDeck({...deck, notes});
    };

    function onRefsChanged(note, all_decks_for_note) {
        // have to set deck.refs to be the canonical version
        // 'cacheDeck' will use that to populate each note's decks array

        // remove all deck.refs that relate to this note
        deck.refs = deck.refs.filter(din => {
            return din.note_id !== note.id;
        });
        // add every note.decks entry to deck.refs
        all_decks_for_note.forEach(d => { deck.refs.push(d); });

        findNoteWithId(note.id, (notes, index) => {
            notes[index] = note;
        });
    };


    res.buildDeckRefSection = function() {
        function onCancel() {
            localDispatch(REFS_TOGGLE);
        }
        function onSaved(note, changes, allDecksForNote) {
            // this note is going to be the deck's NoteDeckMeta
            onRefsChanged(note, allDecksForNote);

            appDispatch({
                type: 'noteRefsModified',
                changes,
                allDecksForNote,
            });
            localDispatch(REFS_TOGGLE);
        }

        return html`<${DeckRefSection} deckId=${deck.id} deckMeta=${ deck.noteDeckMeta } editing=${ local.isEditingDeckRefs } onCancel=${onCancel} onSaved=${onSaved} />`;
    }

    res.buildNoteSections = function() {
        return html`
        <div>
            ${ hasSummarySection && html`
                <${NoteSection} heading='Summary'
                                noteKind=${ NOTE_KIND_SUMMARY }
                                howToShow=${ howToShowNoteSection(NOTE_KIND_SUMMARY) }
                                deck=${ deck }
                                onRefsChanged=${onRefsChanged}
                                cacheDeck=${ cacheDeck }/>`}
            ${ hasReviewSection && html`
                <${NoteSection} heading='Review'
                                noteKind=${ NOTE_KIND_REVIEW }
                                howToShow=${ howToShowNoteSection(NOTE_KIND_REVIEW) }
                                deck=${ deck }
                                onRefsChanged=${onRefsChanged}
                                cacheDeck=${ cacheDeck } />`}
            <${NoteSection} heading=${ title }
                            noteKind=${ NOTE_KIND_NOTE }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_NOTE) }
                            deck=${ deck }
                            onRefsChanged=${onRefsChanged}
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
                             onRefsChanged,
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
        localDispatch(REFS_TOGGLE);
    };

    function onEditParentClicked(e) {
        localDispatch(UPDATE_FORM_TOGGLE);
    };

    function onShowSummaryButtonClicked(e) {
        localDispatch(SHOW_SUMMARY_BUTTON, !local.showShowSummaryButton);
    };
    function onShowReviewButtonClicked(e) {
        localDispatch(SHOW_REVIEW_BUTTON, !local.showShowReviewButton);
    };

    function onDeleteClicked(e) {
        localDispatch(DELETE_TOGGLE);
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
                        ${ local.showShowSummaryButton && html`<${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onShowSummaryButtonClicked } label="[show summary]"/>`}
                        ${ local.showShowReviewButton && html`<${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onShowReviewButtonClicked } label="[show review]"/>`}
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


function DeckRefSection({ deckId, deckMeta, editing, onCancel, onSaved }) {
    // deckMeta is the special note (of kind: NoteKind::NoteDeckMeta) that
    // contains the refs that should apply to the deck as a whole and not
    // just to individual paragraphs

    let entries = [];
    if (deckMeta && deckMeta.decks) {
        entries = deckMeta.decks.map(ref => {
            return html`<${Ref} deckReference=${ref} extraClasses="deck-ref-item"/>`;
        });
    }

    return html`<div class="deck-ref-section">
        ${ !editing && entries.length && html`<div><hr class="light"/>${entries}<hr class="light"/></div>`}
        ${  editing && html`<${AddDecksUI} deckId=${deckId} note=${deckMeta} chosen=${deckMeta.decks} onCancel=${onCancel} onSaved=${ onSaved }/>` }
    </div>`;
}

function AddDecksUI({ deckId, note, chosen, onCancel, onSaved }) {

    function referenceChanges(changes) {
        // todo: what if someone:
        // 1. clicks on edit note
        // 2. adds decks
        // 3. clicks ok (these decks should now be associated with the note)
        // 4. clicks on edit note
        // 5. adds more decks
        // 6. clicks cancel
        // expected: only the changes from step 5 should be undone

        if (changes) {
            let data = {
                note_id: note.id,
                // references_unchanged: changes.referencesUnchanged,
                references_changed: changes.referencesChanged,
                references_removed: changes.referencesRemoved,
                references_added: changes.referencesAdded,
                references_created: changes.referencesCreated
            };

            Net.post("/api/edges/notes_decks", data).then((allDecksForNote) => {
                onSaved(note, changes, allDecksForNote)
            });
        } else {
            onCancel();
        }

    };

    return html`
        <div class="block-width">
            <label>Connections:</label>
            <${ CivilSelect } parentDeckId=${ deckId }
                              chosen=${ chosen }
                              onFinish=${ referenceChanges }/>
        </div>`;
};

export { DeckManager };
