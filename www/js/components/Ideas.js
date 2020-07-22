import { html, route, Link, useState, useEffect } from '/js/ext/library.js';

import { useStateValue } from '/js/lib/StateProvider.js';
import Net from '/js/lib/Net.js';
import { capitalise } from '/js/lib/JsUtils.js';

import ListingLink from '/js/components/ListingLink.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import Graph from '/js/components/Graph.js';

let gKeyCounter = 0;

function Ideas() {
  const [state, dispatch] = useStateValue();
  let [showAddIdeaForm, setShowAddIdeaForm] = useState(false);

  let [showRecent, setShowRecent] = useState(true);
  let [showSingleRef, setShowSingleRef] = useState(false);
  let [showZeroRef, setShowZeroRef] = useState(false);
  let [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function fetcher() {
      const ideas = await Net.get('/api/ideas/listings');
      dispatch({
        type: 'setIdeas',
        ideas
      });
    }

    if(!state.ideasLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddIdeaForm(!showAddIdeaForm);
  };

  function buildListSection(show, setShow, label, list) {

    function toggleShow() {
      setShow(!show);
    }

    // svg icons are from https://github.com/tabler/tabler-icons
    if(show) {
      return html`
      <div>
        <p key=${ gKeyCounter++ } class="subtitle" onClick=${ toggleShow }>
          <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-minus" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="none" d="M0 0h24v24H0z"/>
            <line x1="5" y1="15" x2="19" y2="15" />
          </svg>
          ${ label }
        </p>
        <ul class="ideas-list" key=${ gKeyCounter++ } >
          ${ buildListing(list) }
        </ul>
      </div>`;
    } else {
      return html`
      <p class="subtitle" onClick=${ toggleShow }>
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z"/>
          <line x1="12" y1="8" x2="12" y2="22" />
          <line x1="5" y1="15" x2="19" y2="15" />
        </svg>
        ${ label }
      </p>`;
    }
  }

  function buildListing(list) {

    if (!list) {
      return [];
    }
    return list.map(
      (idea, i) => html`<${ListingLink}
                        id=${ idea.id }
                        name=${ idea.title }
                        resource='ideas'/>`
    );
  }


  // buildListSection might return an array, each element therefore requires a unique key value
  gKeyCounter = 0;

  return html`
    <div>
      <h1 onClick=${ toggleShowAdd }>${ showAddIdeaForm ? "Add Idea" : "Ideas" }</h1>
      ${ showAddIdeaForm && html`<${IdeaForm}/>` }
      ${ buildListSection(showRecent, setShowRecent, "Recent", state.ideas.recent) }
      ${ buildListSection(showAll, setShowAll, "All", state.ideas.all) }
      ${ buildListSection(showSingleRef, setShowSingleRef, "Single References", state.ideas.single_references) }
      ${ buildListSection(showZeroRef, setShowZeroRef, "Zero References", state.ideas.zero_references) }
    </div>`;
}

function Idea(props) {
  const [state] = useStateValue();

  const ideaId = parseInt(props.id, 10);
  const idea = state.cache.deck[ideaId] || { id: ideaId };

  const deckManager = DeckManager({
    deck: idea,
    title: idea.title,
    resource: "ideas",
    updateForm: html`<${IdeaForm} idea=${idea} editing />`
  });

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes || idea.linkbacks_to_decks;;

  return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons }
      ${ deckManager.noteForm }
      ${ deckManager.updateForm }
      ${ deckManager.notes }
      <${SectionLinkBack} linkbacks=${ idea.linkbacks_to_decks }/>
      <${SectionSearchResultsLinkBack} linkbacks=${ idea.search_results }/>
      ${ okToShowGraph && html`<${Graph} id=${ ideaId } onlyIdeas depth=${ 4 } />` }
    </article>`;
}

function IdeaForm({ idea, editing }) {
  idea = idea || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(idea.title || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (idea.title && idea.title !== '' && title === '') {
    setTitle(idea.title);
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
  };

  const handleSubmit = (event) => {
    const data = {
      title: title.trim()
    };

    if (editing) {
      // edit an existing idea
      Net.put(`/api/ideas/${idea.id}`, data).then(newItem => {
        dispatch({
          type: "cacheDeck",
          id: idea.id,
          newItem
        });
      });
    } else {
      // create a new idea
      Net.post('/api/ideas', data).then(idea => {
        Net.get('/api/ideas/listings').then(ideas => {
          dispatch({
            type: 'setIdeas',
            ideas
          });
          dispatch({
            type: 'addAutocompleteDeck',
            id: idea.id,
            value: idea.title,
            label: idea.title
          });
        });
        setRedirectUrl(`ideas/${idea.id}`);
      });
    }

    event.preventDefault();
  };

  if (redirectUrl) {
    route(redirectUrl, true);
  } else {
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
        <input type="submit" value=${ editing ? "Update Idea" : "Create Idea"}/>
      </form>`;
  }
}

function SectionSearchResultsLinkBack(props) {
  function listingLinks(linkbacks, heading) {
    function buildLinkback(lb) {
      return (
        html`<${ListingLink} id=${ lb.id } name=${ lb.name } resource=${ lb.resource }/>`
      );
    }

    if (linkbacks.length === 0) {
      return html`<div></div>`;
    }

    let list = linkbacks.map(buildLinkback);
    let sectionHeading = capitalise(heading || linkbacks[0].resource);
    let sectionId = linkbacks[0].id;

    return html`
    <section key=${ sectionId }>
      <h2>${ sectionHeading }</h2>
      <ul>
        ${ list }
      </ul>
    </section>`;
  }

  const linkbacks = props.linkbacks || [];
  return listingLinks(linkbacks, "Additional Search Results");
}

export { Ideas, Idea };
