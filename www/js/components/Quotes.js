import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { capitalise } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import buildMarkup from '/js/components/BuildMarkup.js';

import CivilInput from '/js/components/CivilInput.js';
import CivilTextArea from '/js/components/CivilTextArea.js';
import DeleteConfirmation from '/js/components/DeleteConfirmation.js';
import Note from '/js/components/Note.js';

const SHOW_ADD_FORM = 'show-add-form';
const HIDE_ADD_FORM = 'hide-add-form';
const SET_ATTRIBUTION = 'set_attribution';
const SET_QUOTE_TEXT = 'set-quote-text';
const CREATED_NEW_QUOTE = 'created-new-quote';

function quotesReducer(state, action) {
    switch(action.type) {
    case SHOW_ADD_FORM: {
        return {
            ...state,
            showAddForm: true
        };
    }
    case HIDE_ADD_FORM: {
        return {
            ...state,
            showAddForm: false
        };
    }
    case SET_ATTRIBUTION: {
        return {
            ...state,
            attribution: action.data
        }
    }
    case SET_QUOTE_TEXT: {
        return {
            ...state,
            quoteText: action.data
        }
    }
    case CREATED_NEW_QUOTE: {
        return {
            ...state,
            showAddForm: false,
            attribution: '',
            quoteText: ''
        }
    }
    default: throw new Error(`unknown action: ${action}`);
    }
}

function cacheDeck(dispatch, deck) {
    dispatch({
        type: 'cacheDeck',
        id: deck.id,
        newItem: deck
    });
}

function titleFromQuoteText(quoteText) {
    const title = quoteText.length > 60 ? quoteText.slice(0, 57) + "..." : quoteText;
    return title;
}

function Quotes() {
    const [state, dispatch] = useStateValue();
    const resource = 'quotes';

    const [local, localDispatch] = useLocalReducer(quotesReducer, {
        showAddForm: false,
        attribution: '',
        quoteText: ''
    });

    function clickedNewQuoteButton(e) {
        e.preventDefault();
        localDispatch(SHOW_ADD_FORM);
    }

    function clickedRandomButton(e) {
        e.preventDefault();
        Net.get("/api/quotes/random").then(quote => {
            cacheDeck(dispatch, quote);
            route(`/quotes/${quote.id}`);
        });
    }

    function handleChangeEvent(e) {
        const value = e.target.value;
        const name = e.target.name;

        if (name === "attribution") {
            localDispatch(SET_ATTRIBUTION, value);
        }
        if (name === "quote-text") {
            localDispatch(SET_QUOTE_TEXT, value);
        }
    }

    function clickedSave(e) {
        e.preventDefault();

        const data = {
            title: titleFromQuoteText(local.quoteText),
            text: local.quoteText,
            attribution: local.attribution
        };

        Net.post("/api/quotes", data).then(quote => {
            route(`/quotes/${quote.id}`);
        });
    }

    function clickedCancel(e) {
        e.preventDefault();
        localDispatch(HIDE_ADD_FORM);
    }

    function renderNewQuoteButton() {
        return html`<button onClick=${ clickedNewQuoteButton }>Add Quote...</button>`;
    }

    function renderRandomButton() {
        return html`<button onClick=${ clickedRandomButton }>Random Quote</button>`;
    }

    function renderAddForm() {
        return html`
        <form class="civil-form">
            <label for="attribution">QuoteText:</label>
            <br/>
            <${CivilTextArea} id="quote-text"
                              value=${ local.quoteText }
                              onInput=${handleChangeEvent}/>
            <br/>
            <label for="attribution">Attribution:</label>
            <br/>
            <${CivilInput} id="attribution"
                           autocomplete="off"
                           value=${ local.attribution }
                           onInput=${handleChangeEvent}/>
            <br/>
            <button onClick=${clickedCancel}>cancel</button>
            <button onClick=${clickedSave}>save</button>
        </form>`;
    }

    return html`
    <article>
        <h1 class="ui">${capitalise(resource)}</h1>

          ${ !local.showAddForm && renderNewQuoteButton()}
          ${ local.showAddForm && renderAddForm()}
          ${ !local.showAddForm && renderRandomButton()}
    </article>`;
}

