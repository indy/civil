import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { DeckArticle, DeckKind, ArticleListings } from "types";

import { getAppState, AppStateChange } from "app-state";
import CivilInput from "./civil-input";
import { buildUrl, deckKindToHeadingString } from "../civil-utils";
import DeckManager from "./deck-manager";
import DeleteDeckConfirmation from "./delete-deck-confirmation";
import LeftMarginHeading from "./left-margin-heading";
import LeftMarginHeadingNoWrap from "./left-margin-heading-no-wrap";
import Net from "net";
import SegmentBackRefs from "./segment-back-refs";
import SegmentDeckRefs from "./segment-deck-refs";
import SegmentGraph from "./segment-graph";
import SegmentNotes from "./segment-notes";
import TopMatter from "./top-matter";
import { SlimDeckGrouping, RatedGrouping } from "./groupings";
import { InsigniaSelector } from "./insignias";
import { StarRatingPartial } from "./star-rating";
import { removeEmptyStrings, formattedDate } from "../js-utils";

function Articles({ path }: { path?: string }) {
    const appState = getAppState();
    const deckKind: DeckKind = DeckKind.Article;

    useEffect(() => {
        if (!appState.listing.value.articles) {
            let url: string = "/api/articles/listings";
            Net.get<ArticleListings>(url).then((listings) => {
                AppStateChange.setArticleListings(listings);
            });
        }
    }, []);

    const articles = appState.listing.value.articles;

    if (articles) {
        return (
            <article>
                <h1 class="ui">{deckKindToHeadingString(deckKind)}</h1>
                <RatedGrouping label="Recent" list={articles.recent} expanded />
                <RatedGrouping label="Rated" list={articles.rated} />
                <SlimDeckGrouping
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
        hasSummaryPassage: true,
        hasReviewPassage: true,
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
                            Show Summary Passage
                        </button>
                        <button onClick={deckManager.onShowReviewClicked}>
                            Show Review Passage
                        </button>
                        <ArticleUpdater
                            article={deck}
                            onUpdate={deckManager.updateAndReset}
                            onCancel={deckManager.onFormHide}
                        />
                    </div>
                )}
                {deck.shortDescription && (
                    <TopScribble text={deck.shortDescription} />
                )}
                <SegmentDeckRefs
                    deck={deck}
                    isEditing={deckManager.isEditingDeckRefs()}
                    onRefsChanged={deckManager.onRefsChanged}
                    onRefsToggle={deckManager.onRefsToggle}
                />
                <SegmentNotes
                    deck={deck}
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckKind}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onUpdateDeck={deckManager.update}
                />
                <SegmentBackRefs deck={deck} />
                <SegmentGraph depth={2} deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
}

function TopScribble({ text }: { text: string }) {
    if (text) {
        return <div class="top-scribble">{text}</div>;
    }
    return <span></span>;
}

type ArticleUpdaterProps = {
    article: DeckArticle;
    onUpdate: (d: DeckArticle) => void;
    onCancel: () => void;
};
function ArticleUpdater({ article, onUpdate, onCancel }: ArticleUpdaterProps) {
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

    function onRatingChange(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value = target.value;

            if (name === "rating") {
                setRating(parseInt(value, 10));
            }
        }
    }

    function onContentChange(content: string, name: string) {
        if (name === "title") {
            setTitle(content);
        }
        if (name === "source") {
            setSource(content);
        }
        if (name === "author") {
            setAuthor(content);
        }
        if (name === "short-description") {
            setShortDescription(content);
        }
        if (name === "publishedDate") {
            setPublishedDate(content);
        }
    }

    function handleSubmit(event: Event) {
        type Data = {
            title: string;
            author: string;
            source?: string;
            shortDescription: string;
            rating: number;
            graphTerminator: boolean;
            publishedDate: string;
            insignia: number;
        };

        const data: Data = removeEmptyStrings(
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

        Net.put<Data, DeckArticle>(
            buildUrl(deckKind, article.id, "/api"),
            data
        ).then((newDeck) => {
            onUpdate(newDeck);

            // fetch the listing incase editing the article has changed it's star rating or annotation
            //
            Net.get<ArticleListings>("/api/articles/listings").then(
                (articles) => {
                    AppStateChange.setArticleListings(articles);
                }
            );
        });

        event.preventDefault();
    }

    return (
        <form class="civil-form" onSubmit={handleSubmit}>
            <label for="title">Title:</label>
            <br />
            <CivilInput
                id="title"
                value={title}
                onContentChange={onContentChange}
            />
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
                onContentChange={onContentChange}
            />
            <br />
            <label for="author">Author:</label>
            <br />
            <CivilInput
                id="author"
                value={author}
                onContentChange={onContentChange}
            />
            <br />
            <label for="publishedDate">Published Date:</label>
            <br />
            <CivilInput
                id="publishedDate"
                value={publishedDate}
                onContentChange={onContentChange}
            />
            <br />
            <label for="short-description">Short Description:</label>
            <br />
            <CivilInput
                id="short-description"
                value={shortDescription}
                onContentChange={onContentChange}
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
                onInput={onRatingChange}
            />
            <br />
            <input
                type="button"
                value="Cancel"
                class="dialog-cancel"
                onClick={onCancel}
            />
            <input id="article-submit" type="submit" value="Update Article" />
        </form>
    );
}

export { Article, Articles };
