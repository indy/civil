import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { indexToShortcut } from '/js/CivilUtils.js';

import Net from '/js/Net.js';

const MODE_SEARCH = 'mode-search';
const MODE_COMMAND = 'mode-command';

// actions to give to the dispatcher
const SWITCH_OFF_JUST_ROUTED = 'switch-off-just-routed';
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
    const newState = {
      ...state
    };

    if (state.mode === MODE_SEARCH) {
      newState.showKeyboardShortcuts = !state.showKeyboardShortcuts && (state.candidates.length > 0);
    }

    return newState;
  }
  case SHORTCUT_CHECK: {
    if (state.showKeyboardShortcuts && state.mode === MODE_SEARCH) {
      if (state.candidates.length > action.data) {
        const candidate = state.candidates[action.data];

        route(`/${candidate.resource}/${candidate.id}`);

        const newState = {
          ...state,
          showKeyboardShortcuts: false,
          justRoutedViaKeyboardShortcut: true,
          text: '',
          candidates: []
        };

        return newState;
      }
    }
    return state;
  }
  case CANDIDATES_SET: return {
    ...state,
    candidates: action.data.results ? action.data.results : []
  }
  case INPUT_GIVEN: {
    const text = state.justRoutedViaKeyboardShortcut ? state.text : action.data;
    const mode = isCommand(text) ? MODE_COMMAND : MODE_SEARCH;

    let candidates = state.candidates;
    if (mode === MODE_COMMAND && state.mode === MODE_SEARCH) {
      // just changed mode from search to command
      candidates = refineCommandCandidates(text);
    } else if (mode === MODE_SEARCH && state.mode === MODE_COMMAND) {
      // just changed mode from command to search
      candidates = [];
    }

    const newState = {
      ...state,
      mode,
      text,
      candidates
    };

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }
}

function isCommand(text) {
  return text.length >= 1 && text[0] === ':';
}

export default function SearchCommand() {
  const [state] = useStateValue();

  const [local, localDispatch] = useLocalReducer(reducer, {
    mode: MODE_SEARCH,
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

    if (local.mode === MODE_COMMAND) {
      localDispatch(INPUT_GIVEN, text);
    } else if (local.mode === MODE_SEARCH) {
      if (!local.showKeyboardShortcuts && !local.justRoutedViaKeyboardShortcut) {
        localDispatch(INPUT_GIVEN, text);
        if (text.length > 0 && !isCommand(text)) {
          search(text);
        }
      } else if (local.justRoutedViaKeyboardShortcut) {
        localDispatch(SWITCH_OFF_JUST_ROUTED);
      }
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
        <${Link} class="pigment-fg-${entry.resource}" href='/${entry.resource}/${entry.id}'>
          ${ canShowKeyboardShortcut && html`<span class='keyboard-shortcut'>${ indexToShortcut(i)}: </span>`}
          ${ entry.name }
        </${Link}>`;
  }

  function buildCommandEntry(entry, i) {
    if (entry.spacer) {
      return html`
        <div>-</div>`;
    } else {
      return html`
        <div>
          ${ entry.command } <span>${ entry.description }</span>
        </div>`;
    }
  }

  function buildCandidates() {
    let candidateRenderer = local.mode === MODE_SEARCH ? buildSearchResultEntry : buildCommandEntry;

    return html`
      <div id="top-menu-search-command-results">
        <ul>
          ${ local.candidates.map((entry, i) => html`<li key=${ i }>${ candidateRenderer(entry, i) }</li>`) }
        </ul>
      </div>
    `;
  }

  return html`<div id="top-menu-search-command">
                <input type="text" name="full search" value=${local.text} onInput=${handleChangeEvent}/>
                ${ !!local.candidates.length && buildCandidates() }
              </div>`;
}

function refineCommandCandidates(text) {
  return allCommands();
}


function allCommands() {
  return [
    {command: 'l', description: "lock (prevent edits)"},
    {command: 'u', description: "unlock (allow edits)"},
    {spacer: true},
    {command: 'gi', description: "goto ideas"},
    {command: 'gp', description: "goto people"},
    {command: 'gu', description: "goto publications"},
    {command: 'gt', description: "goto timelines"},
    {spacer: true},
    {command: 'ai', description: "add idea <<title>>"},
    {command: 'ap', description: "add person <<name>>"},
    {command: 'au', description: "add publication <<title>>"},
    {command: 'at', description: "add timeline <<title>>"}
  ];
}
