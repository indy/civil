import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { setDeckListing, invalidateGraph } from '/js/CivilUtils.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { indexToShortcut } from '/js/CivilUtils.js';

const SHORTCUT_CHECK = 'shortcut-check';
const ESC_KEY_DOWN = 'esc-key-down';
const CTRL_KEY_DOWN = 'ctrl-key-down';
const INPUT_GIVEN = 'input-given';
const SEARCH_RESULTS = 'search-results';

function reducer(state, action) {
  switch (action.type) {
  case ESC_KEY_DOWN: return {
    ...state,
    showKeyboardShortcuts: false,
    candidates: []
  };
  case CTRL_KEY_DOWN: {
    const e = action.data;

    const newState = { ...state };

    if (!state.showKeyboardShortcuts && state.candidates.length) {
      newState.showKeyboardShortcuts = true;
    } else {
      newState.showKeyboardShortcuts = false;
    }

    return newState;
  }
  case SHORTCUT_CHECK: {
    if (state.showKeyboardShortcuts) {
      const index = action.data;

      const newState = {
        ...state,
      };

      if (newState.candidates.length > index) {
        const id = newState.candidates[index].id;
        route(`/${newState.resource}/${id}`);
      }

      return newState;
    } else {
      return state;
    }
  }
  case SEARCH_RESULTS: {
    const { searchTerm, searchResults } = action.data;

    const newState = {
      ...state,
      searchTerm: searchTerm
    };

    newState.candidates = searchResults;

    return newState;
  }
  case INPUT_GIVEN: {
    const newState = {
      ...state,
      searchTerm: action.data
    };

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }
}

export default function QuickFindOrCreate({ resource }) {
  const [state, dispatch] = useStateValue();

  const [local, localDispatch] = useLocalReducer(reducer, {
    searchTerm: '',
    showKeyboardShortcuts: false,
    candidates: [],
    resource
  });

  const onKeyDown = e => {
    if (e.key === "Escape") {
      localDispatch(ESC_KEY_DOWN);
    }
    if (e.ctrlKey) {
      localDispatch(CTRL_KEY_DOWN, e);
    }

    if ((e.keyCode >= 49 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90)) {
      // digit: 1 -> 0, 2 -> 1, ... 9 -> 8       letter: a -> 9, b -> 10, ... z -> 34
      const index = (e.keyCode >= 49 && e.keyCode <= 57) ? e.keyCode - 49 : (e.keyCode - 65) + 9;
      localDispatch(SHORTCUT_CHECK, index);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
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
        invalidateGraph(dispatch);
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

    if (!state.readOnly) {
      createDeck(local.searchTerm.trim());
    }
  }

  function handleChangeEvent(e) {
    search(e.target.value);
    localDispatch(INPUT_GIVEN, e.target.value);
  }

  async function search(text) {
    const url = `/api/${resource}/search?q=${encodeURI(text)}`;
    const searchResponse = await Net.get(url);

    if (searchResponse.results) {
      localDispatch(SEARCH_RESULTS, {
        searchTerm: text,
        searchResults: searchResponse.results
      });
    }
  }

  let cl = local.candidates.map((c, i) => {
    return html`<${CandidateItem} candidate=${c}
                                  resource=${resource}
                                  keyIndex=${ i }
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
             onInput=${ handleChangeEvent }
      />
      <div class='quickfind-candidates'>${ cl }</div>
    </form>
`;
}

function CandidateItem({ candidate, keyIndex, resource, showKeyboardShortcuts }) {
  const { id, name } = candidate;
  const href = `/${resource}/${id}`;

  const maxShortcuts = 9 + 26;  // 1..9 and a..z

  if (showKeyboardShortcuts && keyIndex < maxShortcuts) {
    return html`<div class="quickfind-candidate pigment-${resource}">
                  <${Link} href=${ href }><span class="keyboard-shortcut">${indexToShortcut(keyIndex)}:</span> ${ name }</${Link}>
                </div>`;
  } else {
    return html`<div class="quickfind-candidate pigment-${resource}">
                  <${Link} href=${ href }>${ name }</${Link}>
                </div>`;
  }
}
