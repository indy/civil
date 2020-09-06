import { html, route, Link, useState, useEffect } from '/js/ext/library.js';

import { removeEmptyStrings, formattedDate } from '/js/lib/JsUtils.js';
import { useStateValue } from '/js/lib/StateProvider.js';
import Net from '/js/lib/Net.js';

import QuickFind from '/js/components/QuickFind.js';
import ListingLink     from '/js/components/ListingLink.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import Graph           from '/js/components/Graph.js';

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
      source: ""
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
    publication => html`<${ListingLink} id=${ publication.id }  name=${ publication.title } resource='publications'/>    `
  );

  return html`
    <div>
      <h1>Publications</h1>
      <${QuickFind} autocompletes=${state.ac.decks} resource='publications' save=${saveNewPublication} />
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

  return html`
    <article>
      ${ deckManager.title }
      ${ created_at_textual }
      ${ deckManager.buttons }
      ${ deckManager.noteForm }
      ${ deckManager.updateForm }

      ${ publication.author && authorHeading }
      ${ publication.source && sourceHeading }

      ${ deckManager.notes }
      <${SectionLinkBack} linkbacks=${ publication.linkbacks_to_decks }/>
      ${ okToShowGraph && html`<${Graph} id=${ publicationId } depth=${ 2 }/>` }
    </article>`;
}

function UpdatePublicationForm({ publication }) {
  publication = publication || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(publication.title || '');
  const [author, setAuthor] = useState(publication.author || '');
  const [source, setSource] = useState(publication.source || '');

  if (publication.title && publication.title !== '' && title === '') {
    setTitle(publication.title);
  }
  if (publication.source && publication.source !== '' && source === '') {
    setSource(publication.source);
  }
  if (publication.author && publication.author !== '' && author === '') {
    setAuthor(publication.author);
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
  };

  const handleSubmit = (event) => {
    const data = removeEmptyStrings({
      title: title.trim(),
      author: author.trim(),
      source: source.trim()
    }, ["source"]);

    Net.put(`/api/publications/${publication.id}`, data).then(newItem => {
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
      <input type="submit" value="Update Publication"/>
    </form>`;
}

export { Publication, Publications };
