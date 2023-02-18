// todo: the exports could be wrong, see the correct way of defining interfaces

import { Signal } from "@preact/signals";

export type ProtoNoteReferences = {
    noteId: number;
    referencesChanged: Array<Ref>;
    referencesRemoved: Array<Ref>;
    referencesAdded: Array<Ref>;
    referencesCreated: Array<Ref>;
};

// graph stuff
//
export type GraphCallback = (g: GraphState, p: number, h: number) => void;

export enum ExpandedState {
    Fully = 0,
    Partial,
    None,
}

type SimStats = {
    tickCount: number;
    maxVelocities: [number, number];
};
export type GraphState = {
    nodes: { [index: number]: Node };
    edges: Array<Edge>;

    simStats?: SimStats;
};

export type Node = {
    id: number;
    isImportant: boolean;
    expandedState: ExpandedState;
    deckKind: DeckKind;
    label: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    textWidth?: number;
    textHeight?: number;
};

export type Edge = [number, number, number, RefKind];

export type DeckManagerType = {
    update: (d: FatDeck) => void;
    getDeck: () => FatDeck | undefined;
    isShowingUpdateForm: () => boolean;
    isEditingDeckRefs: () => boolean;
    updateAndReset: (newDeck: FatDeck) => void;
    onShowSummaryClicked: () => void;
    onShowReviewClicked: () => void;
    onRefsToggle: () => void;
    onFormToggle: () => any;
    buildPointForm: (onSuccessCallback: () => void) => any;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => any;
    noteManagerForDeckPoint: (deckPoint: DeckPoint) => any;
    pointHasNotes: (point: DeckPoint) => any;
    canShowNoteSection: (noteKind: NoteKind) => any;
    howToShowNoteSection: (noteKind: NoteKind) => NoteSectionHowToShow;
};

export type NoteManagerType = {
    x?: any;
};

export type NoteThing = {
    topRefKind?: RefKind;
    topAnnotation?: string;
    noteContent: string;
    noteId: number;
    refs: Array<Ref>;
};

export type RefsModified = {
    referencesChanged: Array<Ref>;
    referencesRemoved: Array<Ref>;
    referencesAdded: Array<Ref>;
    referencesCreated: Array<Ref>;
};

export type Admin = {
    dbName: string;
};

export type User = {
    username: string;
    email: string;
    admin?: Admin;
};

export enum RefKind {
    Ref = 1,
    RefToParent,
    RefToChild,
    RefInContrast,
    RefCritical,
}

export enum NoteKind {
    Note = 1,
    NoteReview,
    NoteSummary,
    NoteDeckMeta,
}

export enum DeckKind {
    Article = 1,
    Person,
    Idea,
    Timeline,
    Quote,
}

export type Ref = SlimDeck & {
    noteId: number;
    refKind: RefKind;
    annotation?: string;
};

export type BackNote = SlimDeck & {
    noteId: number;
    noteContent: string;
    noteKind: NoteKind;
};

export enum PointKind {
    Point = 1,
    PointBegin,
    PointEnd,
}

export type ProtoPoint = {
    title?: string;
    kind: PointKind;

    locationTextual?: string;
    longitude?: number;
    latitude?: number;
    locationFuzz: number;

    dateTextual?: string;
    exactDate?: string;
    lowerDate?: string;
    upperDate?: string;
    dateFuzz: number;
};

export type DeckPoint = {
    id: number;
    kind: PointKind;
    title?: string;
    dateTextual?: string;
    date?: string;
    age?: number;

    deckId: number;
    deckName: string;
    deckKind: DeckKind;
};

export type FlashCard = {
    id: number;
    noteId: number;
    prompt: string;
    nextTestDate: string;
    easinessFactor: number;
    interRepetitionInterval: number;
};

export type Note = {
    id: number;
    prevNoteId: number | null;
    kind: NoteKind;
    content: string;
    pointId: number | null;

    decks: Array<Ref>;
    flashcards: Array<FlashCard>;
};

export type Notes = Array<Note>;

export type NoteSeqs = {
    points?: { [_: number]: Notes };
    note: Notes;
    noteDeckMeta: Notes;
    noteReview: Notes;
    noteSummary: Notes;
};

export type SlimDeck = {
    id: number;
    title: string;
    deckKind: DeckKind;
    insignia: number;
}

export interface FatDeck {
    title: string;
    backnotes?: Array<BackNote>;
    backrefs?: Array<Ref>;
    flashcards?: Array<FlashCard>;
    id: number;
    insignia: number;
    noteSeqs?: NoteSeqs;
    notes: Notes;
    refs?: Array<Ref>;
    points?: Array<DeckPoint>;
}

export type DeckIdea = FatDeck & {
    createdAt: string;
    graphTerminator: boolean;
};

export type DeckPerson = FatDeck & {
    sortDate?: string;
};

export type DeckArticle = FatDeck & {
    source?: string;
    author?: string;
    createdAt: string;
    publishedDate?: string;
    rating: number;
    shortDescription?: string;
};

