import { h } from "preact";
import { useEffect, useRef, Ref } from "preact/hooks";
import { route } from "preact-router";

import {
    Key,
    Command,
    CommandBarMode,
    DeckKind,
    DeckQuote,
    NoteKind,
    ResultList,
    SlimDeck,
    State,
} from "types";

import Net from "shared/net";
import { addBookmark, addMultipleBookmarks } from "shared/bookmarks";
import { getAppState, AppStateChange } from "app-state";
import { isCommand, indexToShortcut } from "shared/command";
import { deckKindToResourceString, createDeck } from "shared/deck";

import DeckLink from "components/deck-link";

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
    }

    AppStateChange.cbInputGiven(text);
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
            AppStateChange.cbKeyDownEsc();
        }
        if (e.key === ":") {
            AppStateChange.cbKeyDownColon();
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
                        AppStateChange.commandBarHide();
                    }
                }
            }
        }
        if (e.key === "/") {
            AppStateChange.cbKeyDownSlash();
        }
        if (e.ctrlKey) {
            AppStateChange.cbKeyDownCtrl();
        }
        if (
            e.shiftKey ||
            (e.key >= "1" && e.key <= "9") ||
            (e.key >= "a" && e.key <= "z")
        ) {
            AppStateChange.cbKeyDownAlphaNumeric(e.code, e.shiftKey);
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
                    AppStateChange.cbKeyDownPlusHack();
                }
            }
        }
    }

    function onFocus() {
        AppStateChange.cbFocus(true);
    }

    function onBlur() {
        AppStateChange.cbFocus(false);
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
            AppStateChange.cbSearchCandidateSet(searchResponse);
        }
    }

    function buildSearchResultEntry(entry: SlimDeck, i: number) {
        const maxShortcuts = 9 + 26; // 1..9 and a..z
        const canShowKeyboardShortcut =
            appState.commandBarState.value.showKeyboardShortcuts &&
            i < maxShortcuts;

        function clickedCandidate() {
            AppStateChange.cbClickedCandidate();
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
                AppStateChange.commandBarHide();
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
                <ul class="search-command-listing" id="search-candidates">
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
                    ? "search-command-important "
                    : "";
            classes += "search-command-listing";

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

    const extraClasses = appState.showingCommandBar.value
        ? "search-command-visible"
        : "search-command-invisible";

    let inputClasses = "search-command-input";
    if (appState.hasPhysicalKeyboard) {
        inputClasses += appState.commandBarState.value.showKeyboardShortcuts
            ? " search-command-unimportant"
            : " search-command-important";
    }

    return (
        <div id="search-command">
            <div class={extraClasses}>
                <input
                    id="search-command-input"
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
        let rest: Array<any> = [];
        if (action.giveState) {
            rest.push(state);
        }
        rest = rest.concat(commandPlusArgs.slice(1).join(" "));
        return action.fn ? action.fn(rest) : false;
    }
    return false;
}

function getIdFromUrl(url: string): number | undefined {
    let re = url.match(/^\/(\w+)\/(\w+)/);
    return re ? parseInt(re[2], 10) : undefined;
}
