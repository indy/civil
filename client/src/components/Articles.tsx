import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { DeckArticle, DeckKind, ArticleListings } from "../types";

import { getAppState, AppStateChange } from "../AppState";
import CivilInput from "./CivilInput";
import {
    buildUrl,
    deckKindToHeadingString,
    deckKindToResourceString,
    fetchDeckListing,
} from "../CivilUtils";
import DeckManager from "./DeckManager";
import DeleteDeckConfirmation from "./DeleteDeckConfirmation";
import LeftMarginHeading from "./LeftMarginHeading";
import LeftMarginHeadingNoWrap from "./LeftMarginHeadingNoWrap";
import Net from "../Net";
import SectionBackRefs from "./SectionBackRefs";
import SectionDeckRefs from "./SectionDeckRefs";
import SectionGraph from "./SectionGraph";
import SectionNotes from "./SectionNotes";
import TopMatter from "./TopMatter";
import { DeckSimpleListSection, RatedListSection } from "./ListSections";
import { DeluxeToolbar } from "./DeluxeToolbar";
import { InsigniaSelector } from "./Insignias";
import { StarRatingPartial } from "./StarRating";
import { removeEmptyStrings, formattedDate } from "../JsUtils";

function Articles({ path }: { path?: string }) {
    const appState = getAppState();
    const deckKind: DeckKind = DeckKind.Article;

    useEffect(() => {
        if (!appState.listing.value.articles) {
            let url: string = "/api/articles/listings";
            Net.get<ArticleListings>(url).then((listing) => {
                AppStateChange.setArticlesListing(listing);
            });
        }
    }, []);

    const articles = appState.listing.value.articles;

    if (articles) {
        return (
            <article>
                <h1 class="ui">{deckKindToHeadingString(deckKind)}</h1>
                <RatedListSection
                    label="Recent"
                    list={articles.recent}
                    expanded
                />
                <RatedListSection label="Rated" list={articles.rated} />
                <DeckSimpleListSection
                    label="Orphans"
                    list={articles.orphans}
                    hideEmpty
                />
            </article>
        );
    } else {
        return <div></div>;
    }
}

function Article({ path, id }: { path?: string; id?: string }) {
    const articleId = id ? parseInt(id, 10) : 0;

    const deckKind = DeckKind.Article;
    const deckManager = DeckManager({
        id: articleId,
        deckKind,
        hasSummarySection: true,
        hasReviewSection: true,
    });

    function Url({ url }: { url: string }) {
        return <a href={url}>{url}</a>;
    }

    const deck: DeckArticle | undefined = deckManager.getDeck() as
        | DeckArticle
        | undefined;
    if (deck) {
        return (
            <article>
                <DeluxeToolbar />
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    onRefsToggle={deckManager.onRefsToggle}
                    onFormToggle={deckManager.onFormToggle}
                >
                    <LeftMarginHeading>{deck.author}</LeftMarginHeading>

                    {deck.source && (
                        <LeftMarginHeadingNoWrap>
                            <Url url={deck.source} />
                        </LeftMarginHeadingNoWrap>
                    )}
                    {deck.publishedDate && (
                        <LeftMarginHeading>
                            Published: {formattedDate(deck.publishedDate)}
                        </LeftMarginHeading>
                    )}

                    <LeftMarginHeading>
                        Added: {formattedDate(deck.createdAt)}
                    </LeftMarginHeading>
                    <StarRatingPartial rating={deck.rating} />
                </TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <div>
                        <DeleteDeckConfirmation
                            deckKind={DeckKind.Article}
                            id={articleId}
                        />
                        <button onClick={deckManager.onShowSummaryClicked}>
                            Show Summary Section
                        </button>
                        <button onClick={deckManager.onShowReviewClicked}>
                            Show Review Section
                        </button>
                        <SectionUpdateArticle
                            article={deck}
                            onUpdate={deckManager.updateAndReset}
                        />
                    </div>
                )}
                {deck.shortDescription && (
                    <TopScribble text={deck.shortDescription} />
                )}
                <SectionDeckRefs
                    deck={deck}
                    isEditing={deckManager.isEditingDeckRefs()}
                    onRefsChanged={deckManager.onRefsChanged}
                    onRefsToggle={deckManager.onRefsToggle}
                />
                <SectionNotes
                    deck={deck}
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckKind}
                    howToShowNoteSection={deckManager.howToShowNoteSection}
                    canShowNoteSection={deckManager.canShowNoteSection}
                    onUpdateDeck={deckManager.update}
                />
                <SectionBackRefs deck={deck} />
                <SectionGraph depth={2} deck={deck} />
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

