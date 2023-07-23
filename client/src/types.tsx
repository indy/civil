import { Signal } from "@preact/signals";

export type Key = number;

export enum RenderingDeckPart {
    Body,
    Heading,
    UiInterleaved,
}

// export enum Typeface {
//     Serif,
//     Cursive,
//     AI,
//     Book,
//     OldBook,
//     Magazine,
//     Sans,
// }

export enum ColourScheme {
    Dark,
    Light,
}

export enum AiKind {
    OpenAIGpt35Turbo = 1,
    OpenAIGpt4,
}

export enum DeckManagerFlags {
    Summary = 1,
    Review = 2,
}

export enum DeckKind {
    Article = 1,
    Person,
    Idea,
    Timeline,
    Quote,
    Dialogue,
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

export enum CivilMode {
    View = 1,
    Edit,
    Refs,
    Memorise,
    AddAbove,
    ScratchListLinks,
}

export enum PassageHowToShow {
    Hide = 1,
    Show,
    Exclusive,
}

export type Reference = SlimDeck & {
    noteId: Key;
    refKind: RefKind;
    annotation?: string;
};

export type BackNote = SlimDeck & {
    noteId: Key;
    prevNoteId?: Key;
    noteContent: string;
    noteKind: NoteKind;
    noteTypeface: string;
};

export type PreviewNotes = {
    deckId: Key;
    notes: Notes;
};

export type PreviewDeck = SlimDeck & {
    notes: Notes;
};

export type SlimDeck = {
    id: Key;
    title: string;
    deckKind: DeckKind;
    insignia: number;
    typeface: string;
};

export interface FatDeck {
    // received from server
    //
    title: string;
    backnotes?: Array<BackNote>;
    backrefs?: Array<Reference>;
    flashcards?: Array<FlashCard>;
    id: Key;
    insignia: number;
    refs?: Array<Reference>;
    points?: Array<DeckPoint>;
    typeface: string;

    // received from server and then modified by the client
    //
    notes: Notes;

