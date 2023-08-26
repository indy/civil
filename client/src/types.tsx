import { Signal } from "@preact/signals";

export type Key = number;

export enum CivilSpan {
    Narrow = 1,
    Broad,
}

export enum RenderingDeckPart {
    Body,
    Heading,
    UiInterleaved,
}

export enum Font {
    Serif = 1,
    Sans,
    Cursive,
    AI,
    FrenchCanon,
    English,
    DeWalpergens,
    DoublePica,
    GreatPrimer,
    ThreeLinesPica,
    LibreBaskerville,
}

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
    Event,
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
    BookmarkLinks,
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

export type BackDeck = {
    notes: Notes;
    deck: SlimDeck;

    // generated client side with data from server
    //
    passages: Array<Passage>;
};

export type PreviewNotes = {
    deckId: Key;
    notes: Notes;
};

export type PreviewDeck = SlimDeck & {
    notes: Notes;
};

export type DeckUpdate = {
    title: string;
    insignia: number;
    font: Font;
    graphTerminator: boolean;
};

export type SlimDeck = {
    id: Key;
    title: string;
    deckKind: DeckKind;
    graphTerminator: boolean;
    insignia: number;
    font: Font;
};

export type SlimEvent = SlimDeck & {
    locationTextual?: string;
    dateTextual?: string;
    date?: string;

    // generated client side with data from server
    //
    age?: number;
    compDate: Date;
};

export type FatDeck = SlimDeck & {
    // received from server
    //
    flashcards: Array<FlashCard>;
    points?: Array<Point>;
    events?: Array<SlimEvent>;

    // received from server and then modified by the client
    //
    notes: Notes;
    backDecks: Array<BackDeck>;

    // generated client side with data from server
    //
    passage: Record<NoteKind, Passage>;
    passageForPoint?: Record<Key, Passage>;
    backDecksGrouped: Record<DeckKind, Array<BackDeck>>;
};

export type ChatMessage = {
    noteId: Key;
    role: Role;
    content: string;
};

export type IdeaExtras = {
    createdAt: string;
};

export type PersonExtras = {
    sortDate?: string;
};

export type ArticleExtras = {
    source?: string;
    author?: string;
    createdAt: string;
    publishedDate?: string;
    rating: number;
    shortDescription?: string;
};

export type DialogueExtras = {
    aiKind: AiKind;
    originalChatMessages: Array<ChatMessage>;
};

export type EventExtras = {
    locationTextual?: string;
    longitude?: number;
    latitude?: number;
    locationFuzz: number;

    dateTextual?: string;
    exactDate?: string;
    lowerDate?: string;
    upperDate?: string;
    dateFuzz: number;

    importance: number;
};

export type QuoteExtras = {
    attribution: string;
};

export type DeckIdea = FatDeck & IdeaExtras;
export type DeckPerson = FatDeck & PersonExtras;
export type DeckArticle = FatDeck & ArticleExtras;
export type DeckDialogue = FatDeck & DialogueExtras;
export type DeckEvent = FatDeck & EventExtras;
export type DeckTimeline = FatDeck;
export type DeckQuote = FatDeck & QuoteExtras;

export type Note = {
    id: Key;
    prevNoteId: Key | null;
    kind: NoteKind;
    content: string;
    pointId: Key | null;
    font: Font;

    refs: Array<Reference>;
    flashcards: Array<FlashCard>;

    chatMessage?: ChatMessage; // the original chat message for a dialogue
};

// typescript has structural typing rather than nominal typing
// so the following are unfortunately interchangeable
//
export type Notes = Array<Note>;
export type Passage = Array<Note>; // guaranteed to be a sequence of consecutive notes

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

