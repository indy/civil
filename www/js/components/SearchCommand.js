import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { createDeck, indexToShortcut } from '/js/CivilUtils.js';

import Net from '/js/Net.js';

const MODE_SEARCH = 'mode-search';
const MODE_COMMAND = 'mode-command';

// actions to give to the dispatcher
const CANDIDATES_SET = 'candidate-set';
const INPUT_FOCUS = 'input-focus';
const INPUT_BLUR = 'input-blur';
const INPUT_GIVEN = 'input-given';
const KEY_DOWN_CTRL = 'key-down-ctrl';
const KEY_DOWN_ENTER = 'key-down-enter';
const KEY_DOWN_ESC = 'key-down-esc';
const SHORTCUT_CHECK = 'shortcut-check';
const SWITCH_OFF_JUST_ROUTED = 'switch-off-just-routed';

function debugState(state) {
  console.log(`mode: ${state.mode}, text: "${state.text}"`);
}

function cleanState(state) {
  return {
    ...state,
    showKeyboardShortcuts: false,
    text: '',
    candidates: []
  }
}

function reducer(state, action) {
  switch(action.type) {
  case INPUT_FOCUS: {
    return {
      ...state,
      hasFocus: true
    };
  }
  case INPUT_BLUR: {
    return {
      ...state,
      hasFocus: false
    };
  }
  case SWITCH_OFF_JUST_ROUTED: return {
    ...state,
    justRoutedViaKeyboardShortcut: false
  };
  case KEY_DOWN_ENTER: {
    if (!state.hasFocus) {
      return state;
    }

    if (state.mode === MODE_COMMAND) {
      const appDispatch = action.data;
      const success = executeCommand(state.text, appDispatch);
      if (success) {
        return cleanState(state);
      }
    }

    return state;
  }
  case KEY_DOWN_ESC: {
    if (!state.hasFocus) {
      return state;
    }
    return cleanState(state);
  };
  case KEY_DOWN_CTRL: {
    if (!state.hasFocus) {
      return state;
    }

    const newState = {
      ...state
    };

    if (state.mode === MODE_SEARCH) {
      newState.showKeyboardShortcuts = !state.showKeyboardShortcuts && (state.candidates.length > 0);
    }

    return newState;
  }
  case SHORTCUT_CHECK: {
    if (!state.hasFocus) {
      return state;
    }

    if (state.showKeyboardShortcuts && state.mode === MODE_SEARCH) {
      if (state.candidates.length > action.data) {
        const candidate = state.candidates[action.data];

        route(`/${candidate.resource}/${candidate.id}`);

        const newState = cleanState(state);
        newState.justRoutedViaKeyboardShortcut = true;

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

    if (!state.hasFocus) {
      return state;
    }

    const text = state.justRoutedViaKeyboardShortcut ? state.text : action.data;
    const mode = isCommand(text) ? MODE_COMMAND : MODE_SEARCH;

    let candidates = state.candidates;
    if (mode === MODE_COMMAND) {
      candidates = refineCommandCandidates(text);
    }
    if (mode === MODE_SEARCH && state.mode === MODE_COMMAND) {
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
  const [state, dispatch] = useStateValue();

  const [local, localDispatch] = useLocalReducer(reducer, {
    mode: MODE_SEARCH,
    hasFocus: false,
    showKeyboardShortcuts: false,
    justRoutedViaKeyboardShortcut: false,
    text: '',
    candidates: []
  });

  function onKeyDown(e) {
    if (e.key === "Escape") {
      localDispatch(KEY_DOWN_ESC);
    }
    if (e.key === "Enter") {
      localDispatch(KEY_DOWN_ENTER, dispatch);
    }
    if (e.ctrlKey) {
      localDispatch(KEY_DOWN_CTRL, e);
    }
    if ((e.keyCode >= 49 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90)) {
      // digit: 1 -> 0, 2 -> 1, ... 9 -> 8       letter: a -> 9, b -> 10, ... z -> 34
      const index = (e.keyCode >= 49 && e.keyCode <= 57) ? e.keyCode - 49 : (e.keyCode - 65) + 9;

      localDispatch(SHORTCUT_CHECK, index);
    }
  };

  function onFocus() {
    localDispatch(INPUT_FOCUS);
  }

  function onBlur() {
    localDispatch(INPUT_BLUR);
  }

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
        <div class="command-entry">-</div>`;
    } else {
      return html`
        <div class="command-entry">
          <span class="command-entry-name">${ entry.command }</span> <span class="command-entry-desc">${ entry.description }</span>
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
                <input type="text"
                       name="full search"
                       value=${local.text}
                       onInput=${handleChangeEvent}
                       onFocus=${onFocus}
                       onBlur=${onBlur}/>
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

function executeCommand(text, appDispatch) {
  const commandPlusArgs = text.slice(1).split(" ").filter(s => s.length > 0);
  if (commandPlusArgs.length === 0) {
    return;
  }

  const command = commandPlusArgs[0];
  const rest = commandPlusArgs.slice(1).join(" ");

  switch(command) {
  case "l":
    appDispatch({type: 'lock'});
    return true;
  case "u":
    appDispatch({type: 'unlock'});
    return true;
  case "gi":
    route(`/ideas`);
    return true;
  case "gp":
    route(`/people`);
    return true;
  case "gu":
    route(`/publications`);
    return true;
  case "gt":
    route(`/timelines`);
    return true;
  case "ai":
    createDeck(appDispatch, "ideas", rest);
    return true;
  case "ap":
    createDeck(appDispatch, "people", rest);
    return true;
  case "au":
    createDeck(appDispatch, "publications", rest);
    return true;
  case "at":
    createDeck(appDispatch, "timelines", rest);
    return true;
  }

  return false;
}
