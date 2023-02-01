// todo: the exports could be wrong, see the correct way of defining interfaces

// COPIED FROM MEMO


import { Signal } from "@preact/signals";

export interface IAdmin {
    dbName: string;
}

export interface IUser {
    username: string;
    email: string;
    admin?: IAdmin;
}



export interface IArticle {
    id: number;
    title: string;

    insignia: number;

    created_at: string;

    source?: string;
    author?: string;
    short_description?: string;

    rating: number;

    notes?: any;

    refs?: any;

    backnotes?: any;
    backrefs?: any;

    flashcards?: any;

    published_date?: any;
}

export interface IDeckSimple {
    id: number,
    name: string,
    resource: string,
    insignia: number,
}

export interface IIdeasListings {
    recent: Array<IDeckSimple>;
    orphans: Array<IDeckSimple>;
    unnoted: Array<IDeckSimple>;
}

export interface IPeopleListings {
    uncategorised: Array<IDeckSimple>;
    ancient: Array<IDeckSimple>;
    medieval: Array<IDeckSimple>;
    modern: Array<IDeckSimple>;
    contemporary: Array<IDeckSimple>;
}

export interface IArticleListings {
    recent: Array<IArticle>;
    rated: Array<IArticle>;
    orphans: Array<IDeckSimple>;
}

export interface IListing {
    ideas: IIdeasListings | undefined;
    people: IPeopleListings | undefined;
    articles: IArticleListings | undefined;
    timelines: Array<IDeckSimple> | undefined;
}

export interface ISettings {
    [index: string]: number;

    hueDelta: number;

    hueOffsetFg: number;
    saturationFg: number;
    lightnessFg: number;

    hueOffsetBg: number;
    saturationBg: number;
    lightnessBg: number;
}

export interface IDefinitions {
    [index: string]: string | [number, number, number] | undefined;

    bg?: [number, number, number],
    bg1?: [number, number, number],
    bg2?: [number, number, number],
    bg3?: [number, number, number],

    fg?: [number, number, number],
    fg1?: [number, number, number],
    fg_inactive?: [number, number, number],

    divider?: [number, number, number],

    graph_node_expanded?: [number, number, number],
    graph_node_partial?: [number, number, number],
    graph_node_minimised?: [number, number, number],
    graph_edge?: [number, number, number],
    graph_edge_in_contrast?: [number, number, number],
    graph_edge_critical?: [number, number, number],

    scribble_neutral?: [number, number, number],
    scribble_disagree?: [number, number, number],
    hyperlink?: [number, number, number],
    highlight?: [number, number, number],

    bg_ideas?: string,
    bg_articles?: string,
    bg_people?: string,
    bg_timelines?: string,
    bg_quotes?: string,

    fg_ideas?: string,
    fg_articles?: string,
    fg_people?: string,
    fg_timelines?: string,
    fg_quotes?: string,
}

export interface WasmInterface {
    asHtmlAst(markup: string): any;
    splitter(markup: string): any;

    rgbFromHsl(hsl: [number, number, number]): string
}


export enum ToolbarMode {
    View = 1,
    Edit,
    Refs,
    SR,
    AddAbove,
}

export interface IState {
    appName: string;
    toolbarMode: Signal<ToolbarMode>;

    wasmInterface: WasmInterface | undefined;

    settings: Signal<ISettings>;
    definitions: Signal<IDefinitions>;

    hasPhysicalKeyboard: boolean;
    oldestAliveAge: number;

    componentRequiresFullKeyboardAccess: Signal<boolean>;

    showingSearchCommand: Signal<boolean>;


    urlName: Signal<string>;
    url: Signal<string>;

    user: Signal<IUser>;

    preferredOrder: Array<string>;

    listing: Signal<IListing>;

    verboseUI: Signal<boolean>;

    showNoteForm: Signal<IShowNoteForm>;

    showAddPointForm: Signal<boolean>;

    recentImages: Signal<Array<IUserUploadedImage>>;

    imageDirectory: Signal<string>;

    showConnectivityGraph: Signal<boolean>;

    graph: Signal<IGraph>;

    scratchList: Signal<Array<IScratchList>>;

    scratchListMinimised: Signal<boolean>;

    srReviewCount: Signal<number>;
    srEarliestReviewDate: Signal<undefined | string>;

}

// isg hacked in:
export interface IScratchList {
    fake: boolean;
}

// isg hacked in:
export interface IGraph {
    fullyLoaded: boolean;
    // an array of { id, name, resource }
    decks: Array<any>;
    links: Array<any>;
    // an array which is indexed by deckId, returns the offset into state.graph.value.decks
    deckIndexFromId: Array<any>;
}

// isg hacked in:
export interface IShowNoteForm {
    note: boolean;
    summary: boolean;
    review: boolean;
}

export interface IPigment {
    num: number;
    numString: string;
    class: string;
    classAlt: string;
}

export interface IUserUploadedImage {
    filename: string;
}

export interface IUberSetup {
    directory: string;
    recentImages: Array<IUserUploadedImage>;
    srReviewCount: number;
    srEarliestReviewDate: string;
}