// onKeyDown is a function that captures variables when added as an event listener
// so resorting to these variables that are scoped to this file
//
let showingSearchCommand = false;
let componentRequiresFullKeyboardAccess = false;

function Quote(props) {
    const [state, dispatch] = useStateValue();

    const quoteId = parseInt(props.id, 10);
    const quote = state.cache.deck[quoteId] || { id: quoteId };

    useEffect(() => {
        dispatch({
            type: 'quoteId',
            id: quoteId
        });

        if(!state.cache.deck[quote.id]) {
            // fetch resource from the server
            const url = `/api/quotes/${quote.id}`;
            Net.get(url).then(deck => {
                if (deck) {
                    cacheDeck(dispatch, deck);
                } else {
                    console.error(`error: fetchDeck for ${url}`);
                }
            });
        }

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [quote]);


    useEffect(() => {
        showingSearchCommand = state.showingSearchCommand;
        componentRequiresFullKeyboardAccess = state.componentRequiresFullKeyboardAccess;
    }, [state]);

    function getQuoteThenRoute(url) {
        Net.get(url).then(deck => {
            if (deck) {
                cacheDeck(dispatch, deck);
                route(`/quotes/${deck.id}`);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }

    function onKeyDown(e) {
        if (!componentRequiresFullKeyboardAccess && !showingSearchCommand) {
            if (e.key === 'n') {
                getQuoteThenRoute(`/api/quotes/${quoteId}/next`);
            } else if (e.key === 'p') {
                getQuoteThenRoute(`/api/quotes/${quoteId}/prev`);
            } else if (e.key === 'r') {
                Net.get("/api/quotes/random").then(quote => {
                    cacheDeck(dispatch, quote);
                    route(`/quotes/${quote.id}`);
                });
            }
        }
    };

    const note = quote.notes && quote.notes[0];

    function updateNoteServerSide() {
        // as the title could have changed, we need to post the updated quote to the server
        Net.put(`/api/quotes/${quote.id}`, {
            title: quote.title,
            text: quote.notes[0].content, // not really needed, server side only uses title and attribution
            attribution: quote.attribution
        });

        cacheDeck(dispatch, quote);
    }

    function onEditedNote(id, data) {
        quote.notes[0] = Object.assign(quote.notes[0], data);
        quote.title = titleFromQuoteText(data.content);
        updateNoteServerSide();
    }

    function onEditedAttribute(attribution) {
        quote.attribution = attribution;
        updateNoteServerSide();
    }

    function onDelete(id) {
        Net.delete(`/api/quotes/${quote.id}`).then(() => {
            route("/quotes");
        });
    }

    function onDecksChanged(note, all_decks_for_note) {
        // have to set deck.refs to be the canonical version
        // 'cacheDeck' will use that to populate each note's decks array

        // remove all deck.refs that relate to this note
        quote.refs = quote.refs.filter(din => {
            return din.note_id !== note.id;
        });
        // add every note.decks entry to quote.refs
        all_decks_for_note.forEach(d => { quote.refs.push(d); });

        quote.notes[0] = note;
        cacheDeck(dispatch, quote);
    }

    return html`
    <article id="quotation-article">
        ${ note && html`
            <${Note} key=${ note.id }
                     note=${ note }
                     parentDeck=${ quote }
                     onEdited=${ onEditedNote }
                     onDelete=${ onDelete }
                     onDecksChanged=${ onDecksChanged }/>`}
        <${Attribution} attribution=${ quote.attribution }
                        onEdited=${ onEditedAttribute}
                        onDelete=${ onDelete }/>
    </article>`;
}

const ATTR_SHOW_MODE = 'attr-show-mode';
const ATTR_EDIT_MODE = 'attr-edit-mode';

const ATTR_SET_MODE = 'attr-set-mode';
const ATTR_INIT_ATTRIBUTION = 'attr-init-attribution';
const ATTR_SET_ATTRIBUTION = 'attr-set-attribution';
const ATTR_RESET_ATTRIBUTION = 'attr-reset-attribution';
const ATTR_SHOW_BUTTONS = 'attr-show-buttons';
const ATTR_HIDE_BUTTONS = 'attr-hide-buttons';

function attributionReducer(state, action) {
    switch(action.type) {
    case ATTR_SET_MODE: {
        return {
            ...state,
            mode: action.data,
            showButtons: action.data === ATTR_SHOW_MODE ? false : state.showButtons
        }
    }
    case ATTR_SHOW_BUTTONS: {
        return {
            ...state,
            showButtons: true
        }
    }
    case ATTR_HIDE_BUTTONS: {
        return {
            ...state,
            showButtons: false
        }
    }
    case ATTR_INIT_ATTRIBUTION: {
        return {
            ...state,
            originalAttribution: action.data,
            attribution: action.data
        }
    }
    case ATTR_SET_ATTRIBUTION: {
        return {
            ...state,
            attribution: action.data
        }
    }
    case ATTR_RESET_ATTRIBUTION: {
        return {
            ...state,
            attribution: state.originalAttribution
        }
    }
    default: throw new Error(`unknown action: ${action}`);
    }
}

function Attribution({ attribution, onEdited, onDelete}) {
    const [state] = useStateValue();

    const [local, localDispatch] = useLocalReducer(attributionReducer, {
        mode: ATTR_SHOW_MODE,
        showButtons: false,
        originalAttribution: attribution,
        attribution
    });

    useEffect(() => {
        if (local.originalAttribution !== attribution) {
            localDispatch(ATTR_INIT_ATTRIBUTION, attribution);
        }
    }, [attribution]);


    function clickedAttribution(e) {
        e.preventDefault();
        localDispatch(local.showButtons ? ATTR_HIDE_BUTTONS : ATTR_SHOW_BUTTONS);
    }

    function confirmedDeleteClicked() {
        onDelete();
    }

    function clickedEdit(e) {
        e.preventDefault();
        localDispatch(ATTR_SET_MODE, ATTR_EDIT_MODE);
    }

    function handleChangeEvent(e) {
        const target = e.target;
        const name = target.name;
        const value = target.value;

        localDispatch(ATTR_SET_ATTRIBUTION, value);
    }

    function clickedCancel(e) {
        e.preventDefault();
        localDispatch(ATTR_SET_MODE, ATTR_SHOW_MODE);
    }

    function clickedOK(e) {
        e.preventDefault();
        onEdited(local.attribution);
        localDispatch(ATTR_SET_MODE, ATTR_SHOW_MODE);
    }

    let markup = attribution && buildMarkup(attribution);
    // convert the p tag into spans
    if (markup) {
        markup[0].type = "span";
    }

    return html`<div>
        ${local.mode === ATTR_SHOW_MODE && html`
              <div>
                  <div id="quotation-attribute" onClick=${clickedAttribution}>
                      ${ markup }
                  </div>
                  ${local.showButtons && html`
                      <button onClick=${ clickedEdit }>Edit...</button>
                      <${DeleteConfirmation} onDelete=${ confirmedDeleteClicked }/>
                  `}
              </div>`}
        ${local.mode === ATTR_EDIT_MODE && html`
              <div>
                  <${CivilInput} id="attribution"
                                 value=${ local.attribution }
                                 autoComplete="off"
                                 onInput=${ handleChangeEvent } />
                  <br/>
                  <button onClick=${ clickedCancel }>Cancel</button>
                  <button onClick=${ clickedOK }>OK</button>
              </div>
          `}
    </div>`;
}

export { Quote, Quotes };
