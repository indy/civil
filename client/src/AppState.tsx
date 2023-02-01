import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";

import { IUser, IUberSetup, IState, ToolbarMode, IDeckSimple, IIdeasListings, IPeopleListings, IArticleListings } from "./types";

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
    setDeckListing: function(resource: string, listing: Array<IDeckSimple>) {
        console.error("REPLACE setDeckListing WITH ILISTING SPECIFIC VARIANTS");
    },

};
