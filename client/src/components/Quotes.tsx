import { h } from "preact";
import { useEffect } from "preact/hooks";
import { route } from "preact-router";

import Net from "../Net";
import buildMarkup from "./BuildMarkup";
import { getAppState, AppStateChange } from "../AppState";
import { capitalise } from "../JsUtils";
import { deckTitle } from "../CivilUtils";
import { useLocalReducer } from "../PreactUtils";

import CivilInput from "./CivilInput";
import CivilTextArea from "./CivilTextArea";
import DeckManager from "./DeckManager";
import DeleteConfirmation from "./DeleteConfirmation";
import SectionNotes from "./SectionNotes";
import { DeluxeToolbar } from "./DeluxeToolbar";

const SHOW_ADD_FORM = "show-add-form";
const HIDE_ADD_FORM = "hide-add-form";
const SET_ATTRIBUTION = "set_attribution";
const SET_QUOTE_TEXT = "set-quote-text";
const CREATED_NEW_QUOTE = "created-new-quote";

function quotesReducer(state?: any, action?: any) {
    switch (action.type) {
        case SHOW_ADD_FORM: {
            return {
                ...state,
                showAddForm: true,
            };
        }
        case HIDE_ADD_FORM: {
            return {
                ...state,
                showAddForm: false,
            };
        }
        case SET_ATTRIBUTION: {
            return {
                ...state,
                attribution: action.data,
            };
        }
        case SET_QUOTE_TEXT: {
            return {
                ...state,
                quoteText: action.data,
            };
        }
        case CREATED_NEW_QUOTE: {
            return {
                ...state,
                showAddForm: false,
                attribution: "",
                quoteText: "",
            };
        }
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

function titleFromQuoteText(quoteText: string) {
    const title =
        quoteText.length > 60 ? quoteText.slice(0, 57) + "..." : quoteText;
    return title;
}

function Quotes({ path }: { path?: string }) {
    const resource = "quotes";

    const [local, localDispatch] = useLocalReducer(quotesReducer, {
        showAddForm: false,
        attribution: "",
        quoteText: "",
    });

    function clickedNewQuoteButton(e: Event) {
        e.preventDefault();
        localDispatch(SHOW_ADD_FORM);
    }

    function clickedRandomButton(e: Event) {
        e.preventDefault();
        Net.get<any>("/api/quotes/random").then((quote) => {
            route(`/quotes/${quote.id}`);
        });
    }

    function handleChangeEvent(e: Event) {
        if (e.target instanceof HTMLInputElement) {
            const value = e.target.value;
            const name = e.target.name;

            if (name === "attribution") {
                localDispatch(SET_ATTRIBUTION, value);
            }
            if (name === "quote-text") {
                localDispatch(SET_QUOTE_TEXT, value);
            }
        }
    }

    function clickedSave(e: Event) {
        e.preventDefault();

        const data = {
            title: titleFromQuoteText(local.quoteText),
            text: local.quoteText,
            attribution: local.attribution,
            insignia: 0,
        };

        Net.post<any, any>("/api/quotes", data).then((quote) => {
            route(`/quotes/${quote.id}`);
        });
    }

    function clickedCancel(e: Event) {
        e.preventDefault();
        localDispatch(HIDE_ADD_FORM);
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

function preCacheFn(d) {
    return d;
}

function Quote({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    const quoteId = id ? parseInt(id, 10) : 0;
    const resource = "quotes";

    const deckManager = DeckManager({
        id: quoteId,
        resource,
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
        Net.get<any>(url).then((deck) => {
            if (deck) {
                route(`/quotes/${deck.id}`);
                AppStateChange.urlName(deck.title);
            } else {
                console.error(`error: fetchDeck for ${url}`);
            }
        });
    }

    function onKeyDown(e?: any) {
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

    let deck: any = deckManager.getDeck();

    function onEditedAttribute(attribution) {
        let note = deck.notes.find((n) => n.kind === "Note");

        // as the title could have changed, we need to post the updated quote to the server
        Net.put(`/api/quotes/${quoteId}`, {
            title: deck.title,
            text: note.content, // not really needed, server side only uses title and attribution
            attribution: attribution,
        }).then((updatedDeck) => {
            deckManager.updateAndReset(updatedDeck);
        });
    }

    function onDelete(id) {
        Net.delete(`/api/quotes/${id}`, {}).then(() => {
            route("/quotes");
        });
    }

    return (
        <article id="quotation-article">
            <DeluxeToolbar />
            <SectionNotes
                deck={deck}
                title={deckTitle(deck)}
                howToShowNoteSection={deckManager.howToShowNoteSection}
                canShowNoteSection={deckManager.canShowNoteSection}
                onRefsChanged={deckManager.onRefsChanged}
                resource="quotes"
                onUpdateDeck={deckManager.update}
                noappend
            />
            {deck && (
                <Attribution
                    attribution={deck.attribution}
                    onEdited={onEditedAttribute}
                    onDelete={onDelete}
                />
            )}
        </article>
    );
}

const ATTR_SHOW_MODE = "attr-show-mode";
const ATTR_EDIT_MODE = "attr-edit-mode";

const ATTR_SET_MODE = "attr-set-mode";
const ATTR_INIT_ATTRIBUTION = "attr-init-attribution";
const ATTR_SET_ATTRIBUTION = "attr-set-attribution";
const ATTR_RESET_ATTRIBUTION = "attr-reset-attribution";
const ATTR_SHOW_BUTTONS = "attr-show-buttons";
const ATTR_HIDE_BUTTONS = "attr-hide-buttons";

function attributionReducer(state?: any, action?: any) {
    switch (action.type) {
        case ATTR_SET_MODE: {
            return {
                ...state,
                mode: action.data,
                showButtons:
                    action.data === ATTR_SHOW_MODE ? false : state.showButtons,
            };
        }
        case ATTR_SHOW_BUTTONS: {
            return {
                ...state,
                showButtons: true,
            };
        }
        case ATTR_HIDE_BUTTONS: {
            return {
                ...state,
                showButtons: false,
            };
        }
        case ATTR_INIT_ATTRIBUTION: {
            return {
                ...state,
                originalAttribution: action.data,
                attribution: action.data,
            };
        }
        case ATTR_SET_ATTRIBUTION: {
            return {
                ...state,
                attribution: action.data,
            };
        }
        case ATTR_RESET_ATTRIBUTION: {
            return {
                ...state,
                attribution: state.originalAttribution,
            };
        }
        default:
            throw new Error(`unknown action: {action}`);
    }
}

function Attribution({ attribution, onEdited, onDelete }) {
    const [local, localDispatch] = useLocalReducer(attributionReducer, {
        mode: ATTR_SHOW_MODE,
        showButtons: false,
        originalAttribution: attribution,
        attribution,
    });

    useEffect(() => {
        if (local.originalAttribution !== attribution) {
            localDispatch(ATTR_INIT_ATTRIBUTION, attribution);
        }
    }, [attribution]);

    function clickedAttribution(e) {
        e.preventDefault();
        localDispatch(
            local.showButtons ? ATTR_HIDE_BUTTONS : ATTR_SHOW_BUTTONS
        );
    }

    function confirmedDeleteClicked() {
        onDelete();
    }

    function clickedEdit(e) {
        e.preventDefault();
        localDispatch(ATTR_SET_MODE, ATTR_EDIT_MODE);
    }

    function handleChangeEvent(e: Event) {
        if (e.target instanceof HTMLInputElement) {
            const target = e.target;
            const value = target.value;

            localDispatch(ATTR_SET_ATTRIBUTION, value);
        }
    }

    function clickedCancel(e) {
        e.preventDefault();
        localDispatch(ATTR_SET_MODE, ATTR_SHOW_MODE);
    }

    function clickedOK(e) {
        e.preventDefault();
        onEdited(local.attribution);
        localDispatch(ATTR_SET_MODE, ATTR_SHOW_MODE);
    }

    let markup = attribution && buildMarkup(attribution);
    // convert the p tag into spans
    if (markup) {
        markup[0].type = "span";
    }

    return (
        <div>
            {local.mode === ATTR_SHOW_MODE && (
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
            {local.mode === ATTR_EDIT_MODE && (
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
