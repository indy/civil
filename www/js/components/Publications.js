import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded, setDeckListing, addAutocompleteDeck } from '/js/CivilUtils.js';
import { capitalise, removeEmptyStrings, formattedDate } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { RatedListSection, CompactedListSection } from '/js/components/ListSections.js';
import DeckManager from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import QuickFind from '/js/components/QuickFind.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import SpanneStarRating from '/js/components/SpanneStarRating.js';

function Publications() {
  const [state, dispatch] = useStateValue();
  const resource = 'publications';

  ensureListingLoaded(resource, '/api/publications/listings');

  const publications = state.deckkindsListing.publications;

  return html`
    <div>
      <h1>${capitalise(resource)}</h1>
      <${QuickFind} autocompletes=${state.ac.decks}
                    resource='publications'
                    save=${(params) => saveNewPublication(params, dispatch)}
                    minSearchLength=3/>
      <${RatedListSection} label='Recent' list=${publications.recent} resource=${resource} expanded/>
      <${RatedListSection} label='Rated' list=${publications.rated} resource=${resource}/>
      <${CompactedListSection} label='Orphans' list=${publications.orphans} resource=${resource} hideEmpty/>
      <${CompactedListSection} label='All' list=${publications.all} resource=${resource}/>
    </div>`;
}

function saveNewPublication({ title }, dispatch) {
    const data = {
      title: title,
      author: "",
      source: "",
      short_description: "",
      rating: 0,
      graph_terminator: false
    };
    const resource = "publications";

    Net.post(`/api/${resource}`, data).then(deck => {
      Net.get(`/api/${resource}/listings`).then(listing => {
        setDeckListing(dispatch, resource, listing);
        addAutocompleteDeck(dispatch, deck.id, deck.title, resource);
      });

      route(`/${resource}/${deck.id}`);
    });
}

function Publication(props) {
  const [state] = useStateValue();

  const publicationId = parseInt(props.id, 10);
  const publication = state.cache.deck[publicationId] || { id: publicationId };

  const deckManager = DeckManager({
    deck: publication,
    title: publication.title,
    resource: "publications",
    updateForm: html`<${UpdatePublicationForm} publication=${publication} />`
  });

  let authorHeading = html`<p class="subtitle">${ publication.author }</p>`;
  let sourceHeading = html`<p class="subtitle">Source: <a href=${ publication.source }>${ publication.source }</a></p>`;

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes;
  const created_at_textual = publication.created_at ? formattedDate(publication.created_at) : '';

  return html`
    <article>
      <div>
        <${SpanneStarRating} rating=${publication.rating}/>
        ${ deckManager.title }
      </div>
      ${ created_at_textual }
      ${ deckManager.buttons }
      ${ deckManager.updateForm }

      ${ publication.author && authorHeading }
      ${ publication.source && sourceHeading }
      ${ deckManager.noteManager() }
      <${SectionLinkBack} linkbacks=${ publication.linkbacks_to_decks }/>
      <${GraphSection} heading='Connectivity Graph' okToShowGraph=${okToShowGraph} id=${ publicationId } depth=${ 2 }/>
    </article>`;
}

function UpdatePublicationForm({ publication }) {
  publication = publication || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(publication.title || '');
  const [author, setAuthor] = useState(publication.author || '');
  const [source, setSource] = useState(publication.source || '');
  const [shortDescription, setShortDescription] = useState(publication.short_description || '');
  const [rating, setRating] = useState(publication.rating);

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

    Net.put(`/api/publications/${publication.id}`, data).then(newItem => {
      console.log(newItem);
      dispatch({
        type: 'cacheDeck',
        id: publication.id,
        newItem
      });
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
      <input type="submit" value="Update Publication"/>
    </form>`;
}

export { Publication, Publications };
