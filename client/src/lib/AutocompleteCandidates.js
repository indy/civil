import { useState, useEffect } from 'react';
import Net from './Net';

export default function AutocompleteCandidates() {
  const [ac, setAc] = useState({
    people: [],
    subjects: []
  });
  useEffect(() => {
    async function fetchAutocompleteLists() {
      const peopleNew = await Net.get("/api/autocomplete/people");
      const subjectsNew = await Net.get("/api/autocomplete/subjects");
      setAc({
        people: peopleNew,
        subjects: subjectsNew
      });
    };
    fetchAutocompleteLists();
  }, []);

  return ac;
}
