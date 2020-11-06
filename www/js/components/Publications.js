import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { removeEmptyStrings, formattedDate } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import { svgRatingStar } from '/js/svgIcons.js';
import Net from '/js/Net.js';

import QuickFind from '/js/components/QuickFind.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import GraphSection    from '/js/components/GraphSection.js';

function Publications() {
  const [state, dispatch] = useStateValue();

  useEffect(() => {
    async function fetcher() {
      const publications = await Net.get('/api/publications');

      dispatch({
        type: 'setPublications',
        publications
      });
    }
    if(!state.publicationsLoaded) {
      fetcher();
    }
  }, []);

  function saveNewPublication({title}) {
    const data = {
      title: title,
      author: "",
      source: "",
      short_description: "",
      rating: 0
    };
    const resource = "publications";

    // create a new resource named 'searchTerm'
    Net.post(`/api/${resource}`, data).then(publication => {
      dispatch({
        type: 'setPublication',
        id: publication.id,
        newItem: publication
      });

      dispatch({
        type: 'addAutocompleteDeck',
        id: publication.id,
        name: publication.title,
        resource: "publications"
      });

      route(`/${resource}/${publication.id}`);
    });
  }

  const publicationsList = state.publications.map(
    publication => html`<${RatedListingLink}
                           id=${ publication.id }
                           name=${ publication.title }
                           rating=${ publication.rating }
                           description=${ publication.short_description }
                           resource='publications'/>    `
  );

  return html`
    <div>
      <h1>Publications</h1>
      <${QuickFind} autocompletes=${state.ac.decks} resource='publications' save=${saveNewPublication} minSearchLength=3/>
      <ul class="publications-list">
        ${ publicationsList }
      </ul>
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
    updateForm: html`<${UpdatePublicationForm} publication=${publication} />`
  });

  let authorHeading = html`<p class="subtitle">${ publication.author }</p>`;
  let sourceHeading = html`<p class="subtitle">Source: <a href=${ publication.source }>${ publication.source }</a></p>`;

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes;
  const created_at_textual = publication.created_at ? formattedDate(publication.created_at) : '';

  console.log(publication);

  return html`
    <article>
      <div>
        ${ publication.rating && html`<${SpanneStarRating} rating=${publication.rating}/>` }
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
      rating: rating
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

function SpanneStarRating({ rating }) {
  let ratings = [];
  for (let i = 0; i < rating; i++) {
    ratings.push(svgRatingStar());
  }
  return html`<div class="spanne spanne-in-listing">
                <div class="spanne-entry">
                  ${ratings}
                </div>
              </div>`;
}

// based off ListingLink but displays a star rating in the left hand margin
//
function RatedListingLink({ resource, id, name, rating, description }) {
  const href = `/${resource}/${id}`;

  let res = html`
    <li>
      ${ !!rating && html`<${SpanneStarRating} rating=${rating}/>` }
      <${Link} class="pigment-fg-${resource}" href=${ href }>${ name }</${Link}>
      <span class="short-description">${description}</span>
    </li>`;

  return res;
}

export { Publication, Publications };
