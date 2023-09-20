import { signal } from "@preact/signals";
import { ComponentChildren, createContext } from "preact";
import { useContext } from "preact/hooks";

import {
    AppStateChangeArgs,
    Bookmark,
    CivilMode,
    CivilSpan,
    CommandBarMode,
    CommandBarState,
    DeckKind,
    Font,
    FullGraphStruct,
    Graph,
    GraphEdge,
    ImmutableState,
    Key,
    NoteKind,
    Notes,
    PreviewDeck,
    PreviewNotes,
    RefKind,
    ReferencesDiff,
    SlimDeck,
    State,
    StateChangeAddPreview,
    StateChangeBookmarks,
    StateChangeCount,
    StateChangeDeckId,
    StateChangeDeleteDeck,
    StateChangeEmpty,
    StateChangeGraph,
    StateChangeInputGiven,
    StateChangeKeyDown,
    StateChangeMode,
    StateChangeNoteForm,
    StateChangeNoteRefsModified,
    StateChangeRecentImages,
    StateChangeRecentlyUsedDecks,
    StateChangeSetFocus,
    StateChangeSetSearch,
    StateChangeShowShortcuts,
    StateChangeSpan,
    StateChangeTitle,
    StateChangeUber,
    StateChangeUiConfig,
    StateChangeUrl,
    StateChangeUser,
    StateChangeWaitingFor,
    UberSetup,
    User,
    UserUploadedImage,
    VisiblePreview,
    WaitingFor,
} from "./types";

import {
    declareSeeds,
    generateColoursFromSeeds,
} from "./shared/colour-creator";
import { passageForNoteKind } from "./shared/passage";
import { basicUiConfig } from "./shared/ui-config";

const emptyUser: User = {
    username: "",
    email: "",
    admin: { dbName: "" },
};

function cleanCommandBarState(): CommandBarState {
    return {
        mode: CommandBarMode.Search,
        hasFocus: false,
        showKeyboardShortcuts: false,
        shiftKey: false,
        text: "",
        searchCandidates: [],
        keyDownIndex: -1,
    };
}

// immutable values that are globally accessible for reading
// these are all constant throughout the lifetime of the app
// just basic typescript values nothing framework dependent belongs here
//
export const immutableState: ImmutableState = {
    appName: "civil",

    defaultFont: Font.Serif,

    // preferred order of rendering the back-refs
    //
    deckKindOrder: [
        DeckKind.Quote,
        DeckKind.Idea,
        DeckKind.Event,
        DeckKind.Timeline,
        DeckKind.Person,
        DeckKind.Article,
        DeckKind.Dialogue,
    ],

    // preferred order of the top-level menu bar
    //
    topMenuOrder: ["home", "search", "insignias", "memorise", "stats"],

    // oldest reasonable age in years, any person whose birth means they're older can be assumed to be dead
    //
    oldestAliveAge: 120,

    imageZoomDefault: 80,
    imageZoomMin: 10,
    imageZoomMax: 300,
};

export enum Scope {
    Local,
    Broadcast,
}

const DEBUG_APP_STATE = false;
// const DEBUG_APP_STATE = true;

const broadcastChannel = new BroadcastChannel("civil::appStateChange");
broadcastChannel.onmessage = (event) => {
    const fnName = event.data.fnName;

    let args = event.data.args;
    args.calledFromBroadcastChannel = true;

    if (DEBUG_APP_STATE) {
        console.log(`broadcast channel received: ${fnName}`);
        console.log(args);
    }

    // each broadcastable function in AppStateChange should be dealt with here
    // (could have used AppStateChange[fnName] but that errors when strict
    // typing is set in tsconfig.json)
    //
    switch (fnName) {
        case "noteRefsModified":
            AppStateChange.noteRefsModified(args);
            break;
        case "setRecentImages":
            AppStateChange.setRecentImages(args);
            break;
        case "deleteDeck":
            AppStateChange.deleteDeck(args);
            break;
        case "setBookmarks":
            AppStateChange.setBookmarks(args);
            break;
        case "setRecentlyUsedDecks":
            AppStateChange.setRecentlyUsedDecks(args);
            break;
        case "setReviewCount":
            AppStateChange.setReviewCount(args);
            break;
        default:
            console.error(`received unknown broadcast function: ${fnName}`);
    }
};

