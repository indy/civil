import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { setDeckListing, addAutocompleteDeck } from '/js/CivilUtils.js';
import { useLocalReducer } from '/js/PreactUtils.js';

const ESC_KEY_DOWN = 'esc-key-down';
const CTRL_KEY_DOWN = 'ctrl-key-down';
const CTRL_KEY_UP = 'ctrl-key-up';
const INPUT_GIVEN = 'input-given';

function reducer(state, action) {
  switch (action.type) {
  case ESC_KEY_DOWN: return {
    ...state,
    candidates: []
  };
  case CTRL_KEY_DOWN: {
    const e = action.data;

    const newState = {
      ...state,
      showKeyboardShortcuts: true
    };

    if (e.keyCode >= 49 && e.keyCode <= 57) {
      // Ctrl + digit
      const digit = e.keyCode - 48;

      const index = digit - 1;
      const id = newState.candidates[index].id;
      route(`/${newState.resource}/${id}`);
    }

    return newState;
  }
  case CTRL_KEY_UP: return {
    ...state,
    showKeyboardShortcuts: false
  };
  case INPUT_GIVEN: {
    const newState = {
      ...state,
      searchTerm: action.data
    };

    if (newState.searchTerm.length >= state.minSearchLength) {
      const lowerText = newState.searchTerm.toLowerCase();
      newState.candidates = state.autocompletes
            .filter(op => {
              return op.resource === state.resource
                && op.name.toLowerCase().includes(lowerText);
            })
            .sort((a, b) => { return a.name.length - b.name.length; });
    } else {
      newState.candidates = [];
    }

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }
}

export default function QuickFindOrCreate({ autocompletes, resource, minSearchLength }) {
  const [state, dispatch] = useStateValue();

  const [local, localDispatch] = useLocalReducer(reducer, {
    searchTerm: '',
    showKeyboardShortcuts: false,
    candidates: [],
    minSearchLength: minSearchLength || 3,
    autocompletes,
    resource
  });

  const onKeyDown = e => {
    if (e.key === "Escape") {
      localDispatch(ESC_KEY_DOWN);
    }
    if (e.ctrlKey) {
      localDispatch(CTRL_KEY_DOWN, e);
      if (e.key === "Enter") {
        // Ctrl+Enter == save
        // onCommitAddDecks();
      }
    }
  };

  const onKeyUp = e => {
    if (e.key === "Control") {
      localDispatch(CTRL_KEY_UP);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function createDeck(title) {
    // creates a new deck
    const data = {
      title: title
    };

    Net.post(`/api/${resource}`, data).then(deck => {
      Net.get(`/api/${resource}/listings`).then(listing => {
        setDeckListing(dispatch, resource, listing);
        addAutocompleteDeck(dispatch, deck.id, deck.title || deck.name, resource);
      });
      route(`/${resource}/${deck.id}`);
    });
  }

  function onSubmit(event){
    event.preventDefault();

    // if the user has typed in the name of an existing resource, redirect to that page
    for (let candidate of local.candidates) {
      const { id, name } = candidate;
      if (name.toLowerCase().trim() === local.searchTerm.toLowerCase().trim()) {
        route(`/${resource}/${id}`);
        return;
      }
    }

    createDeck(local.searchTerm.trim());
  }

  let cl = local.candidates.map((c, i) => {
    return html`<${CandidateItem} candidate=${c}
                                  resource=${resource}
                                  keyIndex=${ 1 + i }
                                  showKeyboardShortcuts=${ local.showKeyboardShortcuts }
                />`;
  });

  return html`
    <form class="quickfind-form" onSubmit=${ onSubmit }>
      <input id="quickfind"
             type="text"
             name="quickfind"
             autoComplete='off'
             value=${ local.searchTerm }
             onInput=${ (event) => localDispatch(INPUT_GIVEN, event.target.value) }
      />
      <div class='quickfind-candidates'>${ cl }</div>
    </form>
`;
}

function CandidateItem({ candidate, keyIndex, resource, showKeyboardShortcuts }) {
  const { id, name } = candidate;
  const href = `/${resource}/${id}`;

  if (showKeyboardShortcuts && keyIndex < 10) {
    return html`<div class="quickfind-candidate pigment-${resource}">
                  <${Link} href=${ href }><span class="quickfind-shortcut">${keyIndex}:</span> ${ name }</${Link}>
                </div>`;
  } else {
    return html`<div class="quickfind-candidate pigment-${resource}">
                  <${Link} href=${ href }>${ name }</${Link}>
                </div>`;
  }
}
