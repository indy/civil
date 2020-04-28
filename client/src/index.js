import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
// import registerServiceWorker from './registerServiceWorker';
import Net from './lib/Net';

Net.get("/api/users").then(user => {
  ReactDOM.render(<App user={ user }/>, document.getElementById('root'));
}, err => {
  ReactDOM.render(<App/>, document.getElementById('root'));
});

// registerServiceWorker();
