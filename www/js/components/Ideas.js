import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';
import { capitalise, formattedDate, plural } from '/js/JsUtils.js';
import { svgExpand, svgMinimise } from '/js/svgIcons.js';

import QuickFind from '/js/components/QuickFind.js';
import ListingLink from '/js/components/ListingLink.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import DeckManager     from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import RollableSection from '/js/components/RollableSection.js';

let gKeyCounter = 0;

function Ideas() {
  const [state, dispatch] = useStateValue();

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

  function buildListSection(show, setShow, label, list) {

    function toggleShow() {
      setShow(!show);
    }

    if(show) {
      return html`
      <div>
        <p key=${ gKeyCounter++ } class="subtitle" onClick=${ toggleShow }>
          ${ svgMinimise() } ${ label }
        </p>
        <ul class="ideas-list" key=${ gKeyCounter++ } >
          ${ buildListing(list) }
        </ul>
      </div>`;
    } else {
      return html`
      <p class="subtitle" onClick=${ toggleShow }>
        ${ svgExpand() } ${ label }
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


  function saveNewIdea({title, idea_category}) {
    const data = {
      title: title,
      idea_category: idea_category || 'Verbatim'
    };
    const resource = "ideas";

    // create a new resource named 'searchTerm'
    Net.post(`/api/${resource}`, data).then(idea => {
      Net.get(`/api/${resource}/listings`).then(ideas => {
        dispatch({
          type: 'setIdeas',
          ideas
        });
        dispatch({
          type: 'addAutocompleteDeck',
          id: idea.id,
          name: idea.title,
          resource: resource
        });
      });
      route(`/${resource}/${idea.id}`);
    });
  }

  // buildListSection might return an array, each element therefore requires a unique key value
  gKeyCounter = 0;

  return html`
    <div>
      <h1>Ideas</h1>
      <${QuickFind} autocompletes=${state.ac.decks} resource='ideas' save=${saveNewIdea}/>
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
    updateForm: html`<${UpdateIdeaForm} idea=${idea} />`
  });

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes || idea.linkbacks_to_decks;
  const created_at_textual = idea.created_at ? formattedDate(idea.created_at) : '';
  const graphTitle = idea.title ? `${idea.title} Connectivity Graph` : '';

  return html`
    <article>
      ${ deckManager.title }
      ${ created_at_textual }
      ${ deckManager.buttons }
      ${ deckManager.updateForm }
      ${ deckManager.noteManager() }
      <${SectionLinkBack} linkbacks=${ idea.linkbacks_to_decks }/>
      <${SectionSearchResultsLinkBack} linkbacks=${ idea.search_results }/>
      <${GraphSection} heading=${ graphTitle } okToShowGraph=${okToShowGraph} id=${ ideaId } isIdea depth=${ 2 } />
    </article>`;
}

function UpdateIdeaForm({ idea }) {
  idea = idea || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(idea.title || '');
  const [verbatimIdea, setVerbatimIdea] = useState(idea.idea_category === 'Verbatim');

  if (idea.title && idea.title !== '' && title === '') {
    setTitle(idea.title);
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
      title: title.trim(),
      idea_category: verbatimIdea ? 'Verbatim' : 'Insight'
    };

    Net.put(`/api/ideas/${idea.id}`, data).then(newItem => {
      dispatch({
        type: "cacheDeck",
        id: idea.id,
        newItem
      });
    });

    event.preventDefault();
  };

  const handleRadioButtons = (event) => {
    setVerbatimIdea(event.target.id === "verbatim");
  }

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
      <label for="verbatim">Verbatim</label>
      <input type="radio"
             id="verbatim" name="ideakind" value="verbatim"
             onInput=${ handleRadioButtons }
             checked=${ verbatimIdea } />
      <label for="insight">Insight</label>
      <input type="radio"
             id="insight" name="ideakind" value="insight"
             onInput=${ handleRadioButtons }
             checked=${ !verbatimIdea } />
      <br/>
      <input type="submit" value="Update Idea"/>
    </form>`;
}

function SectionSearchResultsLinkBack({ linkbacks }) {
  linkbacks = linkbacks || [];

  function buildLinkback(lb) {
    return (
      html`<${ListingLink} id=${ lb.id } name=${ lb.name } resource=${ lb.resource }/>`
    );
  }

  if (linkbacks.length === 0) {
    return html`<div></div>`;
  }

  const heading = plural(linkbacks.length, 'Additional Search Result', 's');

  return html`<${RollableSection} heading=${ heading } initiallyRolledUp>
                <ul>
                  ${ linkbacks.map(buildLinkback) }
                </ul>
              </${RollableSection}>
`;
}

export { Ideas, Idea };
