import { html, route, Link, useState, useEffect, useRef } from '/lib/preact/mod.js';

import { svgX, svgChevronDown, svgChevronUp } from '/js/svgIcons.js';
import { useStateValue } from '/js/StateProvider.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { createDeck, indexToShortcut } from '/js/CivilUtils.js';

import Net from '/js/Net.js';

const MODE_SEARCH = 'mode-search';
const MODE_COMMAND = 'mode-command';

// actions to give to the dispatcher
const CANDIDATES_SET = 'candidate-set';
const CLICKED_CANDIDATE = 'clicked-candidate';
const INPUT_BLUR = 'input-blur';
const INPUT_GIVEN = 'input-given';
const KEY_DOWN_CTRL = 'key-down-ctrl';
const KEY_DOWN_ENTER = 'key-down-enter';
const KEY_DOWN_ESC = 'key-down-esc';
const KEY_DOWN_COLON = 'key-down-colon';
const KEY_DOWN_KEY = 'key-down-key';
const KEY_DOWN_PLUS = 'key-down-plus';
const REMOVE_SAVED_SEARCH_RESULT = 'remove-saved-search-result';
const TOGGLE_SAVED_SEARCH_RESULT_LIST = 'toggle-saved-search-result-list';

function debugState(state) {
    console.log(`mode: ${state.mode}, text: "${state.text}"`);
}

function cleanState(state) {
    return {
        ...state,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: '',
        candidates: [],
        isVisible: state.searchAlwaysVisible
    }
}

