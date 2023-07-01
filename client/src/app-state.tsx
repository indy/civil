import { h, createContext, ComponentChildren } from "preact";
import { signal } from "@preact/signals";
import { useContext } from "preact/hooks";
import { route } from "preact-router";

import {
    ArticleListings,
    ColourScheme,
    Command,
    CommandBarMode,
    CommandBarState,
    DeckKind,
    FullGraphStruct,
    Graph,
    GraphDeck,
    IdeasListings,
    Key,
    Listing,
    NoteKind,
    Notes,
    PeopleListings,
    PreviewDeck,
    PreviewNotes,
    Reference,
    RefKind,
    RefsModified,
    ResultList,
    SlimDeck,
    State,
    ToolbarMode,
    UberSetup,
    User,
    UserUploadedImage,
    VisiblePreview,
} from "types";

import { isCommand, noteSeq, deckKindToResourceString } from "utils/civil";

const emptyUser: User = {
    username: "",
    email: "",
    admin: { dbName: "" },
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

const state: State = {
    debugMessages: signal([]),

    appName: "civil",
    toolbarMode: signal(ToolbarMode.View),
    wasmInterface: undefined,

    colourScheme: ColourScheme.Light,
    colourSettings: signal({
        hueDelta: 30,

        hueOffsetFg: 0,
        saturationFg: 0,
        lightnessFg: 0,

        hueOffsetBg: 0,
        saturationBg: 0,
        lightnessBg: 0,
    }),
    colourDefinitions: signal({}),

    // this is set via the --search-always-visible css variable so
    // that mobile touch devices will always show the search bar
    //
    hasPhysicalKeyboard: true,

    // oldest reasonable age in years, any person whose birth means they're older can be assumed to be dead
    //
    oldestAliveAge: 120,

    // when true don't let commandBar accept any keystrokes
    //
    componentRequiresFullKeyboardAccess: signal(false),
    showingCommandBar: signal(false),
    commandBarState: signal(cleanCommandBarState()),

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
    preferredOrder: ["sr"],

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

    recentlyUsedDecks: signal([]),

    recentImages: signal([]),
    imageDirectory: signal(""),
    imageZoomDefault: 100,
    imageZoomMin: 10,
    imageZoomMax: 300,

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
    cbSearchClicked: function () {
        state.toolbarMode.value = ToolbarMode.View;
        commandBarToggle(state);
    },

    cbKeyDownEsc: function () {
        if (state.toolbarMode.value !== ToolbarMode.View) {
            state.toolbarMode.value = ToolbarMode.View;
        } else {
            commandBarToggle(state);
        }
    },

    cbKeyDownColon: function () {
        let commandBarState = state.commandBarState.value;
        if (!state.componentRequiresFullKeyboardAccess.value) {
            if (!state.showingCommandBar.value) {
                state.showingCommandBar.value = true;
                state.commandBarState.value = {
                    ...commandBarState,
                    mode: CommandBarMode.Command,
                    text: ":",
                };
            }
        }
    },

    cbKeyDownEnter: function (allCommands: Array<Command>) {
        let commandBarState = state.commandBarState.value;
        if (state.showingCommandBar.value) {
            if (commandBarState.mode === CommandBarMode.Command) {
                const success = executeCommand(
                    commandBarState.text,
                    allCommands
                );
                if (success) {
                    state.showingCommandBar.value = false;
                    state.commandBarState.value = cleanCommandBarState();
                }
            }
        }
    },

    cbKeyDownCtrl: function () {
        let commandBarState = state.commandBarState.value;
        if (state.showingCommandBar.value) {
            if (commandBarState.mode === CommandBarMode.Search) {
                let showKeyboardShortcuts =
                    !commandBarState.showKeyboardShortcuts &&
                    commandBarState.searchCandidates.length > 0;

                state.commandBarState.value = {
                    ...commandBarState,
                    showKeyboardShortcuts,
                };
            }
        }
    },

    cbKeyDownAlphaNumeric: function (code: string, shiftKey: boolean) {
        let commandBarState = state.commandBarState.value;
        if (state.showingCommandBar.value) {
            let index = indexFromCode(code);
            if (
                commandBarState.showKeyboardShortcuts &&
                commandBarState.mode === CommandBarMode.Search &&
                index >= 0
            ) {
                state.commandBarState.value = {
                    ...commandBarState,
                    keyDownIndex: index,
                    shiftKey: shiftKey,
                };
            }
        } else {
            if (state.componentRequiresFullKeyboardAccess.value === false) {
                // we can treat any keypresses as modal commands for the app
                switch (code) {
                    case "KeyB":
                        toolbarModeToggle(state, ToolbarMode.ScratchListLinks);
                        break;
                    case "KeyE":
                        toolbarModeToggle(state, ToolbarMode.Edit);
                        break;
                    case "KeyR":
                        toolbarModeToggle(state, ToolbarMode.Refs);
                        break;
                    case "KeyA":
                        toolbarModeToggle(state, ToolbarMode.AddAbove);
                        break;
                    case "KeyM":
                        toolbarModeToggle(state, ToolbarMode.SR);
                        break;
                }
            }
        }
    },

    cbKeyDownPlus: function () {
        let commandBarState = state.commandBarState.value;
        if (state.showingCommandBar.value) {
            if (
                commandBarState.showKeyboardShortcuts &&
                commandBarState.mode === CommandBarMode.Search
            ) {
                let sl = state.scratchList.value.slice();
                commandBarState.searchCandidates.forEach((c) => {
                    sl.push(c);
                });
                state.scratchList.value = sl;
                state.commandBarState.value = {
                    ...commandBarState,
                    keyDownIndex: -1,
                    shiftKey: true,
                };
            }
        }
    },

    cbFocus: function (hasFocus: boolean) {
        let commandBarState = state.commandBarState.value;
        state.commandBarState.value = {
            ...commandBarState,
            hasFocus,
        };
    },

    cbSearchCandidateSet: function (searchResponse: ResultList) {
        let commandBarState = state.commandBarState.value;
        state.commandBarState.value = {
            ...commandBarState,
            searchCandidates: searchResponse.results || [],
        };
    },

    cbClickedCandidate: function () {
        state.showingCommandBar.value = false;
        state.commandBarState.value = cleanCommandBarState();
    },

    cbClickedCommand: function (entry: Command, allCommands: Array<Command>) {
        const command = entry.command;

        const success = command ? executeCommand(command, allCommands) : false;
        if (success) {
            state.showingCommandBar.value = false;
            state.commandBarState.value = cleanCommandBarState();
        } else {
            console.error(`Failed to execute command: ${command}`);
        }
    },

    cbInputGiven: function (text: string) {
        let commandBarState = state.commandBarState.value;
        if (state.showingCommandBar.value) {
            const mode = isCommand(text)
                ? CommandBarMode.Command
                : CommandBarMode.Search;

            let searchCandidates = commandBarState.searchCandidates;

            if (text.length === 0) {
                searchCandidates = [];
            }

            if (
                mode === CommandBarMode.Search &&
                commandBarState.mode === CommandBarMode.Command
            ) {
                // just changed mode from command to search
                searchCandidates = [];
            }

            if (
                commandBarState.showKeyboardShortcuts &&
                commandBarState.mode === CommandBarMode.Search
            ) {
                const index = commandBarState.keyDownIndex;

                if (
                    index >= 0 &&
                    commandBarState.searchCandidates.length > index
                ) {
                    const candidate = commandBarState.searchCandidates[index];

                    if (commandBarState.shiftKey) {
                        // once a candidate has been added to the saved search
                        // results, set the keyDownIndex to an invalid value,
                        // otherwise if the user presses shift and an unused
                        // key (e.g. '+' ) then the last candidate to be added
                        // will be added again.
                        //

                        state.commandBarState.value = {
                            ...commandBarState,
                            keyDownIndex: -1,
                        };

                        let sl = state.scratchList.value.slice();
                        sl.push(candidate);
                        state.scratchList.value = sl;

                        return;
                    } else {
                        const url = `/${deckKindToResourceString(
                            candidate.deckKind
                        )}/${candidate.id}`;
                        route(url);

                        state.showingCommandBar.value = false;
                        state.commandBarState.value = cleanCommandBarState();
                        return;
                    }
                }
            }

            state.commandBarState.value = {
                ...commandBarState,
                mode,
                text,
                searchCandidates,
            };
        }
    },

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
    setShowingCommandBar: function (b: boolean) {
        if (DEBUG_APP_STATE) {
            console.log("setShowingCommandBar");
        }

        state.showingCommandBar.value = b;
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
        state.recentlyUsedDecks.value = uber.recentlyUsedDecks;
        state.imageDirectory.value = uber.directory;
        state.srReviewCount.value = uber.srReviewCount;
        state.srEarliestReviewDate.value = uber.srEarliestReviewDate;

        state.listing.value = {
            ideas: uber.ideas,
            people: uber.people,
            articles: uber.articles,
            timelines: uber.timelines,
            dialogues: uber.dialogues,
        };
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
        allDecksForNote: Array<Reference>,
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

    setRecentlyUsedDecks: function (recents: Array<SlimDeck>) {
        if (DEBUG_APP_STATE) {
            console.log("setRecentlyUsedDecks");
        }
        state.recentlyUsedDecks.value = recents;
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

function executeCommand(text: string, allCommands: Array<Command>) {
    const commandPlusArgs = text
        .slice(1)
        .split(" ")
        .filter((s) => s.length > 0);
    if (commandPlusArgs.length === 0) {
        return;
    }

    const command = commandPlusArgs[0];

    const action: Command | undefined = allCommands.find(
        (c) => c.command === command
    );
    if (action) {
        const rest = commandPlusArgs.slice(1).join(" ");
        return action.fn ? action.fn(rest) : false;
    }
    return false;
}

// map key code for an alphanumeric character to an index value
//
//  digit: 1 -> 0, 2 ->  1, ... 9 ->  8
// letter: a -> 9, b -> 10, ... z -> 34
//
function indexFromCode(code: string): number {
    // this was the simple code that now has to be replaced
    // because the retards who define web standards have
    // deprecated keyCode .
    //
    // const index =
    //     e.keyCode >= 49 && e.keyCode <= 57
    //         ? e.keyCode - 49
    //         : e.keyCode - 65 + 9;

    switch (code) {
        case "Digit1":
            return 0;
        case "Digit2":
            return 1;
        case "Digit3":
            return 2;
        case "Digit4":
            return 3;
        case "Digit5":
            return 4;
        case "Digit6":
            return 5;
        case "Digit7":
            return 6;
        case "Digit8":
            return 7;
        case "Digit9":
            return 8;
        case "KeyA":
            return 9;
        case "KeyB":
            return 10;
        case "KeyC":
            return 11;
        case "KeyD":
            return 12;
        case "KeyE":
            return 13;
        case "KeyF":
            return 14;
        case "KeyG":
            return 15;
        case "KeyH":
            return 16;
        case "KeyI":
            return 17;
        case "KeyJ":
            return 18;
        case "KeyK":
            return 19;
        case "KeyL":
            return 20;
        case "KeyM":
            return 21;
        case "KeyN":
            return 22;
        case "KeyO":
            return 23;
        case "KeyP":
            return 24;
        case "KeyQ":
            return 25;
        case "KeyR":
            return 26;
        case "KeyS":
            return 27;
        case "KeyT":
            return 28;
        case "KeyU":
            return 29;
        case "KeyV":
            return 30;
        case "KeyW":
            return 31;
        case "KeyX":
            return 32;
        case "KeyY":
            return 33;
        case "KeyZ":
            return 34;
        default: {
            // console.error(`invalid code value: '${code}'`);
            return -1;
        }
    }
}

function toolbarModeToggle(state: State, mode: ToolbarMode) {
    if (isToolbarModeAllowed(state, mode)) {
        if (state.toolbarMode.value !== mode) {
            state.toolbarMode.value = mode;
        } else {
            state.toolbarMode.value = ToolbarMode.View;
        }
    }
}

function commandBarToggle(state: State) {
    state.showingCommandBar.value = !state.showingCommandBar.value;
    state.commandBarState.value = cleanCommandBarState();
}

export function isToolbarModeAllowed(
    state: State,
    toolbarMode: ToolbarMode
): boolean {
    // e.g. state.url.value = /articles or /ideas/42
    // urlParts is of either one of these forms: ["", "articles"], or ["", "ideas", "42"]
    let urlParts = state.url.value.split("/");

    const onListingPage = urlParts.length === 2;

    switch (toolbarMode) {
        case ToolbarMode.View:
            return !onListingPage;
        case ToolbarMode.Edit:
            return !onListingPage;
        case ToolbarMode.Refs:
            return !onListingPage;
        case ToolbarMode.SR:
            return !onListingPage;
        case ToolbarMode.AddAbove:
            // don't show AddAbove option for quotes
            return !onListingPage && urlParts[1] !== "quotes";
        case ToolbarMode.ScratchListLinks:
            return true;
    }
}
