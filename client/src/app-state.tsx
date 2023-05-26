import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import {
    ArticleListings,
    DeckKind,
    PreviewDeck,
    PreviewNotes,
    FullGraphStruct,
    Graph,
    GraphDeck,
    IdeasListings,
    Key,
    Listing,
    NoteKind,
    Notes,
    PeopleListings,
    Ref,
    RefKind,
    RefsModified,
    SlimDeck,
    State,
    ToolbarMode,
    UberSetup,
    User,
    UserUploadedImage,
    VisiblePreview,
} from "types";

import { noteSeq } from "utils/civil";

const emptyUser: User = {
    username: "",
    email: "",
    admin: { dbName: "" },
};

const state: State = {
    debugMessages: signal([]),

    appName: "civil",
    toolbarMode: signal(ToolbarMode.View),
    wasmInterface: undefined,

    settings: signal({
        hueDelta: 30,

        hueOffsetFg: 0,
        saturationFg: 0,
        lightnessFg: 0,

        hueOffsetBg: 0,
        saturationBg: 0,
        lightnessBg: 0,
    }),
    definitions: signal({}),

    // this is set via the --search-always-visible css variable so
    // that mobile touch devices will always show the search bar
    //
    hasPhysicalKeyboard: true,

    // oldest reasonable age in years, any person whose birth means they're older can be assumed to be dead
    //
    oldestAliveAge: 120,

    // when true don't let searchCommand accept any keystrokes
    //
    componentRequiresFullKeyboardAccess: signal(false),
    showingSearchCommand: signal(false),

    // to add the current page to the scratchList we need the id, name, deckKind.
    // id and deckKind can be parsed from the url, but the name needs to be
    // stored separately
    //
    urlTitle: signal(""),

    // the url of the current page
    //
    url: signal(""),

    user: signal(emptyUser),

    // preferred order of rendering the back-refs
    //
    preferredDeckKindOrder: [
        DeckKind.Quote,
        DeckKind.Idea,
        DeckKind.Person,
        DeckKind.Article,
        DeckKind.Timeline,
        DeckKind.Dialogue,
    ],

    // preferred order of the top-level menu bar
    //
    preferredOrder: [
        "dialogues",
        "ideas",
        "people",
        "articles",
        "timelines",
        "quotes",
        "stuff",
        "sr",
    ],

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

    verboseUI: signal(true),

    showNoteForm: signal({
        [NoteKind.Note]: false,
        [NoteKind.NoteReview]: false,
        [NoteKind.NoteSummary]: false,
        [NoteKind.NoteDeckMeta]: false,
    }),
    showNoteFormPointId: signal(undefined),

    // same for the Add Point form
    showAddPointForm: signal(false),

    recentDecks: signal([]),

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

    scratchList: signal([]),
    scratchListMinimised: signal(false),

    srReviewCount: signal(0),
    srEarliestReviewDate: signal(undefined),
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

const DEBUG_APP_STATE = false;

export const AppStateChange = {
    showPreviewDeck: function (deckId: Key) {
        if (DEBUG_APP_STATE) {
            console.log("showPreviewDeck");
        }
        let vp: VisiblePreview = {
            id: deckId,
            showing: true,
        };

        state.visiblePreviewDeck.value = vp;
    },
    hidePreviewDeck: function (deckId: Key) {
        if (DEBUG_APP_STATE) {
            console.log("hidePreviewDeck");
        }

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
        if (DEBUG_APP_STATE) {
            console.log("addPreviewDeck");
        }
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
            notes: ns,
        };

        pc[previewDeck.id] = previewDeck;
        state.previewCache.value = pc;
    },
    setShowingSearchCommand: function (b: boolean) {
        if (DEBUG_APP_STATE) {
            console.log("setShowingSearchCommand");
        }

        state.showingSearchCommand.value = b;
    },
    resetShowingSearchCommand: function () {
        if (DEBUG_APP_STATE) {
            console.log("resetShowingSearchCommand");
        }
        state.showingSearchCommand.value = !state.hasPhysicalKeyboard;
    },
    addDebugMessage: function (msg: string) {
        if (DEBUG_APP_STATE) {
            console.log("addDebugMessage");
        }

        let dm = state.debugMessages.value.slice();
        dm.unshift(msg);
        state.debugMessages.value = dm;
    },
    toolbarMode: function (newMode: ToolbarMode) {
        if (DEBUG_APP_STATE) {
            console.log("toolbarMode");
        }
        state.toolbarMode.value = newMode;
    },
    urlTitle: function (title: string) {
        if (DEBUG_APP_STATE) {
            console.log("urlTitle");
        }
        state.urlTitle.value = title;
        document.title = `${state.appName}: ${title}`;
    },
    routeChanged: function (url: string) {
        if (DEBUG_APP_STATE) {
            console.log("routeChanged");
        }
        state.url.value = url;
    },

    uberSetup: function (uber: UberSetup) {
        if (DEBUG_APP_STATE) {
            console.log("uberSetup");
        }

        state.graph.value = {
            fullyLoaded: false,
            decks: [],
            links: [],
            deckIndexFromId: [],
        };

        state.recentImages.value = uber.recentImages;
        state.imageDirectory.value = uber.directory;
        state.srReviewCount.value = uber.srReviewCount;
        state.srEarliestReviewDate.value = uber.srEarliestReviewDate;
    },
    userLogin: function (user: User) {
        if (DEBUG_APP_STATE) {
            console.log("userLogin");
        }
        state.user.value = user;
    },
    userLogout: function () {
        if (DEBUG_APP_STATE) {
            console.log("userLogout");
        }
        let user: User = { ...state.user.value };
        user.username = "";

        state.user.value = user;
    },

    showAddPointForm: function () {
        if (DEBUG_APP_STATE) {
            console.log("showAddPointForm");
        }
        state.showAddPointForm.value = true;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideAddPointForm: function () {
        if (DEBUG_APP_STATE) {
            console.log("hideAddPointForm");
        }
        state.showAddPointForm.value = false;
        state.componentRequiresFullKeyboardAccess.value = false;
    },
    noteRefsModified: function (
        allDecksForNote: Array<Ref>,
        changes: RefsModified
    ) {
        if (DEBUG_APP_STATE) {
            console.log("noteRefsModified");
        }

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

    setIdeaListings: function (ideas: IdeasListings) {
        let li = {
            ...state.listing.value,
            ideas,
        };
        state.listing.value = li;
    },

    setPeopleListings: function (people: PeopleListings) {
        let li = {
            ...state.listing.value,
            people,
        };
        state.listing.value = li;
    },

    setArticleListings: function (articles: ArticleListings) {
        let li = {
            ...state.listing.value,
            articles,
        };
        state.listing.value = li;
    },

    setTimelineListings: function (timelines: Array<SlimDeck>) {
        let li = {
            ...state.listing.value,
            timelines,
        };
        state.listing.value = li;
    },

    setDialogueListings: function (dialogues: Array<SlimDeck>) {
        let li = {
            ...state.listing.value,
            dialogues,
        };
        state.listing.value = li;
    },

    obtainKeyboard: function () {
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    relinquishKeyboard: function () {
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    obtainKeyboardFn: function () {
        if (DEBUG_APP_STATE) {
            console.log("obtainKeyboard");
        }
        return function (e: Event) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = true;
        };
    },

    relinquishKeyboardFn: function () {
        if (DEBUG_APP_STATE) {
            console.log("relinquishKeyboard");
        }
        return function (e: Event) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = false;
        };
    },

    showNoteForm: function (noteKind: NoteKind, pointId?: number) {
        if (DEBUG_APP_STATE) {
            console.log("showNoteForm");
        }
        let snf = { ...state.showNoteForm.value };

        snf[noteKind] = true;

        state.showNoteForm.value = snf;
        state.showNoteFormPointId.value = pointId || undefined;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideNoteForm: function (noteKind: NoteKind) {
        if (DEBUG_APP_STATE) {
            console.log("hideNoteForm");
        }
        let snf = { ...state.showNoteForm.value };

        snf[noteKind] = false;

        state.showNoteForm.value = snf;
        state.showNoteFormPointId.value = undefined;
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    setRecentImages: function (recentImages: Array<UserUploadedImage>) {
        if (DEBUG_APP_STATE) {
            console.log("setRecentImages");
        }
        state.recentImages.value = recentImages;
    },

    deleteDeck: function (id: Key) {
        // todo: typescript check the Listing entry and the filterFn

        if (DEBUG_APP_STATE) {
            console.log("deleteDeck");
        }
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

    scratchListToggle: function () {
        if (DEBUG_APP_STATE) {
            console.log("scratchListToggle");
        }
        state.scratchListMinimised.value = !state.scratchListMinimised.value;
    },

    scratchListAddMulti: function (candidates: Array<SlimDeck>) {
        if (DEBUG_APP_STATE) {
            console.log("scratchListAddMulti");
        }
        let sl = state.scratchList.value.slice();
        candidates.forEach((c) => {
            sl.push(c);
        });
        state.scratchList.value = sl;
    },

    scratchListRemove: function (index: number) {
        if (DEBUG_APP_STATE) {
            console.log("scratchListRemove");
        }
        let sl = state.scratchList.value.slice();
        sl.splice(index, 1);
        state.scratchList.value = sl;
    },

    scratchlistLinkToggle: function () {
        if (DEBUG_APP_STATE) {
            console.log("scratchlistLinkToggle");
        }
        if (state.toolbarMode.value === ToolbarMode.ScratchListLinks) {
            state.toolbarMode.value = ToolbarMode.View;
        } else {
            state.toolbarMode.value = ToolbarMode.ScratchListLinks;
        }
    },

    addScratchListLink: function (candidate: SlimDeck) {
        if (DEBUG_APP_STATE) {
            console.log("addScratchListLink");
        }
        addSlimDeckToScratchList(state, candidate);
    },

    addCurrentUrlToScratchList: function () {
        if (DEBUG_APP_STATE) {
            console.log("addCurrentUrlToScratchList");
        }
        let candidate: SlimDeck | undefined = parseCurrentUrlIntoSlimDeck(
            state.url.value,
            state.urlTitle.value
        );
        if (candidate) {
            addSlimDeckToScratchList(state, candidate);
        }
    },

    addRecentDeck: function (ref: SlimDeck) {
        if (DEBUG_APP_STATE) {
            console.log("addRecentDeck");
        }

        let sl = state.recentDecks.value.slice();
        sl.unshift(ref);
        sl.slice(0, 3);
        console.log(sl);
        state.recentDecks.value = sl;
    },

    cleanUI: function () {
        if (DEBUG_APP_STATE) {
            console.log("cleanUI");
        }
        state.verboseUI.value = false;
    },

    basicUI: function () {
        if (DEBUG_APP_STATE) {
            console.log("basicUI");
        }
        state.verboseUI.value = true;
    },

    connectivityGraphShow: function () {
        if (DEBUG_APP_STATE) {
            console.log("connectivityGraphShow");
        }
        state.showConnectivityGraph.value = true;
    },

    connectivityGraphHide: function () {
        if (DEBUG_APP_STATE) {
            console.log("connectivityGraphHide");
        }
        state.showConnectivityGraph.value = false;
    },

    setReviewCount: function (count: number) {
        if (DEBUG_APP_STATE) {
            console.log("setReviewCount");
        }
        state.srReviewCount.value = count;
    },

    loadGraph: function (graph: FullGraphStruct) {
        if (DEBUG_APP_STATE) {
            console.log("loadGraph");
        }
        let newGraph: Graph = {
            fullyLoaded: true,
            decks: graph.graphDecks,
            links: buildFullGraph(graph.graphConnections),
            deckIndexFromId: buildDeckIndex(graph.graphDecks),
        };
        state.graph.value = newGraph;
    },

    invalidateGraph: function () {
        if (DEBUG_APP_STATE) {
            console.log("invalidateGraph");
        }
        state.graph.value = {
            fullyLoaded: false,
            decks: [],
            links: {},
            deckIndexFromId: [],
        };
    },
};

function addSlimDeckToScratchList(state: State, candidate: SlimDeck) {
    let sl = state.scratchList.value.slice();
    sl.push(candidate);
    state.scratchList.value = sl;
}

function parseCurrentUrlIntoSlimDeck(
    url: string,
    urlTitle: string
): SlimDeck | undefined {
    function resourceStringToDeckKind(s: string): DeckKind | undefined {
        if (s === "articles") {
            return DeckKind.Article;
        }
        if (s === "ideas") {
            return DeckKind.Idea;
        }
        if (s === "people") {
            return DeckKind.Person;
        }
        if (s === "timelines") {
            return DeckKind.Timeline;
        }
        if (s === "quotes") {
            return DeckKind.Quote;
        }
        if (s === "dialogues") {
            return DeckKind.Dialogue;
        }
        return undefined;
    }
    // note: this will break if we ever change the url schema
    let re = url.match(/^\/(\w+)\/(\w+)/);

    if (re) {
        let id = re[2];
        let resource = re[1];

        let dk: DeckKind | undefined = resourceStringToDeckKind(resource);

        if (dk) {
            let res: SlimDeck = {
                id: parseInt(id, 10),
                title: urlTitle,
                deckKind: dk,
                insignia: 0,
            };

            return res;
        } else {
            console.error(
                `unable to determine DeckKind from parsing "${resource}"`
            );
        }
    }

    return undefined;
}

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
