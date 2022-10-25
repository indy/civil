import { html, route, Link, useEffect, useRef } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { getAppState, AppStateChange } from '/js/AppState.js';
import { createDeck, indexToShortcut } from '/js/CivilUtils.js';
import { svgX, svgChevronDown, svgChevronUp } from '/js/svgIcons.js';
import { useLocalReducer } from '/js/PreactUtils.js';

import { NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

const MODE_SEARCH = 'mode-search';
const MODE_COMMAND = 'mode-command';

// actions to give to the dispatcher
const CANDIDATES_SET = 'candidate-set';
const CLICKED_CANDIDATE = 'clicked-candidate';
const CLICKED_COMMAND = 'clicked-command';
const INPUT_BLUR = 'input-blur';
const INPUT_FOCUS = 'input-focus';
const INPUT_GIVEN = 'input-given';
const KEY_DOWN_COLON = 'key-down-colon';
const KEY_DOWN_CTRL = 'key-down-ctrl';
const KEY_DOWN_ENTER = 'key-down-enter';
const KEY_DOWN_ESC = 'key-down-esc';
const KEY_DOWN_KEY = 'key-down-key';
const KEY_DOWN_PLUS = 'key-down-plus';
const REMOVE_SAVED_SEARCH_RESULT = 'remove-saved-search-result';

// array because ordering is important when printing the commands
//
const Commands = [
    {
        command: "i",
        description: "goto ideas or add ",
        quoteAround: "title",
        fn: args => {
            return routeOrCreate('ideas', args);
        }
    },
    {
        command: 'p',
        description: "goto people or add ",
        quoteAround: "name",
        fn: args => {
            return routeOrCreate('people', args);
        }
    },
    {
        command: 'a',
        description: "goto articles or add ",
        quoteAround: "title",
        fn: args => {
            return routeOrCreate('articles', args);
        }
    },
    {
        command: 't',
        description: "goto timelines or add ",
        quoteAround: "title",
        fn: args => {
            return routeOrCreate('timelines', args);
        }

    },
    {
        command: 'q',
        description: "goto quotes",
        fn: () => {
            return routeOrCreate('quotes', []);
        }
    },
    {
        command: 'r',
        description: "goto random quote",
        fn: () => {
            Net.get("/api/quotes/random").then(quote => {
                route(`/quotes/${quote.id}`);
            });
            return true;
        }
    },
    {
        command: 's',
        description: "goto spaced repetition",
        fn: () => {
            route('/sr');
            return true;
        }
    },
    {
        spacer: true
    },
    {
        command: 'n',
        description: "show add-note form",
        fn: () => {
            AppStateChange.showNoteForm(NOTE_KIND_NOTE);
            return true;
        }
    },
    {
        command: 'nr',
        description: "show add-note form for review section",
        fn: () => {
            AppStateChange.showNoteForm(NOTE_KIND_REVIEW);
            return true;
        }
    },
    {
        command: 'ns',
        description: "show add-note form for summary section",
        fn: () => {
            AppStateChange.showNoteForm(NOTE_KIND_SUMMARY);
            return true;
        }
    },
    {
        command: 'fp',
        description: "show point form",
        fn: () => {
            AppStateChange.showAddPointForm();
            return true;
        }
    },
    {
        spacer: true
    },
    {
        command: 'b',
        description: "bookmark current page to scratchlist",
        fn: () => {
            AppStateChange.bookmarkUrl();
            return true;
        }
    },
    {
        command: 'uic',
        description: "clean ui",
        fn: () => {
            AppStateChange.cleanUI();
            return true;
        }
    },
    {
        command: 'uib',
        description: "basic ui",
        fn: () => {
            AppStateChange.basicUI();
            return true;
        }
    },
    {
        command: 'g',
        description: "show connectivity graph",
        fn: () => {
            AppStateChange.connectivityGraphShow()
            return true;
        }
    },
    {
        command: 'h',
        description: "hide connectivity graph",
        fn: () => {
            AppStateChange.connectivityGraphHide()
            return true;
        }
    }
];


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
        isVisible: !state.hasPhysicalKeyboard
    }
}

