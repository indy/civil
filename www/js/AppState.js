import { html, createContext, useContext, signal } from '/lib/preact/mod.js';

import { opposingKind } from '/js/JsUtils.js';
import { sortByResourceThenName } from '/js/CivilUtils.js';

import { NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

export const DELUXE_TOOLBAR_VIEW = 1;
export const DELUXE_TOOLBAR_EDIT = 2;
export const DELUXE_TOOLBAR_REFS = 3;
export const DELUXE_TOOLBAR_SR = 4;
export const DELUXE_TOOLBAR_ADD_ABOVE = 5;
export const DELUXE_TOOLBAR_ADD_BELOW = 6;

export const AppStateContext = createContext();

export const AppStateProvider = ({state, children}) => {
    return html`
        <${AppStateContext.Provider} value=${state}>
            ${children}
        </${AppStateContext.Provider}>`;
};

export const getAppState = () => useContext(AppStateContext);

const state = {
    appName: "Civil",

    toolbarMode: signal(DELUXE_TOOLBAR_VIEW),

    wasmInterface: undefined,   // initialised in index.js
    uiColours: {
        // note: this will be filled with extra values from
        // ColourCreator.js::augmentSettingsWithCssModifierParameters
    },

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

    // when a user is logged in:
    // user: {
    //   username: ...
    //   email: ...
    // },
    user: signal(undefined),

    preferredOrder: ["ideas", "people", "articles", "timelines", "quotes", "stats"],

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
    showNoteForm: signal({
        [NOTE_KIND_NOTE]: false,
        [NOTE_KIND_SUMMARY]: false,
        [NOTE_KIND_REVIEW]: false
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

const DEBUG_APP_STATE = false;

export const AppStateChange = {

    toolbarMode: function(newMode) {
        if (DEBUG_APP_STATE) {
            console.log("toolbarMode");
        }
        state.toolbarMode.value = newMode;
    },

    urlName: function(name) {
        if (DEBUG_APP_STATE) {
            console.log("setUrlName");
        }
        _setUrlName(name);
    },

    routeChanged: function(url) {
        if (DEBUG_APP_STATE) {
            console.log("routeChanged");
        }
        state.url.value = url;
    },

    obtainKeyboard: function(b) {
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    relinquishKeyboard: function(b) {
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    obtainKeyboardFn: function() {
        if (DEBUG_APP_STATE) {
            console.log("obtainKeyboard");
        }
        return function(e) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = true;
        }
    },

    relinquishKeyboardFn: function() {
        if (DEBUG_APP_STATE) {
            console.log("relinquishKeyboard");
        }
        return function(e) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = false;
        }
    },

    scratchListToggle: function() {
        if (DEBUG_APP_STATE) {
            console.log("scratchListToggle");
        }
        state.scratchListMinimised.value = !state.scratchListMinimised.value;
    },

    scratchListAddMulti: function(candidates) {
        if (DEBUG_APP_STATE) {
            console.log("scratchListAddMulti");
        }
        let sl = state.scratchList.value.slice();
        candidates.forEach(c => {
            sl.push(c);
        });
        state.scratchList.value = sl;
    },

    scratchListRemove: function(index) {
        if (DEBUG_APP_STATE) {
            console.log("scratchListRemove");
        }
        let sl = state.scratchList.value.slice();
        sl.splice(index, 1);
        state.scratchList.value = sl;
    },

    bookmarkUrl: function() {
        if (DEBUG_APP_STATE) {
            console.log("bookmarkUrl");
        }
        let sl = state.scratchList.value.slice();
        let candidate = parseForScratchList(state.url.value, state.urlName.value);

        sl.push(candidate);
        state.scratchList.value = sl;
    },

    cleanUI: function() {
        if (DEBUG_APP_STATE) {
            console.log("cleanUI");
        }
        state.verboseUI.value = false;
    },

    basicUI: function() {
        if (DEBUG_APP_STATE) {
            console.log("basicUI");
        }
        state.verboseUI.value = true;
    },

    showAddPointForm: function() {
        if (DEBUG_APP_STATE) {
            console.log("showAddPointForm");
        }
        state.showAddPointForm.value = true;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideAddPointForm: function() {
        if (DEBUG_APP_STATE) {
            console.log("hideAddPointForm");
        }
        state.showAddPointForm.value = false;
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    showNoteForm: function(noteKind) {
        if (DEBUG_APP_STATE) {
            console.log("showNoteForm");
        }
        let snf = {...state.showNoteForm.value};
        snf[noteKind] = true;

        state.showNoteForm.value = snf;
        state.componentRequiresFullKeyboardAccess.value = true;
    },

    hideNoteForm: function(noteKind) {
        if (DEBUG_APP_STATE) {
            console.log("hideNoteForm");
        }
        let snf = {...state.showNoteForm.value};
        snf[noteKind] = false;

        state.showNoteForm.value = snf;
        state.componentRequiresFullKeyboardAccess.value = false;
    },

    setRecentImages: function(recentImages) {
        if (DEBUG_APP_STATE) {
            console.log("setRecentImages");
        }
        state.recentImages.value = recentImages;
    },

    connectivityGraphShow: function() {
        if (DEBUG_APP_STATE) {
            console.log("connectivityGraphShow");
        }
        state.showConnectivityGraph.value = true;
    },

    connectivityGraphHide: function() {
        if (DEBUG_APP_STATE) {
            console.log("connectivityGraphHide");
        }
        state.showConnectivityGraph.value = false;
    },

    setReviewCount: function(count) {
        if (DEBUG_APP_STATE) {
            console.log("setReviewCount");
        }
        state.srReviewCount.value = count;
    },

    loadGraph: function(nodes, connections) {
        if (DEBUG_APP_STATE) {
            console.log("loadGraph");
        }
        let newGraph = {
            fullyLoaded: true,
            decks: nodes,
            links: buildFullGraph(connections),
            deckIndexFromId: buildDeckIndex(nodes)
        };
        state.graph.value = newGraph;
    },

    invalidateGraph: function() {
        if (DEBUG_APP_STATE) {
            console.log("invalidateGraph");
        }
        state.graph.value = { fullyLoaded: false };
    },

    uberSetup: function(uber) {
        if (DEBUG_APP_STATE) {
            console.log("uberSetup");
        }
        state.graph.value = { fullyLoaded: false };
        state.recentImages.value = uber.recentImages;
        state.imageDirectory.value = uber.directory;
        state.srReviewCount.value = uber.srReviewCount;
        state.srEarliestReviewDate.value = uber.srEarliestReviewDate;
    },

    setDeckListing: function(resource, listing) {
        if (DEBUG_APP_STATE) {
            console.log("setDeckListing");
        }
        let li = {...state.listing.value};
        li[resource] = listing;
        state.listing.value = li;
    },

    updatePeopleListing: function(newPerson) {
        if (DEBUG_APP_STATE) {
            console.log("updatePeopleListing");
        }
        let li = {...state.listing.value};

        if (li.people) {
            updateHashOfNames(li.people, newPerson);
        }

        state.listing.value = li;
    },

    noteRefsModified: function(allDecksForNote, changes) {
        if (DEBUG_APP_STATE) {
            console.log("noteRefsModified");
        }

        if (changes.referencesCreated.length > 0) {
            let ng = {...state.graph.value, fullLoaded: false };
            state.graph.value = ng;
        }

        if (state.listing.value.ideas) {
            let li = {...state.listing.value};
            changes.referencesCreated.forEach(r => {
                let newReference = allDecksForNote.find(d => d.name === r.name && d.resource === "ideas");

                if (newReference) {
                    let newIdeaListing = {
                        id: newReference.id,
                        name: newReference.name,
                        resource: "ideas"
                    };
                    // update the listing with the new resource
                    if (li.ideas.recent) {
                        li.ideas.recent.unshift(newIdeaListing);
                    }
                    if (li.ideas.unnoted) {
                        li.ideas.unnoted.unshift(newIdeaListing);
                    }
                }
            });

            state.listing.value = li;
        }
    },

    deleteDeck: function(id) {
        if (DEBUG_APP_STATE) {
            console.log("deleteDeck");
        }
        let filterFn = d => d.id !== id;

        if (state.graph.value && state.graph.value.decks) {
            let g = { ...state.graph.value,
                      decks: state.graph.value.decks.filter(filterFn)};
            state.graph.value = g;
        }

        let li = {};

        if (state.listing.value.ideas) {
            li.ideas = {
                orphans: state.listing.value.ideas.orphans.filter(filterFn),
                recent: state.listing.value.ideas.recent.filter(filterFn),
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
            li.people = state.listing.value.people.filter(filterFn);
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
    }
}

function _setUrlName(name) {
    state.urlName.value = name;
    document.title = `${state.appName}: ${name}`;
}

function parseForScratchList(url, urlName) {
    // note: this will break if we ever change the url schema
    let res = url.match(/^\/(\w+)\/(\w+)/);

    let id = res[2];
    let resource = res[1];

    return { id: parseInt(id, 10), name: urlName, resource: resource}
}

function updateHashOfNames(people, obj) {
    function updateArrayOfNames(arr) {

        let isEntry = false;
        // check if the title of obj has changed, update the listing array if necessary
        //
        arr.forEach(a => {
            if (a.id === obj.id) {
                isEntry = true;
                a.name = obj.name;
            }
        });

        if (!isEntry) {
            // this is a new entry, place it at the start of the list
            arr.unshift({id: obj.id, name: obj.name});
        }
    }

    updateArrayOfNames(people.uncategorised);
    updateArrayOfNames(people.ancient);
    updateArrayOfNames(people.medieval);
    updateArrayOfNames(people.contemporary);
}




function packedToKind(packed) {
    switch(packed) {
    case 0: return 'ref';
    case -1: return 'refToParent';
    case 1: return 'refToChild';
    case 42: return 'refInContrast';
    case 99: return 'refCritical';
    default: {
        console.log(`packed_to_kind invalid value: ${packed}`);
        return 'packed_to_kind ERROR';
    }
    }
}

function buildFullGraph(graphConnections) {
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

function buildDeckIndex(decks) {
    let res = [];

    decks.forEach((d, i) => {
        res[d.id] = i;
    });

    return res;
}
