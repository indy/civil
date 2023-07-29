import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import {
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
    ResultList,
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

//const DEBUG_APP_STATE = false;
const DEBUG_APP_STATE = true;

const broadcastChannel = new BroadcastChannel("civil::appStateChange");
broadcastChannel.onmessage = (event) => {
    const fnName = event.data.fnName;
    let args = event.data.args || {};
    args.calledFromBroadcastChannel = true;

    if (DEBUG_APP_STATE) {
        console.log(`broadcast channel received: ${fnName}`);
        console.log(args);
    }

    AppStateChange[fnName](args);
};

function boilerplate(scope: Scope, fnName: string, args?: any) {
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
    setColourScheme: function (colourScheme: ColourScheme) {
        boilerplate(Scope.Local, "setColourScheme");

        state.colourScheme = colourScheme;
        state.colourSeeds.value = declareSeeds(state.colourScheme);
        generateColoursFromSeeds(state, state.colourSeeds.value);
    },

    setWaitingFor: function (waitingFor: WaitingFor) {
        boilerplate(Scope.Local, "setWaitingFor");

        state.waitingFor.value = waitingFor;
    },

    commandBarResetAndShow: function () {
        boilerplate(Scope.Local, "commandBarResetAndShow");

        commandBarReset(state, true);
    },
    commandBarResetAndHide: function () {
        boilerplate(Scope.Local, "commandBarResetAndHide");

        commandBarReset(state, false);
    },

    commandBarEnterCommandMode: function () {
        boilerplate(Scope.Local, "commandBarEnterCommandMode");

        let commandBarState = state.commandBarState.value;

        state.showingCommandBar.value = true;
        state.commandBarState.value = {
            ...commandBarState,
            mode: CommandBarMode.Command,
            text: ":",
        };
    },

    commandBarShowKeyboardShortcuts: function (showKeyboardShortcuts: boolean) {
        boilerplate(Scope.Local, "commandBarShowKeyboardShortcuts");

        let commandBarState = state.commandBarState.value;
        state.commandBarState.value = {
            ...commandBarState,
            showKeyboardShortcuts,
        };
    },

    commandBarKeyDown: function (keyDownIndex: number, shiftKey: boolean) {
        boilerplate(Scope.Local, "commandBarKeyDown");

        let commandBarState = state.commandBarState.value;
        state.commandBarState.value = {
            ...commandBarState,
            keyDownIndex,
            shiftKey,
        };
    },

    commandBarSetFocus: function (hasFocus: boolean) {
        boilerplate(Scope.Local, "commandBarSetFocus");

        let commandBarState = state.commandBarState.value;
        state.commandBarState.value = {
            ...commandBarState,
            hasFocus,
        };
    },

    commandBarSetSearchCandidates: function (searchResponse: ResultList) {
        boilerplate(Scope.Local, "commandBarSetSearchCandidates");

        let commandBarState = state.commandBarState.value;
        state.commandBarState.value = {
            ...commandBarState,
            searchCandidates: searchResponse.results || [],
        };
    },

    commandBarInputGiven: function (
        mode: CommandBarMode,
        text: string,
        searchCandidates: Array<SlimDeck>
    ) {
        boilerplate(Scope.Local, "commandBarInputGiven");

        let commandBarState = state.commandBarState.value;

        state.commandBarState.value = {
            ...commandBarState,
            mode,
            text,
            searchCandidates,
        };
    },

    showPreviewDeck: function (deckId: Key) {
        boilerplate(Scope.Local, "showPreviewDeck");

        let vp: VisiblePreview = {
            id: deckId,
            showing: true,
        };

        state.visiblePreviewDeck.value = vp;
    },
    hidePreviewDeck: function (deckId: Key) {
        boilerplate(Scope.Local, "hidePreviewDeck");

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
    },
    addPreview: function (slimDeck: SlimDeck, previewNotes: PreviewNotes) {
        boilerplate(Scope.Local, "addPreview");

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
    },
    setShowingCommandBar: function (b: boolean) {
        boilerplate(Scope.Local, "setShowingCommandBar");

        state.showingCommandBar.value = b;
    },

    mode: function (newMode: CivilMode) {
        boilerplate(Scope.Local, "mode");

        state.mode.value = newMode;
    },
    urlTitle: function (title: string) {
        boilerplate(Scope.Local, "urlTitle");

        state.urlTitle.value = title;
        document.title = `${immutableState.appName}: ${title}`;
    },
    routeChanged: function (url: string) {
        boilerplate(Scope.Local, "routeChanged");

        state.url.value = url;
    },

    uberSetup: function (uber: UberSetup) {
        boilerplate(Scope.Local, "uberSetup");

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
    },

    userLogin: function (user: User) {
        boilerplate(Scope.Local, "userLogin");

        state.user.value = user;
    },
    userLogout: function (args) {
        boilerplate(Scope.Broadcast, "userLogout", args);

        let user: User = { ...state.user.value };
        user.username = "";

        state.user.value = user;
    },

    showAddPointForm: function () {
        boilerplate(Scope.Local, "showAddPointForm");

        state.showAddPointForm.value = true;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideAddPointForm: function () {
        boilerplate(Scope.Local, "hideAddPointForm");

        state.showAddPointForm.value = false;
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    noteRefsModified: function (args) {
        boilerplate(Scope.Broadcast, "noteRefsModified", args);

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
                            d.title === r.title && d.deckKind === DeckKind.Idea
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
    },

    setIdeaListings: function (args) {
        boilerplate(Scope.Broadcast, "setIdeaListings", args);

        const ideas: IdeasListings = args.ideaListings;

        const li = {
            ...state.listing.value,
            ideas,
        };

        state.listing.value = li;
    },

    setPeopleListings: function (args) {
        boilerplate(Scope.Broadcast, "setPeopleListings", args);

        const people: PeopleListings = args.peopleListings;
        const li = {
            ...state.listing.value,
            people,
        };
        state.listing.value = li;
    },

    setArticleListings: function (args) {
        boilerplate(Scope.Broadcast, "setArticleListings", args);

        const articles: ArticleListings = args.articleListings;
        const li = {
            ...state.listing.value,
            articles,
        };
        state.listing.value = li;
    },

    setTimelineListings: function (args) {
        boilerplate(Scope.Broadcast, "setTimelineListings", args);

        const timelines: Array<SlimDeck> = args.timelineListings;
        const li = {
            ...state.listing.value,
            timelines,
        };
        state.listing.value = li;
    },

    setDialogueListings: function (args) {
        boilerplate(Scope.Broadcast, "setDialogueListings", args);

        const dialogues: Array<SlimDeck> = args.dialogueListings;
        const li = {
            ...state.listing.value,
            dialogues,
        };
        state.listing.value = li;
    },

    obtainKeyboard: function () {
        boilerplate(Scope.Local, "obtainKeyboard");

        state.componentRequiresFullKeyboardAccess.value = true;
    },

    relinquishKeyboard: function () {
        boilerplate(Scope.Local, "relinquishKeyboard");

        state.componentRequiresFullKeyboardAccess.value = false;
    },

    obtainKeyboardFn: function () {
        boilerplate(Scope.Local, "obtainKeyboardFn");

        return function (e: Event) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = true;
        };
    },

    relinquishKeyboardFn: function () {
        boilerplate(Scope.Local, "relinquishKeyboardFn");

        return function (e: Event) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = false;
        };
    },

    showNoteForm: function (noteKind: NoteKind, pointId?: number) {
        boilerplate(Scope.Local, "showNoteForm");

        let snf = { ...state.showNoteForm.value };

        snf[noteKind] = true;

        state.showNoteForm.value = snf;
        state.showNoteFormPointId.value = pointId || undefined;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideNoteForm: function (noteKind: NoteKind) {
        boilerplate(Scope.Local, "hideNoteForm");

        let snf = { ...state.showNoteForm.value };

        snf[noteKind] = false;

        state.showNoteForm.value = snf;
        state.showNoteFormPointId.value = undefined;
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    setRecentImages: function (args) {
        boilerplate(Scope.Broadcast, "setRecentImages", args);

        const recentImages: Array<UserUploadedImage> = args.recentImages;
        state.recentImages.value = recentImages;
    },

    deleteDeck: function (id: Key) {
        boilerplate(Scope.Local, "deleteDeck"); // todo

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
                orphans: state.listing.value.articles.orphans.filter(filterFn),
                recent: state.listing.value.articles.recent.filter(filterFn),
                rated: state.listing.value.articles.rated.filter(filterFn),
            };
        }

        if (state.listing.value.people) {
            li.people = {
                uncategorised:
                    state.listing.value.people.uncategorised.filter(filterFn),
                ancient: state.listing.value.people.ancient.filter(filterFn),
                medieval: state.listing.value.people.medieval.filter(filterFn),
                modern: state.listing.value.people.modern.filter(filterFn),
                contemporary:
                    state.listing.value.people.contemporary.filter(filterFn),
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
    },

    bookmarkToggle: function () {
        boilerplate(Scope.Local, "bookmarkToggle", {});

        state.bookmarksMinimised.value = !state.bookmarksMinimised.value;
    },

    setBookmarks: function (args) {
        boilerplate(Scope.Broadcast, "setBookmarks", args);

        const bookmarks: Array<Bookmark> = args.bookmarks;
        state.bookmarks.value = bookmarks;
    },

    setRecentlyUsedDecks: function (args) {
        boilerplate(Scope.Broadcast, "setRecentlyUsedDecks", args);

        const recents: Array<SlimDeck> = args.recents;
        state.recentlyUsedDecks.value = recents;
    },

    connectivityGraphShow: function () {
        boilerplate(Scope.Local, "connectivityGraphShow");

        state.showConnectivityGraph.value = true;
    },

    connectivityGraphHide: function () {
        boilerplate(Scope.Local, "connectivityGraphHide");

        state.showConnectivityGraph.value = false;
    },

    setReviewCount: function (args) {
        boilerplate(Scope.Broadcast, "setReviewCount", args);

        const count: number = args.count;
        state.memoriseReviewCount.value = count;
    },

    loadGraph: function (graph: FullGraphStruct) {
        boilerplate(Scope.Local, "loadGraph");

        let newGraph: Graph = {
            fullyLoaded: true,
            decks: graph.graphDecks,
            links: buildFullGraph(graph.graphConnections),
            deckIndexFromId: buildDeckIndex(graph.graphDecks),
        };
        state.graph.value = newGraph;
    },

    invalidateGraph: function () {
        boilerplate(Scope.Local, "invalidateGraph");

        state.graph.value = {
            fullyLoaded: false,
            decks: [],
            links: {},
            deckIndexFromId: [],
        };
    },
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
