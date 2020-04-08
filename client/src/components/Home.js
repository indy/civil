import React from 'react';
import {ensureAC} from '../lib/appUtils';

import { useStateValue } from '../lib/state';


export default function Home() {
  const [state, dispatch] = useStateValue();
  ensureAC(state, dispatch);

  return (
    <div>
      <h1>Civil &times; Zettelkasten &times; Samizdat</h1>
      <ol>
        <li>Keep private</li>
        <li>Remain honest</li>
        <li>Never delete</li>
      </ol>
      <img src="/img/BertrandRussell-Illustration-1024x1022.png" alt="Bertrand Russell"/>
    </div>
  );
};
