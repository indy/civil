import React, { useState, useEffect } from 'react';
import Net from '../lib/Net';
import { Link } from 'react-router-dom';
import ListingLink from './ListingLink';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  let [showAddSubjectLink, setShowAddSubjectLink] = useState(false);

  useEffect(() => {
      async function fetcher() {
        const p = await Net.get('/api/subjects');
        setSubjects(p);
      }
      fetcher();
  }, []);

  const toggleShowAdd = () => {
    setShowAddSubjectLink(!showAddSubjectLink);
  };

  const subjectsList = subjects.map(
    subject => <ListingLink id={ subject.id } key={ subject.id } name={ subject.name } resource='subjects'/>
  );

  return (
    <div>
      <h1 onClick={ toggleShowAdd }>Subjects</h1>
      { showAddSubjectLink && <Link to='/add-subject'>Add Subject</Link> }
      <ul>
        { subjectsList }
      </ul>
    </div>
  );
}