function boilerplate(scope: Scope, fnName: string, args: AppStateChangeArgs) {
    if (DEBUG_APP_STATE) {
        console.log(fnName);
    }

    if (scope === Scope.Broadcast) {
        // don't re-broadcast an app state change
        if (!args.calledFromBroadcastChannel) {
            broadcastChannel.postMessage({ args, fnName });
        }
    }
}

function build(
    scope: Scope,
    fnName: string,
    fn: (args?: AppStateChangeArgs) => void
) {
    return (args?: AppStateChangeArgs) => {
        let empty: StateChangeEmpty = {};
        let args_ = args || empty;
        boilerplate(scope, fnName, args_);
        fn(args_);
    };
}

const state: State = {
    waitingFor: signal(WaitingFor.User),

    span: signal(CivilSpan.Broad),

    wantToShowDeckUpdateForm: signal(false),

    debugMessages: signal([]),

    mode: signal(CivilMode.View),
    wasmInterface: undefined,

    hasPhysicalKeyboard: true,
    canNarrowWidth: true,

    componentRequiresFullKeyboardAccess: signal(false),
    showingCommandBar: signal(false),
    commandBarState: signal(cleanCommandBarState()),

    urlTitle: signal("home"),

    url: signal(""),

    user: signal(emptyUser),
    uiConfig: signal(basicUiConfig()),

    colourSeeds: signal({}),

    previewCache: signal(new Map<Key, PreviewDeck>()),
    visiblePreviewDeck: signal({ id: 0, showing: false }),

    showNoteForm: signal({
        [NoteKind.Note]: false,
        [NoteKind.NoteReview]: false,
        [NoteKind.NoteSummary]: false,
        [NoteKind.NoteDeckMeta]: false,
    }),
    showNoteFormPointId: signal(undefined),

    // same for the Add Point form
    showAddPointForm: signal(false),

    recentlyUsedDecks: signal([]),

    recentImages: signal([]),
    imageDirectory: signal(""),

    showConnectivityGraph: signal(true),
    graph: signal({
        fullyLoaded: false,
        // an array of { id, name, deckKind }
        decks: [],
        links: [],
        // an array which is indexed by deckId, returns the offset into state.graph.value.decks
        deckIndexFromId: [],
    }),

    bookmarks: signal([]),
    bookmarksMinimised: signal(false),

    memoriseReviewCount: signal(0),
    memoriseEarliestReviewDate: signal(undefined),
};

export const initialState = state;

export const AppStateContext = createContext(state);

export const AppStateProvider = ({
    state,
    children,
}: {
    state: State;
    children: ComponentChildren;
}) => {
    return (
        <AppStateContext.Provider value={state}>
            {children}
        </AppStateContext.Provider>
    );
};

export const getAppState = () => useContext(AppStateContext);