function TopScribble({ text }: { text: string }) {
    if (text) {
        return <div class="top-scribble">{text}</div>;
    }
    return <span></span>;
}

function SectionUpdateArticle({ article, onUpdate }) {
    const [title, setTitle] = useState(article.title || "");
    const [author, setAuthor] = useState(article.author || "");
    const [source, setSource] = useState(article.source || "");
    const [shortDescription, setShortDescription] = useState(
        article.shortDescription || ""
    );
    const [rating, setRating] = useState(article.rating || 0);
    const [publishedDate, setPublishedDate] = useState(
        article.publishedDate || ""
    );
    const [insigniaId, setInsigniaId] = useState(article.insignia || 0);

    useEffect(() => {
        if (article.title && article.title !== "" && title === "") {
            setTitle(article.title);
        }
        if (article.author && article.author !== "" && author === "") {
            setAuthor(article.author);
        }
        if (article.source && article.source !== "" && source === "") {
            setSource(article.source);
        }
        if (
            article.shortDescription &&
            article.shortDescription !== "" &&
            shortDescription === ""
        ) {
            setShortDescription(article.shortDescription);
        }
        if (article.rating) {
            setRating(article.rating);
        }
        if (
            article.publishedDate &&
            article.publishedDate !== "" &&
            publishedDate === ""
        ) {
            setPublishedDate(article.publishedDate);
        }
        if (article.insignia !== undefined) {
            setInsigniaId(article.insignia);
        }
    }, [article]);

    const handleChangeEvent = (event: Event) => {
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value = target.value;

            if (name === "title") {
                setTitle(value);
            }
            if (name === "source") {
                setSource(value);
            }
            if (name === "author") {
                setAuthor(value);
            }
            if (name === "short-description") {
                setShortDescription(value);
            }
            if (name === "rating") {
                setRating(parseInt(value, 10));
            }
            if (name === "publishedDate") {
                setPublishedDate(value);
            }
        }
    };

    const handleSubmit = (event: Event) => {
        const data = removeEmptyStrings(
            {
                title: title.trim(),
                author: author.trim(),
                source: source.trim(),
                shortDescription: shortDescription.trim(),
                rating: rating,
                graphTerminator: false,
                publishedDate: publishedDate.trim(),
                insignia: insigniaId,
            },
            ["source"]
        );

        const deckKind: DeckKind = DeckKind.Article;

        Net.put(buildUrl(deckKind, article.id, "/api"), data).then(
            (newDeck) => {
                onUpdate(newDeck);

                // fetch the listing incase editing the article has changed it's star rating or annotation
                //
                fetchDeckListing(
                    deckKind,
                    `/api/${deckKindToResourceString(deckKind)}/listings`
                );
            }
        );

        event.preventDefault();
    };

    return (
        <form class="civil-form" onSubmit={handleSubmit}>
            <label for="title">Title:</label>
            <br />
            <CivilInput id="title" value={title} onInput={handleChangeEvent} />
            <br />

            <InsigniaSelector
                insigniaId={insigniaId}
                onChange={setInsigniaId}
            />
            <br />

            <label for="source">Source:</label>
            <br />
            <CivilInput
                id="source"
                value={source}
                onInput={handleChangeEvent}
            />
            <br />
            <label for="author">Author:</label>
            <br />
            <CivilInput
                id="author"
                value={author}
                onInput={handleChangeEvent}
            />
            <br />
            <label for="publishedDate">Published Date:</label>
            <br />
            <CivilInput
                id="publishedDate"
                value={publishedDate}
                onInput={handleChangeEvent}
            />
            <br />
            <label for="short-description">Short Description:</label>
            <br />
            <CivilInput
                id="short-description"
                value={shortDescription}
                onInput={handleChangeEvent}
            />
            <br />
            <label for="rating">Rating (between 0 and 5):</label>
            <input
                id="rating"
                type="number"
                name="rating"
                value={rating}
                min="0"
                max="5"
                onInput={handleChangeEvent}
            />
            <br />
            <input id="article-submit" type="submit" value="Update Article" />
        </form>
    );
}

export { Article, Articles };
