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
import PersonCreateForm from './components/PersonCreateForm';

import Subject from './components/Subject';
import Subjects from './components/Subjects';
import SubjectCreateForm from './components/SubjectCreateForm';

import Article from './components/Article';
import Articles from './components/Articles';
import ArticleCreateForm from './components/ArticleCreateForm';

import Book from './components/Book';
import Books from './components/Books';
import BookCreateForm from './components/BookCreateForm';

import Point from './components/Point';
import Points from './components/Points';
import PointCreateForm from './components/PointCreateForm';

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
          <Link className='top-bar-menuitem' to={'/people'}>People</Link>
          <Link className='top-bar-menuitem' to={'/points'}>Points</Link>
          <Link className='top-bar-menuitem' to={'/subjects'}>Subjects</Link>
          <Link className='top-bar-menuitem' to={'/books'}>Books</Link>
          <Link className='top-bar-menuitem' to={'/articles'}>Articles</Link>
          <Link className='top-bar-menuitem' to={'/articles'}>Tags</Link>
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

          <PrivateRoute path={'/people/:id'}>
            <Person/>
          </PrivateRoute>
          <PrivateRoute exact path="/people">
            <People/>
          </PrivateRoute>
          <PrivateRoute path={'/add-person'}>
            <PersonCreateForm/>
          </PrivateRoute>

          <PrivateRoute path={'/points/:id'}>
            <Point/>
          </PrivateRoute>
          <PrivateRoute exact path="/points">
            <Points/>
          </PrivateRoute>
          <PrivateRoute path={'/add-point'}>
            <PointCreateForm/>
          </PrivateRoute>


          <PrivateRoute path={'/subjects/:id'}>
            <Subject/>
          </PrivateRoute>
          <PrivateRoute exact path="/subjects">
            <Subjects/>
          </PrivateRoute>
          <PrivateRoute path={'/add-subject'}>
            <SubjectCreateForm/>
          </PrivateRoute>


          <PrivateRoute path={'/articles/:id'}>
            <Article/>
          </PrivateRoute>
          <PrivateRoute exact path="/articles">
            <Articles/>
          </PrivateRoute>
          <PrivateRoute path={'/add-article'}>
            <ArticleCreateForm/>
          </PrivateRoute>

          <PrivateRoute path={'/books/:id'}>
            <Book/>
          </PrivateRoute>
          <PrivateRoute exact path="/books">
            <Books/>
          </PrivateRoute>
          <PrivateRoute path={'/add-book'}>
            <BookCreateForm/>
          </PrivateRoute>

        </Switch>
      </div>
    </Router>
  );
}

const Home = () => {
  return (
    <img src="/img/BertrandRussell-Illustration-1024x1022.png" alt="Bertrand Russell"/>
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
