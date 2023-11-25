// need to know the current state of the page in order to prevent
// unnecessary previews from appearing when the mouse hovers over
// a link after another link has been clicked, the hovered over
// link will show a preview afther the clicked link page is navigated
// to.
//
export enum PageState {
    PageLoaded = 1,
    PageLoading,
}

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

export enum CommandBarMode {
    Search,
    Command,
}

export enum WaitingFor {
    User,
    Client,
    Server,
}

export enum LineStyle {
    Solid = 1,
    Dotted,
}

export enum Direction {
    Incoming = 1,
    Outgoing,
}

export enum Role {
    /// A system message, automatically sent at the start to set the tone of the model
    System = 1,
    /// A message sent by ChatGPT
    Assistant,
    /// A message sent by the user
    User,
}
