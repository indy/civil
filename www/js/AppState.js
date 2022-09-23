import { signal } from '/lib/preact/mod.js';

import { opposingKind } from '/js/JsUtils.js';
import { sortByResourceThenName } from '/js/CivilUtils.js'; // todo: delete this import

import { NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

export function setUrlName(state, name) {
    state.sigs.urlName.value = name;
    document.title = `${state.appName}: ${name}`;
}

export function obtainKeyboard(state) {
    return function(e) {
        e.preventDefault();
        state.sigs.componentRequiresFullKeyboardAccess.value = true;
    }
}

export function relinquishKeyboard(state) {
    return function(e) {
        e.preventDefault();
        state.sigs.componentRequiresFullKeyboardAccess.value = false;
    }
}

export const initialState = {
    ticks: 0,

    // signals
    sigs: {
        // when true don't let searchCommand accept any keystrokes
        componentRequiresFullKeyboardAccess: signal(false),

        showingSearchCommand: signal(false),

        // to add the current page to the scratchList we need the id, name, resource.
        // id and resource can be parsed from the url, but the name needs to be
        // stored separately
        //
        urlName: signal(''),

        // when a user is logged in:
        // user: {
        //   username: ...
        //   email: ...
        // },
        user: signal(undefined),

        deckManagerState: signal(cleanDeckManagerState())
    },

    appName: "Civil",

    wasmInterface: undefined,   // initialised in buildInitialState
    uiColours: {
        // note: this will be filled with extra values from
        // ColourCreator.js::augmentSettingsWithCssModifierParameters
    },

    // this is set via the --search-always-visible css variable so
    // that mobile touch devices will always show the search bar
    //
    hasPhysicalKeyboard: true,

    // the url of the current page
    url: '',

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
        // an array which is indexed by deckId, returns the offset into state.graph.decks
        deckIndexFromId: []
    },

    deckManagerState: cleanDeckManagerState(),

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

function cleanDeckManagerState() {
    let res = {
        deck: undefined,
        showUpdateForm: false,
        showDelete: false,
        isEditingDeckRefs: false,
        hasSummarySection: false,
        hasReviewSection: false,
        showShowSummaryButton: false,
        showShowReviewButton: false
    }
    return res;
}

export function dmsUpdateDeck(state, deck, resource) {
    console.log("todo: update the state's url");
    // url: `/${resource}/${deck.id}`,

    // modify the notes received from the server
    applyDecksAndCardsToNotes(deck);
    // organise the notes into noteSeqs
    buildNoteSeqs(deck);

    // todo: maybe move this back into the apps router now that we're using signals
    setUrlName(state, deck.title || deck.name);

    let dms = { ...state.sigs.deckManagerState.value };
    dms.deck = deck;

    if (deck.noteSeqs) {
        if (dms.hasSummarySection) {
            dms.showShowSummaryButton = deck.noteSeqs.noteSummary.length > 0;
        }
        if (dms.hasReviewSection) {
            dms.showShowReviewButton = deck.noteSeqs.noteReview.length > 0;
        }
    }

    state.sigs.deckManagerState.value = dms;
}

export function dmsUpdateFormToggle(state) {
    let dms = { ...state.sigs.deckManagerState.value };
    dms.showUpdateForm = !dms.showUpdateForm;
    state.sigs.deckManagerState.value = dms;
}

export function dmsDeleteToggle(state) {
    let dms = { ...state.sigs.deckManagerState.value };
    dms.showDelete = !dms.showDelete;
    state.sigs.deckManagerState.value = dms;
}

export function dmsRefsToggle(state) {
    let dms = { ...state.sigs.deckManagerState.value };
    dms.isEditingDeckRefs = !dms.isEditingDeckRefs;
    state.sigs.deckManagerState.value = dms;
}

export function dmsHideForm(state) {
    let dms = { ...state.sigs.deckManagerState.value };
    dms.showUpdateForm = false;
    state.sigs.deckManagerState.value = dms;
}

export function dmsShowSummaryButtonToggle(state, isToggled) {
    let dms = { ...state.sigs.deckManagerState.value };
    dms.showShowSummaryButton = isToggled;
    state.sigs.deckManagerState.value = dms;
}

export function dmsShowReviewButtonToggle(state, isToggled) {
    let dms = { ...state.sigs.deckManagerState.value };
    dms.showShowReviewButton = isToggled;
    state.sigs.deckManagerState.value = dms;
}

export const reducer = (state, action) => {
    if (true) {
        console.log(`AppState change: ${action.type}`);
    }
    switch (action.type) {

    case 'routeChanged':
        return {
            ...state,
            ticks: state.ticks + 1,
            url: action.url,
            deckManagerState: cleanDeckManagerState()
        };
    case 'uberSetup':
        return {
            ...state,
            ticks: state.ticks + 1,
            imageDirectory: action.imageDirectory,
            recentImages: action.recentImages,
            graph: {
                fullyLoaded: false
            },
            srReviewCount: action.srReviewCount,
            srEarliestReviewDate: action.srEarliestReviewDate
        };
    case 'scratchListToggle': {
        let newState = {
            ...state,
            ticks: state.ticks + 1,
            scratchListMinimised: !state.scratchListMinimised
        }
        return newState;
    }
    case 'scratchListAddMulti': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };

        action.candidates.forEach(c => {
            newState.scratchList.push(c);
        });

        return newState;
    }
    case 'scratchListAdd': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };

        newState.scratchList.push(action.candidate);

        return newState;
    }
    case 'scratchListRemove': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };

        newState.scratchList.splice(action.index, 1);

        return newState;
    }
    case 'loadGraph':
        return {
            ...state,
            ticks: state.ticks + 1,
            graph: {
                fullyLoaded: true,
                decks: action.graphNodes,
                links: buildFullGraph(action.graphConnections),
                deckIndexFromId: buildDeckIndex(action.graphNodes)
            }
        }
    case 'bookmarkUrl': {
        let candidate = parseForScratchList(state.url, state.sigs.urlName.value);
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };
        newState.scratchList.push(candidate);
        return newState;
    }
    case 'cleanUI':
        return {
            ...state,
            ticks: state.ticks + 1,
            verboseUI: false
        };
    case 'basicUI':
        return {
            ...state,
            ticks: state.ticks + 1,
            verboseUI: true
        };
    case 'showNoteForm': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };
        newState.showNoteForm[action.noteKind] = true;
        newState.sigs.componentRequiresFullKeyboardAccess.value = true;
        return newState;
    }
    case 'hideNoteForm': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };
        newState.showNoteForm[action.noteKind] = false;
        newState.sigs.componentRequiresFullKeyboardAccess.value = false;
        return newState;
    }
    case 'showAddPointForm': {
        let newState = {
            ...state,
            ticks: state.ticks + 1,
            showAddPointForm: true
        };
        newState.sigs.componentRequiresFullKeyboardAccess.value = true;
    }
    case 'hideAddPointForm': {
        let newState = {
            ...state,
            ticks: state.ticks + 1,
            showAddPointForm: false
        };
        newState.sigs.componentRequiresFullKeyboardAccess.value = false;
    }
    case 'connectivityGraphShow':
        return {
            ...state,
            ticks: state.ticks + 1,
            showConnectivityGraph: true
        };
    case 'connectivityGraphHide':
        return {
            ...state,
            ticks: state.ticks + 1,
            showConnectivityGraph: false
        };
    case 'setRecentImages':
        return {
            ...state,
            ticks: state.ticks + 1,
            recentImages: action.recentImages
        };
    case 'setImageDirectory':
        return {
            ...state,
            ticks: state.ticks + 1,
            imageDirectory: action.imageDirectory
        };
    case 'setReviewCount':
        return {
            ...state,
            ticks: state.ticks + 1,
            srReviewCount: action.srReviewCount
        };

    case 'invalidateGraph': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };

        newState.graph.fullyLoaded = false;

        return newState;
    }
    case 'noteRefsModified':
        {
            let newState = {
                ...state,
                ticks: state.ticks + 1
            };

            let changes = action.changes;

            // update the newState.listing with new ideas that were created in action.changes.referencesCreated
            //
            function basicNoteFromReference(r) {
                return {
                    debug: "created by basicNoteFromReference",
                    backnotes: null,
                    backrefs: null,
                    createdId: "",
                    flashcards: null,
                    graphTerminator: false,
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

            // // decks that are referenced by this note may have their state changed (e.g. annotation changed,
            // // a backref value added/deleted depending on if the deck was added or removed), so the easiest
            // // thing to do is remove the deck from the cache, and refetch it from the server
            // //
            // [changes.referencesChanged, changes.referencesAdded, changes.referencesRemoved].forEach(rs => {
            //     rs.forEach(r => {
            //         if (newState.cache.deck[r.id]) {
            //             delete newState.cache.deck[r.id];
            //         }
            //     });
            // });


            return newState;
        }
    case 'deleteDeck': {
        let filterFn = d => d.id !== action.id;

        let newState = {
            ...state,
            ticks: state.ticks + 1
        };

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

        newState.deckManagerState.showDelete = false;

        return newState;

    }
        // sets the listing values for a particular deck kind
    case 'setDeckListing': {
        let listing = {
            ...state.listing
        };
        listing[action.resource] = action.listing;

        let newState = {
            ...state,
            ticks: state.ticks + 1,
            listing: listing
        };

        return newState;
    }
    case 'updatePeopleListing': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };
        if (newState.listing.people) {
            updateHashOfNames(newState.listing.people, action.newItem);
        }
        return newState;
    }
    case 'setTimeline': {
        let newState = {
            ...state,
            ticks: state.ticks + 1
        };
        if (newState.listing.timelines) {
            updateListOfTitles(newState.listing.timelines, action.newItem);
        }
        return newState;
    }
    default: {
        console.log("HITTING DEFAULT OF APPSTATE'S SWITCH STATEMENT");
        return state;
    }
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

