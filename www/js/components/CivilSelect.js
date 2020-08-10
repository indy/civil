import { html, Link, useState, useEffect } from '/js/ext/library.js';

export default function CivilSelect({ parentDeckId, values, onChange, options, onCancelAddDecks, onCommitAddDecks }) {
  const [currentValues, setCurrentValues] = useState(values);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [candidates, setCandidates] = useState([]);

  const onKeyDown = e => {
    if (e.key === "Escape") {
      setCandidates([]);
    }
    if (e.ctrlKey) {
      setShowKeyboardShortcuts(true);
      if (e.keyCode >= 49 && e.keyCode <= 57) {
        // Ctrl + digit
        const digit = e.keyCode - 48;

        if (digit - 1 < currentValues.length) {
          // delete from current values
          setCurrentValues(currentValues.filter((cv, i) => i !== digit - 1));
        } else {
          const indexToAdd = digit - currentValues.length - 1;

          if (candidates.length > indexToAdd) {
            onSelectedAdd(candidates[indexToAdd]);
          }
        }
      } else if (e.key === "Enter") {
        // Ctrl+Enter == save
        onCommitAddDecks();
      }
    }
  };

  const onKeyUp = e => {
    if (e.key === "Control") {
      setShowKeyboardShortcuts(false);
    }
  };

  useEffect(() => {
    onChange(currentValues);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [currentValues, candidates]);

  function onSelectedRemove(e) {
    setCurrentValues(currentValues.filter(cv => { return cv.value !== e.value;}));
  }

  function onSelectedAdd(candidate) {
    setCurrentValues(currentValues.concat([candidate]));
  }

  return html`<div class='civsel-main-box'>
                ${ currentValues.map((value, i) => html`<${SelectedValue}
                                                        selected=${value}
                                                        onSelectedRemove=${onSelectedRemove}
                                                        keyIndex=${ i + 1 }
                                                        showKeyboardShortcuts=${ showKeyboardShortcuts } />`) }
                <${SelectInput} options=${ options }
                                parentDeckId=${ parentDeckId }
                                candidates=${ candidates }
                                setCandidates=${ setCandidates }
                                onSelectedAdd=${ onSelectedAdd }
                                currentValues=${ currentValues }
                                showKeyboardShortcuts=${ showKeyboardShortcuts }/>
               <button onClick=${ onCancelAddDecks }>Cancel</button>
               <button onClick=${ onCommitAddDecks }>${ showKeyboardShortcuts && html`Ctrl-Enter`} Save</button>
              </div>`;
}

function SelectedValue({ selected, onSelectedRemove, keyIndex, showKeyboardShortcuts }) {
  function onClick(e) {
    e.preventDefault();
    onSelectedRemove(selected);
  }

  return html`<div class='civsel-selected-value'>
                ${ showKeyboardShortcuts && html`<span class='civsel-keyboard-shortcut'>Ctrl-${ keyIndex }</span>`}
                <span class='civsel-delete-selected' onClick=${onClick}>[X] </span>${selected.value}
              </div>`;
}

function SelectInput({ parentDeckId, options, onSelectedAdd, candidates, setCandidates, currentValues, showKeyboardShortcuts }) {
  let [text, setText] = useState('');

  useEffect(() => {
    if (text.length > 2) {
      refineCandidates();
    } else {
      setCandidates([]);
    }
  }, [text]);

  function alreadySelected(compValue) {
    return currentValues.some(cv => { return cv.value.toLowerCase() === compValue;});
  }

  function refineCandidates() {
    let lowerText = text.toLowerCase();

    setCandidates(options
                  .filter(op => { return (op.id !== parentDeckId)
                                  && (op.compValue.includes(lowerText))
                                  && !alreadySelected(op.compValue);  })
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

  let cl = candidates.map((c, i) => {
    return html`<${CandidateItem} candidate=${c}
                                  onSelectedCandidate=${ onSelectedCandidate }
                                  showKeyboardShortcuts=${ showKeyboardShortcuts }
                                  keyIndex=${ currentValues.length + 1 + i }
                />`;
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

function CandidateItem({ candidate, onSelectedCandidate, showKeyboardShortcuts, keyIndex }) {
  function selectedThisCandidate(e) {
    onSelectedCandidate(candidate);
    e.preventDefault();
  }

  const canShowKeyboardShortcut = showKeyboardShortcuts && keyIndex < 10;

  return html`<div class="civsel-candidate" onClick=${selectedThisCandidate}>
                ${ canShowKeyboardShortcut && html`<span class='civsel-keyboard-shortcut'>Ctrl-${ keyIndex }</span>`}
                ${candidate.value}
              </div>`;
}
