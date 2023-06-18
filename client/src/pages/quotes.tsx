import { h } from "preact";
import { useEffect } from "preact/hooks";
import { route } from "preact-router";

import { Key, DM, DeckKind, NoteKind, DeckQuote } from "types";

import Net from "utils/net";
import buildMarkup from "components/notes/build-markup";
import { AppStateChange } from "app-state";
import { deckKindToHeadingString } from "utils/civil";

import CivilInput from "components/civil-input";
import CivilTextArea from "components/civil-text-area";
import Module from "components/module";
import DeleteConfirmation from "components/delete-confirmation";
import SegmentNotes from "components/notes/segment-notes";
import useDeckManager from "components/use-deck-manager";
import useLocalReducer from "components/use-local-reducer";
import useModalKeyboard from "components/use-modal-keyboard";

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

type QuoteState = {
    showAddForm: boolean;
    attribution: string;
    quoteText: string;
};

function quotesReducer(state: QuoteState, action: Action) {
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
    return <QuotesModule />;
}

function QuotesModule({}) {
    const initialState: QuoteState = {
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

    function handleAttributionChange(content: string) {
        localDispatch(ActionType.SetAttribution, content);
    }

    function handleContentChange(content: string) {
        localDispatch(ActionType.SetQuoteText, content);
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
                    onContentChange={handleContentChange}
                />
                <br />
                <label for="attribution">Attribution:</label>
                <br />
                <CivilInput
                    id="attribution"
                    value={local.attribution}
                    onContentChange={handleAttributionChange}
                />
                <br />
                <button onClick={clickedCancel}>cancel</button>
                <button onClick={clickedSave}>save</button>
            </form>
        );
    }

    let buttons = (
        <span>
            {!local.showAddForm && renderNewQuoteButton()}
            {!local.showAddForm && renderRandomButton()}
        </span>
    );

    return (
        <Module heading={deckKindToHeadingString(DeckKind.Quote)} buttons={buttons}>
            {local.showAddForm && renderAddForm()}
        </Module>
    );
}

function Quote({ path, id }: { path?: string; id?: string }) {
    const deckManager: DM<DeckQuote> = useDeckManager(id, DeckKind.Quote);

    const quoteId: number = id ? parseInt(id, 10) : 0;
    const canReadKeyboard = useModalKeyboard(quoteId, (key: string) => {
        switch (key) {
            case "n":
                getQuoteThenRoute(`/api/quotes/${quoteId}/next`);
                break;
            case "p":
                getQuoteThenRoute(`/api/quotes/${quoteId}/prev`);
                break;
            case "r":
                getQuoteThenRoute(`/api/quotes/random`);
                break;
        }
    });

    function showKeyboardHelp() {
        let kl = "modal-keyboard-help";
        if (canReadKeyboard) {
            kl += " modal-keyboard-help-visible";
        }
        return (
            <div class={kl}>
                <pre>n: next quote</pre>
                <pre>p: previous quote</pre>
                <pre>r: random quote</pre>
            </div>
        );
    }

    function getQuoteThenRoute(url: string) {
        Net.get<DeckQuote>(url).then((deck) => {
            if (deck) {
                route(`/quotes/${deck.id}`);
                AppStateChange.urlTitle(deck.title);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }

    function onEditedAttributeFn(deckId: Key) {
        return function (attribution: string) {
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
                Net.put<ProtoQuote, DeckQuote>(
                    `/api/quotes/${deckId}`,
                    data
                ).then((updatedDeck) => {
                    deckManager.updateAndReset(updatedDeck);
                });
            }
        };
    }

    function onDeleteFn(deckId: Key) {
        return function () {
            Net.delete(`/api/quotes/${deckId}`, {}).then(() => {
                route("/quotes");
            });
        };
    }

    const deck: DeckQuote | undefined = deckManager.getDeck();
    if (deck) {
        return (
            <article id="quotation-article">
                <SegmentNotes
                    deck={deck}
                    title={deck.title}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckManager.getDeckKind()}
                    onUpdateDeck={deckManager.update}
                    noAppend
                />

                <Attribution
                    attribution={deck.attribution}
                    onEdited={onEditedAttributeFn(deck.id)}
                    onDelete={onDeleteFn(deck.id)}
                />

                {showKeyboardHelp()}
            </article>
        );
    } else {
        return <article></article>;
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

    function handleAttributionChange(content: string) {
        localDispatch(ActionAttrType.SetAttribution, content);
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
                        onContentChange={handleAttributionChange}
                    />
                    <br />
                    <button onClick={clickedCancel}>Cancel</button>
                    <button onClick={clickedOK}>OK</button>
                </div>
            )}
        </div>
    );
}

export { Quote, Quotes, QuotesModule };
