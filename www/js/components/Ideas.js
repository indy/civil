import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { ensureListingLoaded } from '/js/CivilUtils.js';
import { capitalise, formattedDate, plural } from '/js/JsUtils.js';

import DeckManager from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import QuickFindOrCreate from '/js/components/QuickFindOrCreate.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionLinkBack from '/js/components/SectionLinkBack.js';
import { CompactedListSection } from '/js/components/ListSections.js';
import { ListingLink } from '/js/components/ListingLink.js';

function Ideas() {
  const [state, dispatch] = useStateValue();
  const resource = 'ideas';

  ensureListingLoaded(resource, '/api/ideas/listings');

  const ideas = state.listing.ideas || {};

  return html`
    <div>
      <h1>${capitalise(resource)}</h1>
      <${QuickFindOrCreate} autocompletes=${state.ac.decks} resource=${resource} />
      <${CompactedListSection} label='Recent' list=${ideas.recent} resource=${resource} expanded/>
      <${CompactedListSection} label='Orphans' list=${ideas.orphans} resource=${resource} hideEmpty/>
      <${CompactedListSection} label='All' list=${ideas.all} resource=${resource}/>
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
  const [graphTerminator, setGraphTerminator] = useState(idea.graph_terminator);

  useEffect(() => {
    if (idea.title && idea.title !== '' && title === '') {
      setTitle(idea.title);
    }
  }, [idea]);

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
      graph_terminator: graphTerminator
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

  const handleCheckbox = (event) => {
    if (event.target.id === 'graph-terminator') {
      setGraphTerminator(!graphTerminator);
    }
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
      <label for="graph-terminator">Graph Terminator:</label>
      <input type="checkbox"
             id="graph-terminator"
             name="graph-terminator"
             onInput=${ handleCheckbox }
             checked=${graphTerminator}/>
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
