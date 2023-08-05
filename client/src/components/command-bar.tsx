import { h } from "preact";
import { useEffect, useRef, Ref } from "preact/hooks";
import { route } from "preact-router";

import {
    Key,
    CivilMode,
    CivilSpan,
    Command,
    CommandBarMode,
    DeckKind,
    DeckQuote,
    NoteKind,
    ResultList,
    SlimDeck,
    State,
} from "types";

import { getAppState, AppStateChange } from "app-state";

import DeckLink from "components/deck-link";

import Net from "shared/net";
import { addBookmark, addMultipleBookmarks } from "shared/bookmarks";
import { deckKindToResourceString, createDeck } from "shared/deck";
import { isCivilModeAllowed } from "shared/civil";
import { isCommand, indexToShortcut } from "shared/command";
import { visibleClass } from "shared/css";

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
        command: "m",
        description: "goto memorisation",
        fn: () => {
            route("/memorise");
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
            AppStateChange.showNoteForm({ noteKind: NoteKind.Note });
            return true;
        },
    },
    {
        command: "nr",
        description: "show add-note form for review passage",
        fn: () => {
            AppStateChange.showNoteForm({ noteKind: NoteKind.NoteReview });
            return true;
        },
    },
    {
        command: "ns",
        description: "show add-note form for summary passage",
        fn: () => {
            AppStateChange.showNoteForm({ noteKind: NoteKind.NoteSummary });
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
        description: "bookmark current page to bookmark",
        giveState: true,
        fn: (args) => {
            let state: State = args[0];
            let id: Key | undefined = getIdFromUrl(state.url.value);
            if (id) {
                addBookmark(id);
            }
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

function inputGiven(state: State, text: string) {
    // before calling the appState chInputGiven logic, check if any bookmarks are being added

    let commandBarState = state.commandBarState.value;
    if (state.showingCommandBar.value) {
        if (
            commandBarState.showKeyboardShortcuts &&
            commandBarState.mode === CommandBarMode.Search
        ) {
            const index = commandBarState.keyDownIndex;

            if (index >= 0 && commandBarState.searchCandidates.length > index) {
                const candidate = commandBarState.searchCandidates[index];

                if (commandBarState.shiftKey) {
                    // once a candidate has been added to the saved search
                    // results, set the keyDownIndex to an invalid value,
                    // otherwise if the user presses shift and an unused
                    // key (e.g. '+' ) then the last candidate to be added
                    // will be added again.
                    //

                    state.commandBarState.value = {
                        ...commandBarState,
                        keyDownIndex: -1,
                    };

                    addBookmark(candidate.id);
                }
            }
        }

        const mode = isCommand(text)
            ? CommandBarMode.Command
            : CommandBarMode.Search;

        let searchCandidates = commandBarState.searchCandidates;

        if (text.length === 0) {
            searchCandidates = [];
        }

        if (
            mode === CommandBarMode.Search &&
            commandBarState.mode === CommandBarMode.Command
        ) {
            // just changed mode from command to search
            searchCandidates = [];
        }

        if (
            commandBarState.showKeyboardShortcuts &&
            commandBarState.mode === CommandBarMode.Search
        ) {
            const index = commandBarState.keyDownIndex;

            if (index >= 0 && commandBarState.searchCandidates.length > index) {
                const candidate = commandBarState.searchCandidates[index];

                if (!commandBarState.shiftKey) {
                    const url = `/${deckKindToResourceString(
                        candidate.deckKind
                    )}/${candidate.id}`;
                    route(url);

                    AppStateChange.commandBarResetAndHide();
                    return;
                }
            }
        }

        AppStateChange.commandBarInputGiven({ mode, text, searchCandidates });
    }
}

export default function CommandBar() {
    const appState = getAppState();
    const commandBarRef: Ref<HTMLInputElement> = useRef(null);

    const inputElement = commandBarRef.current;
    if (inputElement) {
        if (appState.showingCommandBar.value) {
            inputElement.focus();
        } else {
            inputElement.blur();
        }
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            if (appState.mode.value !== CivilMode.View) {
                AppStateChange.mode({ mode: CivilMode.View });
            }
            AppStateChange.commandBarResetAndHide();
        }
        if (e.key === ":") {
            if (!appState.componentRequiresFullKeyboardAccess.value) {
                if (!appState.showingCommandBar.value) {
                    AppStateChange.commandBarEnterCommandMode();
                }
            }
        }
        if (e.key === "Enter") {
            let commandBarState = appState.commandBarState.value;
            if (appState.showingCommandBar.value) {
                if (commandBarState.mode === CommandBarMode.Command) {
                    const success = executeCommand(
                        appState,
                        commandBarState.text,
                        Commands
                    );
                    if (success) {
                        AppStateChange.commandBarResetAndHide();
                    }
                }
            }
        }
        if (e.key === "/") {
            if (
                !appState.componentRequiresFullKeyboardAccess.value &&
                !appState.showingCommandBar.value
            ) {
                AppStateChange.mode({ mode: CivilMode.View });
                AppStateChange.commandBarResetAndShow();
            }
        }
        if (e.ctrlKey) {
            let commandBarState = appState.commandBarState.value;
            if (appState.showingCommandBar.value) {
                if (commandBarState.mode === CommandBarMode.Search) {
                    const showKeyboardShortcuts =
                        !commandBarState.showKeyboardShortcuts &&
                        commandBarState.searchCandidates.length > 0;

                    AppStateChange.commandBarShowShortcuts({
                        showKeyboardShortcuts,
                    });
                }
            }
        }
        if (
            e.shiftKey ||
            (e.key >= "1" && e.key <= "9") ||
            (e.key >= "a" && e.key <= "z")
        ) {
            const code = e.code;
            const shiftKey = e.shiftKey;

            let commandBarState = appState.commandBarState.value;
            if (appState.showingCommandBar.value) {
                let keyDownIndex = indexFromCode(code);
                if (
                    commandBarState.showKeyboardShortcuts &&
                    commandBarState.mode === CommandBarMode.Search &&
                    keyDownIndex >= 0
                ) {
                    AppStateChange.commandBarKeyDown({
                        keyDownIndex,
                        shiftKey,
                    });
                }
            } else {
                /*

                  shortcut keys

                  Escape : toolbar: view mode
                  / : search
                  a : toolbar: add above
                  b : toolbar: bookmarks
                  c
                  d
                  e : toolbar: edit mode
                  f
                  g
                  h : toolbar: home
                  i
                  j : quotes: jump to random quote
                  k
                  l
                  m : toolbar: memorise
                  n : quotes: next quote
                  o
                  p : quotes: prev quote
                  q
                  r : toolbar: refs
                  s
                  t : special: toggle showing deck update form (me_T_adata)
                  u
                  v
                  w : special: toggle civil span (_W_idth)
                  x
                  y
                  z

                */
                if (
                    appState.componentRequiresFullKeyboardAccess.value === false
                ) {
                    // we can treat any keypresses as modal commands for the app
                    switch (code) {
                        case "KeyH":
                            AppStateChange.mode({ mode: CivilMode.View });
                            route("/");
                            break;
                        case "KeyB":
                            modeToggle(appState, CivilMode.BookmarkLinks);
                            break;
                        case "KeyE":
                            modeToggle(appState, CivilMode.Edit);
                            break;
                        case "KeyR":
                            modeToggle(appState, CivilMode.Refs);
                            break;
                        case "KeyA":
                            modeToggle(appState, CivilMode.AddAbove);
                            break;
                        case "KeyM":
                            modeToggle(appState, CivilMode.Memorise);
                            break;
                        case "KeyT":
                            if (appState.wantToShowDeckUpdateForm.value) {
                                AppStateChange.requestToHideUpdateForm();
                            } else {
                                AppStateChange.requestToShowUpdateForm();
                            }
                            break;
                        case "KeyW":
                            if (appState.span.value === CivilSpan.Broad) {
                                AppStateChange.setSpan({
                                    span: CivilSpan.Narrow,
                                });
                            } else {
                                AppStateChange.setSpan({
                                    span: CivilSpan.Broad,
                                });
                            }
                            break;
                    }
                }
            }
        }
        if (e.key === "+") {
            let commandBarState = appState.commandBarState.value;
            if (appState.showingCommandBar.value) {
                if (
                    commandBarState.showKeyboardShortcuts &&
                    commandBarState.mode === CommandBarMode.Search
                ) {
                    let deckIds: Array<Key> =
                        commandBarState.searchCandidates.map((c) => c.id);
                    addMultipleBookmarks(deckIds);

                    AppStateChange.commandBarResetAndHide();
                }
            }
        }
    }

    function onFocus() {
        AppStateChange.commandBarSetFocus({ hasFocus: true });
    }

    function onBlur() {
        AppStateChange.commandBarSetFocus({ hasFocus: false });
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
            if (
                appState.commandBarState.value.mode === CommandBarMode.Command
            ) {
                inputGiven(appState, text);
            } else if (
                appState.commandBarState.value.mode === CommandBarMode.Search
            ) {
                if (!appState.commandBarState.value.showKeyboardShortcuts) {
                    inputGiven(appState, text);
                    if (text.length > 0 && !isCommand(text)) {
                        search(text);
                    }
                }

                if (appState.commandBarState.value.showKeyboardShortcuts) {
                    // searchCommand is showing keyboard shortcuts and the user
                    // has just pressed a key whilst holding down the shift button
                    //
                    // since the handleChangeEvent code runs after the latest
                    // render we have to manually remove the final character
                    //
                    const displayText = appState.commandBarState.value.shiftKey
                        ? text.slice(0, -1)
                        : text;

                    inputGiven(appState, displayText);
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
            const url = `/api/decks/search?q=${encodeURI(sanitized)}`;
            const searchResponse: ResultList = await Net.get(url);
            const searchCandidates: Array<SlimDeck> =
                searchResponse.results || [];

            AppStateChange.commandBarSetSearch({ searchCandidates });
        }
    }

    function buildSearchResultEntry(entry: SlimDeck, i: number) {
        const maxShortcuts = 9 + 26; // 1..9 and a..z
        const canShowKeyboardShortcut =
            appState.commandBarState.value.showKeyboardShortcuts &&
            i < maxShortcuts;

        function clickedCandidate() {
            AppStateChange.commandBarResetAndHide();
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
            const command = entry.command;

            const success = command
                ? executeCommand(appState, command, Commands)
                : false;
            if (success) {
                AppStateChange.commandBarResetAndHide();
            } else {
                console.error(`Failed to execute command: ${command}`);
            }
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
        if (appState.commandBarState.value.mode === CommandBarMode.Command) {
            return (
                <ul class="command-bar-listing" id="search-candidates">
                    {Commands.map((entry: Command, i: number) => (
                        <li key={i}>{buildCommandEntry(entry)}</li>
                    ))}
                </ul>
            );
        } else if (
            appState.commandBarState.value.mode === CommandBarMode.Search &&
            appState.commandBarState.value.searchCandidates.length > 0
        ) {
            let classes =
                appState.hasPhysicalKeyboard &&
                appState.commandBarState.value.showKeyboardShortcuts
                    ? "command-bar-important "
                    : "";
            classes += "command-bar-listing";

            return (
                <ul class={classes} id="search-candidates">
                    {appState.commandBarState.value.searchCandidates.map(
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

    let klass = "command-bar";
    klass += visibleClass("command-bar", appState.showingCommandBar.value);

    let inputClasses = "command-bar-input";
    if (appState.hasPhysicalKeyboard) {
        inputClasses += appState.commandBarState.value.showKeyboardShortcuts
            ? " command-bar-unimportant"
            : " command-bar-important";
    }

    return (
        <div class={klass}>
            <div>
                <input
                    id="command-bar-input"
                    autocomplete="off"
                    type="text"
                    class={inputClasses}
                    ref={commandBarRef}
                    name="full search"
                    value={appState.commandBarState.value.text}
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

function executeCommand(
    state: State,
    text: string,
    allCommands: Array<Command>
) {
    const commandPlusArgs = text
        .slice(1)
        .split(" ")
        .filter((s) => s.length > 0);
    if (commandPlusArgs.length === 0) {
        return;
    }

    const command = commandPlusArgs[0];

    const action: Command | undefined = allCommands.find(
        (c) => c.command === command
    );
    if (action) {
        let rest: any = commandPlusArgs.slice(1).join(" ");
        if (action.giveState) {
            rest = [state].concat(rest);
        }
        return action.fn ? action.fn(rest) : false;
    }
    return false;
}

function getIdFromUrl(url: string): number | undefined {
    let re = url.match(/^\/(\w+)\/(\w+)/);
    return re ? parseInt(re[2], 10) : undefined;
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

function modeToggle(state: State, mode: CivilMode) {
    if (isCivilModeAllowed(state, mode)) {
        if (state.mode.value !== mode) {
            state.mode.value = mode;
        } else {
            state.mode.value = CivilMode.View;
        }
    }
}
