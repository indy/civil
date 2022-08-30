import { opposingKind } from '/js/JsUtils.js';
import { sortByResourceThenName, sortByTitle } from '/js/CivilUtils.js';

import { NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

export const initialState = {
    user: undefined,
    // when a user is logged in:
    // user: {
    //   username: ...
    //   email: ...
    // },

    uiColours: {
        // note: this will be filled with extra values from
        // ColourCreator.js::augmentSettingsWithCssModifierParameters
    },

    // this is set via the --search-always-visible css variable so
    // that mobile touch devices will always show the search bar
    //
    hasPhysicalKeyboard: true,

    showingSearchCommand: false,

    // when true don't let searchCommand accept any keystrokes
    componentRequiresFullKeyboardAccess: false,

    readOnly: false,

    // the url of the current page
    url: '',
    // to add the current page to the scratchList we need the id, name, resource.
    // id and resource can be parsed from the url, but the name needs to be
    // stored separately
    //
    urlName: '',

    scratchList: [],
    scratchListMinimised: false,


    // put the variables in square brackets so that they're evaluated
    //
    showNoteForm: {
        [NOTE_KIND_NOTE]: false,
        [NOTE_KIND_SUMMARY]: false,
        [NOTE_KIND_REVIEW]: false
    },
    // same for the Add Point form
    showAddPointForm: false,

    showConnectivityGraph: false,
    graph: {
        fullyLoaded: false,
        // an array of { id, name, resource }
        decks: [],
        links: [],
        // an array which is indexed by deck_id, returns the offset into state.graph.decks
        deckIndexFromId: []
    },

    cache: {
        deck: {}
    },

    // oldest reasonable age in years, any person whose birth means they're older can be assumed to be dead
    oldestAliveAge: 120,

    recentImages: [],
    imageDirectory: '',

    verboseUI: true,
    preferredOrder: ["ideas", "people", "articles", "timelines", "quotes", "stats"],

    // key == resource name of decks
    listing: {
        ideas: undefined,           // when listing ideas on /ideas page
        articles: undefined,
        people: undefined,
        timelines: undefined
    },

    srReviewCount: 0,
    srEarliestReviewDate: undefined
};

export const reducer = (state, action) => {
    switch (action.type) {
    case 'routeChanged':
        return {
            ...state,
            url: action.url
        };
    case 'uberSetup':
        return {
            ...state,
            imageDirectory: action.imageDirectory,
            recentImages: action.recentImages,
            graph: {
                fullyLoaded: false
            },
            srReviewCount: action.srReviewCount,
            srEarliestReviewDate: action.srEarliestReviewDate
        };
    case 'setUrlName': {
        return {
            ...state,
            urlName: action.urlName
        };
    }
    case 'scratchListToggle': {
        let newState = {
            ...state,
            scratchListMinimised: !state.scratchListMinimised
        }
        return newState;
    }
    case 'scratchListAddMulti': {
        let newState = {...state};

        action.candidates.forEach(c => {
            newState.scratchList.push(c);
        });

        return newState;
    }
    case 'scratchListAdd': {
        let newState = {...state};

        newState.scratchList.push(action.candidate);

        return newState;
    }
    case 'scratchListRemove': {
        let newState = {...state};

        newState.scratchList.splice(action.index, 1);

        return newState;
    }
    case 'loadGraph':
        return {
            ...state,
            graph: {
                fullyLoaded: true,
                decks: action.graphNodes,
                links: buildFullGraph(action.graphConnections),
                deckIndexFromId: buildDeckIndex(action.graphNodes)
            }
        }
    case 'showingSearchCommand':
        return {
            ...state,
            showingSearchCommand: action.showingSearchCommand
        };
    case 'bookmarkUrl': {
        let candidate = parseForScratchList(state.url, state.urlName);
        let newState = { ...state };
        newState.scratchList.push(candidate);
        return newState;
    }
    case 'cleanUI':
        return {
            ...state,
            verboseUI: false
        };
    case 'basicUI':
        return {
            ...state,
            verboseUI: true
        };
    case 'showNoteForm': {
        let newState = {
            ...state,
            componentRequiresFullKeyboardAccess: true
        };
        newState.showNoteForm[action.noteKind] = true;
        return newState;
    }
    case 'hideNoteForm': {
        let newState = {
            ...state,
            componentRequiresFullKeyboardAccess: false
        };
        newState.showNoteForm[action.noteKind] = false;
        return newState;
    }
    case 'showAddPointForm':
        return {
            ...state,
            componentRequiresFullKeyboardAccess: true,
            showAddPointForm: true
        };
    case 'hideAddPointForm':
        return {
            ...state,
            componentRequiresFullKeyboardAccess: false,
            showAddPointForm: false
        };
    case 'connectivityGraphShow':
        return {
            ...state,
            showConnectivityGraph: true
        };
    case 'connectivityGraphHide':
        return {
            ...state,
            showConnectivityGraph: false
        };
    case 'setRecentImages':
        return {
            ...state,
            recentImages: action.recentImages
        };
    case 'setImageDirectory':
        return {
            ...state,
            imageDirectory: action.imageDirectory
        };
    case 'setUser':
        return {
            ...state,
            user: action.user
        };
    case 'setReviewCount':
        return {
            ...state,
            srReviewCount: action.srReviewCount
        };

    case 'invalidateGraph': {
        let newState = {...state };
        newState.graph.fullyLoaded = false;

        return newState;
    }
    case 'noteRefsModified':
        {
            let newState = {...state};

            let changes = action.changes;

            // update the newState.listing with new ideas that were created in action.changes.referencesCreated
            //
            function basicNoteFromReference(r) {
                return {
                    debug: "created by basicNoteFromReference",
                    backnotes: null,
                    backrefs: null,
                    created_at: "",
                    flashcards: null,
                    graph_terminator: false,
                    id: r.id,
                    notes: null,
                    refs: null,
                    title: r.name
                };
            };

            if (action.changes.referencesCreated.length > 0) {
                newState.graph.fullyLoaded = false;
            }

            if (newState.listing.ideas) {
                action.changes.referencesCreated.forEach(r => {
                    let newReference = action.allDecksForNote.find(d => d.name === r.name && d.resource === "ideas");
                    let newBasicNote = basicNoteFromReference(newReference);
                    // update the listing with the new resource
                    newState.listing.ideas.recent.unshift(newBasicNote);
                    newState.listing.ideas.unnoted.unshift(newBasicNote);
                });
            }

            // decks that are referenced by this note may have their state changed (e.g. annotation changed,
            // a backref value added/deleted depending on if the deck was added or removed), so the easiest
            // thing to do is remove the deck from the cache, and refetch it from the server
            //
            [changes.referencesChanged, changes.referencesAdded, changes.referencesRemoved].forEach(rs => {
                rs.forEach(r => {
                    if (newState.cache.deck[r.id]) {
                        delete newState.cache.deck[r.id];
                    }
                });
            });

            return newState;
        }
    case 'setCurrentDeckId':
        {
            return state;
        }
    case 'cacheDeck': {
        let deck = action.newItem;
        let updatedDeck = applyDecksAndCardsToNotes(deck);

        updatedDeck.noteDeckMeta = updatedDeck.notes.find(n => n.kind === 'NoteDeckMeta');

        let newState = { ...state };
        newState.cache.deck[action.id] = updatedDeck;

        return newState;
    }
    case 'deleteDeck': {
        let filterFn = d => d.id !== action.id;

        let newState = { ...state };
        if (newState.graph && newState.graph.decks) {
            newState.graph.decks = state.graph.decks.filter(filterFn);
        }

        newState.listing = {};

        if (state.listing.ideas) {
            newState.listing.ideas = {
                orphans: state.listing.ideas.orphans.filter(filterFn),
                recent: state.listing.ideas.recent.filter(filterFn),
            };
        };

        if (state.listing.articles) {
            newState.listing.articles = {
                orphans: state.listing.articles.orphans.filter(filterFn),
                recent: state.listing.articles.recent.filter(filterFn),
                rated: state.listing.articles.rated.filter(filterFn),
            };
        }

        if (state.listing.people) {
            newState.listing.people = state.listing.people.filter(filterFn);
        }

        if (state.listing.timelines) {
            newState.listing.timelines = state.listing.timelines.filter(filterFn);
        }

        if (newState.graph.links) {
            delete newState.graph.links[action.id];
        }

        // todo: delete all the other references in graph.links to action.id
        delete newState.cache.deck[action.id];
        return newState;

    }
        // sets the listing values for a particular deck kind
    case 'setDeckListing':
        {
            let listing = {...state.listing };
            listing[action.resource] = action.listing;

            let newState = {
                ...state,
                listing: listing
            };

            return newState;
        }
    case 'setPerson':
        {
            let newState = { ...state };
            newState.cache.deck[action.newItem.id] = action.newItem;
            if (newState.listing.people) {
                updateHashOfNames(newState.listing.people, action.newItem);
            }
            return newState;
        }
    case 'setTimeline':
        {
            let newState = { ...state };
            if (newState.listing.timelines) {
                updateListOfTitles(newState.listing.timelines, action.newItem);
            }
            return newState;
        }
    case 'enableFullKeyboardAccessForComponent':
        return {
            ...state,
            componentRequiresFullKeyboardAccess: true
        };
    case 'disableFullKeyboardAccessForComponent':
        return {
            ...state,
            componentRequiresFullKeyboardAccess: false
        };
    default:
        return state;
    }
};

function parseForScratchList(url, urlName) {
    // note: this will break if we ever change the url schema
    let res = url.match(/^\/(\w+)\/(\w+)/);

    let id = res[2];
    let resource = res[1];

    return { id: parseInt(id, 10), name: urlName, resource: resource}
}

function updateListOfTitles(arr, obj) {
    let isEntry = false;
    // check if the title of obj has changed, update the listing array if necessary
    //
    arr.forEach(a => {
        if (a.id === obj.id) {
            isEntry = true;
            a.title = obj.title;
        }
    });

    if (!isEntry) {
        // this is a new entry, place it at the start of the list
        arr.unshift({id: obj.id, title: obj.title});
    }
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
    case -1: return 'ref_to_parent';
    case 1: return 'ref_to_child';
    case 42: return 'ref_in_contrast';
    case 99: return 'ref_critical';
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

function applyDecksAndCardsToNotes(obj) {
    const decksInNotes = hashByNoteIds(obj.refs);
    const cardsInNotes = hashByNoteIds(obj.flashcards);

    for(let i = 0;i<obj.notes.length;i++) {
        let n = obj.notes[i];
        n.decks = decksInNotes[n.id] || [];
        n.decks.sort(sortByResourceThenName);
        n.flashcards = cardsInNotes[n.id];
    }

    return obj;
}

function hashByNoteIds(s) {
    s = s || [];
    return s.reduce(function(a, b) {
        const note_id = b.note_id;
        if (a[note_id]) {
            a[note_id].push(b);
        } else {
            a[note_id] = [b];
        }
        return a;
    }, {});
}
