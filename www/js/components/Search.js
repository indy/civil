import { html, Link, useState } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';

import Net from '/js/Net.js';

export default function Search() {
  const [state] = useStateValue();

  let [localState, setLocalState] = useState({
    shownSearchTerm: '',
    searchResults: []
  });

  async function search(searchTerm) {
    const url = `/api/cmd/search?q=${encodeURI(searchTerm)}`;
    const searchResponse = await Net.get(url);

    if (searchResponse.results) {
      setLocalState({
        ...localState,
        shownSearchTerm: searchTerm,
        searchResults: searchResponse.results
      });
    }
  }

  function onSearch(searchTerm){
    search(searchTerm);
  }

  function onRandom() {
    setLocalState({
      ...localState,
      shownSearchTerm: '',
      searchResults: selectRandomIdeas(state.ac.decks, 5)
    });
  }

  function buildSearchResultEntry(entry, i) {
    return html`
      <li key=${ i }>
        <${Link} class="pigment-fg-${entry.resource}" href='/${entry.resource}/${entry.id}'>${ entry.name }</${Link}>
      </li>
`;
  }

  function buildSearchResults() {
    let heading = "";
    if (localState.shownSearchTerm.length > 0) {
      if (localState.searchResults.length === 0) {
        return html`<div><h2>No search results found for: ${localState.shownSearchTerm}</h2></div>`;
      }
      heading = html`<h2>Results for: ${ localState.shownSearchTerm }</h2>`;
    } else {
      if (localState.searchResults.length > 0) {
        heading = html`<h2>Random Ideas</h2>`;
      }
    }

    return html`
      <div>
        ${ heading }
        <ol>
          ${ localState.searchResults.map(buildSearchResultEntry) }
        </ol>
      </div>
    `;
  }

  return html`
    <div>
      <h1>Full Text Search</h1>
      <${SearchBox} onSearch=${ onSearch } onRandom=${ onRandom }/>
      ${ buildSearchResults() }
    </div>
`;
}

function selectRandomIdeas(allDecks, num) {
  let res = [];

  let ideas = allDecks.filter(d => d.resource === 'ideas');
  let len = ideas.length;

  // check in case num > the number of ideas in civil
  let realNum = num < len ? num : len;
  for (let i = 0; i < realNum; i++) {
    let index = parseInt(Math.random() * (len - i), 10);
    res.push(ideas[index]);
    // now remove ideas[index] from the array
    ideas.splice(index, 1);
  };

  return res;
}

function SearchBox(props) {
  let [searchTerm, setSearchTerm] = useState('');
  let [buttonLabel, setButtonLabel] = useState('Random');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    setSearchTerm(value);
    setButtonLabel(value.length > 0 ? 'Search' : 'Random');
  };

  function onSubmit(event){
    event.preventDefault();

    if (searchTerm.length > 0) {
      props.onSearch(searchTerm);
    } else {
      props.onRandom();
    }
  }

  return html`
    <form onSubmit=${ onSubmit }>
      <input id="search"
             type="text"
             name="search"
             value=${ searchTerm }
             onInput=${ handleChangeEvent }
      />
      <input type="submit" value=${ buttonLabel } />
    </form>
`;
}
