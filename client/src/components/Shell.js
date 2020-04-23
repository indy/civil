import React from 'react';
import Console from './Console';
import { useStateValue } from '../lib/state';
import { Link, useHistory } from 'react-router-dom';
import { ensureAC } from '../lib/utils';
import { asShellBlock } from '../lib/reactUtils';

import Net from '../lib/Net';

export default function Shell(props) {
  let history = useHistory();

  const [state, dispatch] = useStateValue();
  ensureAC(state, dispatch);

  const commands = {
    goto: {
      description: 'Goto a listing page',
      usage: 'goto [ideas | articles | people | places]',
      fn: function (deck) {
        return `goto ${deck}`;
      },
      afterEffectFn: function(deck) {
        history.push(`/${deck}`);
      }
    },

    recent: {
      description: 'Display recently added items',
      usage: 'recent [ideas | articles | people | places]',
      fn: async function (deck) {
        const res = await cmdRecent(deck);
        return res;
      }
    },

    search: {
      description: 'Search',
      usage: 'search <string>',
      fn: async function () {
        const query = `${Array.from(arguments).join(' ')}`;
        const res = await cmdSearch(query);
        return res;
      }
    }
  };

  let promptLabel = buildPrompt(state.user);

  return (
    <div className="console-container">
      <Console
        commands={commands}
        promptLabel= { promptLabel }
        autoFocus
      />
    </div>
  );
}

async function cmdRecent(deck) {
  const d = deck.toLowerCase();
  const whiteList = ['articles', 'people', 'events', 'ideas'];
  if (!whiteList.includes(d)) {
    return (<div className="shell-block">unknown deck specifier: { deck }</div>);
  }

  const url = `/api/cmd/recent?resource=${deck}`;
  const recentResults = await Net.get(url);
  const results = recentResults.results.map(buildRecentResultEntry);

  return asShellBlock(results);
}

async function cmdSearch(query) {
  // do this client side for the moment, really should be done in server-side db
  let validQuery = query.replace(/(\s+)/g, ' & ');

  const url = `/api/cmd/search?q=${encodeURI(validQuery)}`;
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