function reducer(state, action) {
    switch(action.type) {
    case CLICKED_COMMAND: {
        const command = action.data.entry.command;
        const success = executeCommand(command);
        if (success) {
            let newState = cleanState(state);
            return newState;
        } else {
            console.error(`Failed to execute command: ${command}`);
            return state;
        }
    }
    case CLICKED_CANDIDATE: {
        const newState = cleanState(state);
        return newState;
    }
    case INPUT_BLUR: {
        const newState = {
            ...state,
            hasFocus: false
        };
        if (newState.candidates.length === 0) {
            newState.isVisible = !state.hasPhysicalKeyboard
        }
        return newState;
    }
    case INPUT_FOCUS: {
        const newState = {
            ...state,
            hasFocus: true
        };
        return newState;
    }
    case KEY_DOWN_ENTER: {
        if (!state.isVisible) {
            return state;
        }

        if (state.mode === MODE_COMMAND) {
            const success = executeCommand(state.text);
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
        if (state.hasPhysicalKeyboard) {
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

        let appState = action.data.appState;
        if (appState.componentRequiresFullKeyboardAccess.value) {
            return newState;
        }

        let searchCommandRef = action.data.searchCommandRef;
        const inputElement = searchCommandRef.current;

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
            AppStateChange.scratchListAddMulti(newState.candidates);

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

        const text = action.data.text;
        const mode = isCommand(text) ? MODE_COMMAND : MODE_SEARCH;

        let candidates = state.candidates;
        if (mode === MODE_COMMAND) {
            candidates = Commands;
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

                    AppStateChange.scratchListAddMulti([candidate]);

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
        const index = action.data.index;
        const newState = {...state};

        AppStateChange.scratchListRemove(index);

        return newState;
    }
    default: throw new Error(`unknown action: ${action}`);
    }
}

function isCommand(text) {
    return text.length >= 1 && text[0] === ':';
}

export default function SearchCommand() {
    const appState = getAppState();
    const searchCommandRef = useRef(null);

    const [local, localDispatch] = useLocalReducer(reducer, {
        mode: MODE_SEARCH,
        hasPhysicalKeyboard: appState.hasPhysicalKeyboard,
        isVisible: !appState.hasPhysicalKeyboard,
        hasFocus: false,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: '',
        candidates: []
    });

    function onKeyDown(e) {
        if (e.key === "Escape") {
            localDispatch(KEY_DOWN_ESC, searchCommandRef);
        }
        if (e.key === ":") {
            localDispatch(KEY_DOWN_COLON, { searchCommandRef, appState });
        }
        if (e.key === "Enter") {
            localDispatch(KEY_DOWN_ENTER);
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
    }, [appState])

    const handleChangeEvent = (event) => {
        const text = event.target.value;

        if (local.mode === MODE_COMMAND) {
            localDispatch(INPUT_GIVEN, { text });
        } else if (local.mode === MODE_SEARCH) {
            if (!local.showKeyboardShortcuts) {
                localDispatch(INPUT_GIVEN, { text });
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

                localDispatch(INPUT_GIVEN, { text: displayText });
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
        </${Link}>`;
    }

    function buildCommandEntry(entry, i) {
        function clickedCommand(e) {
            localDispatch(CLICKED_COMMAND, { entry });
        }
        if (entry.spacer) {
            return html`<div class="command-entry">-</div>`;
        } else {
            return html`
            <div class="command-entry" onClick=${clickedCommand}>
                <span class="command-entry-name">:${ entry.command }</span>
                <span class="command-entry-desc">${ entry.description }
                ${ entry.quoteAround && html`<span class="command-entry-quote-around">${entry.quoteAround}</span>`}</span>
            </div>`;
        }
    }

    function buildCandidates() {
        let classes = local.hasPhysicalKeyboard && local.showKeyboardShortcuts ? "search-command-important " : "";
        classes += "search-command-listing";

        let candidateRenderer = local.mode === MODE_SEARCH ? buildSearchResultEntry : buildCommandEntry;

        return html`
        <ul class="${classes}" id="search-candidates">
            ${ local.candidates.map((entry, i) => html`<li key=${ i }>${ candidateRenderer(entry, i) }</li>`) }
        </ul>
        `;
    }

    function buildScratchList() {
        function buildScratchListEntry(entry, i) {
            function clickedCandidate(e) {
                localDispatch(CLICKED_CANDIDATE);
            }

            function clickedDelete(e) {
                localDispatch(REMOVE_SAVED_SEARCH_RESULT, { index: i });
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
            AppStateChange.scratchListToggle();
        }

        const scratchList = appState.scratchList.value.map((entry, i) =>
            html`<li key=${ i }>${ buildScratchListEntry(entry, i) }</li>`);

        return html`
        <div id="saved-search-component">
            ${ !appState.scratchListMinimised.value && html`
                <ul class="search-command-listing" id="saved-search-results">
                    ${ scratchList }
                </ul>`}
             ${ appState.scratchListMinimised.value ? html`
                <div class="saved-search-menu">
                    <div onClick=${clickedToggle}>
                        ${ svgChevronUp() }
                    </div>
                    <span class="saved-search-menu-tip">Maximise ScratchList</spand>
                </div>
            ` : html`
                <div class="saved-search-menu">
                    <div onClick=${clickedToggle}>
                        ${ svgChevronDown() }
                    </div>
                    <span class="saved-search-menu-tip">Minimise ScratchList</spand>
                </div>
            `}
        </div>`;
    }

    const extraClasses = local.isVisible ? "search-command-visible" : "search-command-invisible";

    let inputClasses = "search-command-input";
    if (local.hasPhysicalKeyboard) {
        inputClasses += local.showKeyboardShortcuts ? " search-command-unimportant" : " search-command-important";
    } else {
        if (local.hasFocus) {
            inputClasses += " on-touch-device-search-command-has-focus";
        } else {
            inputClasses += " on-touch-device-search-command-lost-focus";
        }
    }

    if (appState.showingSearchCommand.value !== local.isVisible) {
        appState.showingSearchCommand.value = local.isVisible;
    }

    // note: for debugging purposes:
    //
    // function kbInactive() {
    //     return html`<div>keyboard inactive</div>`;
    // }
    //
    // put this inside the search-command div
    // <div class="keyboard-access-indicator">
    //   ${ appState.componentRequiresFullKeyboardAccess.value && html`<div>component has kb</div>` }
    //   ${ !appState.componentRequiresFullKeyboardAccess.value && html`<div>search command has kb</div>` }
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
        ${ !!appState.scratchList.value.length && buildScratchList() }
      </div>`;
}

function routeOrCreate(kind, argString) {
    if (argString.length === 0) {
        route(`/${kind}`);
    } else {
        createDeck(kind, argString);
    }

    return true;
}

function executeCommand(text) {
    const commandPlusArgs = text.slice(1).split(" ").filter(s => s.length > 0);
    if (commandPlusArgs.length === 0) {
        return;
    }

    const command = commandPlusArgs[0];

    const action = Commands.find(c => c.command === command);
    if (action) {
        const rest = commandPlusArgs.slice(1).join(" ");
        return action.fn(rest);
    }
    return false;
}
