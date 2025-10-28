import { type RefObject } from "preact";
import { route } from "preact-router";
import { useEffect, useState, useRef } from "preact/hooks";

import { DeckKind, Font, NoteKind } from "../enums";
import type { DeckQuote, DM, ProtoQuote, SearchResults } from "../types";

import { AppStateChange } from "../app-state";

import {
    deckKindToHeadingString,
    deckKindToResourceString,
} from "../shared/deck";
import { impactAsText } from "../shared/impact";
import Net from "../shared/net";
import { sanitize, emptySearchResults } from "../shared/search";

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
import AlwaysVisibleKeyboardHelp from "./always-visible-keyboard-help";
import RecentlyVisited from "./recently-visited";
import SegmentArrivals from "./segment-arrivals";
import SegmentInsignias from "./segment-insignias";
import SegmentNotes from "./segment-notes";
import useDeckManager from "./use-deck-manager";
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
            <RecentlyVisited deckKind={DeckKind.Quote} numRecent={30} />
            <SegmentInsignias deckKind={DeckKind.Quote} />
        </article>
    );
}

// note: not sure that this abort mechanism is working for quotes
// I think that the route function call may be escaping the code
// out of the enclosing try/catch block?
//
let gQuotesAbort = new AbortController();
function getQuoteThenRoute(url: string) {
    try {
        gQuotesAbort.abort();

        gQuotesAbort = new AbortController();
        Net.getAbortable<DeckQuote>(url, gQuotesAbort.signal).then((deck) => {
            if (deck) {
                route(`/quotes/${deck.id}`);
                AppStateChange.urlTitle({ title: deck.title });
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    } catch (e) {
        // this catches the exception thrown when abort is invoked
        console.log(e);
    }
}

function QuoteNew({ path }: { path?: string }) {
    const [localState, setLocalState] = useState<ProtoQuote>({
        title: "",
        insignia: 0,
        deckKind: DeckKind.Quote,
        font: Font.DeWalpergens,
        graphTerminator: false,
        impact: 1,
        text: "",
        attribution: "",
    });

    const textAreaRef: RefObject<HTMLTextAreaElement> = useRef(null);
    useEffect(() => {
        if (textAreaRef && textAreaRef.current) {
            textAreaRef.current.focus();
        }
    }, []);

    function handleAttributionChange(content: string) {
        setLocalState(prev => ({
            ...prev,
            attribution: content,
        }));
    }

    function handleContentChange(content: string) {
        setLocalState(prev => ({
            ...prev,
            text: content,
            title: titleFromQuoteText(content),
        }));
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
                setLocalState(prev => ({
                    ...prev,
                    graphTerminator: !localState.graphTerminator,
                }));
            }
        }
    }

    function setInsignia(insignia: number) {
        setLocalState(prev => ({
            ...prev,
            insignia,
        }));
    }

    function setFont(font: Font) {
        setLocalState(prev => ({
            ...prev,
            font,
        }));
    }

    function onImpactChange(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            const n = (event.target as HTMLInputElement).valueAsNumber;
            setLocalState(prev => ({
                ...prev,
                impact: n,
            }));
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

    // todo: how to delete a quote?
    // function onDeleteFn(deckId: Key) {
    //     return function () {
    //         Net.delete(`/api/quotes/${deckId}`, {}).then(() => {
    //             route("/quotes");
    //         });
    //     };
    // }

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

                <SegmentArrivals deck={deck} />

                <WhenNoPhysicalKeyboard>
                    <QuoteButtons quoteId={quoteId} />
                </WhenNoPhysicalKeyboard>

                <AlwaysVisibleKeyboardHelp>
                    <pre>,: previous quote</pre>
                    <pre>.: next quote</pre>
                    <pre>j: jump to random quote</pre>
                </AlwaysVisibleKeyboardHelp>
            </article>
        );
    } else {
        return <article></article>;
    }
}

export { Quote, Quotes, QuoteNew };
