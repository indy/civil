import React from 'react';
import Console from './Console';
import { useStateValue } from '../lib/state';
import { Link } from 'react-router-dom';
import { ensureAC } from '../lib/utils';

import Net from '../lib/Net';

export default function Home(props) {
  const [state, dispatch] = useStateValue();
  ensureAC(state, dispatch);

  const commands = {
    echo: {
      description: 'Echo a passed string.',
      usage: 'echo <string>',
      fn: function () {
        let words = `${Array.from(arguments).join(' ')}`;
        let res = (<div><Link to="/articles/172">{ words }</Link></div>) ;

        return res;
      }
    },
    delayed: {
      description: 'Delayed',
      usage: 'delayed <string>',
      fn: function () {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve('hello world');
          }, 1000);
        });
      }
    },

    recent: {
      description: 'Recent',
      usage: 'recent <deck>',
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
  const whiteList = ['articles', 'books', 'people', 'events', 'ideas', 'tags'];
  if (!whiteList.includes(d)) {
    return (<div>unknown deck specifier: { deck }</div>);
  }

  const url = `/api/recent?resource=${deck}`;
  const recentResults = await Net.get(url);

  const results = recentResults.results.map(buildRecentResultEntry);
  return (<div>{ results }</div>);

}

async function cmdSearch(query) {
  const url = `/api/search?q=${encodeURI(query)}`;
  const searchResults = await Net.get(url);

  const results = searchResults.results.map(buildSearchResultEntry);

  return (<div>{ results }</div>);
}

function buildRecentResultEntry(entry) {
  let url = `/${entry.resource}/${entry.id}`;
  let key = `${entry.id}`;
  return (<div key={ key }><Link to={ url }>{ entry.name }</Link></div>);
}

function buildSearchResultEntry(entry) {
  let url = `/${entry.resource}/${entry.id}`;
  let key = `${entry.id}`;
  return (<div key={ key }><Link to={ url }>{ entry.name }</Link></div>);
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
