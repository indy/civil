// todo: the exports could be wrong, see the correct way of defining interfaces

import { Signal } from "@preact/signals";

export type Key = number;

export enum DeckKind {
    Article = 1,
    Person,
    Idea,
    Timeline,
    Quote,
}

export enum NoteKind {
    Note = 1,
    NoteReview,
    NoteSummary,
    NoteDeckMeta,
}

export enum RefKind {
    Ref = 1,
    RefToParent,
    RefToChild,
    RefInContrast,
    RefCritical,
}

export enum PointKind {
    Point = 1,
    PointBegin,
    PointEnd,
}

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

export type SlimDeck = {
    id: Key;
    title: string;
    deckKind: DeckKind;
    insignia: number;
};

export type Ref = SlimDeck & {
    noteId: Key;
    refKind: RefKind;
    annotation?: string;
};

export type BackNote = SlimDeck & {
    noteId: Key;
    noteContent: string;
    noteKind: NoteKind;
};

export interface FatDeck {
    title: string;
    backnotes?: Array<BackNote>;
    backrefs?: Array<Ref>;
    flashcards?: Array<FlashCard>;
    id: Key;
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

export type Note = {
    id: Key;
    prevNoteId: Key | null;
    kind: NoteKind;
    content: string;
    pointId: Key | null;

    decks: Array<Ref>;
    flashcards: Array<FlashCard>;
};

export type Notes = Array<Note>;

export type NoteSeqs = {
    points?: { [_: Key]: Notes };
    note: Notes;
    noteDeckMeta: Notes;
    noteReview: Notes;
    noteSummary: Notes;
};

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
    id: Key;
    kind: PointKind;
    title?: string;
    dateTextual?: string;
    date?: string;
    age?: number;

    deckId: Key;
    deckName: string;
    deckKind: DeckKind;
};

export type FlashCard = {
    id: Key;
    noteId: Key;
    prompt: string;
    nextTestDate: string;
    easinessFactor: number;
    interRepetitionInterval: number;
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

export type ColourTriple = [number, number, number];

export type Definitions = {
    [index: string]: string | ColourTriple | undefined;

    bg?: ColourTriple;
    bg1?: ColourTriple;
    bg2?: ColourTriple;
    bg3?: ColourTriple;

    fg?: ColourTriple;
    fg1?: ColourTriple;
    fg_inactive?: ColourTriple;

    divider?: ColourTriple;

    graph_node_expanded?: ColourTriple;
    graph_node_partial?: ColourTriple;
    graph_node_minimised?: ColourTriple;
    graph_edge?: ColourTriple;
    graph_edge_in_contrast?: ColourTriple;
    graph_edge_critical?: ColourTriple;

    scribble_neutral?: ColourTriple;
    scribble_disagree?: ColourTriple;
    hyperlink?: ColourTriple;
    highlight?: ColourTriple;

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

    rgbFromHsl(hsl: ColourTriple): string;
};

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

    urlTitle: Signal<string>;
    url: Signal<string>;

    user: Signal<User>;

    preferredDeckKindOrder: Array<DeckKind>;
    preferredOrder: Array<string>; // rename to preferredTopMenuOrder

    listing: Signal<Listing>;

    verboseUI: Signal<boolean>;

    showNoteForm: Signal<Record<NoteKind, boolean>>;
    showNoteFormPointId: Signal<Key | undefined>;

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
    id: Key;
    name: string;
    deckKind: DeckKind;
    graphTerminator: boolean;
};

export type Graph = {
    fullyLoaded: boolean;
    // an array of { id, name, resource }
    decks: Array<GraphNode>;
    links: { [id: Key]: Set<GraphEdge> };
    // an array which is indexed by deckId, returns the offset into state.graph.value.decks
    deckIndexFromId: Array<Key>;
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

export type ProtoNoteReferences = {
    noteId: Key;
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
    nodes: { [index: Key]: Node };
    edges: Array<Edge>;

    simStats?: SimStats;
};

export type Node = {
    id: Key;
    isImportant: boolean;
    expandedState: ExpandedState;
    deckKind: DeckKind;
    label: string;
    x: number;
    y: number;
    fx?: number;
    fy?: number;
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
    onFormToggle: () => void;
    onFormHide: () => void;
    buildPointForm: (onSuccessCallback: () => void) => any;
    onRefsChanged: (note: Note, allDecksForNote: Array<Ref>) => void;
    noteSectionForDeckPoint: (deckPoint: DeckPoint) => any;
    pointHasNotes: (point: DeckPoint) => boolean;
    canShowNoteSection: (noteKind: NoteKind) => boolean;
    howToShowNoteSection: (noteKind: NoteKind) => NoteSectionHowToShow;
};

export type NoteSectionType = {
    x?: any;
};

export type NoteThing = {
    topRefKind?: RefKind;
    topAnnotation?: string;
    noteContent: string;
    noteId: Key;
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
