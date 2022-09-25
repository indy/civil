import { signal } from '/lib/preact/mod.js';

import { opposingKind } from '/js/JsUtils.js';
import { sortByResourceThenName } from '/js/CivilUtils.js'; // todo: delete this import

import { NOTE_KIND_NOTE, NOTE_KIND_SUMMARY, NOTE_KIND_REVIEW} from '/js/components/NoteSection.js';

const state = {
    appName: "Civil",

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

    deckManagerState: signal(cleanDeckManagerState()),

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
        state.deckManagerState.value = cleanDeckManagerState();
    },

    obtainKeyboard: function() {
        if (DEBUG_APP_STATE) {
            console.log("obtainKeyboard");
        }
        return function(e) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = true;
        }
    },

    relinquishKeyboard: function() {
        if (DEBUG_APP_STATE) {
            console.log("relinquishKeyboard");
        }
        return function(e) {
            e.preventDefault();
            state.componentRequiresFullKeyboardAccess.value = false;
        }
    },

    dmsUpdateDeck: function(deck, resource) {
        if (DEBUG_APP_STATE) {
            console.log("dmsUpdateDeck");
        }
        // modify the notes received from the server
        applyDecksAndCardsToNotes(deck);
        // organise the notes into noteSeqs
        buildNoteSeqs(deck);

        // todo: maybe move this back into the apps router now that we're using signals
        _setUrlName(deck.title || deck.name);
        state.url.value = `/${resource}/${deck.id}`;

        let dms = { ...state.deckManagerState.value };
        dms.deck = deck;

        if (deck.noteSeqs) {
            if (dms.hasSummarySection) {
                dms.showShowSummaryButton = deck.noteSeqs.noteSummary.length > 0;
            }
            if (dms.hasReviewSection) {
                dms.showShowReviewButton = deck.noteSeqs.noteReview.length > 0;
            }
        }

        state.deckManagerState.value = dms;

        window.scrollTo(0, 0);
    },

    dmsUpdateFormToggle: function() {
        if (DEBUG_APP_STATE) {
            console.log("dmsUpdateFormToggle");
        }
        let dms = { ...state.deckManagerState.value };
        dms.showUpdateForm = !dms.showUpdateForm;
        state.deckManagerState.value = dms;
    },

    dmsDeleteToggle: function() {
        if (DEBUG_APP_STATE) {
            console.log("dmsDeleteToggle");
        }
        let dms = { ...state.deckManagerState.value };
        dms.showDelete = !dms.showDelete;
        state.deckManagerState.value = dms;
    },

    dmsRefsToggle: function() {
        if (DEBUG_APP_STATE) {
            console.log("dmsRefsToggle");
        }
        let dms = { ...state.deckManagerState.value };
        dms.isEditingDeckRefs = !dms.isEditingDeckRefs;
        state.deckManagerState.value = dms;
    },

    dmsHideForm: function() {
        if (DEBUG_APP_STATE) {
            console.log("dmsHideForm");
        }
        let dms = { ...state.deckManagerState.value };
        dms.showUpdateForm = false;
        state.deckManagerState.value = dms;
    },

    dmsShowSummaryButtonToggle: function(isToggled) {
        if (DEBUG_APP_STATE) {
            console.log("dmsShowSummaryButtonToggle");
        }
        let dms = { ...state.deckManagerState.value };
        dms.showShowSummaryButton = isToggled;
        state.deckManagerState.value = dms;
    },

    dmsShowReviewButtonToggle: function(isToggled) {
        if (DEBUG_APP_STATE) {
            console.log("dmsShowReviewButtonToggle");
        }
        let dms = { ...state.deckManagerState.value };
        dms.showShowReviewButton = isToggled;
        state.deckManagerState.value = dms;
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

    loadGraph: function(graphNodes, graphConnections) {
        if (DEBUG_APP_STATE) {
            console.log("loadGraph");
        }
        let ng = {
            fullyLoaded: true,
            decks: graphNodes,
            links: buildFullGraph(graphConnections),
            deckIndexFromId: buildDeckIndex(graphNodes)
        };
        state.graph.value = ng;
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
        // update the state.listing with new ideas that were created in action.changes.referencesCreated
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

        if (changes.referencesCreated.length > 0) {
            let ng = {...state.graph.value, fullLoaded: false };
            state.graph.value = ng;
        }

        if (state.listing.value.ideas) {
            let li = {...state.listing.value};

            changes.referencesCreated.forEach(r => {
                let newReference = allDecksForNote.find(d => d.name === r.name && d.resource === "ideas");
                let newBasicNote = basicNoteFromReference(newReference);
                // update the listing with the new resource
                li.recent.unshift(newBasicNote);
                li.unnoted.unshift(newBasicNote);
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

        state.deckManagerState.value.showDelete = false;
    }
}

function _setUrlName(name) {
    state.urlName.value = name;
    document.title = `${state.appName}: ${name}`;
}

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
