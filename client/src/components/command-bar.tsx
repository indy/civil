import { h } from "preact";
import { useEffect, useRef, Ref } from "preact/hooks";
import { route } from "preact-router";

import {
    Command,
    CommandBarMode,
    DeckKind,
    DeckQuote,
    NoteKind,
    ResultList,
    SlimDeck,
} from "types";

import Net from "utils/net";
import { getAppState, AppStateChange } from "app-state";
import {
    isCommand,
    deckKindToResourceString,
    indexToShortcut,
    createDeck,
} from "utils/civil";

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
            AppStateChange.cbKeyDownEnter(Commands);
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
            AppStateChange.cbKeyDownPlus();
        }
    }

    function onFocus() {
        AppStateChange.cbInputFocus();
    }

    function onBlur() {
        AppStateChange.cbInputBlur();
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
                AppStateChange.cbInputGiven(text);
            } else if (
                appState.commandBarState.value.mode === CommandBarMode.Search
            ) {
                if (!appState.commandBarState.value.showKeyboardShortcuts) {
                    AppStateChange.cbInputGiven(text);
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

                    AppStateChange.cbInputGiven(displayText);
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
            const url = `/api/deck-queries/search?q=${encodeURI(sanitized)}`;
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
            AppStateChange.cbClickedCommand(entry, Commands);
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
