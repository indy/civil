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

export interface ICategory {
    id: number;
    title: string;
}

export interface INote {
    age: string;
    content: string;
    createdAt: string;
    id: number;
    pinned: boolean;
    title: string;
    triagedAt?: string;
    categoryId?: number;
}

export interface IListing {
    notes: Array<INote>;
    category: { [key: number]: Array<INote> };
    bin: Array<INote>;
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
    Fake = 1,
    SomethingElse
}

export interface IState {
    appName: string;
    toolbarMode: Signal<ToolbarMode>;

    wasmInterface: WasmInterface | undefined;

    settings: Signal<ISettings>;
    definitions: Signal<IDefinitions>;

    hasPhysicalKeyboard: boolean;

    user: Signal<IUser>;

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
    directory: number;
    recentImages: [IUserUploadedImage];
    srReviewCount: number;
    srEarliestReviewDate: string;
}
