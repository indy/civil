import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import {
    AppStateChangeArgs,
    StateChangeColourScheme,
    StateChangeWaitingFor,
    StateChangeShowShortcuts,
    StateChangeKeyDown,
    StateChangeSetFocus,
    StateChangeSetSearch,
    StateChangeInputGiven,
    StateChangeDeckId,
    StateChangeAddPreview,
    StateChangeMode,
    StateChangeTitle,
    StateChangeUrl,
    StateChangeUber,
    StateChangeUser,
    StateChangeNoteRefsModified,
    StateChangeIdea,
    StateChangePeople,
    StateChangeArticle,
    StateChangeTimeline,
    StateChangeDialogue,
    StateChangeNoteForm,
    StateChangeRecentImages,
    StateChangeBookmarks,
    StateChangeRecentlyUsedDecks,
    StateChangeCount,
    StateChangeGraph,
    StateChangeEmpty,
    ArticleListings,
    Bookmark,
    CivilMode,
    ColourScheme,
    CommandBarMode,
    CommandBarState,
    DeckKind,
    Font,
    FullGraphStruct,
    Graph,
    GraphDeck,
    IdeasListings,
    ImmutableState,
    Key,
    Listing,
    NoteKind,
    Notes,
    PeopleListings,
    PreviewDeck,
    PreviewNotes,
    RefKind,
    Reference,
    RefsModified,
    SlimDeck,
    State,
    UberSetup,
    User,
    UserUploadedImage,
    VisiblePreview,
    WaitingFor,
} from "types";

import { noteSeq } from "shared/seq";
import { generateColoursFromSeeds, declareSeeds } from "shared/colour-creator";

