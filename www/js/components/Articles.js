import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { dmsUpdateDeck, dmsHideForm } from '/js/AppState.js';

import { ensureListingLoaded, fetchDeckListing } from '/js/CivilUtils.js';
import { capitalise, removeEmptyStrings, formattedDate } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import CivilInput from '/js/components/CivilInput.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import LeftMarginHeading from '/js/components/LeftMarginHeading.js';
import LeftMarginHeadingNoWrap from '/js/components/LeftMarginHeadingNoWrap.js';
import SectionGraph from '/js/components/SectionGraph.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionNotes from '/js/components/SectionNotes.js';
import DeckManager from '/js/components/DeckManager.js';
import { DeckSimpleListSection, RatedListSection } from '/js/components/ListSections.js';
import { StarRatingPartial } from '/js/components/StarRating.js';
import Title from '/js/components/Title.js';

function Articles() {
    const state = useStateValue();
    const resource = 'articles';

    ensureListingLoaded(resource, '/api/articles/listings');

    const articles = state.listing.value.articles || {};

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
    const state = useStateValue();

    const articleId = parseInt(id, 10);

    const deckManager = DeckManager({
        id: articleId,
        resource: "articles",
        preCacheFn: preCacheFn,
        hasSummarySection: true,
        hasReviewSection: true
    });

    let shortDescription = !!state.deckManagerState.value.deck && state.deckManagerState.value.deck.shortDescription;
    return html`
    <article>
        <${ArticleTopMatter} title=${ deckManager.title }/>
        <${SectionUpdateArticle}/>
        <${DeleteDeckConfirmation} resource='articles' id=${articleId}/>
        <${TopScribble} text=${ shortDescription }/>
        <${SectionDeckRefs} onRefsChanged=${ deckManager.onRefsChanged }/>
        <${SectionNotes} title=${ deckManager.title } onRefsChanged=${ deckManager.onRefsChanged } preCacheFn=${preCacheFn} resource="articles" />
        <${SectionBackRefs} deckId=${ articleId }/>
        <${SectionGraph} depth=${ 2 } />
    </article>`;
}

function TopScribble({ text }) {
    if (text) {
        return html`<div class="top-scribble">${ text }</div>`;
    }
    return html``;
}

function ArticleTopMatter({ title }) {
    const state = useStateValue();
    const deck = state.deckManagerState.value.deck;

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
        <${Title} title=${ title }/>
    </div>`;
}

function SectionUpdateArticle() {
    const state = useStateValue();

    const article = state.deckManagerState.value.deck || {};

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
            dmsUpdateDeck(state, newDeck, 'articles');
            dmsHideForm(state);

            // fetch the listing incase editing the article has changed it's star rating or annotation
            //
            fetchDeckListing(state, resource, '/api/articles/listings');
        });

        event.preventDefault();
    };

    if (!state.deckManagerState.value.showUpdateForm) {
        return html`<div></div>`;
    }

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
