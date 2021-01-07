import { html, Link, useState, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { setDeckListing, addAutocompleteDeck } from '/js/CivilUtils.js';
import { useLocalReducer } from '/js/PreactUtils.js';

const INPUT_GIVEN = 'input-given';

function reducer(state, action) {
  switch (action.type) {
  case INPUT_GIVEN: {
    const newState = {
      ...state,
      searchTerm: action.data
    };

    if (newState.searchTerm.length >= state.minSearchLength) {
      const lowerText = newState.searchTerm.toLowerCase();
      newState.candidates = state.autocompletes
            .filter(op => {
              return op.resource === state.resource
                && op.name.toLowerCase().includes(lowerText);
            })
            .sort((a, b) => { return a.name.length - b.name.length; });
    } else {
      newState.candidates = [];
    }

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }
}

export default function QuickFindOrCreate({ autocompletes, resource, minSearchLength }) {
  const [state, dispatch] = useStateValue();

  const [local, localDispatch] = useLocalReducer(reducer, {
    searchTerm: '',
    candidates: [],
    minSearchLength: minSearchLength || 3,
    autocompletes,
    resource
  });

  function createDeck(title) {
    // creates a new deck
    const data = {
      title: title
    };

    Net.post(`/api/${resource}`, data).then(deck => {
      Net.get(`/api/${resource}/listings`).then(listing => {
        setDeckListing(dispatch, resource, listing);
        addAutocompleteDeck(dispatch, deck.id, deck.title || deck.name, resource);
      });
      route(`/${resource}/${deck.id}`);
    });
  }

  // autocompletes contain the entire set of decks
  // so filter autocompletes by the resource
  const onInput = (event) => {
    localDispatch(INPUT_GIVEN, event.target.value);
  };

  function onSubmit(event){
    event.preventDefault();

    // if the user has typed in the name of an existing resource, redirect to that page
    for (let candidate of local.candidates) {
      const { id, name } = candidate;
      if (name.toLowerCase().trim() === local.searchTerm.toLowerCase().trim()) {
        route(`/${resource}/${id}`);
        return;
      }
    }

    createDeck(local.searchTerm.trim());
  }

  let cl = local.candidates.map((c, i) => {
    return html`<${CandidateItem} candidate=${c}
                                  resource=${resource}
                                  keyIndex=${ 1 + i }
                />`;
  });

  return html`
    <form class="quickfind-form" onSubmit=${ onSubmit }>
      <input id="quickfind"
             type="text"
             name="quickfind"
             autoComplete='off'
             value=${ local.searchTerm }
             onInput=${ onInput }
      />
      <div class='quickfind-candidates'>${ cl }</div>
    </form>
`;
}

function CandidateItem({ candidate, keyIndex, resource }) {
  const { id, name } = candidate;
  const href = `/${resource}/${id}`;

  return html`<div class="quickfind-candidate pigment-${resource}">
                <${Link} href=${ href }>${ name }</${Link}>
              </div>`;
}
