import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { canShowGraph, ensureListingLoaded, fetchDeckListing, leftMarginHeading } from '/js/CivilUtils.js';
import { capitalise, removeEmptyStrings, nonEmptyArray, formattedDate } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { RatedListSection, CompactedListSection } from '/js/components/ListSections.js';
import DeckManager from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import QuickFindOrCreate from '/js/components/QuickFindOrCreate.js';
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
      <${QuickFindOrCreate} autocompletes=${state.ac.decks} resource='publications' minSearchLength=3/>
      <${RatedListSection} label='Recent' list=${publications.recent} resource=${resource} expanded/>
      <${RatedListSection} label='Rated' list=${publications.rated} resource=${resource}/>
      <${CompactedListSection} label='Orphans' list=${publications.orphans} resource=${resource} hideEmpty/>
      <${CompactedListSection} label='All' list=${publications.all} resource=${resource}/>
    </div>`;
}

function Publication(props) {
  const [state] = useStateValue();

  const publicationId = parseInt(props.id, 10);
  const publication = state.cache.deck[publicationId] || { id: publicationId };

  const deckManager = DeckManager({
    deck: publication,
    title: publication.title,
    resource: "publications",
    updateForm: UpdatePublicationForm
  });

  let authorHeading = html`<div class="left-margin-heading">${ publication.author }</div>`;
  let sourceHeading = html`<p class="subtitle"><a href=${ publication.source }>${ publication.source }</a></p>`;

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes;

  return html`
    <article>
      <div>
        <div class="left-margin">
          ${ publication.created_at && leftMarginHeading(formattedDate(publication.created_at)) }
          ${ publication.author && leftMarginHeading(authorHeading) }
          <${StarRatingPartial} rating=${publication.rating}/>
          <div class="left-margin-entry">
            <div class="descriptive-scribble">${ publication.short_description }</div>
          </div>
        </div>
        ${ deckManager.title }
      </div>
      ${ deckManager.buttons }
      ${ deckManager.buildUpdateForm() }

      ${ publication.source && sourceHeading }
      ${ deckManager.noteManager() }
      ${ nonEmptyArray(publication.backrefs) && html`<${SectionBackRefs} state=${state} backrefs=${ publication.backrefs } backnotes=${ publication.backnotes } deckId=${ publication.id }/>`}
      ${ canShowGraph(state, publicationId) && html`<${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${ publicationId } depth=${ 2 }/>`}
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
  };

  const handleSubmit = (event) => {
    const data = removeEmptyStrings({
      title: title.trim(),
      author: author.trim(),
      source: source.trim(),
      short_description: shortDescription.trim(),
      rating: rating,
      graph_terminator: false
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
