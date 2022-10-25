import { html, useState, useEffect } from '/lib/preact/mod.js';

import { getAppState, AppStateChange } from '/js/AppState.js';

import { ensureListingLoaded, fetchDeckListing, deckTitle } from '/js/CivilUtils.js';
import { capitalise, removeEmptyStrings, formattedDate } from '/js/JsUtils.js';
import Net from '/js/Net.js';

import CivilInput from '/js/components/CivilInput.js';
import DeckManager from '/js/components/DeckManager.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import LeftMarginHeading from '/js/components/LeftMarginHeading.js';
import LeftMarginHeadingNoWrap from '/js/components/LeftMarginHeadingNoWrap.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionGraph from '/js/components/SectionGraph.js';
import SectionNotes from '/js/components/SectionNotes.js';
import Title from '/js/components/Title.js';
import { DeckSimpleListSection, RatedListSection } from '/js/components/ListSections.js';
import { DeluxeToolbar, TOOLBAR_VIEW } from '/js/components/DeluxeToolbar.js';
import { StarRatingPartial } from '/js/components/StarRating.js';

function Articles() {
    const appState = getAppState();
    const resource = 'articles';

    ensureListingLoaded(resource, '/api/articles/listings');

    const articles = appState.listing.value.articles || {};

    return html`
    <article>
        <h1 class="ui">${capitalise(resource)}</h1>
        <${RatedListSection} label='Recent' list=${articles.recent} resource=${resource} expanded/>
        <${RatedListSection} label='Rated' list=${articles.rated} resource=${resource}/>
        <${DeckSimpleListSection} label='Orphans' list=${articles.orphans} resource=${resource} hideEmpty/>
    </article>`;
}

function preCacheFn(d) {
    return d;
}

function Article({ id }) {
    const articleId = parseInt(id, 10);

    const resource = "articles";
    const deckManager = DeckManager({
        id: articleId,
        resource,
        preCacheFn,
        hasSummarySection: true,
        hasReviewSection: true
    });

    let deck = deckManager.getDeck()
    let shortDescription = !!deck && deck.shortDescription;

    return html`
    <article>
        <${DeluxeToolbar}/>
        <${ArticleTopMatter} title=${ deckTitle(deck) } deck=${deck} isShowingUpdateForm=${deckManager.isShowingUpdateForm()} isEditingDeckRefs=${deckManager.isEditingDeckRefs()} onRefsToggle=${ deckManager.onRefsToggle } onFormToggle=${ deckManager.onFormToggle } />
        ${ deckManager.isShowingUpdateForm() && html`
            <${DeleteDeckConfirmation} resource='articles' id=${articleId}/>
            <button onClick=${ deckManager.onShowSummaryClicked }>Show Summary Section</button>
            <button onClick=${ deckManager.onShowReviewClicked }>Show Review Section</button>
            <${SectionUpdateArticle} article=${ deck } onUpdate=${ deckManager.updateAndReset }/>
        `}
        <${TopScribble} text=${ shortDescription }/>
        <${SectionDeckRefs} deck=${ deck } isEditing=${ deckManager.isEditingDeckRefs()} onRefsChanged=${ deckManager.onRefsChanged } onRefsToggle=${ deckManager.onRefsToggle }/>
        <${SectionNotes} deck=${ deck }
                         title=${ deckTitle(deck) }
                         onRefsChanged=${ deckManager.onRefsChanged }
                         resource="articles"
                         howToShowNoteSection=${ deckManager.howToShowNoteSection }
                         canShowNoteSection=${ deckManager.canShowNoteSection }
                         onUpdateDeck=${deckManager.update}/>
        <${SectionBackRefs} deck=${ deck } />
        <${SectionGraph} depth=${ 2 } deck=${ deck }/>
    </article>`;
}

function TopScribble({ text }) {
    if (text) {
        return html`<div class="top-scribble">${ text }</div>`;
    }
    return html``;
}

