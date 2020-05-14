import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Net from '../lib/Net';

export default function Search() {
  let [state, setState] = useState({
    shownSearchTerm: '',
    searchResults: []
  });

  async function search(searchTerm) {
    // do this client side for the moment, really should be done in server-side db
    // let validQuery = rawInput.replace(/(\s+)/g, ' & ');

    const url = `/api/cmd/search?q=${encodeURI(searchTerm)}`;
    const searchResponse = await Net.get(url);
    console.log(searchResponse);

    if (searchResponse.results) {
      setState({
        ...state,
        shownSearchTerm: state.searchTerm,
        searchResults: searchResponse.results
      });
    }
  }

  function onSearch(searchTerm){
    search(searchTerm);
  }

  function buildSearchResultEntry(entry, i) {
    return (
      <li key = { i }>
        <Link to={ `/${entry.resource}/${entry.id}` }>{ entry.name }</Link>
      </li>
    );
  }

  function buildSearchResults() {
    return (<div>
              <h2>Results for: { state.shownSearchTerm }</h2>,
              <ol>
                { state.searchResults.map(buildSearchResultEntry) }
              </ol>
            </div>);
  }

  return (
    <div>
      <h1>Search</h1>
      <SearchBox onSearch = { onSearch }/>
      { state.searchResults.length > 0 && buildSearchResults() }
    </div>

  )
}

function SearchBox(props) {
  let [searchTerm, setSearchTerm] = useState('');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === 'search') {
      setSearchTerm(value);
    }
  };

  function onSubmit(event){
    event.preventDefault();
    props.onSearch(searchTerm);
  }

  return (
    <form onSubmit={ onSubmit }>
      <input id="search"
             type="text"
             name="search"
             value={ searchTerm }
             onChange={ handleChangeEvent }
      />
      <input type="submit" value="Search" />
    </form>
  );
}
