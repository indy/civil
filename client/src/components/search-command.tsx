import { h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { route } from "preact-router";

import {
    ArticleListings,
    DeckKind,
    DeckQuote,
    IdeasListings,
    NoteKind,
    PeopleListings,
    SearchResults,
    SlimDeck,
    ToolbarMode,
} from "types";

import Net from "utils/net";
import { getAppState, AppStateChange } from "app-state";
import { deckKindToResourceString, indexToShortcut } from "utils/civil";

import DeckLink from "components/deck-link";
import useLocalReducer from "components/use-local-reducer";

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
    SearchCandidatesSet,
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
}

type Action = {
    type: ActionType;
    data?: any;
};

type State = {
    mode: Mode;
    hasFocus: boolean;
    showKeyboardShortcuts: boolean;
    shiftKey: boolean;
    text: string;
    searchCandidates: Array<SlimDeck>;
    keyDownIndex: number;
};

// array because ordering is important when printing the commands
//
const Commands: Array<Command> = [
    {
        command: "z",
        description: "test ",
        quoteAround: "title",
        fn: (args) => {
            async function foo(text: string) {
                const url = `/api/dialogues/ask?q=${encodeURI(text)}`;
                const askResponse: any = await Net.post(url, {});
                console.log(askResponse);
            }

            foo(args);
            // console.log(args);
            return true;
        },
    },
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
        description: "show add-note form for review passage",
        fn: () => {
            AppStateChange.showNoteForm(NoteKind.NoteReview);
            return true;
        },
    },
    {
        command: "ns",
        description: "show add-note form for summary passage",
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
            AppStateChange.addCurrentUrlToScratchList();
            return true;
        },
    },
    {
        command: "bl",
        description: "clicking on a link adds it to the scratchlist",
        fn: () => {
            AppStateChange.scratchlistLinkToggle();
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

function cleanState(state: State): State {
    return {
        ...state,
        hasFocus: false,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: "",
        searchCandidates: [],
        keyDownIndex: -1,
    };
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case ActionType.ClickedCommand: {
            const command = action.data.entry.command;
            const success = executeCommand(command);
            if (success) {
                AppStateChange.setShowingSearchCommand(false);
                let newState = cleanState(state);
                return newState;
            } else {
                console.error(`Failed to execute command: ${command}`);
                return state;
            }
        }
        case ActionType.ClickedCandidate: {
            AppStateChange.setShowingSearchCommand(false);
            const newState = cleanState(state);
            return newState;
        }
        case ActionType.InputBlur: {
            const newState = {
                ...state,
                hasFocus: false,
            };
            if (newState.searchCandidates.length === 0) {
                AppStateChange.setShowingSearchCommand(false);
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
            if (state.mode === Mode.Command) {
                const success = executeCommand(state.text);
                if (success) {
                    AppStateChange.setShowingSearchCommand(false);
                    let newState = cleanState(state);
                    return newState;
                }
            }

            return state;
        }
        case ActionType.KeyDownEsc: {
            const inputElement = action.data.searchCommandRef.current;
            if (action.data.hasPhysicalKeyboard) {
                if (action.data.isVisible) {
                    if (inputElement) {
                        inputElement.blur();
                        AppStateChange.setShowingSearchCommand(false);
                    }
                } else {
                    if (inputElement) {
                        inputElement.focus();
                        AppStateChange.setShowingSearchCommand(true);
                    }
                }
            }

            const newState = cleanState(state);
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

            if (!appState.showingSearchCommand.value) {
                if (inputElement) {
                    inputElement.focus();
                    AppStateChange.setShowingSearchCommand(true);
                }
            }
            return newState;
        }
        case ActionType.KeyDownCtrl: {
            const newState = {
                ...state,
            };

            if (state.mode === Mode.Search) {
                newState.showKeyboardShortcuts =
                    !state.showKeyboardShortcuts &&
                    state.searchCandidates.length > 0;
            }

            return newState;
        }
        case ActionType.KeyDownKey: {
            const newState = { ...state };

            const code = action.data.code; // key code
            let index = indexFromCode(code);

            if (
                state.showKeyboardShortcuts &&
                state.mode === Mode.Search &&
                index >= 0
            ) {
                newState.keyDownIndex = index;
                newState.shiftKey = action.data.shiftKey;
            }

            return newState;
        }
        case ActionType.KeyDownPlus: {
            const newState = { ...state };
            if (state.showKeyboardShortcuts && state.mode === Mode.Search) {
                AppStateChange.scratchListAddMulti(newState.searchCandidates);

                newState.shiftKey = true;
                newState.keyDownIndex = -1;

                return newState;
            } else {
                return newState;
            }
        }
        case ActionType.SearchCandidatesSet:
            return {
                ...state,
                searchCandidates: action.data.results || [],
            };
        case ActionType.InputGiven: {
            const appState = action.data.appState;

            if (!appState.showingSearchCommand.value) {
                return state;
            }

            const text = action.data.text;
            const mode = isCommand(text) ? Mode.Command : Mode.Search;

            let searchCandidates = state.searchCandidates;

            if (text.length === 0) {
                searchCandidates = [];
            }

            if (mode === Mode.Search && state.mode === Mode.Command) {
                // just changed mode from command to search
                searchCandidates = [];
            }

            if (state.showKeyboardShortcuts && state.mode === Mode.Search) {
                const index = state.keyDownIndex;

                if (index >= 0 && state.searchCandidates.length > index) {
                    const candidate = state.searchCandidates[index];

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
                        const url = `/${deckKindToResourceString(
                            candidate.deckKind
                        )}/${candidate.id}`;
                        route(url);

                        AppStateChange.setShowingSearchCommand(false);
                        const newState = cleanState(state);

                        return newState;
                    }
                }
            }

            const newState = {
                ...state,
                mode,
                text,
                searchCandidates,
            };

            return newState;
        }
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

// map key code for an alphanumeric character to an index value
//
//  digit: 1 -> 0, 2 ->  1, ... 9 ->  8
// letter: a -> 9, b -> 10, ... z -> 34
//
function indexFromCode(code: string): number {
    // this was the simple code that now has to be replaced
    // because the retards who define web standards have
    // deprecated keyCode .
    //
    // const index =
    //     e.keyCode >= 49 && e.keyCode <= 57
    //         ? e.keyCode - 49
    //         : e.keyCode - 65 + 9;

    switch (code) {
        case "Digit1":
            return 0;
        case "Digit2":
            return 1;
        case "Digit3":
            return 2;
        case "Digit4":
            return 3;
        case "Digit5":
            return 4;
        case "Digit6":
            return 5;
        case "Digit7":
            return 6;
        case "Digit8":
            return 7;
        case "Digit9":
            return 8;
        case "KeyA":
            return 9;
        case "KeyB":
            return 10;
        case "KeyC":
            return 11;
        case "KeyD":
            return 12;
        case "KeyE":
            return 13;
        case "KeyF":
            return 14;
        case "KeyG":
            return 15;
        case "KeyH":
            return 16;
        case "KeyI":
            return 17;
        case "KeyJ":
            return 18;
        case "KeyK":
            return 19;
        case "KeyL":
            return 20;
        case "KeyM":
            return 21;
        case "KeyN":
            return 22;
        case "KeyO":
            return 23;
        case "KeyP":
            return 24;
        case "KeyQ":
            return 25;
        case "KeyR":
            return 26;
        case "KeyS":
            return 27;
        case "KeyT":
            return 28;
        case "KeyU":
            return 29;
        case "KeyV":
            return 30;
        case "KeyW":
            return 31;
        case "KeyX":
            return 32;
        case "KeyY":
            return 33;
        case "KeyZ":
            return 34;
        default: {
            // console.error(`invalid code value: '${code}'`);
            return -1;
        }
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
        hasFocus: false,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: "",
        searchCandidates: [],
        keyDownIndex: -1,
    };
    const [local, localDispatch] = useLocalReducer(reducer, initialState);

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            localDispatch(ActionType.KeyDownEsc, {
                hasPhysicalKeyboard: appState.hasPhysicalKeyboard,
                isVisible: appState.showingSearchCommand.value,
                searchCommandRef,
            });
        }
        if (e.key === ":") {
            localDispatch(ActionType.KeyDownColon, {
                searchCommandRef,
                appState,
            });
        }
        if (e.key === "Enter") {
            if (appState.showingSearchCommand.value) {
                localDispatch(ActionType.KeyDownEnter);
            }
        }
        if (e.ctrlKey) {
            if (appState.showingSearchCommand.value) {
                localDispatch(ActionType.KeyDownCtrl);
            }
        }
        // console.log(`keyCode = ${e.keyCode}, code = ${e.code}, key = ${e.key}`);
        if (
            e.shiftKey ||
            (e.key >= "1" && e.key <= "9") ||
            (e.key >= "a" && e.key <= "z")
        ) {
            if (appState.showingSearchCommand.value) {
                localDispatch(ActionType.KeyDownKey, {
                    code: e.code,
                    shiftKey: e.shiftKey,
                });
            }
        }
        if (e.key === "+") {
            if (appState.showingSearchCommand.value) {
                localDispatch(ActionType.KeyDownPlus);
            }
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
                localDispatch(ActionType.InputGiven, { text, appState });
            } else if (local.mode === Mode.Search) {
                if (!local.showKeyboardShortcuts) {
                    localDispatch(ActionType.InputGiven, { text, appState });
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

                    localDispatch(ActionType.InputGiven, {
                        text: displayText,
                        appState,
                    });
                }
            }
        }
    };

    function sanitize(text: string) {
        let blocked = [
            "?",
            ">",
            "<",
            "+",
            "-",
            "/",
            "*",
            "%",
            "!",
            "(",
            ")",
            ",",
            ".",
            ":",
            "`",
            "\\",
            "'",
        ];
        return blocked.reduce((a, b) => a.replaceAll(b, ""), text);
    }

    async function search(text: string) {
        let sanitized: string = sanitize(text);
        if (sanitized.length > 0) {
            const url = `/api/cmd/search?q=${encodeURI(sanitized)}`;
            const searchResponse: SearchResults = await Net.get(url);
            localDispatch(ActionType.SearchCandidatesSet, searchResponse);
        }
    }

    function buildSearchResultEntry(entry: SlimDeck, i: number) {
        const maxShortcuts = 9 + 26; // 1..9 and a..z
        const canShowKeyboardShortcut =
            local.showKeyboardShortcuts && i < maxShortcuts;

        function clickedCandidate() {
            localDispatch(ActionType.ClickedCandidate);
        }

        return (
            <DeckLink slimDeck={entry} onClick={clickedCandidate}>
                {canShowKeyboardShortcut && (
                    <span class="keyboard-shortcut">
                        {indexToShortcut(i)}:{" "}
                    </span>
                )}
            </DeckLink>
        );
    }

    function buildCommandEntry(entry: Command) {
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

    // build either the SearchCandidates or the CommandCandidates
    function buildCandidates() {
        if (local.mode === Mode.Command) {
            return (
                <ul class="search-command-listing" id="search-candidates">
                    {Commands.map((entry: Command, i: number) => (
                        <li key={i}>{buildCommandEntry(entry)}</li>
                    ))}
                </ul>
            );
        } else if (
            local.mode === Mode.Search &&
            local.searchCandidates.length > 0
        ) {
            let classes =
                appState.hasPhysicalKeyboard && local.showKeyboardShortcuts
                    ? "search-command-important "
                    : "";
            classes += "search-command-listing";

            return (
                <ul class={classes} id="search-candidates">
                    {local.searchCandidates.map(
                        (entry: SlimDeck, i: number) => (
                            <li key={entry.id}>
                                {buildSearchResultEntry(entry, i)}
                            </li>
                        )
                    )}
                </ul>
            );
        } else {
            return <div></div>;
        }
    }

    const extraClasses = appState.showingSearchCommand.value
        ? "search-command-visible"
        : "search-command-invisible";

    let inputClasses = "search-command-input";
    if (appState.hasPhysicalKeyboard) {
        inputClasses += local.showKeyboardShortcuts
            ? " search-command-unimportant"
            : " search-command-important";
    } else {
        // if (local.hasFocus) {
        //     inputClasses += " on-touch-device-search-command-has-focus";
        // } else {
        //     inputClasses += " on-touch-device-search-command-lost-focus";
        // }
    }

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
                {buildCandidates()}
            </div>
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

function createDeck(deckKind: DeckKind, title: string) {
    type ProtoDeck = {
        title: string;
    };

    // creates a new deck
    const data: ProtoDeck = {
        title: title,
    };

    const resource = deckKindToResourceString(deckKind);

    type AnyDeckListing =
        | IdeasListings
        | PeopleListings
        | ArticleListings
        | Array<SlimDeck>;

    Net.post<ProtoDeck, SlimDeck>(`/api/${resource}`, data).then((deck) => {
        Net.get<AnyDeckListing>(`/api/${resource}/listings`).then((listing) => {
            switch (deckKind) {
                case DeckKind.Idea:
                    AppStateChange.setIdeaListings(listing as IdeasListings);
                    break;
                case DeckKind.Person:
                    AppStateChange.setPeopleListings(listing as PeopleListings);
                    break;
                case DeckKind.Article:
                    AppStateChange.setArticleListings(
                        listing as ArticleListings
                    );
                    break;
                case DeckKind.Timeline:
                    AppStateChange.setTimelineListings(
                        listing as Array<SlimDeck>
                    );
                    break;
            }
            AppStateChange.invalidateGraph();
        });
        route(`/${resource}/${deck.id}`);
    });
}