    // generated client side with data from server
    //
    noteSeqs?: NoteSeqs;
    backRefDecksGroupedByKind?: Record<DeckKind, Array<BackRefDeck>>;
}

export type BackRefDeck = {
    deckId: Key;
    title: string;
    deckInsignia: number;
    deckKind: DeckKind;
    deckTypeface: string;

    // each deck may have multiple sequences of notes that have been given the same ref
    // notes in a single sequence should be rendered together
    // and sequences should be separated by a 'hr' element
    //
    backRefNoteSeqs: Array<Array<BackRefNote>>;

    deckLevelRefs: Array<Reference>;
    metaNoteId: Key;
    deckLevelAnnotation?: string;
};

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

export type OriginalChatMessage = {
    noteId: Key;
    role: Role;
    content: string;
};

export type DeckDialogue = FatDeck & {
    aiKind: string;
    originalChatMessages: Array<OriginalChatMessage>;
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
    typeface: string;

    refs: Array<Reference>;
    flashcards: Array<FlashCard>;

    chatMessage?: OriginalChatMessage; // the original chat message for a dialogue
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
    typeface: string;

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
    interval: number;
    repetition: number;
};

export type ResultList = {
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
    dialogues: Array<SlimDeck> | undefined;
};

export type ColourSeeds = {
    [index: string]: number;
};

export type ColourTriple = [number, number, number];

export type WasmInterface = {
    markupAsStruct(markup: string, noteId: number): any;
    splitter(markup: string): any;

    rgbFromHsl(hsl: ColourTriple): string;
};

export type VisiblePreview = {
    id: Key;
    showing: boolean; // replace boolean with enum
};

export type Command = {
    command?: string;
    description?: string;
    quoteAround?: string;
    fn?: (args?: any) => any;
    spacer?: boolean;
};

export enum CommandBarMode {
    Search,
    Command,
}

export type CommandBarState = {
    mode: CommandBarMode;
    hasFocus: boolean;
    showKeyboardShortcuts: boolean;
    shiftKey: boolean;
    text: string;
    searchCandidates: Array<SlimDeck>;
    keyDownIndex: number;
};

export enum WaitingFor {
    User,
    Client,
    Server,
}

export type ImmutableState = {
    readonly appName: string;

    readonly defaultTypeface: string;

    readonly deckKindOrder: Array<DeckKind>;
    readonly topMenuOrder: Array<string>;

    readonly oldestAliveAge: number;

    readonly imageZoomDefault: number;
    readonly imageZoomMin: number;
    readonly imageZoomMax: number;
};

export type State = {
    waitingFor: Signal<WaitingFor>;

    debugMessages: Signal<Array<string>>;

    mode: Signal<CivilMode>;

    wasmInterface: WasmInterface | undefined;

    colourScheme: ColourScheme;
    colourSeeds: Signal<ColourSeeds>;

    hasPhysicalKeyboard: boolean;

    componentRequiresFullKeyboardAccess: Signal<boolean>;

    showingCommandBar: Signal<boolean>;
    commandBarState: Signal<CommandBarState>;

    urlTitle: Signal<string>;
    url: Signal<string>;

    user: Signal<User>;

    listing: Signal<Listing>;

    previewCache: Signal<Record<Key, PreviewDeck>>;

    visiblePreviewDeck: Signal<VisiblePreview>;

    showNoteForm: Signal<Record<NoteKind, boolean>>;
    showNoteFormPointId: Signal<Key | undefined>;

    showAddPointForm: Signal<boolean>;

    // the three most recent decks added as refs
    recentlyUsedDecks: Signal<Array<SlimDeck>>;

    recentImages: Signal<Array<UserUploadedImage>>;
    imageDirectory: Signal<string>;

    showConnectivityGraph: Signal<boolean>;
    graph: Signal<Graph>;

    scratchList: Signal<Array<SlimDeck>>;
    scratchListMinimised: Signal<boolean>;

    memoriseReviewCount: Signal<number>;
    memoriseEarliestReviewDate: Signal<undefined | string>;
};

type GraphEdge = [number, RefKind, number];

export type GraphDeck = {
    id: Key;
    name: string;
    deckKind: DeckKind;
    graphTerminator: boolean;
};

export type FullGraphStruct = {
    graphDecks: Array<GraphDeck>;
    graphConnections: Array<number>;
};

export type Graph = {
    fullyLoaded: boolean;
    // an array of { id, name, resource }
    decks: Array<GraphDeck>;
    links: { [id: Key]: Set<GraphEdge> };
    // an array which is indexed by deckId, returns the offset into state.graph.value.decks
    deckIndexFromId: Array<Key>;
};

export type UserUploadedImage = {
    filename: string;
};

export type UberSetup = {
    directory: string;
    recentlyUsedDecks: Array<SlimDeck>;
    recentImages: Array<UserUploadedImage>;
    memoriseReviewCount: number;
    memoriseEarliestReviewDate: string;
    ideas: IdeasListings;
    people: PeopleListings;
    articles: ArticleListings;
    timelines: Array<SlimDeck>;
    dialogues: Array<SlimDeck>;
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
export type GraphNode = {
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

export type GraphState = {
    nodes: { [index: Key]: GraphNode };
    edges: Array<Edge>;

    simStats?: SimStats;
};

export type DM<T extends FatDeck> = {
    update: (d: T) => void;
    getDeck: () => T | undefined;
    getDeckKind: () => DeckKind;
    isShowingUpdateForm: () => boolean;
    setShowingUpdateForm: (value: boolean) => void;
    isEditingDeckRefs: () => boolean;
    setEditingDeckRefs: (value: boolean) => void;
    updateAndReset: (newDeck: T) => void;
    onShowSummaryClicked: () => void;
    onShowReviewClicked: () => void;
    buildPointForm: (onSuccessCallback: () => void) => any;
    onRefsChanged: (note: Note, allDecksForNote: Array<Reference>) => void;
    passageForDeckPoint: (deckPoint: DeckPoint) => any;
    pointHasNotes: (point: DeckPoint) => boolean;
    canShowPassage: (noteKind: NoteKind) => boolean;
    howToShowPassage: (noteKind: NoteKind) => PassageHowToShow;
};

export type PassageType = {
    x?: any;
};

export type BackRefNote = {
    topRefKind?: RefKind;
    topAnnotation?: string;
    noteContent: string;
    typeface: string;
    noteId: Key;
    prevNoteId?: Key;
    refs: Array<Reference>;
};

export type RefsModified = {
    referencesChanged: Array<Reference>;
    referencesRemoved: Array<Reference>;
    referencesAdded: Array<Reference>;
    referencesCreated: Array<Reference>;
};

export type ProtoNoteReferences = RefsModified & {
    noteId: Key;
};

export type ReferencesApplied = {
    refs: Array<Reference>;
    recents: Array<SlimDeck>;
};

export type Admin = {
    dbName: string;
};

export type User = {
    username: string;
    email: string;
    admin?: Admin;
    theme: string;
};

export enum Role {
    /// A system message, automatically sent at the start to set the tone of the model
    System = 1,
    /// A message sent by ChatGPT
    Assistant,
    /// A message sent by the user
    User,
}
