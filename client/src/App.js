import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch
} from 'react-router-dom';

import Person from './components/Person';
import People from './components/People';
import PersonCreateForm from './components/PersonCreateForm';

import Subject from './components/Subject';
import Subjects from './components/Subjects';
import SubjectCreateForm from './components/SubjectCreateForm';

import Article from './components/Article';
import Articles from './components/Articles';
import ArticleCreateForm from './components/ArticleCreateForm';

import Point from './components/Point';
import Points from './components/Points';
import PointCreateForm from './components/PointCreateForm';

import Login from './components/Login';
import Logout from './components/Logout';

import Net from './lib/Net';


export default function App(props) {
  const [logged_in, setLogged_in] = useState(false);
  const [username, setUsername] = useState('');
  // const [email, setEmail] = useState('');

  useEffect(() => {
    async function fetcher() {
      await fetchLoggedInStatus();
    }
    fetcher();
  }, []);

  const fetchLoggedInStatus = () => {
    Net.get("/api/users").then(user => {
      setLogged_in(true);
      setUsername(user.username);
      // setEmail(user.email);
    }, err => {
      setLogged_in(false);
      setUsername(null);
      // setEmail(null);
    });
  };

  const logged_status = logged_in ? username : "Login";
  const logged_link = logged_in ? '/logout' : '/login';

  return (
    <Router>
      <div>
        <div id='top-bar-menu'>
          <Link className='top-bar-menuitem' to={'/'}>Home</Link>
          <Link className='top-bar-menuitem' to={'/people'}>People</Link>
          <Link className='top-bar-menuitem' to={'/subjects'}>Subjects</Link>
          <Link className='top-bar-menuitem' to={'/articles'}>Articles</Link>
          <Link className='top-bar-menuitem' to={'/points'}>Points</Link>
          <Link className='top-bar-menuitem' to={ logged_link } id="login-menuitem">{ logged_status }</Link>
        </div>
        <hr/>
        <Switch>
          <Route exact path="/" component={Home}/>
          <Route path={'/people/:personId'} component={Person}/>
          <Route path={'/subjects/:subjectId'} component={Subject}/>
          <Route path={'/articles/:articleId'} component={Article}/>
          <Route path={'/points/:pointId'} component={Point}/>
          <Route exact path="/people" component={People}/>
          <Route exact path="/subjects" component={Subjects}/>
          <Route exact path="/articles" component={Articles}/>
          <Route exact path="/points" component={Points}/>
          <Route exact path="/login" component={Login}/>
          <Route exact path="/logout" component={Logout}/>
          <Route path={'/add-person'} component={PersonCreateForm}/>
          <Route path={'/add-subject'} component={SubjectCreateForm}/>
          <Route path={'/add-article'} component={ArticleCreateForm}/>
          <Route path={'/add-point'} component={PointCreateForm}/>
        </Switch>
      </div>
    </Router>
  );
}

// when trying to pass in props via routes:
// replace component={Person} with:
// render={(props) => <Person people={ people } subjects={ subjects } {...props}/>}

const Home = () => {
  return (
    <img src="/img/BertrandRussell-Illustration-1024x1022.png" alt="Bertrand Russell"/>
  )
};