function applyDecksAndCardsToNotes(deck) {
    const decksInNotes = hashByNoteIds(deck.refs);
    const cardsInNotes = hashByNoteIds(deck.flashcards);

    for(let i = 0;i<deck.notes.length;i++) {
        let n = deck.notes[i];
        n.decks = decksInNotes[n.id] || [];
        n.decks.sort(sortByResourceThenName);
        n.flashcards = cardsInNotes[n.id];
    }

    return deck;
}

// todo: hashByNoteIds is using the "I'm so clever" reduce style. noteSeqsForPoints is using a much simpler forEach
//       perhaps change hashByNoteIds to forEach?
function hashByNoteIds(s) {
    s = s || [];
    return s.reduce(function(a, b) {
        const noteId = b.noteId;
        if (a[noteId]) {
            a[noteId].push(b);
        } else {
            a[noteId] = [b];
        }
        return a;
    }, {});
}

function buildNoteSeqs(deck) {
    deck.noteSeqs = {};

    // build NoteSeqs for notes associated with points
    deck.noteSeqs.points = noteSeqsForPoints(deck.notes);
    // add empty noteSeqs for points without any notes
    if (deck.points) {
        deck.points.forEach(p => {
            if (!deck.noteSeqs.points[p.id]) {
                deck.noteSeqs.points[p.id] = [];
            }
        });
    }

    // build NoteSeqs for all other note kinds
    deck.noteSeqs.note = noteSeqForNoteKind(deck.notes, "Note");
    deck.noteSeqs.noteDeckMeta = noteSeqForNoteKind(deck.notes, "NoteDeckMeta"); // should only be of length 1
    deck.noteSeqs.noteReview = noteSeqForNoteKind(deck.notes, "NoteReview");
    deck.noteSeqs.noteSummary = noteSeqForNoteKind(deck.notes, "NoteSummary");

    if (deck.noteSeqs.noteDeckMeta.length !== 1) {
        console.error(`deck: ${deck.id} has a NoteDeckMeta noteseq of length: ${deck.noteSeqs.noteDeckMeta.length} ???`);
    }

    return deck;
}

function noteSeqsForPoints(notes) {
    let p = {};
    notes.forEach(n => {
        if (n.pointId) {
            if (!p[n.pointId]) {
                p[n.pointId] = [];
            }
            p[n.pointId].push(n);
        }
    });

    Object.keys(p).forEach(k => {
        p[k] = createSeq(p[k]);
    });

    return p;
}

function noteSeqForNoteKind(notes, kind) {
    let ns = notes.filter(n => n.kind === kind && n.pointId === null);
    if (ns.length === 0) {
        return [];
    }
    return createSeq(ns)
}

function createSeq(ns) {
    let h = {};

    ns.forEach(n => h[n.id] = n);

    // find the prevNoteId for each note
    ns.forEach(n => {
        if (n.nextNoteId) {
            h[n.nextNoteId].prevNoteId = n.id;
        } else {
            // this is the last element
        }
    });

    // now find the first element
    let shouldBeFirst = h[ns[0].id];
    while (shouldBeFirst.prevNoteId) {
        shouldBeFirst = h[shouldBeFirst.prevNoteId];
    }

    // create the ordered note seq to return
    let res = [];
    let item = shouldBeFirst;
    do {
        res.push(item);
        item = h[item.nextNoteId];
    } while(item);

    return res;
}
