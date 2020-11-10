import { html, Link, useState, route } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useStateValue } from '/js/StateProvider.js';
import { setDeckListing, addAutocompleteDeck } from '/js/CivilUtils.js';

export default function QuickFindOrCreate({ autocompletes, resource, minSearchLength }) {
  const [state, dispatch] = useStateValue();

  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState([]);

  minSearchLength = minSearchLength || 3;

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
    const newSearchTerm = event.target.value;

    setSearchTerm(newSearchTerm);

    if (newSearchTerm.length >= minSearchLength) {
      refineCandidates(newSearchTerm);
    } else {
      setCandidates([]);
    }

  };

  function onSubmit(event){
    event.preventDefault();

    // if the user has typed in the name of an existing resource, redirect to that page
    for (let candidate of candidates) {
      const { id, name } = candidate;
      if (name.toLowerCase().trim() === searchTerm.toLowerCase().trim()) {
        route(`/${resource}/${id}`);
        return;
      }
    }

    createDeck(searchTerm.trim());
  }

  function refineCandidates(newSearchTerm) {
    let lowerText = newSearchTerm.toLowerCase();

    // todo: store the lowercase representation in autocomplete
    setCandidates(autocompletes
                  .filter(op => {
                    return op.resource === resource
                      && op.name.toLowerCase().includes(lowerText);
                  })
                  .sort((a, b) => { return a.name.length - b.name.length; }));
  }

  let cl = candidates.map((c, i) => {
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
             value=${ searchTerm }
             onInput=${ onInput }
      />
      <div class='quickfind-candidates'>${ cl }</div>
    </form>
`;
}

function CandidateItem({ candidate, keyIndex, resource }) {
  const { id, name } = candidate;
  const href = `/${resource}/${id}`;

  return html`<div class="quickfind-candidate">
                <${Link} href=${ href }>${ name }</${Link}>
              </div>`;
}
