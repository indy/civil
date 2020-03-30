import { useState, useEffect } from 'react';
import Net from './Net';

export default function AutocompleteCandidates() {
  const [ac, setAc] = useState({
    tags: [],
    people: [],
    subjects: []
  });
  useEffect(() => {
    async function fetchAutocompleteLists() {
      const tagsNew = await Net.get("/api/autocomplete/tags");
      const peopleNew = await Net.get("/api/autocomplete/people");
      const subjectsNew = await Net.get("/api/autocomplete/subjects");
      setAc({
        tags: tagsNew,
        people: peopleNew,
        subjects: subjectsNew
      });
    };
    fetchAutocompleteLists();
  }, []);

  return ac;
}