const emptyUser: User = {
    username: "",
    email: "",
    admin: { dbName: "" },
    theme: "light",
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
        DeckKind.Person,
        DeckKind.Article,
        DeckKind.Timeline,
        DeckKind.Dialogue,
    ],

    // preferred order of the top-level menu bar
    //
    topMenuOrder: ["memorise"],

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

    AppStateChange[fnName](args);
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

    debugMessages: signal([]),

    mode: signal(CivilMode.View),
    wasmInterface: undefined,

    colourScheme: ColourScheme.Light,
    colourSeeds: signal({}),

    // this is set via the --search-always-visible css variable so
    // that mobile touch devices will always show the search bar
    //
    hasPhysicalKeyboard: true,

    // when true don't let commandBar accept any keystrokes
    //
    componentRequiresFullKeyboardAccess: signal(false),
    showingCommandBar: signal(false),
    commandBarState: signal(cleanCommandBarState()),

    // to add the current page to the bookmark we need the id, name, deckKind.
    // id and deckKind can be parsed from the url, but the name needs to be
    // stored separately
    //
    urlTitle: signal(""),

    // the url of the current page
    //
    url: signal(""),

    user: signal(emptyUser),

    // key == deckKind name of decks
    listing: signal({
        ideas: undefined, // when listing ideas on /ideas page
        articles: undefined,
        people: undefined,
        timelines: undefined,
        dialogues: undefined,
    }),
    previewCache: signal({}),
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

    showConnectivityGraph: signal(false),
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
    setColourScheme: build(
        Scope.Local,
        "setColourScheme",
        (args: StateChangeColourScheme) => {
            const colourScheme: ColourScheme = args.colourScheme;

            state.colourScheme = colourScheme;
            state.colourSeeds.value = declareSeeds(state.colourScheme);
            generateColoursFromSeeds(state, state.colourSeeds.value);
        }
    ),

    setWaitingFor: build(
        Scope.Local,
        "setWaitingFor",
        (args: StateChangeWaitingFor) => {
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
        (args: StateChangeShowShortcuts) => {
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
        (args: StateChangeKeyDown) => {
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
        (args: StateChangeSetFocus) => {
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
        (args: StateChangeSetSearch) => {
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
        (args: StateChangeInputGiven) => {
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
        (args: StateChangeDeckId) => {
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
        (args: StateChangeDeckId) => {
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
        (args: StateChangeAddPreview) => {
            const slimDeck: SlimDeck = args.slimDeck;
            const previewNotes: PreviewNotes = args.previewNotes;

            if (slimDeck.id !== previewNotes.deckId) {
                console.error(
                    `addPreview: deck id mismatch: ${slimDeck.id} ${previewNotes.deckId}`
                );
            }

            let pc = {
                ...state.previewCache.value,
            };

            // use the summary notes if present
            let ns: Notes = noteSeq(previewNotes.notes, NoteKind.NoteSummary);
            // otherwise use the normal notes
            if (ns.length === 0) {
                ns = noteSeq(previewNotes.notes, NoteKind.Note);
            }

            let previewDeck: PreviewDeck = {
                id: slimDeck.id,
                title: slimDeck.title,
                deckKind: slimDeck.deckKind,
                insignia: slimDeck.insignia,
                font: slimDeck.font,
                notes: ns,
            };

            pc[previewDeck.id] = previewDeck;
            state.previewCache.value = pc;
        }
    ),

    // hideCommandBar: build(Scope.Local, "hideCommandBar", () => {
    //     state.showingCommandBar.value = false;
    // }),

    mode: build(Scope.Local, "mode", (args: StateChangeMode) => {
        state.mode.value = args.mode;
    }),

    urlTitle: build(Scope.Local, "urlTitle", (args: StateChangeTitle) => {
        const title: string = args.title;

        state.urlTitle.value = title;
        document.title = `${immutableState.appName}: ${title}`;
    }),

    routeChanged: build(Scope.Local, "routeChanged", (args: StateChangeUrl) => {
        state.url.value = args.url;
    }),

    uberSetup: build(Scope.Local, "uberSetup", (args: StateChangeUber) => {
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

        state.listing.value = {
            ideas: uber.ideas,
            people: uber.people,
            articles: uber.articles,
            timelines: uber.timelines,
            dialogues: uber.dialogues,
        };
    }),

    userLogin: build(Scope.Local, "userLogin", (args: StateChangeUser) => {
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
        (args: StateChangeNoteRefsModified) => {
            const allDecksForNote: Array<Reference> = args.allDecksForNote;
            const changes: RefsModified = args.changes;

            if (changes.referencesCreated.length > 0) {
                let ng = { ...state.graph.value, fullLoaded: false };
                state.graph.value = ng;
            }

            if (state.listing.value.ideas) {
                let li: Listing = { ...state.listing.value };
                if (li) {
                    changes.referencesCreated.forEach((r) => {
                        let newReference = allDecksForNote.find(
                            (d) =>
                                d.title === r.title &&
                                d.deckKind === DeckKind.Idea
                        );

                        if (newReference) {
                            // todo: what should insignia be here?
                            let newIdeaListing: SlimDeck = {
                                id: newReference.id,
                                title: newReference.title,
                                deckKind: DeckKind.Idea,
                                insignia: 0,
                                font: immutableState.defaultFont,
                            };
                            if (li.ideas) {
                                // update the listing with the new deckKind
                                if (li.ideas.recent) {
                                    li.ideas.recent.unshift(newIdeaListing);
                                }
                                if (li.ideas.unnoted) {
                                    li.ideas.unnoted.unshift(newIdeaListing);
                                }
                            }
                        }
                    });
                    state.listing.value = li;
                }
            }
        }
    ),

    setIdeaListings: build(
        Scope.Broadcast,
        "setIdeaListings",
        (args: StateChangeIdea) => {
            const ideas: IdeasListings = args.ideaListings;

            const li = {
                ...state.listing.value,
                ideas,
            };

            state.listing.value = li;
        }
    ),

    setPeopleListings: build(
        Scope.Broadcast,
        "setPeopleListings",
        (args: StateChangePeople) => {
            const people: PeopleListings = args.peopleListings;
            const li = {
                ...state.listing.value,
                people,
            };
            state.listing.value = li;
        }
    ),

    setArticleListings: build(
        Scope.Broadcast,
        "setArticleListings",
        (args: StateChangeArticle) => {
            const articles: ArticleListings = args.articleListings;
            const li = {
                ...state.listing.value,
                articles,
            };
            state.listing.value = li;
        }
    ),

    setTimelineListings: build(
        Scope.Broadcast,
        "setTimelineListings",
        (args: StateChangeTimeline) => {
            const timelines: Array<SlimDeck> = args.timelineListings;
            const li = {
                ...state.listing.value,
                timelines,
            };
            state.listing.value = li;
        }
    ),

    setDialogueListings: build(
        Scope.Broadcast,
        "setDialogueListings",
        (args: StateChangeDialogue) => {
            const dialogues: Array<SlimDeck> = args.dialogueListings;
            const li = {
                ...state.listing.value,
                dialogues,
            };
            state.listing.value = li;
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
        (args: StateChangeNoteForm) => {
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
        (args: StateChangeNoteForm) => {
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
        (args: StateChangeRecentImages) => {
            const recentImages: Array<UserUploadedImage> = args.recentImages;
            state.recentImages.value = recentImages;
        }
    ),

    deleteDeck: build(
        Scope.Broadcast,
        "deleteDeck",
        (args: StateChangeDeckId) => {
            const id: Key = args.deckId;

            // todo: typescript check the Listing entry and the filterFn
            let filterFn = (d) => d.id !== id;

            if (state.graph.value && state.graph.value.decks) {
                let g = {
                    ...state.graph.value,
                    decks: state.graph.value.decks.filter(filterFn),
                };
                state.graph.value = g;
            }

            let li: Listing = {
                ideas: undefined,
                people: undefined,
                articles: undefined,
                timelines: undefined,
                dialogues: undefined,
            };

            if (state.listing.value.ideas) {
                li.ideas = {
                    orphans: state.listing.value.ideas.orphans.filter(filterFn),
                    recent: state.listing.value.ideas.recent.filter(filterFn),
                    unnoted: state.listing.value.ideas.unnoted.filter(filterFn),
                };
            }

            if (state.listing.value.articles) {
                li.articles = {
                    orphans:
                        state.listing.value.articles.orphans.filter(filterFn),
                    recent: state.listing.value.articles.recent.filter(
                        filterFn
                    ),
                    rated: state.listing.value.articles.rated.filter(filterFn),
                };
            }

            if (state.listing.value.people) {
                li.people = {
                    uncategorised:
                        state.listing.value.people.uncategorised.filter(
                            filterFn
                        ),
                    ancient:
                        state.listing.value.people.ancient.filter(filterFn),
                    medieval:
                        state.listing.value.people.medieval.filter(filterFn),
                    modern: state.listing.value.people.modern.filter(filterFn),
                    contemporary:
                        state.listing.value.people.contemporary.filter(
                            filterFn
                        ),
                };
            }

            if (state.listing.value.timelines) {
                li.timelines = state.listing.value.timelines.filter(filterFn);
            }

            if (state.listing.value.dialogues) {
                li.dialogues = state.listing.value.dialogues.filter(filterFn);
            }

            state.listing.value = li;

            if (state.graph.value.links) {
                let g = { ...state.graph.value };
                if (g.links) {
                    delete g.links[id];
                }

                state.graph.value = g;
            }
        }
    ),

    bookmarkToggle: build(Scope.Local, "bookmarkToggle", () => {
        state.bookmarksMinimised.value = !state.bookmarksMinimised.value;
    }),

    setBookmarks: build(
        Scope.Broadcast,
        "setBookmarks",
        (args: StateChangeBookmarks) => {
            const bookmarks: Array<Bookmark> = args.bookmarks;
            state.bookmarks.value = bookmarks;
        }
    ),

    setRecentlyUsedDecks: build(
        Scope.Broadcast,
        "setRecentlyUsedDecks",
        (args: StateChangeRecentlyUsedDecks) => {
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
        (args: StateChangeCount) => {
            const count: number = args.count;
            state.memoriseReviewCount.value = count;
        }
    ),

    loadGraph: build(Scope.Local, "loadGraph", (args: StateChangeGraph) => {
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

function buildFullGraph(graphConnections: Array<number>) {
    let res = {};

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

function buildDeckIndex(decks: Array<GraphDeck>) {
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
