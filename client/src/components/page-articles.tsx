import { useEffect, useState } from "preact/hooks";

import { DeckKind, DeckManagerFlags, NoteKind } from "../enums";
import type { DeckArticle, DM, Note, ProtoArticle, SlimDeck } from "../types";

import { buildUrl } from "../shared/civil";
import { impactAsText } from "../shared/impact";
import Net from "../shared/net";
import { formattedDate } from "../shared/time";

import AutoSummarize from "./auto-summarize";
import CivilButton from "./civil-button";
import CivilButtonCreateDeck from "./civil-button-create-deck";
import CivilInput from "./civil-input";
import CivilTabButton from "./civil-tab-button";
import DeleteDeckConfirmation from "./delete-deck-confirmation";
import FontSelector from "./font-selector";
import InsigniaSelector from "./insignia-selector";
import LeftMarginHeadingNoWrap from "./left-margin-heading-no-wrap";
import Pagination from "./pagination";
import SegmentArrivals from "./segment-arrivals";
import SegmentDeckRefs from "./segment-deck-refs";
import SegmentGraph from "./segment-graph";
import SegmentHits from "./segment-hits";
import SegmentNotes from "./segment-notes";
import SegmentSearchResults from "./segment-search-results";
import TopMatter from "./top-matter";
import useDeckManager from "./use-deck-manager";
import {
    CivContainer,
    CivForm,
    CivLeftLabel,
    CivMain,
    CivRight,
} from "./civil-layout";
import { HeadedSegment } from "./headed-segment";
import { ImpactPartial } from "./impact";
import { listItemArticle } from "./list-items";

function Articles({ path }: { path?: string }) {
    return <ArticlesModule />;
}

function ArticlesModule() {
    const [selected, setSelected] = useState("recent");

    return (
        <HeadedSegment
            extraClasses="c-articles-module"
            heading="Articles"
            extraHeadingClasses="margin-top-0"
        >
            <ArticlesSelector setSelected={setSelected} selected={selected} />
            <ArticlesPaginator selected={selected} />
        </HeadedSegment>
    );
}

function ArticlesSelector({
    selected,
    setSelected,
}: {
    selected: string;
    setSelected: (s: string) => void;
}) {
    function onClicked(s: string) {
        setSelected(s);
    }

    function selectedCheck(h: string) {
        if (h === selected) {
            return "pigment-articles selected";
        } else {
            return "";
        }
    }

    const headings: Array<string> = ["recent", "rated", "orphans"];

    return (
        <div class="c-articles-selector pagination-top-selector">
            {headings.map((heading) => (
                <div class="paginator-item">
                    <CivilTabButton
                        extraClasses={selectedCheck(heading)}
                        onClick={() => {
                            onClicked(heading);
                        }}
                    >
                        {heading}
                    </CivilTabButton>
                </div>
            ))}
        </div>
    );
}

function ArticlesPaginator({ selected }: { selected: string }) {
    const url = `/api/articles/${selected}`;

    const lowerContent = (
        <CivilButtonCreateDeck
            deckKind={DeckKind.Article}
        ></CivilButtonCreateDeck>
    );

    return (
        <Pagination
            url={url}
            renderItem={listItemArticle}
            itemsPerPage={10}
            lowerContent={lowerContent}
        />
    );
}

function Article({ path, id }: { path?: string; id?: string }) {
    let flags = DeckManagerFlags.Summary | DeckManagerFlags.Review;
    const deckManager: DM<DeckArticle> = useDeckManager(
        id,
        DeckKind.Article,
        flags,
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
        deckManager.complyWithAppStateRequestToShowUpdateForm();
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    displayHits={deckManager.displayHits()}
                    setDisplayHits={deckManager.setDisplayHits}
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
                    <ImpactPartial impact={deck.impact} />
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
                                    NoteKind.NoteSummary,
                                ) && (
                                    <AutoSummarize
                                        deck={deck}
                                        onFinish={onAutoSummarizeFinish}
                                    />
                                )}
                                <CivilButton
                                    onClick={deckManager.onShowSummaryClicked}
                                >
                                    Show Summary Passage
                                </CivilButton>
                                <CivilButton
                                    onClick={deckManager.onShowReviewClicked}
                                >
                                    Show Review Passage
                                </CivilButton>
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
                <SegmentHits
                    displayHits={deckManager.displayHits()}
                    deck={deck}
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
                <SegmentArrivals deck={deck} />
                <SegmentSearchResults slimdeck={deck as SlimDeck} />
                <SegmentGraph deck={deck} />
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
        article.shortDescription || "",
    );
    const [rating, setRating] = useState(article.impact || 0);
    const [publishedDate, setPublishedDate] = useState(
        article.publishedDate || "",
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
        if (article.impact) {
            setRating(article.impact);
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

    function onImpactChange(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            setRating(event.target.valueAsNumber);
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
        let data: ProtoArticle = {
            title: title.trim(),
            deckKind: DeckKind.Article,
            graphTerminator: false,
            insignia: insigniaId,
            font,
            impact: rating,
            author: author.trim(),
            source: source.trim(),
            shortDescription: shortDescription.trim(),
            publishedDate: publishedDate.trim(),
        };
        if (data.source!.length === 0) {
            data.source = undefined;
        }

        const deckKind: DeckKind = DeckKind.Article;

        Net.put<ProtoArticle, DeckArticle>(
            buildUrl(deckKind, article.id, "/api"),
            data,
        ).then((newDeck) => {
            onUpdate(newDeck);
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

            <CivLeftLabel>Impact</CivLeftLabel>
            <CivMain>
                <input
                    type="range"
                    min="0"
                    max="4"
                    value={rating}
                    class="slider"
                    id="impactSlider"
                    onInput={onImpactChange}
                />
                <CivRight>{impactAsText(rating)}</CivRight>
            </CivMain>

            <CivLeftLabel>Font</CivLeftLabel>
            <CivMain>
                <FontSelector font={font} onChangedFont={setFont} />
            </CivMain>

            <CivMain>
                <CivilButton extraClasses="dialog-cancel" onClick={onCancel}>
                    Cancel
                </CivilButton>
                <input
                    id="article-submit"
                    class="c-civil-button"
                    type="submit"
                    value="Update Article"
                />
            </CivMain>
        </CivForm>
    );
}

export { Article, Articles, ArticlesModule };
