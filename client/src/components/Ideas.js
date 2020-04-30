import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/state';
import {ensureAC} from '../lib/utils';
import IdeaForm from './IdeaForm';

export default function Ideas() {
  const [state, dispatch] = useStateValue();
  let [showAddIdeaForm, setShowAddIdeaForm] = useState(false);

  let [showRecent, setShowRecent] = useState(true);
  let [showSingleRef, setShowSingleRef] = useState(false);
  let [showZeroRef, setShowZeroRef] = useState(false);
  let [showAll, setShowAll] = useState(false);

  ensureAC(state, dispatch);

  useEffect(() => {
    async function fetcher() {
      const ideas = await Net.get('/api/ideas/listings');
      console.log(ideas);
      dispatch({
        type: 'setIdeas',
        ideas
      });
    }

    if(!state.ideasLoaded) {
      fetcher();
    }
  }, []);

  const toggleShowAdd = () => {
    setShowAddIdeaForm(!showAddIdeaForm);
  };

  // https://github.com/leungwensen/svg-icon
  return (
    <div>
      <h1 onClick={ toggleShowAdd }>{ showAddIdeaForm ? "Add Idea" : "Ideas" }</h1>
      { showAddIdeaForm && <IdeaForm/> }
      { buildListSection(showRecent, setShowRecent, "Recent", state.ideas.recent, 1) }
      { buildListSection(showAll, setShowAll, "All", state.ideas.all, 7) }
      { buildListSection(showSingleRef, setShowSingleRef, "Single References", state.ideas.single_references, 3) }
      { buildListSection(showZeroRef, setShowZeroRef, "Zero References", state.ideas.zero_references, 5) }
    </div>
  );
}

function buildListSection(show, setShow, label, list, pkey) {
  function toggleShow() {
    setShow(!show);
  }

  if(show) {
    return [
      <p key={ pkey } className="subtitle" onClick={ toggleShow }>- { label }</p>,
      buildListing(list, pkey + 1)
    ];
  } else {
    return <p className="subtitle" onClick={ toggleShow }>+ { label }</p>;
  }
}

function buildListing(list, ulKey) {
  let listing = list ? list.map(
    idea => <ListingLink id={ idea.id } key={ idea.id } name={ idea.title } resource='ideas'/>
  ) : [];

  return (<ul key={ ulKey }>
            { listing }
          </ul>);
}
