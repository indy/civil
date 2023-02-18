import { h } from "preact";
import { useEffect } from "preact/hooks";
import { route } from "preact-router";

import { DeckKind, NoteKind, DeckQuote, FatDeck } from "../types";

import Net from "../Net";
import buildMarkup from "./BuildMarkup";
import { capitalise } from "../JsUtils";
import { getAppState, AppStateChange } from "../AppState";
import { useLocalReducer } from "../PreactUtils";

import CivilInput from "./CivilInput";
import CivilTextArea from "./CivilTextArea";
import DeckManager from "./DeckManager";
import DeleteConfirmation from "./DeleteConfirmation";
import SectionNotes from "./SectionNotes";
import { DeluxeToolbar } from "./DeluxeToolbar";

enum ActionType {
    ShowAddForm,
    HideAddForm,
    SetAttribution,
    SetQuoteText,
}

type Action = {
    type: ActionType;
    data?: string;
};

type State = {
    showAddForm: boolean;
    attribution: string;
    quoteText: string;
};

function quotesReducer(state: State, action: Action) {
    switch (action.type) {
        case ActionType.ShowAddForm: {
            return {
                ...state,
                showAddForm: true,
            };
        }
        case ActionType.HideAddForm: {
            return {
                ...state,
                showAddForm: false,
            };
        }
        case ActionType.SetAttribution: {
            return {
                ...state,
                attribution: action.data,
            };
        }
        case ActionType.SetQuoteText: {
            return {
                ...state,
                quoteText: action.data,
            };
        }
    }
}

function titleFromQuoteText(quoteText: string) {
    const title =
        quoteText.length > 60 ? quoteText.slice(0, 57) + "..." : quoteText;
    return title;
}

function Quotes({ path }: { path?: string }) {
    const resource = "quotes";

    const initialState: State = {
        showAddForm: false,
        attribution: "",
        quoteText: "",
    };

    const [local, localDispatch] = useLocalReducer(quotesReducer, initialState);

    function clickedNewQuoteButton(e: Event) {
        e.preventDefault();
        localDispatch(ActionType.ShowAddForm);
    }

    function clickedRandomButton(e: Event) {
        e.preventDefault();
        Net.get<DeckQuote>("/api/quotes/random").then((quote) => {
            route(`/quotes/${quote.id}`);
        });
    }

    function handleChangeEvent(e: Event) {
        if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
        ) {
            const value = e.target.value;
            const name = e.target.name;

            if (name === "attribution") {
                localDispatch(ActionType.SetAttribution, value);
            }
            if (name === "quote-text") {
                localDispatch(ActionType.SetQuoteText, value);
            }
        }
    }

    function clickedSave(e: Event) {
        e.preventDefault();

        type ProtoQuote = {
            title: string;
            text: string;
            attribution: string;
            insignia: number;
        };

        const data: ProtoQuote = {
            title: titleFromQuoteText(local.quoteText),
            text: local.quoteText,
            attribution: local.attribution,
            insignia: 0,
        };

        Net.post<ProtoQuote, DeckQuote>("/api/quotes", data).then((quote) => {
            route(`/quotes/${quote.id}`);
        });
    }

    function clickedCancel(e: Event) {
        e.preventDefault();
        localDispatch(ActionType.HideAddForm);
    }

    function renderNewQuoteButton() {
        return <button onClick={clickedNewQuoteButton}>Add Quote...</button>;
    }

    function renderRandomButton() {
        return <button onClick={clickedRandomButton}>Random Quote</button>;
    }

    function renderAddForm() {
        return (
            <form class="civil-form">
                <label for="attribution">QuoteText:</label>
                <br />
                <CivilTextArea
                    id="quote-text"
                    value={local.quoteText}
                    onInput={handleChangeEvent}
                />
                <br />
                <label for="attribution">Attribution:</label>
                <br />
                <CivilInput
                    id="attribution"
                    value={local.attribution}
                    onInput={handleChangeEvent}
                />
                <br />
                <button onClick={clickedCancel}>cancel</button>
                <button onClick={clickedSave}>save</button>
            </form>
        );
    }

    return (
        <article>
            <h1 class="ui">{capitalise(resource)}</h1>

            {!local.showAddForm && renderNewQuoteButton()}
            {local.showAddForm && renderAddForm()}
            {!local.showAddForm && renderRandomButton()}
        </article>
    );
}

function preCacheFn(d: FatDeck) {
    return d;
}