export type Point = {
    id: Key;
    kind: PointKind;
    title: string;
    font: Font;

    locationTextual?: string;

    dateTextual?: string;
    date?: string;

    deckId: Key;
    deckName: string;
    deckKind: DeckKind;

    // generated client side with data from server
    //
    age?: number;
    compDate: Date;
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

export type SeekDeck = {
    rank: number;
    deck: SlimDeck;
    seekNotes: Array<Note>;
};

// todo: when is this used, replace with ScourResults?
export type SeekResults = {
    results: Array<SeekDeck>;
};

export type SlimResults = {
    results: Array<SlimDeck>;
};

export type SearchResults = {
    deckLevel: Array<SeekDeck>;
    noteLevel: Array<SeekDeck>;
};

export type ColourSeeds = {
    [index: string]: number;
};

export type ColourTriple = [number, number, number];
export type ColourQuad = [number, number, number, number];

export type WasmInterface = {
    markupAsStruct(markup: string, noteId: number): any;
    splitter(markup: string): any;
    rgbFromHsl(h: number, s: number, l: number): any;
};

export type VisiblePreview = {
    id: Key;
    showing: boolean; // replace boolean with enum
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

export type Bookmark = {
    id: Key;
    deck: SlimDeck;
};

export type ImmutableState = {
    readonly appName: string;

    readonly defaultFont: Font;

    readonly deckKindOrder: Array<DeckKind>;
    readonly topMenuOrder: Array<string>;

    readonly oldestAliveAge: number;

    readonly imageZoomDefault: number;
    readonly imageZoomMin: number;
    readonly imageZoomMax: number;
};

// json structure that will be saved server-side
//
export type UiConfig = {
    colourScheme: ColourScheme;
    decksPerPage: Record<DeckKind, number>;
};

export type State = {
    waitingFor: Signal<WaitingFor>;

    span: Signal<CivilSpan>;

    wantToShowDeckUpdateForm: Signal<boolean>;

    debugMessages: Signal<Array<string>>;

    mode: Signal<CivilMode>;

    wasmInterface: WasmInterface | undefined;

    hasPhysicalKeyboard: boolean;

    componentRequiresFullKeyboardAccess: Signal<boolean>;

    showingCommandBar: Signal<boolean>;
    commandBarState: Signal<CommandBarState>;

    urlTitle: Signal<string>;
    url: Signal<string>;

    user: Signal<User>;
    uiConfig: Signal<UiConfig>; // bit of duplication as the User contains the original uiConfig json string

    colourSeeds: Signal<ColourSeeds>;

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

    bookmarks: Signal<Array<Bookmark>>;
    bookmarksMinimised: Signal<boolean>;

    memoriseReviewCount: Signal<number>;
    memoriseEarliestReviewDate: Signal<undefined | string>;
};

type GraphEdge = [number, RefKind, number];

export type GraphDeck = SlimDeck;

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
    bookmarks: Array<Bookmark>;
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
    complyWithAppStateRequestToShowUpdateForm: () => void;
    isEditingDeckRefs: () => boolean;
    setEditingDeckRefs: (value: boolean) => void;
    updateAndReset: (newDeck: T) => void;
    onShowSummaryClicked: () => void;
    onShowReviewClicked: () => void;
    buildPointForm: (onSuccessCallback: () => void) => any;
    onRefsChanged: (note: Note, refsInNote: Array<Reference>) => void;
    passageForPoint: (point: Point) => any;
    pointHasNotes: (point: Point) => boolean;
    canShowPassage: (noteKind: NoteKind) => boolean;
    howToShowPassage: (noteKind: NoteKind) => PassageHowToShow;
};

export type PassageType = {
    x?: any;
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
};

export type UserWithUiConfig = User & {
    uiConfigJson: string;
};

export enum Role {
    /// A system message, automatically sent at the start to set the tone of the model
    System = 1,
    /// A message sent by ChatGPT
    Assistant,
    /// A message sent by the user
    User,
}

export type StateChangeSpan = {
    span: CivilSpan;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeUiConfig = {
    uiConfig: UiConfig;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeWaitingFor = {
    waitingFor: WaitingFor;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeShowShortcuts = {
    showKeyboardShortcuts: boolean;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeKeyDown = {
    keyDownIndex: number;
    shiftKey: boolean;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeSetFocus = {
    hasFocus: boolean;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeSetSearch = {
    searchCandidates: Array<SlimDeck>;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeInputGiven = {
    mode: CommandBarMode;
    text: string;
    searchCandidates: Array<SlimDeck>;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeDeckId = {
    deckId: Key;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeDeleteDeck = {
    deckKind: DeckKind;
    deckId: Key;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeAddPreview = {
    slimDeck: SlimDeck;
    previewNotes: PreviewNotes;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeMode = {
    mode: CivilMode;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeTitle = {
    title: string;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeUrl = {
    url: string;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeUber = {
    uber: UberSetup;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeUser = {
    user: User;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeNoteRefsModified = {
    refsInNote: Array<Reference>;
    changes: RefsModified;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeNoteForm = {
    noteKind: NoteKind;
    pointId?: Key;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeRecentImages = {
    recentImages: Array<UserUploadedImage>;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeBookmarks = {
    bookmarks: Array<Bookmark>;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeRecentlyUsedDecks = {
    recents: Array<SlimDeck>;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeCount = {
    count: number;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeGraph = {
    graph: FullGraphStruct;
    calledFromBroadcastChannel?: boolean;
};

export type StateChangeEmpty = {
    calledFromBroadcastChannel?: boolean;
};

export type AppStateChangeArgs =
    | StateChangeAddPreview
    | StateChangeBookmarks
    | StateChangeCount
    | StateChangeDeckId
    | StateChangeDeleteDeck
    | StateChangeGraph
    | StateChangeInputGiven
    | StateChangeKeyDown
    | StateChangeMode
    | StateChangeNoteForm
    | StateChangeNoteRefsModified
    | StateChangeRecentImages
    | StateChangeRecentlyUsedDecks
    | StateChangeSetFocus
    | StateChangeSetSearch
    | StateChangeShowShortcuts
    | StateChangeSpan
    | StateChangeTitle
    | StateChangeUber
    | StateChangeUrl
    | StateChangeUser
    | StateChangeWaitingFor
    | StateChangeEmpty
    | StateChangeUiConfig;

export type GeoResult = {
    error: number;
    latt: string;
    longt: string;
};

export type PaginationResults = {
    items: Array<SlimDeck>;
    totalItems: number;
};
