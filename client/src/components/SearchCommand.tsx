import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { Link, route } from "preact-router";

import { DeckKind, DeckQuote, NoteKind, ToolbarMode } from "../types";

import Net from "../Net";
import { getAppState, AppStateChange } from "../AppState";
import {
    createDeck,
    deckKindToResourceString,
    indexToShortcut,
} from "../CivilUtils";
import { svgX, svgChevronDown, svgChevronUp } from "../svgIcons";
import { useLocalReducer } from "../PreactUtils";

import DeckLink from "./DeckLink";

enum Mode {
    Search,
    Command,
}

type Command = {
    command?: string;
    description?: string;
    quoteAround?: string;
    fn?: (args?: any) => any;
    spacer?: boolean;
};

enum ActionType {
    CandidatesSet,
    ClickedCandidate,
    ClickedCommand,
    InputBlur,
    InputFocus,
    InputGiven,
    KeyDownColon,
    KeyDownCtrl,
    KeyDownEnter,
    KeyDownEsc,
    KeyDownKey,
    KeyDownPlus,
    RemoveSavedSearchResult,
}

type Action = {
    type: ActionType;
    data?: any;
};

type State = {
    mode: Mode;
    hasPhysicalKeyboard: boolean;
    isVisible: boolean;
    hasFocus: boolean;
    showKeyboardShortcuts: boolean;
    shiftKey: boolean;
    text: string;
    candidates: Array<any>;
    keyDownIndex: number;
};

// array because ordering is important when printing the commands
//
const Commands: Array<Command> = [
    {
        command: "i",
        description: "goto ideas or add ",
        quoteAround: "title",
        fn: (args) => {
            return routeOrCreate(DeckKind.Idea, args);
        },
    },
    {
        command: "p",
        description: "goto people or add ",
        quoteAround: "name",
        fn: (args) => {
            return routeOrCreate(DeckKind.Person, args);
        },
    },
    {
        command: "a",
        description: "goto articles or add ",
        quoteAround: "title",
        fn: (args) => {
            return routeOrCreate(DeckKind.Article, args);
        },
    },
    {
        command: "t",
        description: "goto timelines or add ",
        quoteAround: "title",
        fn: (args) => {
            return routeOrCreate(DeckKind.Timeline, args);
        },
    },
    {
        command: "q",
        description: "goto quotes",
        fn: () => {
            return routeOrCreate(DeckKind.Quote, "");
        },
    },
    {
        command: "qr",
        description: "goto random quote",
        fn: () => {
            Net.get<DeckQuote>("/api/quotes/random").then((quote) => {
                route(`/quotes/${quote.id}`);
            });
            return true;
        },
    },
    {
        command: "s",
        description: "goto spaced repetition",
        fn: () => {
            route("/sr");
            return true;
        },
    },
    {
        spacer: true,
    },
    {
        command: "e",
        description: "switch to edit mode",
        fn: () => {
            AppStateChange.toolbarMode(ToolbarMode.Edit);
            return true;
        },
    },
    {
        command: "r",
        description: "switch to add reference mode",
        fn: () => {
            AppStateChange.toolbarMode(ToolbarMode.Refs);
            return true;
        },
    },
    {
        spacer: true,
    },
    {
        command: "n",
        description: "show add-note form",
        fn: () => {
            AppStateChange.showNoteForm(NoteKind.Note);
            return true;
        },
    },
    {
        command: "nr",
        description: "show add-note form for review section",
        fn: () => {
            AppStateChange.showNoteForm(NoteKind.NoteReview);
            return true;
        },
    },
    {
        command: "ns",
        description: "show add-note form for summary section",
        fn: () => {
            AppStateChange.showNoteForm(NoteKind.NoteSummary);
            return true;
        },
    },
    {
        command: "fp",
        description: "show point form",
        fn: () => {
            AppStateChange.showAddPointForm();
            return true;
        },
    },
    {
        spacer: true,
    },
    {
        command: "b",
        description: "bookmark current page to scratchlist",
        fn: () => {
            AppStateChange.bookmarkUrl();
            return true;
        },
    },
    {
        command: "uic",
        description: "clean ui",
        fn: () => {
            AppStateChange.cleanUI();
            return true;
        },
    },
    {
        command: "uib",
        description: "basic ui",
        fn: () => {
            AppStateChange.basicUI();
            return true;
        },
    },
    {
        command: "g",
        description: "show connectivity graph",
        fn: () => {
            AppStateChange.connectivityGraphShow();
            return true;
        },
    },
    {
        command: "h",
        description: "hide connectivity graph",
        fn: () => {
            AppStateChange.connectivityGraphHide();
            return true;
        },
    },
];