function ArticleTopMatter({ title, deck, isShowingUpdateForm, isEditingDeckRefs, onRefsToggle, onFormToggle }) {
    function Url({ url }) {
        return html`<a href=${ url }>${ url }</a>`;
    }

    if (!deck) {
        return html`<div></div>`;
    }

    return html`
    <div>
        <div class="left-margin">
            <${LeftMarginHeading}>
                ${deck.author}
            </${LeftMarginHeading}>
            <${LeftMarginHeadingNoWrap}>
                <${Url} url=${deck.source}/>
            </${LeftMarginHeadingNoWrap}>
            <${LeftMarginHeading}>
                Published: ${ formattedDate(deck.publishedDate)}
            </${LeftMarginHeading}>
            <${LeftMarginHeading}>
                Added: ${ formattedDate(deck.createdAt) }
            </${LeftMarginHeading}>
            <${StarRatingPartial} rating=${deck.rating}/>
        </div>
        <${Title} title=${ title } isShowingUpdateForm=${isShowingUpdateForm} isEditingDeckRefs=${isEditingDeckRefs} onRefsToggle=${ onRefsToggle } onFormToggle=${ onFormToggle }/>
    </div>`;
}

function SectionUpdateArticle({ article, onUpdate }) {
    const [title, setTitle] = useState(article.title || '');
    const [author, setAuthor] = useState(article.author || '');
    const [source, setSource] = useState(article.source || '');
    const [shortDescription, setShortDescription] = useState(article.shortDescription || '');
    const [rating, setRating] = useState(article.rating || 0);
    const [publishedDate, setPublishedDate] = useState(article.publishedDate || '');

    useEffect(() => {
        if (article.title && article.title !== '' && title === '') {
            setTitle(article.title);
        }
        if (article.author && article.author !== '' && author === '') {
            setAuthor(article.author);
        }
        if (article.source && article.source !== '' && source === '') {
            setSource(article.source);
        }
        if (article.shortDescription && article.shortDescription !== '' && shortDescription === '') {
            setShortDescription(article.shortDescription);
        }
        if (article.rating) {
            setRating(article.rating);
        }
        if (article.publishedDate && article.publishedDate !== '' && publishedDate === '') {
            setPublishedDate(article.publishedDate);
        }
    }, [article]);

    const handleChangeEvent = (event) => {
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
    };

    const handleSubmit = (event) => {
        const data = removeEmptyStrings({
            title: title.trim(),
            author: author.trim(),
            source: source.trim(),
            shortDescription: shortDescription.trim(),
            rating: rating,
            graphTerminator: false,
            publishedDate: publishedDate.trim()
        }, ["source"]);

        const resource = 'articles';

        Net.put(`/api/${ resource }/${ article.id }`, data).then(newDeck => {
            onUpdate(newDeck);

            // fetch the listing incase editing the article has changed it's star rating or annotation
            //
            fetchDeckListing(resource, '/api/articles/listings');
        });

        event.preventDefault();
    };

    return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
        <label for="title">Title:</label>
        <br/>
        <${CivilInput} id="title"
                       value=${ title }
                       onInput=${ handleChangeEvent } />
        <br/>
        <label for="source">Source:</label>
        <br/>
        <${CivilInput} id="source"
                       value=${ source }
                       onInput=${ handleChangeEvent } />
        <br/>
        <label for="author">Author:</label>
        <br/>
        <${CivilInput} id="author"
                       value=${ author }
                       onInput=${ handleChangeEvent } />
        <br/>
        <label for="publishedDate">Published Date:</label>
        <br/>
        <${CivilInput} id="publishedDate"
                       value=${ publishedDate }
                       onInput=${ handleChangeEvent } />
        <br/>
        <label for="short-description">Short Description:</label>
        <br/>
        <${CivilInput} id="short-description"
                       value=${ shortDescription }
                       onInput=${ handleChangeEvent } />
        <br/>
        <label for="rating">Rating (between 0 and 5):</label>
        <input id="rating"
               type="number"
               name="rating"
               value=${ rating }
               min="0"
               max="5"
               onInput=${ handleChangeEvent } />
        <br/>
        <input id="article-submit" type="submit" value="Update Article"/>
    </form>`;
}

export { Article, Articles };
