import { route } from "preact-router";
import { type Ref, useEffect, useState, useRef } from "preact/hooks";

import { DeckKind, Font, NoteKind } from "../enums";
import type { DeckQuote, DM, Key, ProtoQuote, SearchResults } from "../types";

import { AppStateChange, immutableState } from "../app-state";

import {
    deckKindToHeadingString,
    deckKindToResourceString,
} from "../shared/deck";
import { impactAsText } from "../shared/impact";
import Net from "../shared/net";
import { sanitize, emptySearchResults } from "../shared/search";

import buildMarkup from "./build-markup";
import CivilButton from "./civil-button";
import CivilInput from "./civil-input";
import {
    CivContainer,
    CivForm,
    CivLeft,
    CivLeftLabel,
    CivMain,
    CivMainUi,
    CivRight,
} from "./civil-layout";
import CivilTextArea from "./civil-text-area";
import DeleteConfirmation from "./delete-confirmation";
import ModalKeyboardHelp from "./modal-keyboard-help";
import SegmentArrivals from "./segment-arrivals";
import SegmentNotes from "./segment-notes";
import useDeckManager from "./use-deck-manager";
import useLocalReducer from "./use-local-reducer";
import useModalKeyboard from "./use-modal-keyboard";
import ViewSearchResults from "./view-search-results";
import WhenNoPhysicalKeyboard from "./when-no-physical-keyboard";
import FontSelector from "./font-selector";
import InsigniaSelector from "./insignia-selector";

function titleFromQuoteText(quoteText: string) {
    const title =
        quoteText.length > 60 ? quoteText.slice(0, 57) + "..." : quoteText;
    return title;
}

function Quotes({ path }: { path?: string }) {
    return <QuotesModule />;
}

