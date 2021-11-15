import { html, useRef, useState, useEffect, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import { useWasmInterface } from '/js/WasmInterfaceProvider.js';

import { svgEdit, svgCancel, svgTickedCheckBox, svgUntickedCheckBox } from '/js/svgIcons.js';

import Note from '/js/components/Note.js';
import PointForm from '/js/components/PointForm.js';
import ImageWidget from '/js/components/ImageWidget.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';

const NOTE_SECTION_HIDE = 0;
const NOTE_SECTION_SHOW = 1;
const NOTE_SECTION_EXCLUSIVE = 2;

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

// preCacheFn performs any one-off calculations before caching the Deck
function DeckManager({ deck, title, resource, updateForm, preCacheFn, hasNoteSections }) {
  // returns helper fn that applies preCacheFn and stores deck in AppState

  const [state, dispatch] = useStateValue();

  function cacheDeck(newdeck) {
    if (preCacheFn) {
      newdeck = preCacheFn(newdeck);
    }

    dispatch({
      type: 'cacheDeck',
      id: newdeck.id,
      newItem: newdeck
    });
  }

  useEffect(() => {
    if (deck.notes) {
      localDispatch(SHOW_SUMMARY_BUTTON, !deck.notes.some(n => n.kind === 'NoteSummary'));
      localDispatch(SHOW_REVIEW_BUTTON, !deck.notes.some(n => n.kind === 'NoteReview'));
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
    showShowSummaryButton: hasNoteSections,
    showShowReviewButton: hasNoteSections
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
    e.preventDefault();
    localDispatch(BUTTONS_TOGGLE);
  };

  let res = {};

  res.title = Title(title, onShowButtons);

  res.showNoteSection = function(noteKind) {
    if (hasNoteSections) {
      if (noteKind === 'NoteSummary') {
        return local.showShowSummaryButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
      }
      if (noteKind === 'NoteReview') {
        return local.showShowReviewButton ? NOTE_SECTION_HIDE : NOTE_SECTION_SHOW;
      }
      if (noteKind === 'Note') {
        if (local.showShowSummaryButton && local.showShowReviewButton) {
          return NOTE_SECTION_EXCLUSIVE;
        } else {
          return NOTE_SECTION_SHOW;
        }
      }
    } else {
      if (noteKind === 'Note') {
        return NOTE_SECTION_EXCLUSIVE;
      }
    }
    return NOTE_SECTION_HIDE;
  }

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

  if (local.showUpdateForm) {
    res.updateForm = updateForm;
  }

  function hideForm() {
    localDispatch(HIDE_FORM);
  }

  res.buildUpdateForm = function() {
    return local.showUpdateForm && html`<${updateForm} deck=${deck} hideFormFn=${hideForm}/>`;
  }

  res.noteManagerForDeckPoint = function(deck_point) {
    return NoteManager({ deck,
                         cacheDeck,
                         filterFn: noteFilterDeckPoint(deck_point),
                         optional_deck_point: deck_point,
                         appendLabel: `Append Note to ${ deck_point.title }`,
                         noteKind: 'Note'
                       });
  }

  res.noteManager = function(noteKind) {
    let filterFn = n => (!n.point_id) && n.kind === noteKind;

    let appendLabel = "Append Note";
    if (noteKind === 'NoteSummary') {
      appendLabel = "Append Summary Note";
    } else if (noteKind === 'NoteReview') {
      appendLabel = "Append Review Note";
    }

    return NoteManager({ deck,
                         cacheDeck,
                         filterFn,
                         appendLabel,
                         noteKind
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
  return html`<div>
                <div ref=${ preMarkerRef }></div>
                <div ref=${ backgroundBandRef }></div>
                <h1 ref=${ titleRef } onClick=${ onShowButtons }>${ title }</h1>
                <div ref=${ postMarkerRef }></div>
              </div>`;
}

function NoteForm({ onSubmit, onCancel }) {
  const [content, setContent] = useState('');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === 'content') {
      setContent(value);
    }
  };

  return html`
  <div class="append-note">
    <div class="left-margin">
      <div class="left-margin-entry clickable cancel-offset" onClick=${ onCancel }>
        <span class="left-margin-icon-label">Cancel</span>
        ${ svgCancel() }
      </div>
    </div>
    <form class="civil-add-note-form" onSubmit=${ onSubmit }>
      <label for="content">Append Note:</label>
      <br/>
      <textarea id="content"
                type="text"
                class="new-note-textarea"
                name="content"
                value=${ content }
                onInput=${ handleChangeEvent }
      />
      <br/>
      <input type="submit" value="Save"/>
    </form>
    <${ImageWidget}/>
  </div>`;
}

function addNote(markup, deck_id, noteKind, optional_point_id) {
  const wasmInterface = useWasmInterface();
  const notes = wasmInterface.splitter(markup);

  if (notes === null) {
    console.error(markup);
    return new Promise((resolve, reject) => { reject(new Error("addNote: splitIntoNotes failed")); });
  }

  let data = {
    deck_id,
    kind: noteKind,
    content: notes
  };

  if (optional_point_id) {
    data.point_id = optional_point_id;
  }

  function isEmptyNote(n) {
    return n.content.every(n => { return n.length === 0;});
  }

  if (isEmptyNote(data)) {
    return new Promise((resolve, reject) => { reject(new Error("Parsed as empty note")); });
  } else {
    return Net.post("/api/notes", data);
  }
}

function NoteManager({ deck, cacheDeck, filterFn, optional_deck_point, appendLabel, noteKind }) {
  const [showNoteForm, setShowNoteForm] = useState(false);

  function findNoteWithId(id, modifyFn) {
    const notes = deck.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);
    cacheDeck({...deck, notes});
  };

  function onEditedNote(id, data) {
    findNoteWithId(id, (notes, index) => {
      notes[index] = Object.assign(notes[index], data);
    });
  };

  function onDeleteNote(noteId) {
    findNoteWithId(noteId, (notes, index) => {
      notes.splice(index, 1);
    });
  };

  function onDecksChanged(note, all_decks_for_note) {
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

  function buildNoteComponent(note) {
    return html`
      <${Note} key=${ note.id }
               note=${ note }
               parentDeckId=${ deck.id }
               onDelete=${ onDeleteNote }
               onEdited=${ onEditedNote }
               onDecksChanged=${ onDecksChanged }
      />`;
  }

  function buildNoteForm() {
    function onCancelAddNote(e) {
      setShowNoteForm(false);
      e.preventDefault();
    };

    function onAddNote(e) {
      e.preventDefault();
      const noteForm = e.target;
      const markup = noteForm.content.value;
      addNote(markup, deck.id, noteKind, optional_deck_point && optional_deck_point.id)
        .then(newNotes => {
          const notes = deck.notes;
          newNotes.forEach(n => {
            notes.push(n);
          });

          cacheDeck({...deck, notes});
          setShowNoteForm(false);
          // setShowUpdateForm(false);
        })
        .catch(error => console.error(error.message));
    };

    return html`<${NoteForm} onSubmit=${ onAddNote } onCancel=${ onCancelAddNote } />`;
  };

  function buildNoteFormIcon() {
    function onAddNoteClicked(e) {
      setShowNoteForm(true);
      e.preventDefault();
    };

    if (optional_deck_point) {
      return html`
<div class="inline-append-note">
  <div class="left-margin-inline">
    <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
      ${ svgEdit() }
      <span class="left-margin-icon-label">${ appendLabel }</span>
    </div>
  </div>
</div>
`;
    } else {
      return html`
<div class="append-note">
  <div class="left-margin">
    <div class="left-margin-entry clickable"  onClick=${ onAddNoteClicked }>
      <span class="left-margin-icon-label">${ appendLabel }</span>
      ${ svgEdit() }
    </div>
  </div>
</div>
`;
    }

  }
  const notes = deck.notes ? deck.notes.filter(filterFn).map(buildNoteComponent) : [];

  return html`
      <section>
        ${ notes }
        ${ showNoteForm ? buildNoteForm() : buildNoteFormIcon() }
      </section>`;
}

function noteFilterDeckPoint(deck_point) {
  return n => n.point_id === deck_point.id;
}

export { DeckManager,  NOTE_SECTION_HIDE, NOTE_SECTION_SHOW, NOTE_SECTION_EXCLUSIVE };
