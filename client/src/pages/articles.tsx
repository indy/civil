import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import {
    Font,
    DeckManagerFlags,
    DM,
    DeckArticle,
    DeckKind,
    ArticleListings,
    NoteKind,
    Note,
} from "types";

import { getAppState, AppStateChange } from "app-state";

import InsigniaSelector from "components/insignia-selector";
import SegmentGraph from "components/graph/segment-graph";
import SegmentNotes from "components/notes/segment-notes";

import AutoSummarize from "components/auto-summarize";
import CivilButtonCreateDeck from "components/civil-button-create-deck";
import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import Module from "components/module";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import LeftMarginHeadingNoWrap from "components/left-margin-heading-no-wrap";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import TopMatter from "components/top-matter";
import FontSelector from "components/font-selector";
import { SlimDeckGrouping, RatedGrouping } from "components/groupings";
import { StarRatingPartial } from "components/star-rating";
import {
    CivContainer,
    CivMain,
    CivForm,
    CivLeftLabel,
} from "components/civil-layout";

import Net from "utils/net";
import { buildUrl, deckKindToHeadingString } from "utils/civil";
import { formattedDate } from "utils/js";

function Articles({ path }: { path?: string }) {
    const appState = getAppState();

    useEffect(() => {
        if (!appState.listing.value.articles) {
            let url: string = "/api/articles/listings";
            Net.get<ArticleListings>(url).then((listings) => {
                AppStateChange.setArticleListings(listings);
            });
        }
    }, []);

    const articles = appState.listing.value.articles;
    return articles ? <ArticlesModule articles={articles} /> : <div />;
}

function ArticlesModule({ articles }: { articles: ArticleListings }) {
    let buttons = (
        <CivilButtonCreateDeck
            deckKind={DeckKind.Article}
        ></CivilButtonCreateDeck>
    );

    return (
        <Module
            heading={deckKindToHeadingString(DeckKind.Article)}
            buttons={buttons}
        >
            <RatedGrouping label="Recent" list={articles.recent} expanded />
            <RatedGrouping label="Rated" list={articles.rated} />
            <SlimDeckGrouping
                label="Orphans"
                list={articles.orphans}
                hideEmpty
            />
        </Module>
    );
}

