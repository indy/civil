import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';
import Net from '/js/Net.js';

import { ensureListingLoaded, leftMarginHeading } from '/js/CivilUtils.js';
import { capitalise, formattedDate, nonEmptyArray, plural } from '/js/JsUtils.js';

import { DeckManager } from '/js/components/DeckManager.js';
import GraphSection from '/js/components/GraphSection.js';
import QuickFindOrCreate from '/js/components/QuickFindOrCreate.js';
import RollableSection from '/js/components/RollableSection.js';
import SectionBackRefs from '/js/components/SectionBackRefs.js';
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
      <${QuickFindOrCreate} resource=${resource} />
      <${CompactedListSection} label='Recent' list=${ideas.recent} resource=${resource} expanded/>
      <${CompactedListSection} label='Orphans' list=${ideas.orphans} resource=${resource} hideEmpty/>
      <${CompactedListSection} label='Unnoted' list=${ideas.unnoted} resource=${resource} hideEmpty/>
      <${CompactedListSection} label='All' list=${ideas.all} resource=${resource}/>
    </div>`;
}

function Idea(props) {
  const [state] = useStateValue();

  const [searchResults, setSearchResults] = useState([]); // an array of backrefs

  const ideaId = parseInt(props.id, 10);
  const idea = state.cache.deck[ideaId] || { id: ideaId };

  useEffect(() => {
    if (idea.title) {
      // This  additional search query is slow, so it has to be a separate
      // async call rather than part of the idea's GET response.
      //
      // todo: change this to accept a search parameter, this will normally default to the idea.title
      // but would also allow differently worded but equivalent text
      //
      // todo: should the response be cached in state.cache.deck[ideaId] ???
      //
      Net.get(`/api/ideas/${idea.id}/additional_search`).then(search_results => {
        setSearchResults(search_results.results);
      });
    }
  }, [idea]);

  const deckManager = DeckManager({
    deck: idea,
    title: idea.title,
    resource: "ideas",
    updateForm: UpdateIdeaForm,
    hasSummarySection: false,
    hasReviewSection: false
  });

  // this is only for presentational purposes
  // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
  // this check prevents the vis from rendering until after we have all the note and links ready
  const okToShowGraph = deckManager.hasNotes || idea.backrefs;
  const graphTitle = idea.title ? `Connectivity Graph` : '';

  return html`
    <article>
      <div>
        <div class="left-margin">
          ${ idea.created_at && leftMarginHeading(formattedDate(idea.created_at)) }
        </div>
        ${ deckManager.title }
      </div>
      ${ deckManager.buttons() }
      ${ deckManager.buildUpdateForm() }
      ${ deckManager.buildNoteSections() }

      <${SectionBackRefs} state=${state} backrefs=${ idea.backrefs } backnotes=${ idea.backnotes } deckId=${ idea.id }/>
      <${SectionSearchResultsBackref} backrefs=${ searchResults }/>
      <${GraphSection} heading=${ graphTitle } okToShowGraph=${okToShowGraph} id=${ ideaId } depth=${ 2 } />
    </article>`;
}

function UpdateIdeaForm({ deck, hideFormFn }) {
  const idea = deck || {};
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
      // hide this form
      hideFormFn();
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

function SectionSearchResultsBackref({ backrefs }) {
  function buildBackref(lb) {
    return (
      html`<${ListingLink} id=${ lb.id } name=${ lb.name } resource=${ lb.resource }/>`
    );
  }

  if(nonEmptyArray(backrefs)) {
    const heading = plural(backrefs.length, 'Additional Search Result', 's');
    return html`<${RollableSection} heading=${ heading } initiallyRolledUp>
                <ul>
                  ${ backrefs.map(buildBackref) }
                </ul>
              </${RollableSection}>`;
  } else {
    return html`<div></div>`;
  }
}

export { Ideas, Idea };
