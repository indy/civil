import React, { useState } from 'react';
import Console from './Console';
import { useStateValue } from '../lib/state';
import { Link, useHistory } from 'react-router-dom';
import { ensureAC } from '../lib/utils';
import { asShellBlock } from '../lib/reactUtils';
import Net from '../lib/Net';

export default function Shell(props) {
  let history = useHistory();

  const [state, dispatch] = useStateValue();

  const [showConsole, setShowConsole] = useState(false);

  ensureAC(state, dispatch);

  const commands = {
    goto: {
      description: 'Goto a listing page',
      usage: '!goto [ideas | publications | people | places]',
      fn: function (deck) {
        return `goto ${deck}`;
      },
      afterEffectFn: function(deck) {
        history.push(`/${deck}`);
      }
    },

    recent: {
      description: 'Display recently added items',
      usage: '!recent [ideas | publications | people | places]',
      fn: async function (deck) {
        const res = await cmdRecent(deck);
        return res;
      }
    }
  };

  let promptLabel = buildPrompt(state.user);

  function onClicked(event) {
    setShowConsole(!showConsole);
  }

  let consoleClasses = showConsole ? 'console console-visible' : 'console console-invisible';
  return (
    <div className="sidebar">
      <Console
        className={ consoleClasses }
        searchCommand={ cmdSearch }
        commands={ commands }
        promptLabel= { promptLabel }
        autoFocus
      />
      <div className="sticky-bl">
        <svg onClick={ onClicked } xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="#666" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z"/>
          <circle cx="12" cy="12" r="9" />
          <line x1="9" y1="10" x2="9.01" y2="10" />
          <line x1="15" y1="10" x2="15.01" y2="10" />
          <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
        </svg>
      </div>
    </div>
  );
}

async function cmdRecent(deck) {
  const d = deck.toLowerCase();
  const whiteList = ['publications', 'people', 'events', 'ideas'];
  if (!whiteList.includes(d)) {
    return (<div className="shell-block">unknown deck specifier: { deck }</div>);
  }

  const url = `/api/cmd/recent?resource=${deck}`;
  const recentResults = await Net.get(url);
  const results = recentResults.results.map(buildRecentResultEntry);

  return asShellBlock(results);
}

async function cmdSearch(rawInput) {
  const url = `/api/cmd/search?q=${encodeURI(rawInput)}`;
  const searchResults = await Net.get(url);
  const results = searchResults.results.map(buildSearchResultEntry);

  return asShellBlock(results);
}

function buildRecentResultEntry(entry) {
  return (<Link to={ `/${entry.resource}/${entry.id}` }>{ entry.name }</Link>);
}

function buildSearchResultEntry(entry) {
  return (<Link to={ `/${entry.resource}/${entry.id}` }>{ entry.name }</Link>);
}

function buildPrompt(user) {
  let prompt = '';

  if (user && user.username) {
    prompt += `${user.username}`;
    if (user.admin) {
      let admin = user.admin;
      prompt += `@${admin.db_name}`;
    }
  }
  prompt += '->';

  return prompt;
}
