import React, { Component } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Link
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

class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <div id='top-bar-menu'>
            <Link className='top-bar-menuitem' to={'/'}>Home</Link>
            <Link className='top-bar-menuitem' to={'/people'}>People</Link>
            <Link className='top-bar-menuitem' to={'/subjects'}>Subjects</Link>
            <Link className='top-bar-menuitem' to={'/articles'}>Articles</Link>
            <Link className='top-bar-menuitem' to={'/points'}>Points</Link>
          </div>
          <hr/>
          <Route exact path="/" component={Home}/>
          <Route path="/people" component={People}/>
          <Route path="/subjects" component={Subjects}/>
          <Route path="/articles" component={Articles}/>
          <Route path="/points" component={Points}/>
          <Route path={'/add-person'} component={PersonCreateForm}/>
          <Route path={'/add-subject'} component={SubjectCreateForm}/>
          <Route path={'/add-article'} component={ArticleCreateForm}/>
          <Route path={'/add-point'} component={PointCreateForm}/>
          <Route path={'/person/:personId'} component={Person}/>
          <Route path={'/subject/:subjectId'} component={Subject}/>
          <Route path={'/article/:articleId'} component={Article}/>
          <Route path={'/point/:pointId'} component={Point}/>
        </div>
      </Router>
    );
  }
}

// when trying to pass in props via routes:
// replace component={Person} with:
// render={(props) => <Person people={ people } subjects={ subjects } {...props}/>}

const Home = () => {
  return (
    <img src="/img/BertrandRussell-Illustration-1024x1022.png" alt="Bertrand Russell"/>
  )
};

export default App;
