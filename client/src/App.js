import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch,
  Redirect
} from 'react-router-dom';

import Login from './components/Login';
import Logout from './components/Logout';

import Person from './components/Person';
import People from './components/People';
import PersonForm from './components/PersonForm';

import Article from './components/Article';
import Articles from './components/Articles';
import ArticleForm from './components/ArticleForm';

import Book from './components/Book';
import Books from './components/Books';
import BookForm from './components/BookForm';

import Idea from './components/Idea';
import Ideas from './components/Ideas';
import IdeaForm from './components/IdeaForm';

import Point from './components/Point';
import Points from './components/Points';
import PointForm from './components/PointForm';

import Tag from './components/Tag';
import Tags from './components/Tags';
import TagForm from './components/TagForm';

const CivilAuthGlobal = {
  isAuthenticated: false
};

export default function App(props) {
  const [username, setUsername] = useState(props.user.username);
  const [isAuthenticated, setIsAuthenticated] = useState(props.user.username !== '');

  CivilAuthGlobal.isAuthenticated = isAuthenticated;

  useEffect(() => {
    CivilAuthGlobal.isAuthenticated = isAuthenticated;
  });

  function loggedStatus() {
    console.log('rendering loggedStatus');
    return isAuthenticated ? username : 'Login';
  }

  function loggedLink() {
    return isAuthenticated ? "/logout" : "/login";
  }

  function loginHandler(user) {
    setUsername(user.username);
    setIsAuthenticated(true);
  }

  function logoutHandler() {
    setIsAuthenticated(false);
  }

  return (
    <Router>
      <div>
        <div id='top-bar-menu'>
          <Link className='top-bar-menuitem' to={'/'}>Home</Link>
          <Link className='top-bar-menuitem' to={'/ideas'}>Ideas</Link>
          <Link className='top-bar-menuitem' to={'/tags'}>Tags</Link>
          <Link className='top-bar-menuitem' to={'/books'}>Books</Link>
          <Link className='top-bar-menuitem' to={'/articles'}>Articles</Link>
          <Link className='top-bar-menuitem' to={'/people'}>People</Link>
          <Link className='top-bar-menuitem' to={'/points'}>Points</Link>
          <Link className='top-bar-menuitem' to={ loggedLink() } id="login-menuitem">{ loggedStatus() }</Link>
        </div>
        <hr/>
        <Switch>

          <Route exact path="/">
            <Home/>
          </Route>
          <Route exact path="/login">
            <Login loginCallback = { loginHandler }/>
          </Route>
          <PrivateRoute exact path="/logout">
            <Logout logoutCallback = { logoutHandler }/>
          </PrivateRoute>

          <PrivateRoute path={'/ideas/:id'}>
            <Idea/>
          </PrivateRoute>
          <PrivateRoute exact path="/ideas">
            <Ideas/>
          </PrivateRoute>
          <PrivateRoute path={'/add-idea'}>
            <IdeaForm/>
          </PrivateRoute>

          <PrivateRoute path={'/people/:id'}>
            <Person/>
          </PrivateRoute>
          <PrivateRoute exact path="/people">
            <People/>
          </PrivateRoute>
          <PrivateRoute path={'/add-person'}>
            <PersonForm/>
          </PrivateRoute>

          <PrivateRoute path={'/points/:id'}>
            <Point/>
          </PrivateRoute>
          <PrivateRoute exact path="/points">
            <Points/>
          </PrivateRoute>
          <PrivateRoute path={'/add-point'}>
            <PointForm/>
          </PrivateRoute>

          <PrivateRoute path={'/articles/:id'}>
            <Article/>
          </PrivateRoute>
          <PrivateRoute exact path="/articles">
            <Articles/>
          </PrivateRoute>
          <PrivateRoute path={'/add-article'}>
            <ArticleForm/>
          </PrivateRoute>

          <PrivateRoute path={'/books/:id'}>
            <Book/>
          </PrivateRoute>
          <PrivateRoute exact path="/books">
            <Books/>
          </PrivateRoute>
          <PrivateRoute path={'/add-book'}>
            <BookForm/>
          </PrivateRoute>

          <PrivateRoute path={'/tags/:id'}>
            <Tag/>
          </PrivateRoute>
          <PrivateRoute exact path="/tags">
            <Tags/>
          </PrivateRoute>
          <PrivateRoute path={'/add-tag'}>
            <TagForm/>
          </PrivateRoute>

        </Switch>
      </div>
    </Router>
  );
}

const Home = () => {
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

function PrivateRoute({ children, ...rest }) {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        CivilAuthGlobal.isAuthenticated ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: location }
            }}
          />
        )
      }
    />
  );
}
