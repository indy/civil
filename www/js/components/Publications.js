import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded, fetchDeckListing, leftMarginHeading, leftMarginHeadingNoWrap } from '/js/CivilUtils.js';
import { capitalise, removeEmptyStrings, formattedDate } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { RatedListSection, CompactedListSection } from '/js/components/ListSections.js';
import { DeckManager } from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import QuickFindOrCreate from '/js/components/QuickFindOrCreate.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
import { StarRatingPartial } from '/js/components/StarRating.js';

function Publications() {
  const [state, dispatch] = useStateValue();
  const resource = 'publications';

  ensureListingLoaded(resource, '/api/publications/listings');

  const publications = state.listing.publications || {};

  return html`
    <div>
      <h1>${capitalise(resource)}</h1>
      <${QuickFindOrCreate} resource='publications' />
      <${RatedListSection} label='Recent' list=${publications.recent} resource=${resource} expanded/>
      <${RatedListSection} label='Rated' list=${publications.rated} resource=${resource}/>
      <${CompactedListSection} label='Orphans' list=${publications.orphans} resource=${resource} hideEmpty/>
    </div>`;
}

function asUrl(url) {
  return html`<a href=${ url }>${ url }</a>`;
}

function Publication(props) {
  const [state] = useStateValue();

  const publicationId = parseInt(props.id, 10);
  const publication = state.cache.deck[publicationId] || { id: publicationId };

  const deckManager = DeckManager({
    deck: publication,
    title: publication.title,
    resource: "publications",
    updateForm: UpdatePublicationForm,
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
          ${ publication.author && leftMarginHeading(publication.author) }
          ${ publication.source && leftMarginHeadingNoWrap(asUrl(publication.source)) }
          ${ publication.published_date && leftMarginHeading(`Published: ${ formattedDate(publication.published_date)}`) }
          ${ publication.created_at && leftMarginHeading(`Added: ${ formattedDate(publication.created_at) }`) }
          <${StarRatingPartial} rating=${publication.rating}/>
        </div>
        ${ deckManager.title }
      </div>
      ${ deckManager.buttons() }
      ${ deckManager.buildUpdateForm() }

      <div class="top-scribble">${ publication.short_description }</div>

      ${ deckManager.buildNoteSections() }

      <${SectionBackRefs} state=${state}
                          backrefs=${ publication.backrefs }
                          backnotes=${ publication.backnotes }
                          deckId=${ publication.id }/>
      <${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${ publicationId } depth=${ 2 }/>
    </article>`;
}

function UpdatePublicationForm({ deck, hideFormFn }) {
  const publication = deck || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(publication.title || '');
  const [author, setAuthor] = useState(publication.author || '');
  const [source, setSource] = useState(publication.source || '');
  const [shortDescription, setShortDescription] = useState(publication.short_description || '');
  const [rating, setRating] = useState(publication.rating);
  const [publishedDate, setPublishedDate] = useState(publication.published_date);

  useEffect(() => {
    if (publication.title && publication.title !== '' && title === '') {
      setTitle(publication.title);
    }
    if (publication.source && publication.source !== '' && source === '') {
      setSource(publication.source);
    }
    if (publication.author && publication.author !== '' && author === '') {
      setAuthor(publication.author);
    }
    if (publication.short_description && publication.short_description !== '' && shortDescription === '') {
      setShortDescription(publication.short_description);
    }
    if (publication.published_date && publication.published_date !== '' && publishedDate === '') {
      setPublished_Date(publication.published_date);
    }
  }, [publication]);

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

    const resource = 'publications';

    Net.put(`/api/${ resource }/${ publication.id }`, data).then(newItem => {
      dispatch({
        type: 'cacheDeck',
        id: publication.id,
        newItem
      });

      // fetch the listing incase editing the publication has changed it's star rating or annotation
      //
      fetchDeckListing(dispatch, resource, '/api/publications/listings');
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
      <input id="publication-submit" type="submit" value="Update Publication"/>
    </form>`;
}

export { Publication, Publications };
