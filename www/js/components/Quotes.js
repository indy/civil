import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded } from '/js/CivilUtils.js';
import Net from '/js/Net.js';
import { addChronologicalSortYear } from '/js/eras.js';
import { capitalise } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';

import { DeckManager } from '/js/components/DeckManager.js';
import RollableSection from '/js/components/RollableSection.js';
import { svgPointAdd, svgCancel, svgCaretRight, svgCaretRightEmpty, svgCaretDown } from '/js/svgIcons.js';
import { WhenWritable } from '/js/components/WhenWritable.js';
import { WhenVerbose } from '/js/components/WhenVerbose.js';

function Quotes() {
  const [state, dispatch] = useStateValue();
  const resource = 'quotes';

  return html`
    <article>
      <h1>${capitalise(resource)}</h1>
    </article>`;
}

function Quote(props) {
  const [state, dispatch] = useStateValue();

  const quoteId = parseInt(props.id, 10);
  const quote = state.cache.deck[quoteId] || { id: quoteId };

  const deckManager = DeckManager({
    deck: quote,
    title: quote.title,
    resource: "quotes",
    updateForm: UpdateQuoteForm,
    hasSummarySection: false,
    hasReviewSection: false
  });

  return html`
    <article>
      ${ deckManager.title }
      ${ deckManager.buttons() }
      ${ deckManager.buildUpdateForm() }
      ${ deckManager.buildNoteSections() }
    </article>`;
}

function UpdateQuoteForm({ deck, hideFormFn }) {
  const quote = deck || {};
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    title: quote.title || ''
  });

  useEffect(() => {
    if (quote.title && quote.title !== '' && localState.title === '') {
    setLocalState({
      ...localState,
      title: quote.title
    });
  }
  }, [quote]);

  const handleChangeEvent = (e) => {
    const target = e.target;
    const name = target.name;
    const value = target.value;

    if (name === "title") {
      setLocalState({
        ...localState,
        title: value
      });
    }
  };

  const handleSubmit = (e) => {
    const data = {
      title: localState.title.trim()
    };

    // edit an existing quote
    Net.put(`/api/quotes/${quote.id}`, data).then(newItem => {
      dispatch({
        type: 'cacheDeck',
        id: quote.id,
        newItem
      });
      // hide this form
      hideFormFn();
    });

    e.preventDefault();
  };

  return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
      <label for="title">Title:</label>
      <br/>
      <input id="title"
             type="text"
             name="title"
             value=${ localState.title }
             autoComplete="off"
             onInput=${ handleChangeEvent } />
      <br/>
      <input type="submit" value="Update Quote"/>
    </form>`;
}

function QuoteDeckPoint({ deckPoint, hasNotes, noteManager, holderId }) {
  let [expanded, setExpanded] = useState(false);

  function onClicked(e) {
    e.preventDefault();
    setExpanded(!expanded);
  }

  return html`<li class='relevent-deckpoint'>
                <span onClick=${onClicked}>${ expanded ? svgCaretDown() : hasNotes ? svgCaretRight() : svgCaretRightEmpty() }</span>
                ${ deckPoint.title } ${ deckPoint.date_textual }
                ${ expanded && html`<div class="point-notes">
                                      ${ noteManager }
                                    </div>`}
              </li>`;
}

function ListPoints({ points, deckManager, holderId, holderName, showAddPointForm, dispatch }) {
  function onAddPointClicked(e) {
    e.preventDefault();
    dispatch({type: showAddPointForm ? "hideAddPointForm" : "showAddPointForm"});
  }

  // called by DeckManager once a point has been successfully created
  function onPointCreated() {
    dispatch({type: "hideAddPointForm"});
  }

  let arr = points || [];
  let dps = arr.map(dp => html`<${QuoteDeckPoint}
                                 key=${ dp.id}
                                 noteManager=${ deckManager.noteManagerForDeckPoint(dp) }
                                 hasNotes=${ deckManager.pointHasNotes(dp) }
                                 holderId=${ holderId }
                                 deckPoint=${ dp }/>`);

  let formSidebarText = showAddPointForm ? "Hide Form" : `Add Point for ${ holderName }`;

  return html`
    <${RollableSection} heading='Quote'>
      <ul class="unstyled-list hug-left">
        ${ dps }
      </ul>

      <${WhenWritable}>
        <${WhenVerbose}>
          <div class="left-margin">
            <div class="left-margin-entry clickable" onClick=${ onAddPointClicked }>
              <span class="left-margin-icon-label">${ formSidebarText }</span>
              ${ showAddPointForm ? svgCancel() : svgPointAdd() }
            </div>
          </div>
        </${WhenVerbose}>
        ${ showAddPointForm && deckManager.buildPointForm(onPointCreated) }
      </${WhenWritable}>
    </${RollableSection}>`;
}

export { Quote, Quotes };
