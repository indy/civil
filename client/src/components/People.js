import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import Net from '../lib/Net';

function yearFrom(dateString) {
  let res = 0;
  if (dateString[0] === '-') {
    res = parseInt(dateString.slice(0, 5), 10);
  } else {
    res = parseInt(dateString.slice(0, 4), 10);
  }
  return res;
}

function addBirthYear(p) {
  p.birth_year = yearFrom(p.birth_date.exact_date);
}

class People extends Component {
  constructor(props) {
    super(props);

    this.state = {
      people: [],
      showAddPersonLink: false
    };

    Net.get('/api/people').then(people => {
      people.forEach(addBirthYear);
      this.setState({people});
    });
  }

  createPersonListing = (person) => {
    return <PersonListing id={ person.id } key={ person.id } name={ person.name }/>;
  }

  toggleShowAdd = () => {
    this.setState((prevState, props) => ({
      showAddPersonLink: !prevState.showAddPersonLink
    }));
  }

  render() {
    const { people } = this.state;

    const ancientCutoff = 354;
    const medievalCutoff = 1469;
    const modernCutoff = 1856;

    const ancientPeopleList = people
          .filter(person => person.birth_year < ancientCutoff)
          .map(this.createPersonListing);
    const medievalPeopleList = people
          .filter(person => person.birth_year >= ancientCutoff && person.birth_year < medievalCutoff)
          .map(this.createPersonListing);
    const modernPeopleList = people
          .filter(person => person.birth_year >= medievalCutoff && person.birth_year < modernCutoff)
          .map(this.createPersonListing);
    const contemporaryPeopleList = people
          .filter(person => person.birth_year >= modernCutoff)
          .map(this.createPersonListing);

    return (
      <div>
        <h1 onClick={ this.toggleShowAdd }>People</h1>
        {this.state.showAddPersonLink && <Link to='/add-person'>Add Person</Link>}
        <h2>Ancient</h2>
        <ul className="people-list">
          { ancientPeopleList }
        </ul>
        <h2>Medieval</h2>
        <ul className="people-list">
          { medievalPeopleList }
        </ul>
        <h2>Modern</h2>
        <ul className="people-list">
          { modernPeopleList }
        </ul>
        <h2>Contemporary</h2>
        <ul className="people-list">
          { contemporaryPeopleList }
        </ul>
      </div>
    );
  }
}

const PersonListing = props => {
  const href = `/person/${props.id}`;
  return (<li><Link to={ href }>{ props.name }</Link></li>);
};

export default People;
