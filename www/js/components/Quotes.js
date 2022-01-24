import { html, route, Link, useState, useEffect } from '/lib/preact/mod.js';

import { ensureListingLoaded } from '/js/CivilUtils.js';
import Net from '/js/Net.js';
import { addChronologicalSortYear } from '/js/eras.js';
import { capitalise } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import { useLocalReducer } from '/js/PreactUtils.js';

import { DeckManager } from '/js/components/DeckManager.js';
import RollableSection from '/js/components/RollableSection.js';
import { svgPointAdd, svgCancel, svgCaretRight, svgCaretRightEmpty, svgCaretDown } from '/js/svgIcons.js';
import { WhenWritable } from '/js/components/WhenWritable.js';
import { WhenVerbose } from '/js/components/WhenVerbose.js';

const SHOW_ADD_FORM = 'show-add-form';
const HIDE_ADD_FORM = 'hide-add-form';
const SET_ATTRIBUTION = 'set_attribution';
const SET_QUOTE_TEXT = 'set-quote-text';
const CREATED_NEW_QUOTE = 'created-new-quote';


function reducer(state, action) {
  switch(action.type) {
  case SHOW_ADD_FORM: {
    return {
      ...state,
      showAddForm: true
    };
  }
  case HIDE_ADD_FORM: {
    return {
      ...state,
      showAddForm: false
    };
  }
  case SET_ATTRIBUTION: {
    return {
      ...state,
      attribution: action.data
    }
  }
  case SET_QUOTE_TEXT: {
    return {
      ...state,
      quoteText: action.data
    }
  }
  case CREATED_NEW_QUOTE: {
    return {
      ...state,
      showAddForm: false,
      attribution: '',
      quoteText: ''
    }
  }
  default: throw new Error(`unknown action: ${action}`);
  }
}

function Quotes() {
  const [state, dispatch] = useStateValue();
  const resource = 'quotes';

  const [local, localDispatch] = useLocalReducer(reducer, {
    showAddForm: false,
    attribution: '',
    quoteText: ''
  });

  function clickedHeader(e) {
    e.preventDefault();
    if (local.showAddForm) {
      localDispatch(HIDE_ADD_FORM);
    } else {
      localDispatch(SHOW_ADD_FORM);
    }
  }

  function handleChangeEvent(e) {
    const value = e.target.value;
    const name = e.target.name;

    if (name === "attribution") {
      localDispatch(SET_ATTRIBUTION, value);
    }
    if (name === "quote_text") {
      localDispatch(SET_QUOTE_TEXT, value);
    }
  }

  function clickedSave(e) {
    console.log("saved");
    e.preventDefault();

    const title = local.quoteText.length > 20 ? local.quoteText.slice(0, 17) + "..." : local.quoteText;
    const data = {
      title,
      text: local.quoteText,
      attribution: local.attribution
    };

    Net.post("/api/quotes", data).then(quote => {
      localDispatch(CREATED_NEW_QUOTE);
    });

  }



  function renderAddForm() {
    return html`<form class="civil-form">

<label for="attribution">QuoteText:</label>
<textarea id="quote-text"
type="text"
name="quote_text"
value=${ local.quoteText }
onInput=${handleChangeEvent}/>

<label for="attribution">Attribution:</label>
<input id="attribution"
type="text"
name="attribution"
value=${ local.attribution }
onInput=${handleChangeEvent}/>

<button onClick=${clickedSave}>save</button>

</form>`;
  }

  return html`
    <article>
      <h1 onClick=${ clickedHeader }>${capitalise(resource)}</h1>
      ${ local.showAddForm && renderAddForm()}
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
