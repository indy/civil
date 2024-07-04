import { route } from "preact-router";
import { type Ref, useEffect, useRef } from "preact/hooks";

import {
    CivilMode,
    CivilSpan,
    CommandBarMode,
    DeckKind,
    NoteKind,
} from "../enums";

import type { DeckQuote, Key, SlimDeck, State, SearchResults } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { sanitize } from "../shared/search";
import { addBookmark, addMultipleBookmarks } from "../shared/bookmarks";
import { isCivilModeAllowed } from "../shared/civil";
import { indexToShortcut, isCommand } from "../shared/command";
import { visibleClass } from "../shared/css";
import { createDeck, deckKindToResourceString } from "../shared/deck";
import { indexFromCode } from "../shared/keys";
import Net from "../shared/net";

import DeckLink from "./deck-link";

type Command = {
    command: string;
    description: string;
    fn: (args?: any) => any;

    quoteAround?: string;
    giveState?: boolean;
};

type Spacer = {
    spacer: boolean;
};

type BarEntry = Command | Spacer;

// array because ordering is important when printing the commands
//
const BarEntries: Array<BarEntry> = [
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
        command: "e",
        description: "goto events or add ",
        quoteAround: "title",
        fn: (args) => {
            return routeOrCreate(DeckKind.Event, args);
        },
    },
    {
        command: "d",
        description: "goto dialogues ",
        quoteAround: "title",
        fn: () => {
            return routeOnly(DeckKind.Dialogue);
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
                const candidate = commandBarState.searchCandidates[index]!;

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
                const candidate = commandBarState.searchCandidates[index]!;

                if (!commandBarState.shiftKey) {
                    const url = `/${deckKindToResourceString(
                        candidate.deckKind,
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

let gCommandBarAbortController = new AbortController();

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

    function navigate(url: string, title?: string) {
        let urlTitle = title ? title : url.slice(1);
        AppStateChange.urlTitle({ title: urlTitle });
        AppStateChange.mode({ mode: CivilMode.View });
        AppStateChange.commandBarResetAndHide();
        route(url);
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
                        BarEntries,
                    );
                    if (success) {
                        AppStateChange.commandBarResetAndHide();
                    }
                } else if (commandBarState.mode === CommandBarMode.Search) {
                    let sanitized: string = sanitize(commandBarState.text);
                    if (sanitized.length > 0) {
                        route(`/search?q=${encodeURI(sanitized)}`);
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
            const ctrlKey = e.ctrlKey;

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
                  -------- ----

                  ? : show help overlay
                  Escape : toolbar: view mode
                  Comma: quotes: prev quote
                  Period: quotes: next quote
                  / : search
                  a : route: articles
                  b : toolbar: bookmarks mode
                  c : toolbar: memorise card mode
                  d : route: dialogues
                  e : route: events
                  f :
                  g :
                  h : toolbar: home
                  i : route: ideas
                  j : quotes: jump to random quote
                  k :
                  l :
                  m : special: toggle showing deck metadata form
                  n : toolbar: edit mode
                  o :
                  p : route: people
                  q : route: quotes
                  r : toolbar: refs mode
                  s : route: full search page
                  t : route: timelines
                  u : toolbar: upper insert mode
                  v :
                  w : special: toggle civil span (_W_idth)
                  x :
                  y :
                  z :

                */

                // ignore ctrl and shift so shortcuts like Ctrl-C or Ctrl-Shift-I aren't intercepted here
                let kb = !appState.componentRequiresFullKeyboardAccess.value;

                if (kb && shiftKey && code === "Slash") {
                    // this is the question mark key: ?
                    if (appState.showingHelpOverlay.value) {
                        AppStateChange.helpOverlayHide();
                    } else {
                        AppStateChange.helpOverlayShow();
                    }
                }

                if (kb && !ctrlKey && !shiftKey) {
                    // we can treat any keypresses as modal commands for the app
                    switch (code) {
                        case "KeyA":
                            routeOnly(DeckKind.Article);
                            break;
                        case "KeyB":
                            modeToggle(appState, CivilMode.BookmarkLinks);
                            break;
                        case "KeyC":
                            modeToggle(appState, CivilMode.Memorise);
                            break;
                        case "KeyD":
                            routeOnly(DeckKind.Dialogue);
                            break;
                        case "KeyE":
                            routeOnly(DeckKind.Event);
                            break;
                        case "KeyH":
                            navigate("/", "home");
                            break;
                        case "KeyI":
                            routeOnly(DeckKind.Idea);
                            break;
                        case "KeyM":
                            if (appState.wantToShowDeckUpdateForm.value) {
                                AppStateChange.requestToHideUpdateForm();
                            } else {
                                AppStateChange.requestToShowUpdateForm();
                            }
                            break;
                        case "KeyN":
                            modeToggle(appState, CivilMode.Edit);
                            break;
                        case "KeyP":
                            routeOnly(DeckKind.Person);
                            break;
                        case "KeyQ":
                            routeOnly(DeckKind.Quote);
                            break;
                        case "KeyR":
                            modeToggle(appState, CivilMode.Refs);
                            break;
                        case "KeyS":
                            // can select some text before pressing 's'
                            // this will then search for that text
                            //
                            let navigated = false;
                            const selection = window!.getSelection();
                            if (selection) {
                                const selectedText = selection.toString();
                                if (selectedText.length > 0) {
                                    navigated = true;
                                    navigate(
                                        `/search?q=${encodeURI(selectedText)}`,
                                    );
                                }
                            }
                            if (!navigated) {
                                navigate("/search");
                            }
                            break;
                        case "KeyT":
                            routeOnly(DeckKind.Timeline);
                            break;
                        case "KeyU":
                            modeToggle(appState, CivilMode.UpperInsert);
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
            let text = event.target.value;

            // hacks for quick computers:
            //
            // sanitise the text in case it's picked up a starting forward slash
            if (text.startsWith("/")) {
                text = text.slice(1);
            }
            if (text.startsWith("::")) {
                text = text.slice(1);
            }

            if (
                appState.commandBarState.value.mode === CommandBarMode.Command
            ) {
                inputGiven(appState, text);
            } else if (
                appState.commandBarState.value.mode === CommandBarMode.Search
            ) {
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
                } else {
                    inputGiven(appState, text);
                    if (text.length > 0 && !isCommand(text)) {
                        search(text);
                    }
                }
            }
        }
    };

    async function search(text: string) {
        try {
            gCommandBarAbortController.abort();

            let sanitized: string = sanitize(text);
            if (sanitized.length > 0) {
                gCommandBarAbortController = new AbortController();

                const url = `/api/search/decks?q=${encodeURI(sanitized)}`;
                const searchResponse: SearchResults = await Net.getAbortable(
                    url,
                    gCommandBarAbortController.signal,
                );

                const searchCandidates: Array<SlimDeck> =
                    searchResponse.deckLevel.map((dl) => dl.deck);

                AppStateChange.commandBarSetSearch({ searchCandidates });
            }
        } catch (e) {
            // this catches the exception thrown when abort is invoked
            // console.log(e)
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

    function buildCommandEntry(entry: BarEntry) {
        function clickedCommand() {
            if ("command" in entry) {
                const command = entry.command;

                const success = command
                    ? executeCommand(appState, command, BarEntries)
                    : false;
                if (success) {
                    AppStateChange.commandBarResetAndHide();
                } else {
                    console.error(`Failed to execute command: ${command}`);
                }
            }
        }

        if ("spacer" in entry) {
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
                    {BarEntries.map((entry: BarEntry, i: number) => (
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
                        ),
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

function routeOnly(kind: DeckKind): boolean {
    route(`/${deckKindToResourceString(kind)}`);
    return true;
}

function executeCommand(
    state: State,
    text: string,
    allBarEntries: Array<BarEntry>,
) {
    const commandPlusArgs = text
        .slice(1)
        .split(" ")
        .filter((s) => s.length > 0);
    if (commandPlusArgs.length === 0) {
        return;
    }

    const commandName = commandPlusArgs[0];

    let action: BarEntry | undefined = allBarEntries.find(
        (c) => "command" in c && c.command === commandName,
    );

    if (action) {
        action = action as Command;
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
    return re ? parseInt(re[2]!, 10) : undefined;
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
