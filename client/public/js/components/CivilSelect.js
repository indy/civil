import { h } from '/js/ext/preact.module.js';
import htm from '/js/ext/htm.module.js';
import { Link } from '/js/ext/preact-router.js';
import { useState, useEffect } from '/js/ext/hooks.module.js';

export default function CivilSelect({ values, onChange, options }) {
  const html = htm.bind(h);

  const [currentValues, setCurrentValues] = useState(values);

  useEffect(() => {
    onChange(currentValues);
  }, [currentValues]);

  function onSelectedRemove(e) {
    setCurrentValues(currentValues.filter(cv => { return cv.value !== e.value;}));
  }

  function onSelectedAdd(candidate) {
    setCurrentValues(currentValues.concat([candidate]));
  }

  return html`<div class='civsel-main-box'>
                ${ currentValues.map(value => html`<${SelectedValue}
                                                     selected=${value}
                                                     onSelectedRemove=${onSelectedRemove}
                                                  />`) }
                <${SelectInput} options=${options} onSelectedAdd=${onSelectedAdd}/>
              </div>`;
}

function SelectedValue({ selected, onSelectedRemove }) {
  const html = htm.bind(h);

  function onClick(e) {
    e.preventDefault();
    onSelectedRemove(selected);
  }

  return html`<div class='civsel-selected-value'>
                <span class='civsel-delete-selected' onClick=${onClick}>[X] </span>${selected.value}
              </div>`;
}

function SelectInput({ options, onSelectedAdd }) {
  const html = htm.bind(h);

  let [text, setText] = useState('');
  let [candidates, setCandidates] = useState([]);

  useEffect(() => {
    if (text.length > 1) {
      refineCandidates();
    }
  }, [text]);

  function refineCandidates() {
    let lowerText = text.toLowerCase();

    setCandidates(options
                  .filter(op => { return op.compValue.includes(lowerText); })
                  .sort((a, b) => { return a.compValue.length - b.compValue.length; }));
  }

  function onInput(e) {
    setText(e.target.value);
  }

  function onSubmit(e) {
    e.preventDefault();

    // search for text in options
    let lowerText = text.toLowerCase();
    let existingOption = options.find(option => { return option.compValue === lowerText;});
    if (existingOption) {
      // pre-existing deck
      onSelectedAdd(existingOption);
    } else {
      // treat this text as a new idea that needs to be created
      onSelectedAdd({ value: text, __isNew__: true});
    }
  }

  function onSelectedCandidate(c) {
    onSelectedAdd(c);
    setText('');
    setCandidates([]);
  }

  let cl = candidates.map(c => {
    return html`<${CandidateItem} candidate=${c} onSelectedCandidate=${ onSelectedCandidate }/>`;
  });

  return html`
    <form class="civsel-form" onSubmit=${ onSubmit }>
      <input
        type='text'
        value='${ text }'
        autoComplete='off'
        onInput=${ onInput }
      />
      <div class='civsel-candidates'>${ cl }</div>
    </form>`;
}

function CandidateItem({ candidate, onSelectedCandidate }) {
  const html = htm.bind(h);

  function selectedThisCandidate(e) {
    onSelectedCandidate(candidate);
    e.preventDefault();
  }

  return html`<div class="civsel-candidate" onClick=${selectedThisCandidate}>${candidate.value}</div>`;
}
