import { html, Link, useState } from '/js/ext/library.js';

export default function QuickFind({ autocompletes, resource}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState([]);

  // autocompletes contain the entire set of decks
  // so filter autocompletes by the resource

  const onInput = (event) => {
    const newSearchTerm = event.target.value;

    setSearchTerm(newSearchTerm);

    if (searchTerm.length > 2) {
      refineCandidates();
    } else {
      setCandidates([]);
    }

  };

  function onSubmit(event){
    event.preventDefault();
    console.log("QuickFind onSubmit");
  }

  function refineCandidates() {
    let lowerText = searchTerm.toLowerCase();

    // todo: store the lowercase representation in autocomplete
    setCandidates(autocompletes
                  .filter(op => {
                    return op.resource === resource
                      && op.name.toLowerCase().includes(lowerText);
                  })
                  .sort((a, b) => { return a.name.length - b.name.length; }));
  }

  let cl = candidates.map((c, i) => {
    return html`<${CandidateItem} candidate=${c}
                                  resource=${resource}
                                  keyIndex=${ 1 + i }
                />`;
  });

  return html`
    <form class="quickfind-form" onSubmit=${ onSubmit }>
      <input id="quickfind"
             type="text"
             name="quickfind"
             autoComplete='off'
             value=${ searchTerm }
             onInput=${ onInput }
      />
      <div class='quickfind-candidates'>${ cl }</div>
    </form>
`;
}

function CandidateItem({ candidate, keyIndex, resource }) {
  const { id, name } = candidate;
  const href = `/${resource}/${id}`;

  return html`<div class="quickfind-candidate">
                <${Link} href=${ href }>${ name }</${Link}>
              </div>`;
}
