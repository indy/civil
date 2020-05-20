import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import ListingLink from './ListingLink';
import { useStateValue } from '../lib/StateProvider';
import {ensureAC} from '../lib/utils';
import IdeaForm from './IdeaForm';

let gKeyCounter = 0;

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

  // buildListSection might return an array, each element therefore requires a unique key value
  gKeyCounter = 0;

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>{ showAddIdeaForm ? "Add Idea" : "Ideas" }</h1>
      { showAddIdeaForm && <IdeaForm/> }
      { buildListSection(showRecent, setShowRecent, "Recent", state.ideas.recent) }
      { buildListSection(showAll, setShowAll, "All", state.ideas.all) }
      { buildListSection(showSingleRef, setShowSingleRef, "Single References", state.ideas.single_references) }
      { buildListSection(showZeroRef, setShowZeroRef, "Zero References", state.ideas.zero_references) }
    </div>
  );
}

function buildListSection(show, setShow, label, list) {
  function toggleShow() {
    setShow(!show);
  }

  // svg icons are from https://github.com/tabler/tabler-icons
  if(show) {
    return [
      <p key={ gKeyCounter++ } className="subtitle" onClick={ toggleShow }>
        <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-minus" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z"/>
          <line x1="5" y1="15" x2="19" y2="15" />
        </svg>
        { label }
      </p>,
      <ul className="ideas-list" key = { gKeyCounter++ } >
        { buildListing(list) }
      </ul>

    ];
  } else {
    return <p className="subtitle" onClick={ toggleShow }>
             <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-plus" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
               <path stroke="none" d="M0 0h24v24H0z"/>
               <line x1="12" y1="8" x2="12" y2="22" />
               <line x1="5" y1="15" x2="19" y2="15" />
             </svg>
             { label }
           </p>;
  }
}

function buildListing(list) {
  if (!list) {
    return [];
  }
  return list.map(
    (idea, i) => <ListingLink
                   id={ idea.id }
                   key={ idea.id }
                   name={ i === (list.length - 1) ? idea.title : idea.title + ',' }
                   resource='ideas'/>
  );
}
