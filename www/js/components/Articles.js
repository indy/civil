import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded, fetchDeckListing, leftMarginHeading, leftMarginHeadingNoWrap } from '/js/CivilUtils.js';
import { capitalise, removeEmptyStrings, formattedDate } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import CivilInput from '/js/components/CivilInput.js';
import DeleteDeckConfirmation from '/js/components/DeleteDeckConfirmation.js';
import SectionGraph from '/js/components/SectionGraph.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import SectionDeckRefs from '/js/components/SectionDeckRefs.js';
import SectionNotes from '/js/components/SectionNotes.js';
import { DeckManager } from '/js/components/DeckManager.js';
import { DeckSimpleListSection, RatedListSection } from '/js/components/ListSections.js';
import { StarRatingPartial } from '/js/components/StarRating.js';
import { Title } from '/js/components/Title.js';

function Articles() {
    const [state, dispatch] = useStateValue();
    const resource = 'articles';

    ensureListingLoaded(resource, '/api/articles/listings');

    const articles = state.listing.articles || {};

    return html`
    <article>
        <h1 class="ui">${capitalise(resource)}</h1>
        <${RatedListSection} label='Recent' list=${articles.recent} resource=${resource} expanded/>
        <${RatedListSection} label='Rated' list=${articles.rated} resource=${resource}/>
        <${DeckSimpleListSection} label='Orphans' list=${articles.orphans} resource=${resource} hideEmpty/>
    </article>`;
}

function Article({ id }) {
    const [state] = useStateValue();

    const articleId = parseInt(id, 10);

    const deckManager = DeckManager({
        id: articleId,
        resource: "articles",
        hasSummarySection: true,
        hasReviewSection: true
    });

    let shortDescription = !!state.deckManagerState.deck && state.deckManagerState.deck.short_description;
    return html`
    <article>
        <${ArticleTopMatter} title=${ deckManager.title }/>
        <${SectionUpdateArticle}/>
        <${DeleteDeckConfirmation} resource='articles' id=${articleId}/>
        <${TopScribble} text=${ shortDescription }/>
        <${SectionDeckRefs} onRefsChanged=${ deckManager.onRefsChanged }/>
        <${SectionNotes} title=${ deckManager.title } onRefsChanged=${ deckManager.onRefsChanged } cacheDeck=${ deckManager.cacheDeck }/>
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
    const [state] = useStateValue();

    function asUrl(url) {
        return html`<a href=${ url }>${ url }</a>`;
    }

    if (!state.deckManagerState.deck) {
        return html`<div></div>`;
    }

    return html`
    <div>
        <div class="left-margin">
            ${ leftMarginHeading(state.deckManagerState.deck.author) }
            ${ leftMarginHeadingNoWrap(asUrl(state.deckManagerState.deck.source)) }
            ${ leftMarginHeading(`Published: ${ formattedDate(state.deckManagerState.deck.published_date)}`) }
            ${ leftMarginHeading(`Added: ${ formattedDate(state.deckManagerState.deck.created_at) }`) }
            <${StarRatingPartial} rating=${state.deckManagerState.deck.rating}/>
        </div>
        <${Title} title=${ title }/>
    </div>`;
}

function SectionUpdateArticle() {
    const [state, appDispatch] = useStateValue();

    const article = state.deckManagerState.deck || {};

    const [title, setTitle] = useState(article.title || '');
    const [author, setAuthor] = useState(article.author || '');
    const [source, setSource] = useState(article.source || '');
    const [shortDescription, setShortDescription] = useState(article.short_description || '');
    const [rating, setRating] = useState(article.rating);
    const [publishedDate, setPublishedDate] = useState(article.published_date);

    useEffect(() => {
        if (article.title && article.title !== '' && title === '') {
            setTitle(article.title);
        }
        if (article.source && article.source !== '' && source === '') {
            setSource(article.source);
        }
        if (article.author && article.author !== '' && author === '') {
            setAuthor(article.author);
        }
        if (article.short_description && article.short_description !== '' && shortDescription === '') {
            setShortDescription(article.short_description);
        }
        if (article.published_date && article.published_date !== '' && publishedDate === '') {
            setPublished_Date(article.published_date);
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
        if (name === "published_date") {
            setPublishedDate(value);
        }

    };

    const handleSubmit = (event) => {
        const data = removeEmptyStrings({
            title: title.trim(),
            author: author.trim(),
            source: source.trim(),
            short_description: shortDescription.trim(),
            rating: rating,
            graph_terminator: false,
            published_date: publishedDate.trim()
        }, ["source"]);

        const resource = 'articles';

        Net.put(`/api/${ resource }/${ article.id }`, data).then(newDeck => {
            appDispatch({type: 'dms-update-deck', data: newDeck});
            appDispatch({type: 'dms-hide-form'});

            // fetch the listing incase editing the article has changed it's star rating or annotation
            //
            fetchDeckListing(appDispatch, resource, '/api/articles/listings');
        });

        event.preventDefault();
    };

    if (!state.deckManagerState.showUpdateForm) {
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
        <label for="published_date">Published Date:</label>
        <br/>
        <${CivilInput} id="published_date"
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
