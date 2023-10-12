import { route } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import { DeckKind, Font, NoteKind } from "../enums";
import type { DeckQuote, DM, Key, ProtoQuote, SearchResults } from "../types";

import { AppStateChange, immutableState } from "../app-state";

import { deckKindToHeadingString } from "../shared/deck";
import Net from "../shared/net";
import { sanitize } from "../shared/search";

import buildMarkup from "./build-markup";
import CivilButton from "./civil-button";
import CivilInput from "./civil-input";
import { CivContainer, CivLeft, CivMain, CivMainUi } from "./civil-layout";
import CivilTextArea from "./civil-text-area";
import DeleteConfirmation from "./delete-confirmation";
import ModalKeyboardHelp from "./modal-keyboard-help";
import SegmentArrivals from "./segment-arrivals";
import SegmentNotes from "./segment-notes";
import TopBarMenu from "./top-bar-menu";
import useDeckManager from "./use-deck-manager";
import useLocalReducer from "./use-local-reducer";
import useModalKeyboard from "./use-modal-keyboard";
import ViewSearchResults from "./view-search-results";
import WhenNoPhysicalKeyboard from "./when-no-physical-keyboard";

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

function quotesReducer(state: QuoteState, action: Action): QuoteState {
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
                attribution: action.data!,
            };
        }
        case ActionType.SetQuoteText: {
            return {
                ...state,
                quoteText: action.data!,
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
    return (
        <div>
            <TopBarMenu />
            <QuotesModule />
        </div>
    );
}

function QuotesModule({}) {
    const initialState: QuoteState = {
        showAddForm: false,
        attribution: "",
        quoteText: "",
    };

    const [local, localDispatch] = useLocalReducer<QuoteState, ActionType>(
        quotesReducer,
        initialState,
    );

    function clickedNewQuoteButton() {
        localDispatch(ActionType.ShowAddForm);
    }

    function clickedRandomButton() {
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

    function clickedSave() {
        type ProtoQuote = {
            title: string;
            text: string;
            attribution: string;
            insignia: number;
            font: Font;
        };

        const data: ProtoQuote = {
            title: titleFromQuoteText(local.quoteText),
            text: local.quoteText,
            attribution: local.attribution,
            insignia: 0,
            font: Font.English,
        };

        Net.post<ProtoQuote, DeckQuote>("/api/quotes", data).then((quote) => {
            route(`/quotes/${quote.id}`);
        });
    }

    function clickedCancel() {
        localDispatch(ActionType.HideAddForm);
    }

    function renderNewQuoteButton() {
        return (
            <CivilButton onClick={clickedNewQuoteButton}>
                Add Quote...
            </CivilButton>
        );
    }

    function renderRandomButton() {
        return (
            <CivilButton onClick={clickedRandomButton}>
                Random Quote
            </CivilButton>
        );
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
                <CivilButton onClick={clickedCancel}>cancel</CivilButton>
                <CivilButton onClick={clickedSave}>save</CivilButton>
            </form>
        );
    }

    let buttons = (
        <span>
            {!local.showAddForm && renderNewQuoteButton()}
            {!local.showAddForm && renderRandomButton()}
        </span>
    );

    const [results, setResults] = useState({
        deckLevel: [],
        noteLevel: [],
    } as SearchResults);

    const [timing, setTiming] = useState(0);

    function performQuoteSearch(content: string) {
        let sanitized: string = sanitize(content);
        if (sanitized.length > 0) {
            const url = `/api/quotes/search?q=${encodeURI(sanitized)}`;
            Net.getTimed<SearchResults>(url).then(([response, duration]) => {
                setResults(response);
                setTiming(duration);
            });
        }
    }

    return (
        <article class="c-quotes-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">
                        {deckKindToHeadingString(DeckKind.Quote)}
                    </h3>
                </CivLeft>
                <CivMainUi>
                    {buttons}
                    {local.showAddForm && renderAddForm()}
                    <div class="margin-top-3"></div>
                    <CivilInput onContentChange={performQuoteSearch} />
                </CivMainUi>
            </CivContainer>
            <ViewSearchResults searchResults={results} timing={timing} />
        </article>
    );
}

function getQuoteThenRoute(url: string) {
    Net.get<DeckQuote>(url).then((deck) => {
        if (deck) {
            route(`/quotes/${deck.id}`);
            AppStateChange.urlTitle({ title: deck.title });
        } else {
            console.error(`error: fetchDeck for ${url}`);
        }
    });
}

function nextQuote(quoteId: number) {
    getQuoteThenRoute(`/api/quotes/${quoteId}/next`);
}

function previousQuote(quoteId: number) {
    getQuoteThenRoute(`/api/quotes/${quoteId}/prev`);
}

function randomQuote() {
    getQuoteThenRoute(`/api/quotes/random`);
}

function QuoteButtons({ quoteId }: { quoteId: number }) {
    function onPrev() {
        previousQuote(quoteId);
    }

    function onJump() {
        randomQuote();
    }

    function onNext() {
        nextQuote(quoteId);
    }

    return (
        <div class="quote-onscreen-buttons">
            <CivilButton onClick={onPrev}>Prev</CivilButton>
            <CivilButton onClick={onJump}>Random</CivilButton>
            <CivilButton onClick={onNext}>Next</CivilButton>
        </div>
    );
}

function Quote({ path, id }: { path?: string; id?: string }) {
    const deckManager: DM<DeckQuote> = useDeckManager(id, DeckKind.Quote);

    const quoteId: number = id ? parseInt(id, 10) : 0;

    useModalKeyboard(quoteId, (key: string) => {
        switch (key) {
            case "n":
                nextQuote(quoteId);
                break;
            case "p":
                previousQuote(quoteId);
                break;
            case "j":
                randomQuote();
                break;
        }
    });

    function onEditedAttributeFn(deckId: Key) {
        return function (attribution: string) {
            let deckQuote: DeckQuote = deck! as DeckQuote;
            let note = deckQuote.notes.find((n) => n.kind === NoteKind.Note);

            if (note) {
                let data: ProtoQuote = {
                    title: deckQuote.title,
                    insignia: 0,
                    deckKind: DeckKind.Quote,
                    font: deckQuote.font,
                    graphTerminator: false,
                    attribution: attribution,
                    impact: 0, // isg fix this
                };

                // as the title could have changed, we need to post the updated quote to the server
                Net.put<ProtoQuote, DeckQuote>(
                    `/api/quotes/${deckId}`,
                    data,
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
        deckManager.complyWithAppStateRequestToShowUpdateForm();
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

                <SegmentArrivals deck={deck} />

                <WhenNoPhysicalKeyboard>
                    <QuoteButtons quoteId={quoteId} />
                </WhenNoPhysicalKeyboard>

                <ModalKeyboardHelp>
                    <pre>n: next quote</pre>
                    <pre>p: previous quote</pre>
                    <pre>j: jump to random quote</pre>
                </ModalKeyboardHelp>
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
    data?: AttrMode | string;
};

type StateAttr = {
    mode: AttrMode;
    showButtons: boolean;
    originalAttribution: string;
    attribution: string;
};

function attributionReducer(state: StateAttr, action: ActionAttr): StateAttr {
    switch (action.type) {
        case ActionAttrType.SetMode: {
            const data = action.data as AttrMode;
            return {
                ...state,
                mode: data,
                showButtons: data === AttrMode.Show ? false : state.showButtons,
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
            const data = action.data as string;
            return {
                ...state,
                originalAttribution: data,
                attribution: data,
            };
        }
        case ActionAttrType.SetAttribution: {
            const data = action.data as string;
            return {
                ...state,
                attribution: data,
            };
        }
    }
}

type AttributionProps = {
    attribution: string;
    onEdited: (a: string) => void;
    onDelete: () => void;
};

function Attribution({ attribution, onEdited, onDelete }: AttributionProps) {
    let initialState: StateAttr = {
        mode: AttrMode.Show,
        showButtons: false,
        originalAttribution: attribution,
        attribution,
    };
    const [local, localDispatch] = useLocalReducer<StateAttr, ActionAttrType>(
        attributionReducer,
        initialState,
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
                : ActionAttrType.ShowButtons,
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

    let markup =
        attribution && buildMarkup(attribution, immutableState.defaultFont, 0);
    // convert the p tag into spans
    if (markup) {
        markup[0].type = "span";
    }

    return (
        <CivContainer>
            <CivMain>
                {local.mode === AttrMode.Show && (
                    <div>
                        <div
                            id="quotation-attribute"
                            onClick={clickedAttribution}
                        >
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
            </CivMain>
        </CivContainer>
    );
}

export { Quote, Quotes, QuotesModule };