function Quote({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    const quoteId = id ? parseInt(id, 10) : 0;
    const deckKind = DeckKind.Quote;

    const deckManager = DeckManager({
        id: quoteId,
        deckKind,
        preCacheFn,
        hasSummarySection: false,
        hasReviewSection: false,
    });

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [id]);

    function getQuoteThenRoute(url: string) {
        Net.get<DeckQuote>(url).then((deck) => {
            if (deck) {
                route(`/quotes/${deck.id}`);
                AppStateChange.urlName(deck.title);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }

    function onKeyDown(e: KeyboardEvent) {
        if (
            !appState.componentRequiresFullKeyboardAccess.value &&
            !appState.showingSearchCommand.value
        ) {
            if (e.key === "n") {
                getQuoteThenRoute(`/api/quotes/${quoteId}/next`);
            } else if (e.key === "p") {
                getQuoteThenRoute(`/api/quotes/${quoteId}/prev`);
            } else if (e.key === "r") {
                getQuoteThenRoute(`/api/quotes/random`);
            }
        }
    }

    function onEditedAttribute(attribution: string) {
        let deckQuote: DeckQuote = deck! as DeckQuote;
        let note = deckQuote.notes.find((n) => n.kind === NoteKind.Note);

        type ProtoQuote = {
            title: string;
            text: string; // not really needed, server side only uses title and attribution
            attribution: string;
            insignia: number;
        };

        if (note) {
            let data: ProtoQuote = {
                title: deckQuote.title,
                text: note.content, // not really needed, server side only uses title and attribution
                attribution: attribution,
                insignia: 0,
            };

            // as the title could have changed, we need to post the updated quote to the server
            Net.put<ProtoQuote, FatDeck>(`/api/quotes/${quoteId}`, data).then(
                (updatedDeck) => {
                    deckManager.updateAndReset(updatedDeck);
                }
            );
        }
    }

    function onDelete() {
        Net.delete(`/api/quotes/${quoteId}`, {}).then(() => {
            route("/quotes");
        });
    }

    const deck: DeckQuote | undefined = deckManager.getDeck() as
        | DeckQuote
        | undefined;
    if (deck) {
        return (
            <article id="quotation-article">
                <DeluxeToolbar />
                <SectionNotes
                    deck={deck}
                    title={deck.title}
                    howToShowNoteSection={deckManager.howToShowNoteSection}
                    canShowNoteSection={deckManager.canShowNoteSection}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckKind}
                    onUpdateDeck={deckManager.update}
                    noappend
                />

                <Attribution
                    attribution={deck.attribution}
                    onEdited={onEditedAttribute}
                    onDelete={onDelete}
                />
            </article>
        );
    } else {
        return (
            <article>
                <DeluxeToolbar />
            </article>
        );
    }
}

enum AttrMode {
    Show,
    Edit,
}

enum ActionAttrType {
    SetMode,
    InitAttribution,
    SetAttribution,
    ShowButtons,
    HideButtons,
}

type ActionAttr = {
    type: ActionAttrType;
    data: AttrMode;
};

type StateAttr = {
    mode: AttrMode;
    showButtons: boolean;
    originalAttribution: string;
    attribution: string;
};

function attributionReducer(state: StateAttr, action: ActionAttr) {
    switch (action.type) {
        case ActionAttrType.SetMode: {
            return {
                ...state,
                mode: action.data,
                showButtons:
                    action.data === AttrMode.Show ? false : state.showButtons,
            };
        }
        case ActionAttrType.ShowButtons: {
            return {
                ...state,
                showButtons: true,
            };
        }
        case ActionAttrType.HideButtons: {
            return {
                ...state,
                showButtons: false,
            };
        }
        case ActionAttrType.InitAttribution: {
            return {
                ...state,
                originalAttribution: action.data,
                attribution: action.data,
            };
        }
        case ActionAttrType.SetAttribution: {
            return {
                ...state,
                attribution: action.data,
            };
        }
    }
}

function Attribution({ attribution, onEdited, onDelete }) {
    let initialState: StateAttr = {
        mode: AttrMode.Show,
        showButtons: false,
        originalAttribution: attribution,
        attribution,
    };
    const [local, localDispatch] = useLocalReducer(
        attributionReducer,
        initialState
    );

    useEffect(() => {
        if (local.originalAttribution !== attribution) {
            localDispatch(ActionAttrType.InitAttribution, attribution);
        }
    }, [attribution]);

    function clickedAttribution(e: Event) {
        e.preventDefault();
        localDispatch(
            local.showButtons
                ? ActionAttrType.HideButtons
                : ActionAttrType.ShowButtons
        );
    }

    function confirmedDeleteClicked() {
        onDelete();
    }

    function clickedEdit(e: Event) {
        e.preventDefault();
        localDispatch(ActionAttrType.SetMode, AttrMode.Edit);
    }

    function handleChangeEvent(e: Event) {
        if (e.target instanceof HTMLInputElement) {
            const target = e.target;
            const value = target.value;

            localDispatch(ActionAttrType.SetAttribution, value);
        }
    }

    function clickedCancel(e: Event) {
        e.preventDefault();
        localDispatch(ActionAttrType.SetMode, AttrMode.Show);
    }

    function clickedOK(e: Event) {
        e.preventDefault();
        onEdited(local.attribution);
        localDispatch(ActionAttrType.SetMode, AttrMode.Show);
    }

    let markup = attribution && buildMarkup(attribution);
    // convert the p tag into spans
    if (markup) {
        markup[0].type = "span";
    }

    return (
        <div>
            {local.mode === AttrMode.Show && (
                <div>
                    <div id="quotation-attribute" onClick={clickedAttribution}>
                        {markup}
                    </div>
                    {local.showButtons && (
                        <div>
                            <button onClick={clickedEdit}>Edit...</button>
                            <DeleteConfirmation
                                onDelete={confirmedDeleteClicked}
                            />
                        </div>
                    )}
                </div>
            )}
            {local.mode === AttrMode.Edit && (
                <div>
                    <CivilInput
                        id="attribution"
                        value={local.attribution}
                        onInput={handleChangeEvent}
                    />
                    <br />
                    <button onClick={clickedCancel}>Cancel</button>
                    <button onClick={clickedOK}>OK</button>
                </div>
            )}
        </div>
    );
}

export { Quote, Quotes };
