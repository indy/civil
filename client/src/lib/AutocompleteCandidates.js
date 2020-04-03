import { useState, useEffect } from 'react';
import Net from './Net';

export default function AutocompleteCandidates() {
  const [ac, setAc] = useState({
    tags: [],
    decks: []
  });
  useEffect(() => {
    async function fetchAutocompleteLists() {
      const tagsNew = await Net.get("/api/autocomplete/tags");
      const decksNew = await Net.get("/api/autocomplete/decks");

      setAc({
        tags: tagsNew,
        decks: decksNew,
      });
    };
    fetchAutocompleteLists();
  }, []);

  // someTags == an array of existing and new tags
  // any new tags will be added to the autocomplete tags array
  //
  function addNewTagsToAutocomplete(someTags) {
    let acNew = {...ac};

    someTags.forEach(t => {
      let preExisting = ac.tags.some(a => {
        return a.value === t.name;
      });

      if (!preExisting) {
        // this tag was recently created, so add it to the autocomplete list
        acNew.tags.push({
          id: t.id,
          value: t.name,
          label: t.name
        });
      }
    });

    acNew.tags.sort((a, b) => a.value > b.value);

    setAc(acNew);
  }

  return [ac, addNewTagsToAutocomplete];
}