function Article({ path, id }: { path?: string; id?: string }) {
    let flags = DeckManagerFlags.Summary | DeckManagerFlags.Review;
    const deckManager: DM<DeckArticle> = useDeckManager(
        id,
        DeckKind.Article,
        flags
    );

    function Url({ url }: { url: string }) {
        return <a href={url}>{url}</a>;
    }

    const deck: DeckArticle | undefined = deckManager.getDeck();

    function onAutoSummarizeFinish(autoSummarizedNote: Note) {
        // let newDeck = { ...deck! };
        // newDeck.notes.push(autoSummarizedNote);
        // deckManager.updateAndReset(newDeck!);
        window.location.reload();
    }

    if (deck) {
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    setShowingUpdateForm={deckManager.setShowingUpdateForm}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                >
                    {deck.author}

                    {deck.source && (
                        <LeftMarginHeadingNoWrap>
                            <Url url={deck.source} />
                        </LeftMarginHeadingNoWrap>
                    )}
                    {deck.publishedDate && (
                        <div>
                            Published: {formattedDate(deck.publishedDate)}
                        </div>
                    )}
                    <div>Added: {formattedDate(deck.createdAt)}</div>
                    <StarRatingPartial rating={deck.rating} />
                </TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <section>
                        <CivContainer>
                            <CivMain>
                                <DeleteDeckConfirmation
                                    deckKind={deckManager.getDeckKind()}
                                    id={deck.id}
                                />
                                {deckManager.canShowPassage(
                                    NoteKind.NoteSummary
                                ) && (
                                    <AutoSummarize
                                        deck={deck}
                                        onFinish={onAutoSummarizeFinish}
                                    />
                                )}
                                <button
                                    onClick={deckManager.onShowSummaryClicked}
                                >
                                    Show Summary Passage
                                </button>
                                <button
                                    onClick={deckManager.onShowReviewClicked}
                                >
                                    Show Review Passage
                                </button>
                            </CivMain>
                        </CivContainer>

                        <div class="vertical-spacer"></div>
                        <CivContainer>
                            <ArticleUpdater
                                article={deck}
                                onUpdate={deckManager.updateAndReset}
                                onCancel={() =>
                                    deckManager.setShowingUpdateForm(false)
                                }
                            />
                        </CivContainer>
                    </section>
                )}

                {deck.shortDescription && (
                    <TopScribble text={deck.shortDescription} />
                )}
                <SegmentDeckRefs
                    deck={deck}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                    onRefsChanged={deckManager.onRefsChanged}
                />
                <SegmentNotes
                    deck={deck}
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckManager.getDeckKind()}
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
        return (
            <CivContainer>
                <CivMain replacementClasses="muh-main-standard top-scribble">
                    {text}
                </CivMain>
            </CivContainer>
        );
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
    const [font, setFont] = useState(article.font);

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
        if (article.font) {
            setFont(article.font);
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
            font: Font;
        };

        const data: Data = removeEmptyStrings(
            {
                title: title.trim(),
                author: author.trim(),
                source: source.trim(),
                shortDescription: shortDescription.trim(),
                rating,
                graphTerminator: false,
                publishedDate: publishedDate.trim(),
                insignia: insigniaId,
                font,
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
        <CivForm onSubmit={handleSubmit}>
            <CivLeftLabel forId="title">Title</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="title"
                    value={title}
                    onContentChange={onContentChange}
                />
            </CivMain>

            <CivLeftLabel extraClasses="icon-left-label">
                Insignias
            </CivLeftLabel>
            <CivMain>
                <InsigniaSelector
                    insigniaId={insigniaId}
                    onChange={setInsigniaId}
                />
            </CivMain>

            <CivLeftLabel forId="source">Source</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="source"
                    value={source}
                    onContentChange={onContentChange}
                />
            </CivMain>

            <CivLeftLabel forId="author">Author</CivLeftLabel>

            <CivMain>
                <CivilInput
                    id="author"
                    value={author}
                    onContentChange={onContentChange}
                />
            </CivMain>

            <CivLeftLabel forId="publishedDate">Published Date</CivLeftLabel>

            <CivMain>
                <CivilInput
                    id="publishedDate"
                    value={publishedDate}
                    onContentChange={onContentChange}
                />
            </CivMain>

            <CivLeftLabel forId="short-description">
                Short Description
            </CivLeftLabel>

            <CivMain>
                <CivilInput
                    id="short-description"
                    value={shortDescription}
                    onContentChange={onContentChange}
                />
            </CivMain>

            <CivLeftLabel forId="rating">Rating (0..5)</CivLeftLabel>

            <CivMain>
                <input
                    id="rating"
                    type="number"
                    name="rating"
                    value={rating}
                    min="0"
                    max="5"
                    onInput={onRatingChange}
                />
            </CivMain>

            <CivLeftLabel>Font</CivLeftLabel>
            <CivMain>
                <FontSelector font={font} onChangedFont={setFont} />
            </CivMain>

            <CivMain>
                <input
                    type="button"
                    value="Cancel"
                    class="dialog-cancel"
                    onClick={onCancel}
                />
                <input
                    id="article-submit"
                    type="submit"
                    value="Update Article"
                />
            </CivMain>
        </CivForm>
    );
}

// remove the keys from obj that have empty strings
function removeEmptyStrings(obj, keys: Array<string>) {
    for (var i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (typeof obj[key] === "string" && obj[key].trim().length === 0) {
            delete obj[key];
        }
    }
    return obj;
}

export { Article, Articles, ArticlesModule };