// any functions that are going to be broadcast need to have
// an args object as their only argument
// this args object has to be used as an argument
// into the boilerplate function
//
export const AppStateChange = {
    setUiConfig: build(
        Scope.Local,
        "setUiConfig",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeUiConfig;
            let uiConfig = args.uiConfig;

            state.colourSeeds.value = declareSeeds(uiConfig.colourScheme);
            generateColoursFromSeeds(state, state.colourSeeds.value);

            state.uiConfig.value = uiConfig;
        }
    ),

    setSpan: build(Scope.Local, "setSpan", (asca?: AppStateChangeArgs) => {
        let args = asca! as StateChangeSpan;
        if (state.canNarrowWidth) {
            state.span.value = args.span;

            let root = document.body;
            if (args.span === CivilSpan.Narrow) {
                // root.style.setProperty("--body-width", "72%");
                root.style.setProperty("--block-width", "40%");
            } else {
                // root.style.setProperty("--body-width", "80%");
                root.style.setProperty("--block-width", "55%");
            }
        }
    }),

    setWaitingFor: build(
        Scope.Local,
        "setWaitingFor",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeWaitingFor;
            const waitingFor: WaitingFor = args.waitingFor;

            state.waitingFor.value = waitingFor;
        }
    ),

    commandBarResetAndShow: build(Scope.Local, "commandBarResetAndShow", () => {
        commandBarReset(state, true);
    }),

    commandBarResetAndHide: build(Scope.Local, "commandBarResetAndHide", () => {
        commandBarReset(state, false);
    }),

    commandBarEnterCommandMode: build(
        Scope.Local,
        "commandBarEnterCommandMode",
        () => {
            const commandBarState = state.commandBarState.value;

            state.showingCommandBar.value = true;
            state.commandBarState.value = {
                ...commandBarState,
                mode: CommandBarMode.Command,
                text: ":",
            };
        }
    ),

    commandBarShowShortcuts: build(
        Scope.Local,
        "commandBarShowShortcuts",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeShowShortcuts;
            const showKeyboardShortcuts: boolean = args.showKeyboardShortcuts;
            const commandBarState = state.commandBarState.value;

            state.commandBarState.value = {
                ...commandBarState,
                showKeyboardShortcuts,
            };
        }
    ),

    commandBarKeyDown: build(
        Scope.Local,
        "commandBarKeyDown",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeKeyDown;
            const keyDownIndex: number = args.keyDownIndex;
            const shiftKey: boolean = args.shiftKey;
            const commandBarState = state.commandBarState.value;

            state.commandBarState.value = {
                ...commandBarState,
                keyDownIndex,
                shiftKey,
            };
        }
    ),

    commandBarSetFocus: build(
        Scope.Local,
        "commandBarSetFocus",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeSetFocus;
            const hasFocus: boolean = args.hasFocus;
            const commandBarState = state.commandBarState.value;

            state.commandBarState.value = {
                ...commandBarState,
                hasFocus,
            };
        }
    ),

    commandBarSetSearch: build(
        Scope.Local,
        "commandBarSetSearch",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeSetSearch;
            const searchCandidates: Array<SlimDeck> = args.searchCandidates;
            const commandBarState = state.commandBarState.value;

            state.commandBarState.value = {
                ...commandBarState,
                searchCandidates,
            };
        }
    ),

    commandBarInputGiven: build(
        Scope.Local,
        "commandBarInputGiven",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeInputGiven;
            const mode: CommandBarMode = args.mode;
            const text: string = args.text;
            const searchCandidates: Array<SlimDeck> = args.searchCandidates;
            const commandBarState = state.commandBarState.value;

            state.commandBarState.value = {
                ...commandBarState,
                mode,
                text,
                searchCandidates,
            };
        }
    ),

    showPreviewDeck: build(
        Scope.Local,
        "showPreviewDeck",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeDeckId;
            let vp: VisiblePreview = {
                id: args.deckId,
                showing: true,
            };

            state.visiblePreviewDeck.value = vp;
        }
    ),

    hidePreviewDeck: build(
        Scope.Local,
        "hidePreviewDeck",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeDeckId;
            const deckId: Key = args.deckId;

            if (state.visiblePreviewDeck.value.id === deckId) {
                let vp: VisiblePreview = {
                    ...state.visiblePreviewDeck.value,
                    showing: false,
                };

                state.visiblePreviewDeck.value = vp;
            } else {
                console.log(
                    "calling hidePreviewDeck with a deckId that isn't the current preview deck: " +
                        deckId +
                        " " +
                        state.visiblePreviewDeck.value.id
                );
            }
        }
    ),

    addPreview: build(
        Scope.Local,
        "addPreview",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeAddPreview;
            const slimDeck: SlimDeck = args.slimDeck;
            const previewNotes: PreviewNotes = args.previewNotes;

            if (slimDeck.id !== previewNotes.deckId) {
                console.error(
                    `addPreview: deck id mismatch: ${slimDeck.id} ${previewNotes.deckId}`
                );
            }

            // use the summary notes if present
            let ns: Notes = passageForNoteKind(
                previewNotes.notes,
                NoteKind.NoteSummary
            );
            // otherwise use the normal notes
            if (ns.length === 0) {
                ns = passageForNoteKind(previewNotes.notes, NoteKind.Note);
            }

            let previewDeck: PreviewDeck = {
                id: slimDeck.id,
                title: slimDeck.title,
                deckKind: slimDeck.deckKind,
                graphTerminator: false,
                insignia: slimDeck.insignia,
                font: slimDeck.font,
                notes: ns,
            };

            state.previewCache.value.set(previewDeck.id, previewDeck);
            state.previewCache.value = new Map(state.previewCache.value);
        }
    ),

    // hideCommandBar: build(Scope.Local, "hideCommandBar", () => {
    //     state.showingCommandBar.value = false;
    // }),

    mode: build(Scope.Local, "mode", (asca?: AppStateChangeArgs) => {
        let args = asca! as StateChangeMode;
        state.mode.value = args.mode;
    }),

    urlTitle: build(Scope.Local, "urlTitle", (asca?: AppStateChangeArgs) => {
        let args = asca! as StateChangeTitle;
        const title: string = args.title;

        state.urlTitle.value = title;
        document.title = `${immutableState.appName}: ${title}`;
    }),

    routeChanged: build(
        Scope.Local,
        "routeChanged",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeUrl;
            state.url.value = args.url;
        }
    ),

    uberSetup: build(Scope.Local, "uberSetup", (asca?: AppStateChangeArgs) => {
        let args = asca! as StateChangeUber;
        let uber: UberSetup = args.uber;

        state.graph.value = {
            fullyLoaded: false,
            decks: [],
            links: [],
            deckIndexFromId: [],
        };

        state.recentImages.value = uber.recentImages;
        state.recentlyUsedDecks.value = uber.recentlyUsedDecks;
        state.imageDirectory.value = uber.directory;

        state.memoriseReviewCount.value = uber.memoriseReviewCount;
        state.memoriseEarliestReviewDate.value =
            uber.memoriseEarliestReviewDate;
        state.bookmarks.value = uber.bookmarks;
    }),

    userLogin: build(Scope.Local, "userLogin", (asca?: AppStateChangeArgs) => {
        let args = asca! as StateChangeUser;
        let user: User = args.user;
        state.user.value = user;
    }),

    userLogout: build(Scope.Broadcast, "userLogout", () => {
        let user: User = { ...state.user.value };
        user.username = "";

        state.user.value = user;
    }),

    showAddPointForm: build(Scope.Local, "showAddPointForm", () => {
        state.showAddPointForm.value = true;
        state.componentRequiresFullKeyboardAccess.value = true;
    }),

    hideAddPointForm: build(Scope.Local, "hideAddPointForm", () => {
        state.showAddPointForm.value = false;
        state.componentRequiresFullKeyboardAccess.value = false;
    }),

    noteRefsModified: build(
        Scope.Broadcast,
        "noteRefsModified",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeNoteRefsModified;
            const changes: ReferencesDiff = args.changes;

            if (changes.referencesCreated.length > 0) {
                let ng = { ...state.graph.value, fullLoaded: false };
                state.graph.value = ng;
            }
        }
    ),

    obtainKeyboard: build(Scope.Local, "obtainKeyboard", () => {
        state.componentRequiresFullKeyboardAccess.value = true;
    }),

    relinquishKeyboard: build(Scope.Local, "relinquishKeyboard", () => {
        state.componentRequiresFullKeyboardAccess.value = false;
    }),

    showNoteForm: build(
        Scope.Local,
        "showNoteForm",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeNoteForm;
            let snf = { ...state.showNoteForm.value };

            let noteKind: NoteKind = args.noteKind;
            snf[noteKind] = true;

            state.showNoteForm.value = snf;
            state.showNoteFormPointId.value = args.pointId || undefined;
            state.componentRequiresFullKeyboardAccess.value = true;
        }
    ),

    hideNoteForm: build(
        Scope.Local,
        "hideNoteForm",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeNoteForm;
            let snf = { ...state.showNoteForm.value };

            let noteKind: NoteKind = args.noteKind;
            snf[noteKind] = false;

            state.showNoteForm.value = snf;
            state.showNoteFormPointId.value = undefined;
            state.componentRequiresFullKeyboardAccess.value = false;
        }
    ),

    setRecentImages: build(
        Scope.Broadcast,
        "setRecentImages",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeRecentImages;
            const recentImages: Array<UserUploadedImage> = args.recentImages;
            state.recentImages.value = recentImages;
        }
    ),

    deleteDeck: build(
        Scope.Broadcast,
        "deleteDeck",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeDeleteDeck;
            const id: Key = args.deckId;

            let filterFn = (d: SlimDeck) => d.id !== id;

            if (state.graph.value && state.graph.value.decks) {
                let g = {
                    ...state.graph.value,
                    decks: state.graph.value.decks.filter(filterFn),
                };
                state.graph.value = g;
            }
            if (state.graph.value.links) {
                let g = { ...state.graph.value };
                if (g.links) {
                    delete g.links[id];
                }

                state.graph.value = g;
            }

            // delete any bookmarks to this deck
            if (state.bookmarks.value.length > 0) {
                let idx = state.bookmarks.value.findIndex(
                    (bookmark) => bookmark.deck.id === id
                );
                if (idx !== -1) {
                    let bookmarks = state.bookmarks.value.slice();
                    bookmarks.splice(idx, 1);
                    state.bookmarks.value = bookmarks;
                }
            }

            state.mode.value = CivilMode.View;
        }
    ),

    bookmarkToggle: build(Scope.Local, "bookmarkToggle", () => {
        state.bookmarksMinimised.value = !state.bookmarksMinimised.value;
    }),

    requestToShowUpdateForm: build(
        Scope.Local,
        "requestToShowUpdateForm",
        () => {
            state.wantToShowDeckUpdateForm.value = true;
        }
    ),

    requestToHideUpdateForm: build(
        Scope.Local,
        "requestToHideUpdateForm",
        () => {
            state.wantToShowDeckUpdateForm.value = false;
        }
    ),

    setBookmarks: build(
        Scope.Broadcast,
        "setBookmarks",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeBookmarks;
            const bookmarks: Array<Bookmark> = args.bookmarks;
            state.bookmarks.value = bookmarks;
        }
    ),

    setRecentlyUsedDecks: build(
        Scope.Broadcast,
        "setRecentlyUsedDecks",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeRecentlyUsedDecks;
            const recents: Array<SlimDeck> = args.recents;
            state.recentlyUsedDecks.value = recents;
        }
    ),

    connectivityGraphShow: build(Scope.Local, "connectivityGraphShow", () => {
        state.showConnectivityGraph.value = true;
    }),

    connectivityGraphHide: build(Scope.Local, "connectivityGraphHide", () => {
        state.showConnectivityGraph.value = false;
    }),

    setReviewCount: build(
        Scope.Broadcast,
        "setReviewCount",
        (asca?: AppStateChangeArgs) => {
            let args = asca! as StateChangeCount;
            const count: number = args.count;
            state.memoriseReviewCount.value = count;
        }
    ),

    loadGraph: build(Scope.Local, "loadGraph", (asca?: AppStateChangeArgs) => {
        let args = asca! as StateChangeGraph;
        let graph: FullGraphStruct = args.graph;

        let newGraph: Graph = {
            fullyLoaded: true,
            decks: graph.graphDecks,
            links: buildFullGraph(graph.graphConnections),
            deckIndexFromId: buildDeckIndex(graph.graphDecks),
        };
        state.graph.value = newGraph;
    }),

    invalidateGraph: build(Scope.Local, "invalidateGraph", () => {
        state.graph.value = {
            fullyLoaded: false,
            decks: [],
            links: {},
            deckIndexFromId: [],
        };
    }),
};