export type DeckTimeline = FatDeck;

export type DeckQuote = FatDeck & {
    attribution: string;
};

export type SearchResults = {
    results?: Array<SlimDeck>;
};

export type IdeasListings = {
    recent: Array<SlimDeck>;
    orphans: Array<SlimDeck>;
    unnoted: Array<SlimDeck>;
};

export type PeopleListings = {
    uncategorised: Array<SlimDeck>;
    ancient: Array<SlimDeck>;
    medieval: Array<SlimDeck>;
    modern: Array<SlimDeck>;
    contemporary: Array<SlimDeck>;
};

export type ArticleListings = {
    recent: Array<DeckArticle>;
    rated: Array<DeckArticle>;
    orphans: Array<SlimDeck>;
};

export type Listing = {
    ideas: IdeasListings | undefined;
    people: PeopleListings | undefined;
    articles: ArticleListings | undefined;
    timelines: Array<SlimDeck> | undefined;
};

// used by setDeckListing
export type AnyDeckListing =
    | IdeasListings
    | PeopleListings
    | ArticleListings
    | Array<SlimDeck>;

export type Settings = {
    [index: string]: number;

    hueDelta: number;

    hueOffsetFg: number;
    saturationFg: number;
    lightnessFg: number;

    hueOffsetBg: number;
    saturationBg: number;
    lightnessBg: number;
};

export type Definitions = {
    [index: string]: string | [number, number, number] | undefined;

    bg?: [number, number, number];
    bg1?: [number, number, number];
    bg2?: [number, number, number];
    bg3?: [number, number, number];

    fg?: [number, number, number];
    fg1?: [number, number, number];
    fg_inactive?: [number, number, number];

    divider?: [number, number, number];

    graph_node_expanded?: [number, number, number];
    graph_node_partial?: [number, number, number];
    graph_node_minimised?: [number, number, number];
    graph_edge?: [number, number, number];
    graph_edge_in_contrast?: [number, number, number];
    graph_edge_critical?: [number, number, number];

    scribble_neutral?: [number, number, number];
    scribble_disagree?: [number, number, number];
    hyperlink?: [number, number, number];
    highlight?: [number, number, number];

    bg_ideas?: string;
    bg_articles?: string;
    bg_people?: string;
    bg_timelines?: string;
    bg_quotes?: string;

    fg_ideas?: string;
    fg_articles?: string;
    fg_people?: string;
    fg_timelines?: string;
    fg_quotes?: string;
};

export type WasmInterface = {
    asHtmlAst(markup: string): any;
    splitter(markup: string): any;

    rgbFromHsl(hsl: [number, number, number]): string;
};

export enum ToolbarMode {
    View = 1,
    Edit,
    Refs,
    SR,
    AddAbove,
}

export enum NoteSectionHowToShow {
    Hide = 1,
    Show,
    Exclusive,
}

export type State = {
    appName: string;
    toolbarMode: Signal<ToolbarMode>;

    wasmInterface: WasmInterface | undefined;

    settings: Signal<Settings>;
    definitions: Signal<Definitions>;

    hasPhysicalKeyboard: boolean;
    oldestAliveAge: number;

    componentRequiresFullKeyboardAccess: Signal<boolean>;

    showingSearchCommand: Signal<boolean>;

    urlName: Signal<string>;
    url: Signal<string>;

    user: Signal<User>;

    preferredDeckKindOrder: Array<DeckKind>;
    preferredOrder: Array<string>; // rename to preferredTopMenuOrder

    listing: Signal<Listing>;

    verboseUI: Signal<boolean>;

    showNoteForm: Signal<ShowNoteForm>;
    showNoteFormPointId: Signal<number | undefined>;

    showAddPointForm: Signal<boolean>;

    recentImages: Signal<Array<UserUploadedImage>>;

    imageDirectory: Signal<string>;

    showConnectivityGraph: Signal<boolean>;

    graph: Signal<Graph>;

    scratchList: Signal<Array<SlimDeck>>;

    scratchListMinimised: Signal<boolean>;

    srReviewCount: Signal<number>;
    srEarliestReviewDate: Signal<undefined | string>;
};

type GraphEdge = [number, RefKind, number];

export type GraphNode = {
    id: number;
    name: string;
    deckKind: DeckKind;
    graphTerminator: boolean;
};

export type Graph = {
    fullyLoaded: boolean;
    // an array of { id, name, resource }
    decks: Array<GraphNode>;
    links: { [id: number]: Set<GraphEdge> };
    // an array which is indexed by deckId, returns the offset into state.graph.value.decks
    deckIndexFromId: Array<number>;
};

// isg hacked in:
export type ShowNoteForm = {
    note: boolean;
    summary: boolean;
    review: boolean;
};

export type UserUploadedImage = {
    filename: string;
};

export type UberSetup = {
    directory: string;
    recentImages: Array<UserUploadedImage>;
    srReviewCount: number;
    srEarliestReviewDate: string;
};
