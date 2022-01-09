import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { indexToShortcut } from '/js/CivilUtils.js';

import Net from '/js/Net.js';

const SWITCH_OFF_JUST_ROUTED = 'ssssss';
const CANDIDATES_SET = 'candidate-set';
const CTRL_KEY_DOWN = 'ctrl-key-down';
const ESC_KEY_DOWN = 'esc-key-down';
const INPUT_GIVEN = 'input-given';
const SHORTCUT_CHECK = 'shortcut-check';

function reducer(state, action) {
  switch(action.type) {
  case SWITCH_OFF_JUST_ROUTED: return {
    ...state,
    justRoutedViaKeyboardShortcut: false
  };
  case ESC_KEY_DOWN: return {
    ...state,
    showKeyboardShortcuts: false,
    text: '',
    candidates: []
  };
  case CTRL_KEY_DOWN: {
    const newState = { ...state };

    if (!state.showKeyboardShortcuts && state.candidates.length) {
      newState.showKeyboardShortcuts = true;
    } else {
      newState.showKeyboardShortcuts = false;
    }

    return newState;
  }
  case SHORTCUT_CHECK: {
    if (state.showKeyboardShortcuts && state.candidates.length > action.data) {
      const candidate = state.candidates[action.data];
      route(`/${candidate.resource}/${candidate.id}`, true);

      const newState = {
        ...state,
        showKeyboardShortcuts: false,
        justRoutedViaKeyboardShortcut: true,
        text: '',
        candidates: []
      };

      return newState;
    } else {
      return state;
    }
  }
  case CANDIDATES_SET: return {
    ...state,
    candidates: action.data.results ? action.data.results : []
  }
  case INPUT_GIVEN: {
    const newState = {
      ...state,
      text: state.justRoutedViaKeyboardShortcut ? state.text : action.data
    };

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }
}

export default function FullSearch() {
  const [state] = useStateValue();

  const [local, localDispatch] = useLocalReducer(reducer, {
    showKeyboardShortcuts: false,
    justRoutedViaKeyboardShortcut: false,
    text: '',
    candidates: []
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
  }, [])


  const handleChangeEvent = (event) => {
    const text = event.target.value;
    if (!local.showKeyboardShortcuts && !local.justRoutedViaKeyboardShortcut) {
      localDispatch(INPUT_GIVEN, text);
      search(text);
    } else if (local.justRoutedViaKeyboardShortcut) {
      localDispatch(SWITCH_OFF_JUST_ROUTED);
    }
  };

  async function search(text) {
    const url = `/api/cmd/search?q=${encodeURI(text)}`;
    const searchResponse = await Net.get(url);

    localDispatch(CANDIDATES_SET, searchResponse);
  }

  function buildSearchResultEntry(entry, i) {

    const maxShortcuts = 9 + 26;  // 1..9 and a..z
    const canShowKeyboardShortcut = local.showKeyboardShortcuts && i < maxShortcuts;

    return html`
      <li key=${ i }>
        <${Link} class="pigment-fg-${entry.resource}" href='/${entry.resource}/${entry.id}'>
          ${ canShowKeyboardShortcut && html`<span class='keyboard-shortcut'>${ indexToShortcut(i)}: </span>`}
          ${ entry.name }
        </${Link}>
      </li>
`;
  }

  function buildSearchResults() {
    return html`
      <div id="top-menu-search-results">
        <ul>
          ${ local.candidates.map(buildSearchResultEntry) }
        </ul>
      </div>
    `;
  }

  return html`<div id="top-menu-search">
                <input type="text" name="full search" value=${local.text} onInput=${handleChangeEvent}/>
                ${ !!local.candidates.length && buildSearchResults() }
              </div>`;
}
