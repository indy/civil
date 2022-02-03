import { html, route, Link, useState, useEffect, useRef } from '/lib/preact/mod.js';

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
const KEY_DOWN_COLON = 'key-down-colon';
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
        let newState = cleanState(state);
        return newState;
      }
    }

    return state;
  }
  case KEY_DOWN_ESC: {
    const inputElement = action.data.current;
    if (state.hasFocus) {
      const newState = cleanState(state);
      if (inputElement) {
        inputElement.blur();
        newState.hasFocus = false;
      }
      return newState;
    } else {
      if (inputElement) {
        inputElement.focus();
        state.hasFocus = true;
      }
      return state;
    }
  };
  case KEY_DOWN_COLON: {
    const inputElement = action.data.current;
    if (!state.hasFocus) {
      if (inputElement) {
        inputElement.focus();
        state.hasFocus = true;
      }
      return state;
    }
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
      candidates = allCommands();
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
  const searchCommandRef = useRef(null);

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
      localDispatch(KEY_DOWN_ESC, searchCommandRef);
    }
    if (e.key === ":") {
      localDispatch(KEY_DOWN_COLON, searchCommandRef);
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
      <div id="search-command-results">
        <ul>
          ${ local.candidates.map((entry, i) => html`<li key=${ i }>${ candidateRenderer(entry, i) }</li>`) }
        </ul>
      </div>
    `;
  }

  const extraClasses = local.hasFocus ? "search-command-visible" : "search-command-invisible";

  if (state.showingSearchCommand !== local.hasFocus) {
    dispatch({type: 'showingSearchCommand', showingSearchCommand: local.hasFocus});
  }

  return html`<div id="search-command" class="${extraClasses}">
                <input id="search-command-input"
                       type="text"
                       ref=${ searchCommandRef }
                       name="full search"
                       value=${local.text}
                       onInput=${handleChangeEvent}
                       onFocus=${onFocus}
                       onBlur=${onBlur}/>
                ${ !!local.candidates.length && buildCandidates() }
              </div>`;
}

function allCommands() {
  return [
    {command: 'i', description: "goto ideas or add <<title>>"},
    {command: 'p', description: "goto people or add <<name>>"},
    {command: 'a', description: "goto articles or add <<title>>"},
    {command: 't', description: "goto timelines or add <<title>>"},
    {command: 'q', description: "goto quotes"},
    {spacer: true},
    {command: 'n', description: "show add-note form"},
    {command: 'p', description: "show point form"},
    {spacer: true},
    {command: 'r', description: "goto random quote"},
    {command: 's', description: "goto spaced repetition"},
    {command: 'l', description: "lock (prevent edits)"},
    {command: 'u', description: "unlock (allow edits)"},
    {command: 'c', description: "clean ui"},
    {command: 'b', description: "basic ui"},
    {command: 'g', description: "show connectivity graph"},
    {command: 'h', description: "hide connectivity graph"}
  ];
}

function executeCommand(text, appDispatch) {
  const commandPlusArgs = text.slice(1).split(" ").filter(s => s.length > 0);
  if (commandPlusArgs.length === 0) {
    return;
  }

  const command = commandPlusArgs[0];
  const rest = commandPlusArgs.slice(1).join(" ");

  function routeOrCreate(kind, argString) {
    if (argString.length === 0) {
      route(`/${kind}`);
    } else {
      createDeck(appDispatch, kind, argString);
    }

    return true;
  }

  function dispatchMessage(command) {
    appDispatch({type: command});
    return true;
  }

  switch(command) {
  case "i": return routeOrCreate('ideas', rest);
  case "p": return routeOrCreate('people', rest);
  case "a": return routeOrCreate('articles', rest);
  case "t": return routeOrCreate('timelines', rest);
  case "q": return routeOrCreate('quotes', []);
  case "n": return dispatchMessage('showNoteForm');
  case "p": return dispatchMessage('showAddPointForm');
  case "l": return dispatchMessage('lock');
  case "u": return dispatchMessage('unlock');
  case "r": {
    Net.get("/api/quotes/random").then(quote => {
      route(`/quotes/${quote.id}`);
    });
    return true;
  }
  case "s": route('/sr'); return true;
  case "c": return dispatchMessage('cleanUI');
  case "b": return dispatchMessage('basicUI');
  case "g": return dispatchMessage('connectivityGraphShow');
  case "h": return dispatchMessage('connectivityGraphHide');
  }

  return false;
}
