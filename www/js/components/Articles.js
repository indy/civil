import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded, fetchDeckListing, leftMarginHeading, leftMarginHeadingNoWrap } from '/js/CivilUtils.js';
import { capitalise, removeEmptyStrings, formattedDate } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { RatedListSection, CompactedListSection } from '/js/components/ListSections.js';
import { DeckManager } from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import { StarRatingPartial } from '/js/components/StarRating.js';

function Articles() {
  const [state, dispatch] = useStateValue();
  const resource = 'articles';

  ensureListingLoaded(resource, '/api/articles/listings');

  const articles = state.listing.articles || {};

  return html`
    <article>
      <h1>${capitalise(resource)}</h1>
      <${RatedListSection} label='Recent' list=${articles.recent} resource=${resource} expanded/>
      <${RatedListSection} label='Rated' list=${articles.rated} resource=${resource}/>
      <${CompactedListSection} label='Orphans' list=${articles.orphans} resource=${resource} hideEmpty/>
    </article>`;
}

function asUrl(url) {
  return html`<a href=${ url }>${ url }</a>`;
}

function Article(props) {
  const [state] = useStateValue();

  const articleId = parseInt(props.id, 10);
  const article = state.cache.deck[articleId] || { id: articleId };

  const deckManager = DeckManager({
    deck: article,
    title: article.title,
    resource: "articles",
    updateForm: UpdateArticleForm,
    hasSummarySection: true,
    hasReviewSection: true
  });

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes;

  return html`
    <article>
      <div>
        <div class="left-margin">
          ${ article.author && leftMarginHeading(article.author) }
          ${ article.source && leftMarginHeadingNoWrap(asUrl(article.source)) }
          ${ article.published_date && leftMarginHeading(`Published: ${ formattedDate(article.published_date)}`) }
          ${ article.created_at && leftMarginHeading(`Added: ${ formattedDate(article.created_at) }`) }
          <${StarRatingPartial} rating=${article.rating}/>
        </div>
        ${ deckManager.title }
      </div>
      ${ deckManager.buttons() }
      ${ deckManager.buildUpdateForm() }

      <div class="top-scribble">${ article.short_description }</div>

      ${ deckManager.buildNoteSections() }

      <${SectionBackRefs} state=${state}
                          backrefs=${ article.backrefs }
                          backnotes=${ article.backnotes }
                          deckId=${ article.id }/>
      <${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${ articleId } depth=${ 2 }/>
    </article>`;
}

function UpdateArticleForm({ deck, hideFormFn }) {
  const article = deck || {};
  const [state, dispatch] = useStateValue();
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

    Net.put(`/api/${ resource }/${ article.id }`, data).then(newItem => {
      dispatch({
        type: 'cacheDeck',
        id: article.id,
        newItem
      });

      // fetch the listing incase editing the article has changed it's star rating or annotation
      //
      fetchDeckListing(dispatch, resource, '/api/articles/listings');
      // hide this form
      hideFormFn();
    });

    event.preventDefault();
  };

  return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
      <label for="title">Title:</label>
      <br/>
      <input id="title"
             type="text"
             name="title"
             value=${ title }
             onInput=${ handleChangeEvent } />
      <br/>
      <label for="source">Source:</label>
      <br/>
      <input id="source"
             type="text"
             name="source"
             value=${ source }
             onInput=${ handleChangeEvent } />
      <br/>
      <label for="author">Author:</label>
      <br/>
      <input id="author"
             type="text"
             name="author"
             value=${ author }
             onInput=${ handleChangeEvent } />
      <br/>
      <label for="published_date">Published Date:</label>
      <br/>
      <input id="published_date"
             type="text"
             name="published_date"
             value=${ publishedDate }
             onInput=${ handleChangeEvent } />
      <br/>
      <label for="short-description">Short Description:</label>
      <br/>
      <input id="short-description"
             type="text"
             name="short-description"
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
