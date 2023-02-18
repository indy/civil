import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import {
    AnyDeckListing,
    ArticleListings,
    DeckKind,
    SlimDeck,
    Graph,
    GraphNode,
    IdeasListings,
    Listing,
    NoteKind,
    PeopleListings,
    Ref,
    RefKind,
    RefsModified,
    State,
    ToolbarMode,
    UberSetup,
    User,
    UserUploadedImage,
} from "./types";

import { opposingKind } from "./JsUtils";

const emptyUser: User = {
    username: "",
    email: "",
    admin: { dbName: "" },
};

const state: State = {
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
    oldestAliveAge: 120,

    // when true don't let searchCommand accept any keystrokes
    componentRequiresFullKeyboardAccess: signal(false),

    showingSearchCommand: signal(false),

    // to add the current page to the scratchList we need the id, name, deckKind.
    // id and deckKind can be parsed from the url, but the name needs to be
    // stored separately
    //
    urlName: signal(""),

    // the url of the current page
    url: signal(""),

    user: signal(emptyUser),

    preferredDeckKindOrder: [
        DeckKind.Idea,
        DeckKind.Person,
        DeckKind.Article,
        DeckKind.Timeline,
        DeckKind.Quote,
    ],

    preferredOrder: [
        "ideas",
        "people",
        "articles",
        "timelines",
        "quotes",
        "stuff",
    ],

    // key == deckKind name of decks
    listing: signal({
        ideas: undefined, // when listing ideas on /ideas page
        articles: undefined,
        people: undefined,
        timelines: undefined,
    }),

    verboseUI: signal(true),

    showNoteForm: signal({
        note: false,
        summary: false,
        review: false,
    }),
    showNoteFormPointId: signal(undefined),

    // same for the Add Point form
    showAddPointForm: signal(false),

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
    toolbarMode: function (newMode: ToolbarMode) {
        if (DEBUG_APP_STATE) {
            console.log("toolbarMode");
        }
        state.toolbarMode.value = newMode;
    },
    urlName: function (name: string) {
        if (DEBUG_APP_STATE) {
            console.log("urlName");
        }
        state.urlName.value = name;
        document.title = `${state.appName}: ${name}`;
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

    setIdeasListing: function (listing: IdeasListings) {
        if (DEBUG_APP_STATE) {
            console.log("setIdeasListing");
        }
        let li = { ...state.listing.value };
        li.ideas = listing;
        state.listing.value = li;
    },
    setPeopleListing: function (listing: PeopleListings) {
        if (DEBUG_APP_STATE) {
            console.log("setPeopleListing");
        }
        let li = { ...state.listing.value };
        li.people = listing;
        state.listing.value = li;
    },
    setArticlesListing: function (listing: ArticleListings) {
        if (DEBUG_APP_STATE) {
            console.log("setArticleListing");
        }
        let li = { ...state.listing.value };
        li.articles = listing;
        state.listing.value = li;
    },
    setTimelineListing: function (listing: Array<SlimDeck>) {
        if (DEBUG_APP_STATE) {
            console.log("setIdeasListing");
        }
        let li = { ...state.listing.value };
        li.timelines = listing;
        state.listing.value = li;
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
                        (d) => d.title === r.title && d.deckKind === DeckKind.Idea
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

    setDeckListing: function (deckKind: DeckKind, listing: AnyDeckListing) {
        if (DEBUG_APP_STATE) {
            console.log("setDeckListing");
        }
        let li = { ...state.listing.value };
        if (li) {
            if (deckKind == DeckKind.Idea) {
                li.ideas = listing as IdeasListings;
            } else if (deckKind == DeckKind.Person) {
                li.people = listing as PeopleListings;
            } else if (deckKind == DeckKind.Article) {
                li.articles = listing as ArticleListings;
            } else if (deckKind == DeckKind.Timeline) {
                li.timelines = listing as Array<SlimDeck>;
            }
            state.listing.value = li;
        }
    },

    obtainKeyboard: function () {
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    relinquishKeyboard: function () {
        // isg todo: the original js code had a bug in which this was set to true
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
        if (noteKind == NoteKind.Note) {
            snf.note = true;
        } else if (noteKind == NoteKind.NoteSummary) {
            snf.summary = true;
        } else if (noteKind == NoteKind.NoteReview) {
            snf.review = true;
        }

        state.showNoteForm.value = snf;
        state.showNoteFormPointId.value = pointId || undefined;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideNoteForm: function (noteKind: NoteKind) {
        if (DEBUG_APP_STATE) {
            console.log("hideNoteForm");
        }
        let snf = { ...state.showNoteForm.value };

        if (noteKind == NoteKind.Note) {
            snf.note = false;
        } else if (noteKind == NoteKind.NoteSummary) {
            snf.summary = false;
        } else if (noteKind == NoteKind.NoteReview) {
            snf.review = false;
        }

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

    deleteDeck: function (id: number) {
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

    bookmarkUrl: function () {
        if (DEBUG_APP_STATE) {
            console.log("bookmarkUrl");
        }
        let sl = state.scratchList.value.slice();
        let candidate: SlimDeck | undefined = parseForScratchList(
            state.url.value,
            state.urlName.value
        );

        if (candidate) {
            sl.push(candidate);
            state.scratchList.value = sl;
        }
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

    loadGraph: function (nodes: Array<GraphNode>, connections: Array<number>) {
        if (DEBUG_APP_STATE) {
            console.log("loadGraph");
        }
        let newGraph: Graph = {
            fullyLoaded: true,
            decks: nodes,
            links: buildFullGraph(connections),
            deckIndexFromId: buildDeckIndex(nodes),
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

function parseForScratchList(
    url: string,
    urlName: string
): SlimDeck | undefined {
    // note: this will break if we ever change the url schema
    let res = url.match(/^\/(\w+)\/(\w+)/);

    if (res) {
        let id = res[2];
        let resource = res[1];

        let dk: DeckKind = DeckKind.Article;
        if (resource === "articles") {
            dk = DeckKind.Article;
        } else if (resource === "ideas") {
            dk = DeckKind.Idea;
        } else if (resource === "people") {
            dk = DeckKind.Person;
        } else if (resource === "timelines") {
            dk = DeckKind.Timeline;
        } else if (resource === "quotes") {
            dk = DeckKind.Quote;
        }

        return {
            id: parseInt(id, 10),
            title: urlName,
            deckKind: dk,
            insignia: 0,
        };
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

function buildDeckIndex(decks: Array<GraphNode>) {
    let res: Array<number> = [];

    decks.forEach((d, i) => {
        res[d.id] = i;
    });

    return res;
}
