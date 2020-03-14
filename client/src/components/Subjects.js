import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import Net from '../lib/Net';

class Subjects extends Component {
  constructor(props) {
    super(props);

    this.state = {
      subjects: [],
      showAddSubjectLink: false
    };

    Net.get('/api/subjects').then(subjects => {
      this.setState({ subjects });
    });
  }

  createSubjectListing = (subject) => {
    return <SubjectListing id={ subject.id } key={ subject.id } name={ subject.name }/>;
  }

  toggleShowAdd = () => {
    this.setState((prevState, props) => ({
      showAddSubjectLink: !prevState.showAddSubjectLink
    }));
  }

  render() {
    const { subjects } = this.state;
    const subjectsList = subjects.map(this.createSubjectListing);

    return (
      <div>
        <h1 onClick={ this.toggleShowAdd }>Subjects</h1>
        { this.state.showAddSubjectLink && <Link to='/add-subject'>Add Subject</Link> }
        <ul>
          { subjectsList }
        </ul>
      </div>
    );
  }
}

const SubjectListing = props => {
  const href = `/subjects/${props.id}`;
  return (<li><Link to={ href }>{ props.name }</Link></li>);
};

export default Subjects;