function cleanState(state: State) {
    return {
        ...state,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: "",
        candidates: [],
        isVisible: !state.hasPhysicalKeyboard,
        keyDownIndex: -1,
    };
}

function reducer(state: State, action: Action) {
    switch (action.type) {
        case ActionType.ClickedCommand: {
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
        case ActionType.ClickedCandidate: {
            const newState = cleanState(state);
            return newState;
        }
        case ActionType.InputBlur: {
            const newState = {
                ...state,
                hasFocus: false,
            };
            if (newState.candidates.length === 0) {
                newState.isVisible = !state.hasPhysicalKeyboard;
            }
            return newState;
        }
        case ActionType.InputFocus: {
            const newState = {
                ...state,
                hasFocus: true,
            };
            return newState;
        }
        case ActionType.KeyDownEnter: {
            if (!state.isVisible) {
                return state;
            }

            if (state.mode === Mode.Command) {
                const success = executeCommand(state.text);
                if (success) {
                    let newState = cleanState(state);
                    return newState;
                }
            }

            return state;
        }
        case ActionType.KeyDownEsc: {
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
        }
        case ActionType.KeyDownColon: {
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
        }
        case ActionType.KeyDownCtrl: {
            if (!state.isVisible) {
                return state;
            }

            const newState = {
                ...state,
            };

            if (state.mode === Mode.Search) {
                newState.showKeyboardShortcuts =
                    !state.showKeyboardShortcuts && state.candidates.length > 0;
            }

            return newState;
        }
        case ActionType.KeyDownKey: {
            if (!state.isVisible) {
                return state;
            }

            const newState = { ...state };

            if (state.showKeyboardShortcuts && state.mode === Mode.Search) {
                newState.keyDownIndex = action.data.index;
                newState.shiftKey = action.data.shiftKey;
            }

            return newState;
        }
        case ActionType.KeyDownPlus: {
            if (!state.isVisible) {
                return state;
            }

            const newState = { ...state };
            if (state.showKeyboardShortcuts && state.mode === Mode.Search) {
                AppStateChange.scratchListAddMulti(newState.candidates);

                newState.shiftKey = true;
                newState.keyDownIndex = -1;

                return newState;
            } else {
                return newState;
            }
        }
        case ActionType.CandidatesSet:
            return {
                ...state,
                candidates: action.data.results ? action.data.results : [],
            };
        case ActionType.InputGiven: {
            if (!state.isVisible) {
                return state;
            }

            const text = action.data.text;
            const mode = isCommand(text) ? Mode.Command : Mode.Search;

            let candidates = state.candidates;
            if (mode === Mode.Command) {
                candidates = Commands;
            }
            if (mode === Mode.Search && state.mode === Mode.Command) {
                // just changed mode from command to search
                candidates = [];
            }

            if (state.showKeyboardShortcuts && state.mode === Mode.Search) {
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
                            keyDownIndex: -1,
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
                candidates,
            };

            return newState;
        }
        case ActionType.RemoveSavedSearchResult: {
            const index = action.data.index;
            const newState = { ...state };

            AppStateChange.scratchListRemove(index);

            return newState;
        }
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

function isCommand(text: string) {
    return text.length >= 1 && text[0] === ":";
}

export default function SearchCommand() {
    const appState = getAppState();
    const searchCommandRef = useRef(null);

    const initialState: State = {
        mode: Mode.Search,
        hasPhysicalKeyboard: appState.hasPhysicalKeyboard,
        isVisible: !appState.hasPhysicalKeyboard,
        hasFocus: false,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: "",
        candidates: [],
        keyDownIndex: -1,
    };
    const [local, localDispatch] = useLocalReducer(reducer, initialState);

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            localDispatch(ActionType.KeyDownEsc, searchCommandRef);
        }
        if (e.key === ":") {
            localDispatch(ActionType.KeyDownColon, {
                searchCommandRef,
                appState,
            });
        }
        if (e.key === "Enter") {
            localDispatch(ActionType.KeyDownEnter);
        }
        if (e.ctrlKey) {
            localDispatch(ActionType.KeyDownCtrl);
        }
        if (
            (e.keyCode >= 49 && e.keyCode <= 57) ||
            (e.keyCode >= 65 && e.keyCode <= 90)
        ) {
            // digit: 1 -> 0, 2 -> 1, ... 9 -> 8       letter: a -> 9, b -> 10, ... z -> 34
            const index =
                e.keyCode >= 49 && e.keyCode <= 57
                    ? e.keyCode - 49
                    : e.keyCode - 65 + 9;
            localDispatch(ActionType.KeyDownKey, {
                index: index,
                shiftKey: e.shiftKey,
            });
        }
        if (e.key === "+") {
            localDispatch(ActionType.KeyDownPlus);
        }
    }

    function onFocus() {
        localDispatch(ActionType.InputFocus);
    }

    function onBlur() {
        localDispatch(ActionType.InputBlur);
    }

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [appState]);

    const handleChangeEvent = (event: Event) => {
        if (event.target instanceof HTMLInputElement) {
            const text = event.target.value;

            if (local.mode === Mode.Command) {
                localDispatch(ActionType.InputGiven, { text });
            } else if (local.mode === Mode.Search) {
                if (!local.showKeyboardShortcuts) {
                    localDispatch(ActionType.InputGiven, { text });
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
                    const displayText = local.shiftKey
                        ? text.slice(0, -1)
                        : text;

                    localDispatch(ActionType.InputGiven, { text: displayText });
                }
            }
        }
    };

    async function search(text: string) {
        const url = `/api/cmd/search?q=${encodeURI(text)}`;
        const searchResponse = await Net.get(url);
        localDispatch(ActionType.CandidatesSet, searchResponse);
    }

    function buildSearchResultEntry(entry: any, i: number) {
        const maxShortcuts = 9 + 26; // 1..9 and a..z
        const canShowKeyboardShortcut =
            local.showKeyboardShortcuts && i < maxShortcuts;

        function clickedCandidate() {
            localDispatch(ActionType.ClickedCandidate);
        }

        let hreff = `/${entry.resource}/${entry.id}`;
        return (
            <DeckLink
                resource={entry.resource}
                href={hreff}
                insignia={entry.insignia}
                name={entry.name}
                onClick={clickedCandidate}
            >
                {canShowKeyboardShortcut && (
                    <span class="keyboard-shortcut">
                        ${indexToShortcut(i)}:{" "}
                    </span>
                )}
            </DeckLink>
        );
    }

    function buildCommandEntry(entry: any, i: number) {
        function clickedCommand() {
            localDispatch(ActionType.ClickedCommand, { entry });
        }
        if (entry.spacer) {
            return <div class="command-entry">-</div>;
        } else {
            return (
                <div class="command-entry" onClick={clickedCommand}>
                    <span class="command-entry-name">:{entry.command}</span>
                    <span class="command-entry-desc">
                        {entry.description}
                        {entry.quoteAround && (
                            <span class="command-entry-quote-around">
                                {entry.quoteAround}
                            </span>
                        )}
                    </span>
                </div>
            );
        }
    }

    function buildCandidates() {
        let classes =
            local.hasPhysicalKeyboard && local.showKeyboardShortcuts
                ? "search-command-important "
                : "";
        classes += "search-command-listing";

        let candidateRenderer =
            local.mode === Mode.Search
                ? buildSearchResultEntry
                : buildCommandEntry;

        return (
            <ul class={classes} id="search-candidates">
                {local.candidates.map((entry, i) => (
                    <li key={i}>{candidateRenderer(entry, i)}</li>
                ))}
            </ul>
        );
    }

    function buildScratchList() {
        function buildScratchListEntry(entry, i) {
            function clickedCandidate() {
                localDispatch(ActionType.ClickedCandidate);
            }

            function clickedDelete() {
                localDispatch(ActionType.RemoveSavedSearchResult, { index: i });
            }

            let klass = `pigment-fg-${entry.resource}`;
            let hreff = `/${entry.resource}/${entry.id}`;
            return (
                <div class="saved-search-result">
                    <div
                        class="saved-search-result-remove"
                        onClick={clickedDelete}
                    >
                        ${svgX()}
                    </div>
                    <Link onClick={clickedCandidate} class={klass} href={hreff}>
                        {entry.name}
                    </Link>
                </div>
            );
        }

        function clickedToggle() {
            AppStateChange.scratchListToggle();
        }

        const scratchList = appState.scratchList.value.map((entry, i) => (
            <li key={i}>{buildScratchListEntry(entry, i)}</li>
        ));

        return (
            <div id="saved-search-component">
                {!appState.scratchListMinimised.value && (
                    <ul
                        class="search-command-listing"
                        id="saved-search-results"
                    >
                        {scratchList}
                    </ul>
                )}
                {appState.scratchListMinimised.value ? (
                    <div class="saved-search-menu">
                        <div onClick={clickedToggle}>{svgChevronUp()}</div>
                        <span class="saved-search-menu-tip">
                            Maximise ScratchList
                        </span>
                    </div>
                ) : (
                    <div class="saved-search-menu">
                        <div onClick={clickedToggle}>{svgChevronDown()}</div>
                        <span class="saved-search-menu-tip">
                            Minimise ScratchList
                        </span>
                    </div>
                )}
            </div>
        );
    }

    const extraClasses = local.isVisible
        ? "search-command-visible"
        : "search-command-invisible";

    let inputClasses = "search-command-input";
    if (local.hasPhysicalKeyboard) {
        inputClasses += local.showKeyboardShortcuts
            ? " search-command-unimportant"
            : " search-command-important";
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

    return (
        <div id="search-command">
            <div class={extraClasses}>
                <input
                    id="search-command-input"
                    autocomplete="off"
                    type="text"
                    class={inputClasses}
                    ref={searchCommandRef}
                    name="full search"
                    value={local.text}
                    onInput={handleChangeEvent}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
                {!!local.candidates.length && buildCandidates()}
            </div>
            {!!appState.scratchList.value.length && buildScratchList()}
        </div>
    );
}

function routeOrCreate(kind: DeckKind, argString: string): boolean {
    if (argString.length === 0) {
        route(`/${deckKindToResourceString(kind)}`);
    } else {
        createDeck(kind, argString);
    }

    return true;
}

function executeCommand(text: string) {
    const commandPlusArgs = text
        .slice(1)
        .split(" ")
        .filter((s) => s.length > 0);
    if (commandPlusArgs.length === 0) {
        return;
    }

    const command = commandPlusArgs[0];

    const action: Command | undefined = Commands.find(
        (c) => c.command === command
    );
    if (action) {
        const rest = commandPlusArgs.slice(1).join(" ");
        return action.fn ? action.fn(rest) : false;
    }
    return false;
}
