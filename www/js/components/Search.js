import { html, Link, useState } from '/lib/preact/mod.js';

import { useStateValue } from '/js/StateProvider.js';

import Net from '/js/Net.js';

export default function Search() {
  const [state] = useStateValue();

  let [localState, setLocalState] = useState({
    searchTerm: '',
    searchResults: []
  });

  const handleChangeEvent = (event) => {
    search(event.target.value);
  };

  async function search(text) {
    const url = `/api/cmd/search?q=${encodeURI(text)}`;
    const searchResponse = await Net.get(url);

    if (searchResponse.results) {
      setLocalState({
        ...localState,
        searchTerm: text,
        searchResults: searchResponse.results
      });
    }
  }

  function onSubmit(e) {
    e.preventDefault();
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
    if (localState.searchTerm.length > 0) {
      if (localState.searchResults.length === 0) {
        return html`<div><h2>No search results found for: ${localState.searchTerm}</h2></div>`;
      }
      heading = html`<h2>Results for: ${ localState.searchTerm }</h2>`;
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
      <form onSubmit=${ onSubmit }>
        <input id="search"
               type="text"
               name="search"

               value=${ localState.searchTerm }
               onInput=${ handleChangeEvent }
        />
      </form>
      ${ buildSearchResults() }
    </div>
`;
}
