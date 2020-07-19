import { h } from '/js/ext/preact.module.js';
import htm from '/js/ext/htm.module.js';
import { Link, route } from '/js/ext/preact-router.js';
import { useEffect, useState } from '/js/ext/hooks.module.js';

import { removeEmptyStrings } from '/js/lib/JsUtils.js';
import { useStateValue } from '/js/lib/StateProvider.js';
import Net from '/js/lib/Net.js';

import ListingLink     from '/js/components/ListingLink.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import Graph           from '/js/components/Graph.js';

function Publications() {
  const html = htm.bind(h);

  const [state, dispatch] = useStateValue();
  let [showAddPublicationForm, setShowAddPublicationForm] = useState(false);

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

  const toggleShowAdd = () => {
    setShowAddPublicationForm(!showAddPublicationForm);
  };

  const publicationsList = state.publications.map(
    publication => html`<${ListingLink} id=${ publication.id }  name=${ publication.title } resource='publications'/>    `
  );

  return html`
    <div>
      <h1 onClick=${ toggleShowAdd }>${ showAddPublicationForm ? "Add Publication" : "Publications" }</h1>
      ${ showAddPublicationForm && html`<${PublicationForm}/>` }
      <ul class="publications-list">
        ${ publicationsList }
      </ul>
    </div>`;
}

function Publication(props) {
  const html = htm.bind(h);

  const [state] = useStateValue();

  const publicationId = parseInt(props.id, 10);
  const publication = state.cache.deck[publicationId] || { id: publicationId };

  const deckManager = DeckManager({
    deck: publication,
    title: publication.title,
    resource: "publications",
    updateForm: html`<${PublicationForm} publication=${publication} editing />`
  });

  let authorHeading = html`<p class="subtitle">${ publication.author }</p>`;
  let sourceHeading = html`<p class="subtitle">Source: <a href=${ publication.source }>${ publication.source }</a></p>`;

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes;

  return html`
    <article>
      ${ deckManager.title }
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


function PublicationForm({ publication, editing }) {
  const html = htm.bind(h);

  publication = publication || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(publication.title || '');
  const [author, setAuthor] = useState(publication.author || '');
  const [source, setSource] = useState(publication.source || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (publication.title && publication.title !== '' && title === '') {
    setTitle(publication.title);
  }
  if (publication.source && publication.source !== '' && source === '') {
    setSource(publication.source);
  }
  if (publication.author && publication.author !== '' && author === '') {
    setAuthor(publication.author);
  }
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
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

    if (editing) {
      // edit an existing publication
      Net.put(`/api/publications/${publication.id}`, data).then(newItem => {
        dispatch({
          type: 'cacheDeck',
          id: publication.id,
          newItem
        });
      });
    } else {
      // create a new publication
      Net.post('/api/publications', data).then(publication => {
        dispatch({
          type: 'setPublication',
          id: publication.id,
          newItem: publication
        });

        dispatch({
          type: 'addAutocompleteDeck',
          id: publication.id,
          value: publication.title,
          label: publication.title
        });

        setRedirectUrl(`publications/${publication.id}`);
      });
    }

    event.preventDefault();
  };

  if (redirectUrl) {
    // todo: test
    route(redirectUrl, true);
  } else {
    let res = html`
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
        <input type="submit" value=${ editing ? "Update Publication" : "Create Publication"}/>
      </form>
`;
    return res;
  }
}

export { Publication, Publications };
