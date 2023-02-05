import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import { IListing, IUser, IUberSetup, IState, ToolbarMode, IDeckSimple, IIdeasListings, IPeopleListings, IArticleListings, IUserUploadedImage } from "./types";

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
    urlName: signal(''),

    // the url of the current page
    url: signal(''),

    user: signal(emptyUser),

    preferredOrder: ["ideas", "people", "articles", "timelines", "quotes", "stuff"],

    // key == resource name of decks
    listing: signal({
        ideas: undefined,           // when listing ideas on /ideas page
        articles: undefined,
        people: undefined,
        timelines: undefined
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
        review: false
    }),

    // same for the Add Point form
    showAddPointForm: signal(false),

    recentImages: signal([]),
    imageDirectory: signal(''),

    showConnectivityGraph: signal(false),
    graph: signal({
        fullyLoaded: false,
        // an array of { id, name, resource }
        decks: [],
        links: [],
        // an array which is indexed by deckId, returns the offset into state.graph.value.decks
        deckIndexFromId: []
    }),

    scratchList: signal([]),
    scratchListMinimised: signal(false),

    srReviewCount: signal(0),
    srEarliestReviewDate: signal(undefined)
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
    toolbarMode: function(newMode: ToolbarMode) {
        if (DEBUG_APP_STATE) {
            console.log("toolbarMode");
        }
        state.toolbarMode.value = newMode;
    },
    urlName: function(name: string) {
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
            deckIndexFromId: []
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
    setIdeasListing: function(listing: IIdeasListings) {
        if (DEBUG_APP_STATE) {
            console.log("setIdeasListing");
        }
        let li = {...state.listing.value};
        li.ideas = listing;
        state.listing.value = li;
    },
    setPeopleListing: function(listing: IPeopleListings) {
        if (DEBUG_APP_STATE) {
            console.log("setPeopleListing");
        }
        let li = {...state.listing.value};
        li.people = listing;
        state.listing.value = li;
    },
    setArticlesListing: function(listing: IArticleListings) {
        if (DEBUG_APP_STATE) {
            console.log("setArticleListing");
        }
        let li = {...state.listing.value};
        li.articles = listing;
        state.listing.value = li;
    },
    setTimelineListing: function(listing: Array<IDeckSimple>) {
        if (DEBUG_APP_STATE) {
            console.log("setIdeasListing");
        }
        let li = {...state.listing.value};
        li.timelines = listing;
        state.listing.value = li;
    },

    noteRefsModified: function(allDecksForNote?: any, changes?: any) {
        if (DEBUG_APP_STATE) {
            console.log("noteRefsModified");
        }

        if (changes.referencesCreated.length > 0) {
            let ng = {...state.graph.value, fullLoaded: false };
            state.graph.value = ng;
        }

        if (state.listing.value.ideas) {
            let li: IListing = { ...state.listing.value };
            if (li) {
                changes.referencesCreated.forEach(r => {
                    let newReference = allDecksForNote.find(d => d.name === r.name && d.resource === "ideas");

                    if (newReference) {
                        // todo: what should insignia be here?
                        let newIdeaListing: IDeckSimple = {
                            id: newReference.id,
                            name: newReference.name,
                            resource: "ideas",
                            insignia: 0
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

    setDeckListing: function(resource: string, listing: any) {
        if (DEBUG_APP_STATE) {
            console.log("setDeckListing");
        }
        let li = { ...state.listing.value };
        if (li)  {
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

    obtainKeyboard: function() {
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    relinquishKeyboard: function() {
        // isg todo: the original js code had a bug in which this was set to true
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    obtainKeyboardFn: function() {
        if (DEBUG_APP_STATE) {
            console.log("obtainKeyboard");
        }
        return function(e: Event) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = true;
        }
    },

    relinquishKeyboardFn: function() {
        if (DEBUG_APP_STATE) {
            console.log("relinquishKeyboard");
        }
        return function(e: Event) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = false;
        }
    },

    showNoteForm: function(noteKind: any) {
        if (DEBUG_APP_STATE) {
            console.log("showNoteForm");
        }
        let snf = {...state.showNoteForm.value};
        snf[noteKind] = true;

        state.showNoteForm.value = snf;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideNoteForm: function(noteKind: any) {
        if (DEBUG_APP_STATE) {
            console.log("hideNoteForm");
        }
        let snf = {...state.showNoteForm.value};
        snf[noteKind] = false;

        state.showNoteForm.value = snf;
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    setRecentImages: function(recentImages: Array<IUserUploadedImage>) {
        if (DEBUG_APP_STATE) {
            console.log("setRecentImages");
        }
        state.recentImages.value = recentImages;
    },

    deleteDeck: function(id: any) {
        // todo: typescript check the IListing entry and the filterFn

        if (DEBUG_APP_STATE) {
            console.log("deleteDeck");
        }
        let filterFn = d => d.id !== id;

        if (state.graph.value && state.graph.value.decks) {
            let g = { ...state.graph.value,
                      decks: state.graph.value.decks.filter(filterFn)};
            state.graph.value = g;
        }

        let li: IListing = {
            ideas: undefined,
            people: undefined,
            articles: undefined,
            timelines: undefined
        };

        if (state.listing.value.ideas) {
            li.ideas = {
                orphans: state.listing.value.ideas.orphans.filter(filterFn),
                recent: state.listing.value.ideas.recent.filter(filterFn),
                unnoted: state.listing.value.ideas.unnoted.filter(filterFn),
            };
        };

        if (state.listing.value.articles) {
            li.articles = {
                orphans: state.listing.value.articles.orphans.filter(filterFn),
                recent: state.listing.value.articles.recent.filter(filterFn),
                rated: state.listing.value.articles.rated.filter(filterFn),
            };
        }

        if (state.listing.value.people) {
            li.people = {
                uncategorised: state.listing.value.people.uncategorised.filter(filterFn),
                ancient: state.listing.value.people.ancient.filter(filterFn),
                medieval: state.listing.value.people.medieval.filter(filterFn),
                modern: state.listing.value.people.modern.filter(filterFn),
                contemporary: state.listing.value.people.contemporary.filter(filterFn)
            };
        }

        if (state.listing.value.timelines) {
            li.timelines = state.listing.value.timelines.filter(filterFn);
        }

        state.listing.value = li;

        if (state.graph.value.links) {
            let g = {...state.graph.value};
            delete g.links[id];
            state.graph.value = g;
        }
    },

    setReviewCount: function(count: number) {
        if (DEBUG_APP_STATE) {
            console.log("setReviewCount");
        }
        state.srReviewCount.value = count;
    },

};
