import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import {
    IGraph,
    IListing,
    IUser,
    IUberSetup,
    IState,
    ToolbarMode,
    IDeckSimple,
    IIdeasListings,
    IPeopleListings,
    IArticleListings,
    IUserUploadedImage,
} from "./types";

import { opposingKind } from "./JsUtils";

const emptyUser: IUser = {
    username: "",
    email: "",
    admin: { dbName: "" },
};

const state: IState = {
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

    // to add the current page to the scratchList we need the id, name, resource.
    // id and resource can be parsed from the url, but the name needs to be
    // stored separately
    //
    urlName: signal(""),

    // the url of the current page
    url: signal(""),

    user: signal(emptyUser),

    preferredOrder: [
        "ideas",
        "people",
        "articles",
        "timelines",
        "quotes",
        "stuff",
    ],

    // key == resource name of decks
    listing: signal({
        ideas: undefined, // when listing ideas on /ideas page
        articles: undefined,
        people: undefined,
        timelines: undefined,
    }),

    verboseUI: signal(true),

    // put the variables in square brackets so that they're evaluated
    //
    // showNoteForm: signal({
    //     [NOTE_KIND_NOTE]: false,
    //     [NOTE_KIND_SUMMARY]: false,
    //     [NOTE_KIND_REVIEW]: false
    // }),
    showNoteForm: signal({
        note: false,
        summary: false,
        review: false,
    }),

    // same for the Add Point form
    showAddPointForm: signal(false),

    recentImages: signal([]),
    imageDirectory: signal(""),

    showConnectivityGraph: signal(false),
    graph: signal({
        fullyLoaded: false,
        // an array of { id, name, resource }
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
    state: IState;
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

    uberSetup: function (uber: IUberSetup) {
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
    userLogin: function (user: IUser) {
        if (DEBUG_APP_STATE) {
            console.log("userLogin");
        }
        state.user.value = user;
    },
    userLogout: function () {
        if (DEBUG_APP_STATE) {
            console.log("userLogout");
        }
        let user: IUser = { ...state.user.value };
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

    setIdeasListing: function (listing: IIdeasListings) {
        if (DEBUG_APP_STATE) {
            console.log("setIdeasListing");
        }
        let li = { ...state.listing.value };
        li.ideas = listing;
        state.listing.value = li;
    },
    setPeopleListing: function (listing: IPeopleListings) {
        if (DEBUG_APP_STATE) {
            console.log("setPeopleListing");
        }
        let li = { ...state.listing.value };
        li.people = listing;
        state.listing.value = li;
    },
    setArticlesListing: function (listing: IArticleListings) {
        if (DEBUG_APP_STATE) {
            console.log("setArticleListing");
        }
        let li = { ...state.listing.value };
        li.articles = listing;
        state.listing.value = li;
    },
    setTimelineListing: function (listing: Array<IDeckSimple>) {
        if (DEBUG_APP_STATE) {
            console.log("setIdeasListing");
        }
        let li = { ...state.listing.value };
        li.timelines = listing;
        state.listing.value = li;
    },

    noteRefsModified: function (allDecksForNote?: any, changes?: any) {
        if (DEBUG_APP_STATE) {
            console.log("noteRefsModified");
        }

        if (changes.referencesCreated.length > 0) {
            let ng = { ...state.graph.value, fullLoaded: false };
            state.graph.value = ng;
        }

        if (state.listing.value.ideas) {
            let li: IListing = { ...state.listing.value };
            if (li) {
                changes.referencesCreated.forEach((r) => {
                    let newReference = allDecksForNote.find(
                        (d) => d.name === r.name && d.resource === "ideas"
                    );

                    if (newReference) {
                        // todo: what should insignia be here?
                        let newIdeaListing: IDeckSimple = {
                            id: newReference.id,
                            name: newReference.name,
                            resource: "ideas",
                            insignia: 0,
                        };
                        if (li.ideas) {
                            // update the listing with the new resource
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

    setDeckListing: function (resource: string, listing: any) {
        if (DEBUG_APP_STATE) {
            console.log("setDeckListing");
        }
        let li = { ...state.listing.value };
        if (li) {
            if (resource == "ideas") {
                li.ideas = listing;
            } else if (resource == "people") {
                li.people = listing;
            } else if (resource == "articles") {
                li.articles = listing;
            } else if (resource == "timelines") {
                li.timelines = listing;
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

    showNoteForm: function (noteKind: any) {
        if (DEBUG_APP_STATE) {
            console.log("showNoteForm");
        }
        let snf = { ...state.showNoteForm.value };
        snf[noteKind] = true;

        state.showNoteForm.value = snf;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideNoteForm: function (noteKind: any) {
        if (DEBUG_APP_STATE) {
            console.log("hideNoteForm");
        }
        let snf = { ...state.showNoteForm.value };
        snf[noteKind] = false;

        state.showNoteForm.value = snf;
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    setRecentImages: function (recentImages: Array<IUserUploadedImage>) {
        if (DEBUG_APP_STATE) {
            console.log("setRecentImages");
        }
        state.recentImages.value = recentImages;
    },

    deleteDeck: function (id: any) {
        // todo: typescript check the IListing entry and the filterFn

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

        let li: IListing = {
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

    scratchListAddMulti: function (candidates) {
        if (DEBUG_APP_STATE) {
            console.log("scratchListAddMulti");
        }
        let sl = state.scratchList.value.slice();
        candidates.forEach((c) => {
            sl.push(c);
        });
        state.scratchList.value = sl;
    },

    scratchListRemove: function (index) {
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
        let candidate: any = parseForScratchList(
            state.url.value,
            state.urlName.value
        );

        sl.push(candidate);
        state.scratchList.value = sl;
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

    loadGraph: function (nodes?: any, connections?: any) {
        if (DEBUG_APP_STATE) {
            console.log("loadGraph");
        }
        let newGraph: IGraph = {
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
        state.graph.value = { fullyLoaded: false };
    },
};

function parseForScratchList(url?: any, urlName?: any) {
    // note: this will break if we ever change the url schema
    let res = url.match(/^\/(\w+)\/(\w+)/);

    let id = res[2];
    let resource = res[1];

    return { id: parseInt(id, 10), name: urlName, resource: resource };
}

function packedToKind(packed?: any) {
    switch (packed) {
        case 0:
            return "ref";
        case -1:
            return "refToParent";
        case 1:
            return "refToChild";
        case 42:
            return "refInContrast";
        case 99:
            return "refCritical";
        default: {
            console.log(`packed_to_kind invalid value: ${packed}`);
            return "packed_to_kind ERROR";
        }
    }
}

function buildFullGraph(graphConnections?: any) {
    let res = {};

    for (let i = 0; i < graphConnections.length; i += 4) {
        let fromDeck = graphConnections[i + 0];
        let toDeck = graphConnections[i + 1];
        let packedKind = graphConnections[i + 2];
        let strength = graphConnections[i + 3];

        let kind = packedToKind(packedKind);

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

function buildDeckIndex(decks?: any) {
    let res: any = [];

    decks.forEach((d, i) => {
        res[d.id] = i;
    });

    return res;
}
