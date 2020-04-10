import React from 'react';
import Console from './Console';
import { useStateValue } from '../lib/state';
import { Link } from 'react-router-dom';

import Net from '../lib/Net';

export default function Shell(props) {
  const [state] = useStateValue();

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
      />
    </div>
  );
}


async function cmdSearch(query) {
  const url = `/api/search?q=${encodeURI(query)}`;
  const searchResults = await Net.get(url);

  const results = searchResults.results.map(buildSearchResultEntry);

  return (<div>{ results }</div>);
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