function QuotesModule({}) {
    const [results, setResults] = useState(emptySearchResults());

    const [timing, setTiming] = useState(0);

    function clickedNewQuoteButton() {
        route(`/quotes/new`, false);
    }

    function clickedRandomButton() {
        Net.get<DeckQuote>("/api/quotes/random").then((quote) => {
            route(`/quotes/${quote.id}`);
        });
    }

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
        <article class="c-quotes-module module margin-top-5">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">
                        {deckKindToHeadingString(DeckKind.Quote)}
                    </h3>
                </CivLeft>
                <CivMainUi>
                    <span>
                        <CivilButton onClick={clickedNewQuoteButton}>
                            Add Quote...
                        </CivilButton>
                        <CivilButton onClick={clickedRandomButton}>
                            Random Quote
                        </CivilButton>
                    </span>
                    <div class="margin-top-3"></div>
                    <CivilInput onReturnPressed={performQuoteSearch} />
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

function QuoteNew({ path }: { path?: string }) {
    const initialState: ProtoQuote = {
        title: "",
        insignia: 0,
        deckKind: DeckKind.Quote,
        font: Font.English,
        graphTerminator: false,
        impact: 1,
        text: "",
        attribution: "",
    };
    const [localState, setLocalState] = useState(initialState);

    const textAreaRef: Ref<HTMLTextAreaElement> = useRef(null);
    useEffect(() => {
        if (textAreaRef && textAreaRef.current) {
            textAreaRef.current.focus();
        }
    }, []);

    function handleAttributionChange(content: string) {
        setLocalState({
            ...localState,
            attribution: content,
        });
    }

    function handleContentChange(content: string) {
        setLocalState({
            ...localState,
            text: content,
            title: titleFromQuoteText(content),
        });
    }

    function handleSubmit(event: Event) {
        console.log(localState);
        Net.post<ProtoQuote, DeckQuote>("/api/quotes", localState).then(
            (quote) => {
                route(`/quotes/${quote.id}`);
            },
        );
        event.preventDefault();
    }

    function handleCheckbox(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            if (event.target.id === "graph-terminator") {
                setLocalState({
                    ...localState,
                    graphTerminator: !localState.graphTerminator,
                });
            }
        }
    }

    function setInsignia(insignia: number) {
        setLocalState({
            ...localState,
            insignia,
        });
    }

    function setFont(font: Font) {
        setLocalState({
            ...localState,
            font,
        });
    }

    function onImpactChange(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            setLocalState({
                ...localState,
                impact: event.target.valueAsNumber,
            });
        }
    }

    return (
        <article class="c-quotes-module module margin-top-5">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">
                        {deckKindToHeadingString(DeckKind.Quote)}
                    </h3>
                </CivLeft>
                <CivForm onSubmit={handleSubmit}>
                    <div class="vertical-spacer"></div>

                    <CivLeftLabel forId="title">Title</CivLeftLabel>
                    <CivMain>
                        <CivilInput
                            id="title"
                            value={localState.title}
                            readOnly
                        />
                    </CivMain>

                    <CivLeftLabel extraClasses="icon-left-label">
                        Insignias
                    </CivLeftLabel>
                    <CivMain>
                        <InsigniaSelector
                            insigniaId={localState.insignia}
                            onChange={setInsignia}
                        />
                    </CivMain>

                    <CivLeftLabel
                        extraClasses="graph-terminator-form-label"
                        forId="graph-terminator"
                    >
                        Graph Terminator
                    </CivLeftLabel>
                    <CivMain>
                        <input
                            type="checkbox"
                            id="graph-terminator"
                            name="graph-terminator"
                            onInput={handleCheckbox}
                            checked={localState.graphTerminator}
                        />
                    </CivMain>

                    <CivLeftLabel>Font</CivLeftLabel>
                    <CivMain>
                        <FontSelector
                            font={localState.font}
                            onChangedFont={setFont}
                        />
                    </CivMain>

                    <CivLeftLabel>Impact</CivLeftLabel>
                    <CivMain>
                        <input
                            type="range"
                            min="0"
                            max="4"
                            value={localState.impact}
                            class="slider"
                            id="impactSlider"
                            onInput={onImpactChange}
                        />
                        <CivRight>{impactAsText(localState.impact)}</CivRight>
                    </CivMain>

                    <CivLeftLabel>Text:</CivLeftLabel>
                    <CivMain>
                        <CivilTextArea
                            id="quote-text"
                            value={localState.text}
                            onContentChange={handleContentChange}
                            elementRef={textAreaRef}
                        />
                    </CivMain>

                    <CivLeftLabel>Attribution:</CivLeftLabel>
                    <CivMain>
                        <CivilInput
                            id="attribution"
                            value={localState.attribution}
                            onContentChange={handleAttributionChange}
                        />
                    </CivMain>

                    <div class="vertical-spacer"></div>

                    <CivMain>
                        <input
                            class="c-civil-button"
                            type="submit"
                            value="create"
                        />
                    </CivMain>
                </CivForm>
            </CivContainer>
        </article>
    );
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
        console.log(key);
        switch (key) {
            case ".":
                nextQuote(quoteId);
                break;
            case ",":
                previousQuote(quoteId);
                break;
            case "j":
                randomQuote();
                break;
        }
    });

    function onEditedAttributionFn(deckId: Key) {
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
                    impact: 1, // isg fix this
                    text: deckQuote.text,
                    attribution: attribution,
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

    function onUpdatedDeck(deck: DeckQuote) {
        // re-title the quote now that the content may have changed
        let n = deck.notes.find((n) => n.kind === NoteKind.Note);
        if (n) {
            const data: ProtoQuote = {
                title: titleFromQuoteText(n.content),
                deckKind: deck.deckKind,
                graphTerminator: deck.graphTerminator,
                insignia: deck.insignia,
                font: deck.font,
                impact: deck.impact,
                text: n.content,
                attribution: deck.attribution,
            };
            const resource = deckKindToResourceString(deck.deckKind);
            Net.put<ProtoQuote, DeckQuote>(
                `/api/${resource}/${deck.id}`,
                data,
            ).then((newDeck) => {
                deckManager.update(newDeck);
            });
        }
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
                    onUpdateDeck={onUpdatedDeck}
                    noAppend
                    noDelete
                />

                <Attribution
                    attribution={deck.attribution}
                    onEdited={onEditedAttributionFn(deck.id)}
                    onDelete={onDeleteFn(deck.id)}
                />

                <SegmentArrivals deck={deck} />

                <WhenNoPhysicalKeyboard>
                    <QuoteButtons quoteId={quoteId} />
                </WhenNoPhysicalKeyboard>

                <ModalKeyboardHelp>
                    <pre>,: previous quote</pre>
                    <pre>.: next quote</pre>
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

export { Quote, Quotes, QuotesModule, QuoteNew };