function reducer(state, action) {
    const [appState] = useStateValue();

    switch(action.type) {
    case CLICKED_CANDIDATE: {
        const newState = cleanState(state);
        return newState;
    }
    case INPUT_BLUR: {
        const newState = {...state};
        if (newState.candidates.length === 0) {
            newState.isVisible = state.searchAlwaysVisible;
        }
        return newState;
    }
    case KEY_DOWN_ENTER: {
        if (!state.isVisible) {
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
        const newState = cleanState(state);
        if (!state.searchAlwaysVisible) {
            if (state.isVisible) {
                if (inputElement) {
                    inputElement.blur();
                }
            } else {
                if (inputElement) {
                    inputElement.focus();
                    newState.isVisible = true;
                }
            }
        }
        return newState;
    };
    case KEY_DOWN_COLON: {
        const newState = { ...state };

        if (appState.componentRequiresFullKeyboardAccess) {
            return newState;
        }

        const inputElement = action.data.current;

        if (!newState.isVisible) {
            if (inputElement) {
                inputElement.focus();
                newState.isVisible = true;
            }
        }
        return newState;
    };
    case KEY_DOWN_CTRL: {
        if (!state.isVisible) {
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
    case KEY_DOWN_KEY: {
        if (!state.isVisible) {
            return state;
        }

        const newState = {...state};

        if (state.showKeyboardShortcuts && state.mode === MODE_SEARCH) {
            newState.keyDownIndex = action.data.index;
            newState.shiftKey = action.data.shiftKey;
        }

        return newState;
    }
    case KEY_DOWN_PLUS: {
        if (!state.isVisible) {
            return state;
        }

        const newState = { ...state };
        if (state.showKeyboardShortcuts && state.mode === MODE_SEARCH) {
            newState.candidates.forEach(c => {
                newState.savedSearchResults.push(c);
            });

            newState.shiftKey = true;
            newState.keyDownIndex = -1;

            return newState;
        } else {
            return newState;
        }
    }
    case CANDIDATES_SET: return {
        ...state,
        candidates: action.data.results ? action.data.results : []
    }
    case INPUT_GIVEN: {
        if (!state.isVisible) {
            return state;
        }

        const text = action.data;
        const mode = isCommand(text) ? MODE_COMMAND : MODE_SEARCH;

        let candidates = state.candidates;
        if (mode === MODE_COMMAND) {
            candidates = allCommands();
        }
        if (mode === MODE_SEARCH && state.mode === MODE_COMMAND) {
            // just changed mode from command to search
            candidates = [];
        }

        if (state.showKeyboardShortcuts && state.mode === MODE_SEARCH) {
            const index = state.keyDownIndex;

            if (index >= 0 && state.candidates.length > index) {
                const candidate = state.candidates[index];

                if (state.shiftKey) {
                    // once a candidate has been added to the saved search
                    // results, set the keyDownIndex to an invalid value,
                    // otherwise if the user presses shift and an unused
                    // key (e.g. '+' ) then the last candidate to be added
                    // will be added again.
                    //
                    const newState = {
                        ...state,
                        keyDownIndex: -1
                    };

                    newState.savedSearchResults.push(candidate);

                    return newState;
                } else {
                    const url = `/${candidate.resource}/${candidate.id}`;
                    route(url);

                    const newState = cleanState(state);
                    return newState;
                }
            }
        }

        const newState = {
            ...state,
            mode,
            text,
            candidates
        };

        return newState;
    }
    case REMOVE_SAVED_SEARCH_RESULT: {
        const index = action.data;
        const newState = {...state};

        newState.savedSearchResults.splice(index, 1);

        return newState;
    }
    case TOGGLE_SAVED_SEARCH_RESULT_LIST: {
        const newState = {
            ...state,
            minimisedSavedSearchResults: !state.minimisedSavedSearchResults
        }
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
        searchAlwaysVisible: state.searchAlwaysVisible,
        isVisible: state.searchAlwaysVisible,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: '',
        candidates: [],
        savedSearchResults: [],
        minimisedSavedSearchResults: false
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
            localDispatch(KEY_DOWN_CTRL);
        }
        if ((e.keyCode >= 49 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90)) {
            // digit: 1 -> 0, 2 -> 1, ... 9 -> 8       letter: a -> 9, b -> 10, ... z -> 34
            const index = (e.keyCode >= 49 && e.keyCode <= 57) ? e.keyCode - 49 : (e.keyCode - 65) + 9;
            localDispatch(KEY_DOWN_KEY, { index: index, shiftKey: e.shiftKey });
        }
        if (e.key === "+") {
            localDispatch(KEY_DOWN_PLUS);
        }
    };

    function onFocus() {
        // localDispatch(INPUT_FOCUS);
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
            if (!local.showKeyboardShortcuts) {
                localDispatch(INPUT_GIVEN, text);
                if (text.length > 0 && !isCommand(text)) {
                    search(text);
                }
            }

            if (local.showKeyboardShortcuts) {
                // searchCommand is showing keyboard shortcuts and the user
                // has just pressed a key whilst holding down the shift button
                //
                // since the handleChangeEvent code runs after the latest
                // render we have to manually remove the final character
                //
                const displayText = local.shiftKey ? text.slice(0, -1) : text;

                localDispatch(INPUT_GIVEN, displayText);
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

        function clickedCandidate(e) {
            localDispatch(CLICKED_CANDIDATE);
        }

        return html`
            <${Link} onClick=${clickedCandidate}
                     class="pigment-fg-${entry.resource}"
                     href='/${entry.resource}/${entry.id}'>
              ${ canShowKeyboardShortcut && html`<span class='keyboard-shortcut'>${ indexToShortcut(i)}: </span>`}
              ${ entry.name }
            </${Link}>
        `;
    }

    function buildCommandEntry(entry, i) {
        if (entry.spacer) {
            return html`
                <div class="command-entry">-</div>
            `;
        } else {
            return html`
                <div class="command-entry">
                    <span class="command-entry-name">${ entry.command }</span>
                    <span> </span>
                    <span class="command-entry-desc">${ entry.description }</span>
                </div>
            `;
        }
    }

    function buildCandidates() {
        let classes = local.showKeyboardShortcuts ? "search-command-focused " : "";
        classes += "search-command-listing";

        let candidateRenderer = local.mode === MODE_SEARCH ? buildSearchResultEntry : buildCommandEntry;

        return html`
            <ul class="${classes}" id="search-candidates">
                ${ local.candidates.map((entry, i) => html`<li key=${ i }>${ candidateRenderer(entry, i) }</li>`) }
            </ul>
        `;
    }

    function buildSavedSearchResults() {
        function buildSavedSearchEntry(entry, i) {
            function clickedCandidate(e) {
                localDispatch(CLICKED_CANDIDATE);
            }

            function clickedDelete(e) {
                localDispatch(REMOVE_SAVED_SEARCH_RESULT, i);
            }

            return html`
                <div class="saved-search-result">
                    <div class="saved-search-result-remove" onClick=${clickedDelete}>${ svgX() }</div>
                    <${Link} onClick=${clickedCandidate}
                             class="pigment-fg-${entry.resource}"
                             href='/${entry.resource}/${entry.id}'>
                        ${ entry.name }
                    </${Link}>
                </div>
            `;
        }

        function clickedToggle(e) {
            localDispatch(TOGGLE_SAVED_SEARCH_RESULT_LIST);
        }

        const savedSearchResults = local.savedSearchResults.map((entry, i) =>
            html`<li key=${ i }>${ buildSavedSearchEntry(entry, i) }</li>`);

        return html`
            <div id="saved-search-component">
                ${ !local.minimisedSavedSearchResults && html`
                    <ul class="search-command-listing" id="saved-search-results">
                        ${ savedSearchResults }
                    </ul>
                `}

                ${ local.minimisedSavedSearchResults ? html`
                    <div class="saved-search-menu">
                        <div onClick=${clickedToggle}>
                            ${ svgChevronUp() }
                        </div>
                        <span class="saved-search-menu-tip">Maximise Saved Search Results</spand>
                    </div>
                ` : html`
                    <div class="saved-search-menu">
                        <div onClick=${clickedToggle}>
                            ${ svgChevronDown() }
                        </div>
                        <span class="saved-search-menu-tip">Minimise Saved Search Results</spand>
                    </div>
                `}
            </div>
        `;
    }

    const extraClasses = local.isVisible ? "search-command-visible" : "search-command-invisible";
    let inputClasses = "search-command-input ";
    inputClasses += local.showKeyboardShortcuts ? "search-command-unfocused" : "search-command-focused";


    if (state.showingSearchCommand !== local.isVisible) {
        dispatch({type: 'showingSearchCommand', showingSearchCommand: local.isVisible});
    }

    // note: for debugging purposes:
    //
    // function kbInactive() {
    //     return html`<div>keyboard inactive</div>`;
    // }
    //
    // put this inside the search-command div
    // <div class="keyboard-access-indicator">
    //   ${ state.componentRequiresFullKeyboardAccess && html`<div>component has kb</div>` }
    //   ${ !state.componentRequiresFullKeyboardAccess && html`<div>search command has kb</div>` }
    // </div>

    return html`
        <div id="search-command">
            <div class="${extraClasses}">
              <input id="search-command-input"
                     autocomplete="off"
                     type="text"
                     class="${inputClasses}"
                     ref=${ searchCommandRef }
                     name="full search"
                     value=${local.text}
                     onInput=${handleChangeEvent}
                     onFocus=${onFocus}
                     onBlur=${onBlur}/>
              ${ !!local.candidates.length && buildCandidates() }
            </div>
            ${ !!local.savedSearchResults.length && buildSavedSearchResults() }
          </div>
    `;
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
