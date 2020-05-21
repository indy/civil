import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Net from '../lib/Net';
import { useStateValue } from '../lib/StateProvider';

export default function Search() {
  const [state] = useStateValue();

  let [localState, setLocalState] = useState({
    shownSearchTerm: '',
    searchResults: []
  });

  async function search(searchTerm) {
    const url = `/api/cmd/search?q=${encodeURI(searchTerm)}`;
    const searchResponse = await Net.get(url);

    const graphResponse = await Net.get('/api/cmd/graph');
    console.log(graphResponse);

    // let res1 = "";
    // let res2 = "";
    // state.ac.decks.forEach(ac => res1 += `{ id: ${ac.id}, label: "${ac.label}" }, `);
    // graphResponse.results.forEach(g => res2 += `{ from: ${g.from_id}, to: ${g.to_id} }, `);
    // console.log(res1);
    // console.log(res2);

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
    return (
      <li key = { i }>
        <Link to={ `/${entry.resource}/${entry.id}` }>{ entry.name }</Link>
      </li>
    );
  }

  function buildSearchResults() {
    let heading;
    if (localState.shownSearchTerm.length > 0) {
      heading = (<h2>Results for: { localState.shownSearchTerm }</h2>);
    } else {
      heading = (<h2>Random Ideas</h2>);
    }

    return (<div>
              { heading }
              <ol>
                { localState.searchResults.map(buildSearchResultEntry) }
              </ol>
            </div>);
  }

  return (
    <div>
      <h1>Search</h1>
      <SearchBox onSearch = { onSearch } onRandom = { onRandom }/>
      { localState.searchResults.length > 0 && buildSearchResults() }
    </div>

  )
}

function selectRandomIdeas(allDecks, num) {
  let res = [];


  let ideas = allDecks.filter(d => d.resource === 'ideas');
  let len = ideas.length;

  // check in case num > the number of ideas in civil
  let realNum = num < len ? num : len;
  for (let i = 0; i < realNum; i++) {
    let index = parseInt(Math.random() * (len - i), 10);
    res.push({
      id: ideas[index].id,
      name: ideas[index].label,
      resource: 'ideas',
    })
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

  return (
    <form onSubmit={ onSubmit }>
      <input id="search"
             type="text"
             name="search"
             value={ searchTerm }
             onChange={ handleChangeEvent }
      />
      <input type="submit" value={ buttonLabel } />
    </form>
  );
}
