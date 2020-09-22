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
    // no 'kind' value is populated if the the default is used, so we have to manually add it
    // (fuck the web, the entire thing needs to be burnt to the ground)
    //
    let cv = currentValues.map(c => {
      if (!c.kind) {
        c.kind = "Ref";
      }
      return c;
    });

    onChange(cv); // <- this is how changes to the selection are passed up to the parent note
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [currentValues, candidates]);

  function onReferenceRemove(e) {
    setCurrentValues(currentValues.filter(cv => { return cv.value !== e.value;}));
  }

  function onReferenceChangeKind(reference, newKind) {
    let newValues = currentValues.map(cv => {
      if (cv.id === reference.id) {
        cv.kind = newKind;
      }
      return cv;
    });

    setCurrentValues(newValues);
  }

  function onSelectedAdd(candidate) {
    setCurrentValues(currentValues.concat([candidate]));
  }

  return html`<div class='civsel-main-box'>
                ${ currentValues.map((value, i) => html`<${SelectedReference}
                                                        reference=${value}
                                                        onRemove=${onReferenceRemove}
                                                        onChangeKind=${onReferenceChangeKind}
                                                        keyIndex=${ i + 1 }
                                                        showKeyboardShortcuts=${ showKeyboardShortcuts } />`) }
                <${Input} options=${ options }
                          parentDeckId=${ parentDeckId }
                          candidates=${ candidates }
                          setCandidates=${ setCandidates }
                          onAdd=${ onSelectedAdd }
                          currentValues=${ currentValues }
                          showKeyboardShortcuts=${ showKeyboardShortcuts }/>
               <button onClick=${ onCancelAddDecks }>Cancel</button>
               <button onClick=${ onCommitAddDecks }>${ showKeyboardShortcuts && html`Ctrl-Enter`} Save</button>
              </div>`;
}

function SelectedReference({ reference, onRemove, onChangeKind, keyIndex, showKeyboardShortcuts }) {
  function onClick(e) {
    e.preventDefault();
    onRemove(reference);
  }

  function onKindDropDownSelect(e) {
    onChangeKind(reference, e.target.value);
  }

  return html`<div class='civsel-reference'>
                ${ showKeyboardShortcuts && html`<span class='civsel-keyboard-shortcut'>Ctrl-${ keyIndex }</span>`}
                <span class='civsel-delete-selected' onClick=${onClick}>[X]</span>
                <select onChange=${onKindDropDownSelect} name="choice">
                  <option value="Ref" selected=${reference.kind == "Ref"}>Generic Reference</option>
                  <option value="RefToParent" selected=${reference.kind == "RefToParent"}>Reference to Parent</option>
                  <option value="RefToChild" selected=${reference.kind == "RefToChild"}>Reference to Child</option>
                  <option value="RefInContrast" selected=${reference.kind == "RefInContrast"}>Contrasting Reference</option>
                </select>
                ${reference.value}
              </div>`;
}

function Input({ parentDeckId, options, onAdd, candidates, setCandidates, currentValues, showKeyboardShortcuts }) {
  let [text, setText] = useState('');

  useEffect(() => {
    if (text.length >= 2) {
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
      onAdd(existingOption);
    } else {
      // treat this text as a new idea that needs to be created
      onAdd({ value: text, kind: "Ref", __isNew__: true});
    }
    setText('');
  }

  function onSelectedCandidate(c) {
    onAdd(c);
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