function packedToKind(packed: number): RefKind {
    switch (packed) {
        case 0:
            return RefKind.Ref;
        case -1:
            return RefKind.RefToParent;
        case 1:
            return RefKind.RefToChild;
        case 42:
            return RefKind.RefInContrast;
        case 99:
            return RefKind.RefCritical;
        default: {
            console.log(`packed_to_kind invalid value: ${packed}`);
            return RefKind.Ref;
        }
    }
}

function opposingKind(kind: RefKind): RefKind {
    switch (kind) {
        case RefKind.Ref:
            return RefKind.Ref;
        case RefKind.RefToParent:
            return RefKind.RefToChild;
        case RefKind.RefToChild:
            return RefKind.RefToParent;
        case RefKind.RefInContrast:
            return RefKind.RefInContrast;
        case RefKind.RefCritical:
            return RefKind.RefCritical;
    }
}

function buildFullGraph(graphConnections: Array<number>): {
    [id: Key]: Set<GraphEdge>;
} {
    let res: { [id: Key]: Set<GraphEdge> } = {};

    for (let i = 0; i < graphConnections.length; i += 4) {
        let fromDeck = graphConnections[i + 0];
        let toDeck = graphConnections[i + 1];
        let packedKind = graphConnections[i + 2];
        let strength = graphConnections[i + 3];

        let kind: RefKind = packedToKind(packedKind);

        if (!res[fromDeck]) {
            res[fromDeck] = new Set();
        }
        res[fromDeck].add([toDeck, kind, strength]);

        if (!res[toDeck]) {
            res[toDeck] = new Set();
        }
        res[toDeck].add([fromDeck, opposingKind(kind), -strength]);
    }

    return res;
}

function buildDeckIndex(decks: Array<SlimDeck>) {
    let res: Array<number> = [];

    decks.forEach((d, i) => {
        res[d.id] = i;
    });

    return res;
}

function commandBarReset(state: State, showing: boolean) {
    state.showingCommandBar.value = showing;
    state.commandBarState.value = cleanCommandBarState();
}
