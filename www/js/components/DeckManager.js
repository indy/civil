import { html, useRef, useEffect, useState, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { leftMarginHeading, leftMarginHeadingNoWrap, sortByResourceThenName } from '/js/CivilUtils.js';

import { useStateValue } from '/js/StateProvider.js';
import { formattedDate } from '/js/JsUtils.js';

import GraphSection from '/js/components/GraphSection.js';
import CivilSelect from '/js/components/CivilSelect.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';
import { NoteSection, NoteManager,
         NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE,
         NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';
import { PointForm } from '/js/components/PointForm.js';
import { Ref } from '/js/components/Ref.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';


function applyDecksAndCardsToNotes(obj) {
    const decksInNotes = hashByNoteIds(obj.refs);
    const cardsInNotes = hashByNoteIds(obj.flashcards);

    for(let i = 0;i<obj.notes.length;i++) {
        let n = obj.notes[i];
        n.decks = decksInNotes[n.id] || [];
        n.decks.sort(sortByResourceThenName);
        n.flashcards = cardsInNotes[n.id];
    }

    return obj;
}

function hashByNoteIds(s) {
    s = s || [];
    return s.reduce(function(a, b) {
        const note_id = b.note_id;
        if (a[note_id]) {
            a[note_id].push(b);
        } else {
            a[note_id] = [b];
        }
        return a;
    }, {});
}

function makeCacheDeckFn(preCacheFn, resource) {
    return function(newdeck) {
        if (preCacheFn) {
            newdeck = preCacheFn(newdeck);
        }

        const [state, appDispatch] = useStateValue();

        let updatedDeck = applyDecksAndCardsToNotes(newdeck);
        updatedDeck.noteDeckMeta = updatedDeck.notes.find(n => n.kind === 'NoteDeckMeta');

        appDispatch({type: 'dms-update-deck', data: updatedDeck, resource: resource});
    }
}

// preCacheFn performs any one-off calculations before caching the Deck
function DeckManager({ id, resource, updateForm, preCacheFn, hasSummarySection, hasReviewSection }) {
    // returns helper fn that applies preCacheFn and stores deck in AppState

    const [state, appDispatch] = useStateValue();

    const cacheDeck = makeCacheDeckFn(preCacheFn, resource);

    useEffect(() => {
        // fetch resource from the server
        const url = `/api/${resource}/${id}`;
        Net.get(url).then(deck => {
            if (deck) {
                cacheDeck(deck);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }, [id]);

    let res = {};

    let title = state.deckManagerState.deck && (state.deckManagerState.deck.title || state.deckManagerState.deck.name || '');
    res.title = Title(title);

    res.buildPointForm = function(onSuccessCallback) {
        function onAddPoint(point) {
            const url = `/api/${resource}/${state.deckManagerState.deck.id}/points`;
            Net.post(url, point).then(updatedDeck => {
                cacheDeck(updatedDeck);
                onSuccessCallback();
            });
        };

        return html`<${PointForm} onSubmit=${ onAddPoint } submitMessage="Create Point"/>`;
    };

    res.buildSectionBackRefs = function() {
        let backrefs = (state.deckManagerState.deck && state.deckManagerState.deck.backrefs) || [];
        let backnotes = (state.deckManagerState.deck && state.deckManagerState.deck.backnotes) || [];
        return html`<${SectionBackRefs} state=${state} backrefs=${ backrefs } backnotes=${ backnotes } deckId=${ id }/>`;
    }

    res.buildGraphSection = function() {

        // PERSON
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready
        // const okToShowGraph = !!(deckManager.hasNotes || (person.backrefs && person.backrefs.length > 0));

        // ARTICLE
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready
        // const okToShowGraph = deckManager.hasNotes;

        // TIMELINE
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready
        // const okToShowGraph = !!(deckManager.hasNotes || (timeline.backrefs && timeline.backrefs.length > 0));

        // IDEA
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready

        let deck = state.deckManagerState.deck;
        const okToShowGraph = (deck && deck.notes && deck.notes.length > 0) || (deck && deck.backrefs);
        const graphTitle = (deck && deck.title) ? `Connectivity Graph` : '';

        return html`<${GraphSection} heading=${ graphTitle } okToShowGraph=${okToShowGraph} id=${ id } depth=${ 2 } />`;
    }

    function howToShowNoteSection(noteKind) {
        if (noteKind === NOTE_KIND_SUMMARY) {
            if (state.deckManagerState.hasSummarySection) {
                return state.deckManagerState.showShowSummaryButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
            } else {
                return NOTE_SECTION_HIDE;
            }
        }

        if (noteKind === NOTE_KIND_REVIEW) {
            if (state.deckManagerState.hasReviewSection) {
                return state.deckManagerState.showShowReviewButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
            } else {
                return NOTE_SECTION_HIDE;
            }
        }

        if (noteKind === NOTE_KIND_NOTE) {
            var r = NOTE_SECTION_EXCLUSIVE;
            if (state.deckManagerState.hasSummarySection && !state.deckManagerState.showShowSummaryButton) {
                r = NOTE_SECTION_SHOW;
            }
            if (state.deckManagerState.hasReviewSection && !state.deckManagerState.showShowReviewButton) {
                r = NOTE_SECTION_SHOW;
            }
            return r;
        }

        return NOTE_SECTION_HIDE;
    }

    function findNoteWithId(id, modifyFn) {
        const notes = state.deckManagerState.deck.notes;
        const index = notes.findIndex(n => n.id === id);

        modifyFn(notes, index);
        cacheDeck({...deck, notes});
    };

    function onRefsChanged(note, all_decks_for_note) {
        // have to set deck.refs to be the canonical version
        // 'cacheDeck' will use that to populate each note's decks array

        // remove all deck.refs that relate to this note
        state.deckManagerState.deck.refs = state.deckManagerState.deck.refs.filter(din => {
            return din.note_id !== note.id;
        });
        // add every note.decks entry to deck.refs
        all_decks_for_note.forEach(d => { state.deckManagerState.deck.refs.push(d); });

        findNoteWithId(note.id, (notes, index) => {
            notes[index] = note;
        });
    };


    res.buildDeckRefSection = function() {
        function onCancel() {
            appDispatch({type: 'dms-refs-toggle'});
        }
        function onSaved(note, changes, allDecksForNote) {
            // this note is going to be the deck's NoteDeckMeta
            onRefsChanged(note, allDecksForNote);

            // todo: combine these two appDispatch calls
            appDispatch({
                type: 'noteRefsModified',
                changes,
                allDecksForNote,
            });
            appDispatch({type: 'dms-refs-toggle'});
        }

        return html`<${DeckRefSection} deck=${ state.deckManagerState.deck } editing=${ state.deckManagerState.isEditingDeckRefs } onCancel=${onCancel} onSaved=${onSaved} />`;
    }

    res.buildNoteSections = function() {
        return html`
        <div>
            ${ state.deckManagerState.hasSummarySection && html`
                <${NoteSection} heading='Summary'
                                noteKind=${ NOTE_KIND_SUMMARY }
                                howToShow=${ howToShowNoteSection(NOTE_KIND_SUMMARY) }
                                deck=${ state.deckManagerState.deck }
                                onRefsChanged=${onRefsChanged}
                                cacheDeck=${ cacheDeck }/>`}
            ${ state.deckManagerState.hasReviewSection && html`
                <${NoteSection} heading='Review'
                                noteKind=${ NOTE_KIND_REVIEW }
                                howToShow=${ howToShowNoteSection(NOTE_KIND_REVIEW) }
                                deck=${ state.deckManagerState.deck }
                                onRefsChanged=${onRefsChanged}
                                cacheDeck=${ cacheDeck } />`}
            <${NoteSection} heading=${ title }
                            noteKind=${ NOTE_KIND_NOTE }
                            howToShow=${ howToShowNoteSection(NOTE_KIND_NOTE) }
                            deck=${ state.deckManagerState.deck }
                            onRefsChanged=${onRefsChanged}
                            cacheDeck=${ cacheDeck } />
        </div>`;
    }

    if (state.deckManagerState.showUpdateForm) {
        res.updateForm = updateForm;
    }


    res.buildUpdateForm = function() {
        function hideForm() {
            appDispatch({type: 'dms-hide-form'});
        }

        function deckModified(newDeck) {
            appDispatch({type: 'dms-update-deck', data: newDeck});
        }

        return state.deckManagerState.showUpdateForm && html`<${updateForm} deck=${state.deckManagerState.deck} hideFormFn=${hideForm} deckModifiedFn=${deckModified}/>`;
    }

    function confirmedDeleteClicked() {
        Net.delete(`/api/${resource}/${state.deckManagerState.deck.id}`).then(() => {
            // remove the resource from the app state
            appDispatch({
                type: 'deleteDeck',
                id: deck.id
            });
            route(`/${resource}`, true);
        });
    }

    res.buildDeleteForm = function() {
        return state.deckManagerState.showDelete && html`<${DeleteConfirmation} onDelete=${confirmedDeleteClicked }/>`;
    }

    function noteFilterDeckPoint(deck_point) {
        return n => n.point_id === deck_point.id;
    }

    res.noteManagerForDeckPoint = function(deck_point) {
        return NoteManager({ deck: state.deckManagerState.deck,
                             cacheDeck,
                             onRefsChanged,
                             filterFn: noteFilterDeckPoint(deck_point),
                             optional_deck_point: deck_point,
                             appendLabel: `Append Note to ${ deck_point.title }`,
                             noteKind: NOTE_KIND_NOTE
                           });
    }

    res.pointHasNotes = function(point) {
        return state.deckManagerState.deck.notes.some(n => n.point_id === point.id);
    }

    return res;
}

function Title(title) {
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
        appDispatch({type: 'dms-refs-toggle'});
    };

    function onEditParentClicked(e) {
        appDispatch({type: 'dms-update-form-toggle'});
    };

    function onShowSummaryButtonClicked(e) {
        appDispatch({type: 'dms-show-summary-button-toggle', data: !state.deckManagerState.showShowSummaryButton});
    };
    function onShowReviewButtonClicked(e) {
        appDispatch({type: 'dms-show-review-button-toggle', data: !state.deckManagerState.showShowReviewButton});
    };

    function onDeleteClicked(e) {
        appDispatch({type: 'dms-delete-toggle'});
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
                        ${ state.deckManagerState.showShowSummaryButton && html`<${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onShowSummaryButtonClicked } label="[show summary]"/>`}
                        ${ state.deckManagerState.showShowReviewButton && html`<${DeckControl} onEnter=${mouseEnterChild} onLeave=${mouseLeaveChild} moreVisible=${mouseHovering || mouseHoveringChild} onClick=${ onShowReviewButtonClicked } label="[show review]"/>`}
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


function DeckRefSection({ deck, editing, onCancel, onSaved }) {

    let deckId = deck && deck.id;
    let deckMeta = deck && deck.noteDeckMeta;
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
        ${ !editing && entries.length > 0 && html`<div><hr class="light"/>${entries}<hr class="light"/></div>`}
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
