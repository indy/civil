import { html, Link, useState, useEffect } from '/lib/preact/mod.js';

export default function CivilSelect({ parentDeckId, chosen, available, onChange, onCancelAddDecks, onCommitAddDecks }) {
  const [currentlyChosen, setCurrentlyChosen] = useState(chosen || []);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [canSave, setCanSave] = useState(false);

  const onKeyDown = e => {
    if (e.key === "Escape") {
      setCandidates([]);
    }
    if (e.ctrlKey) {
      setShowKeyboardShortcuts(true);
      if (e.keyCode >= 49 && e.keyCode <= 57) {
        // Ctrl + digit
        const digit = e.keyCode - 48;

        if (digit - 1 < currentlyChosen.length) {
          // delete from currently chosen
          setCurrentlyChosen(currentlyChosen.filter((cv, i) => i !== digit - 1));
        } else {
          const indexToAdd = digit - currentlyChosen.length - 1;

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
    let cv = currentlyChosen.map(c => {
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
  }, [currentlyChosen, candidates]);

  function onReferenceRemove(e) {
    setCanSave(true);
    setCurrentlyChosen(currentlyChosen.filter(cv => { return cv.name !== e.name;}));
  }

  function onReferenceChangeKind(reference, newKind) {
    setCanSave(true);
    let newChosen = currentlyChosen.map(cv => {
      if (cv.id === reference.id) {
        cv.kind = newKind;
      }
      return cv;
    });

    setCurrentlyChosen(newChosen);
  }

  function onReferenceChangeAnnotation(reference, annotation) {
    setCanSave(true);
    let newChosen = currentlyChosen.map(cv => {
      if (cv.id === reference.id) {
        cv.annotation = annotation;
      }
      return cv;
    });

    setCurrentlyChosen(newChosen);
  }

  function onSelectedAdd(candidate) {
    setCanSave(true);
    setCurrentlyChosen(currentlyChosen.concat([candidate]));
  }

  return html`<div class='civsel-main-box'>
                ${ currentlyChosen.map((value, i) => html`<${SelectedReference}
                                                        reference=${value}
                                                        onRemove=${onReferenceRemove}
                                                        onChangeKind=${onReferenceChangeKind}
                                                        onChangeAnnotation=${onReferenceChangeAnnotation}
                                                        keyIndex=${ i + 1 }
                                                        showKeyboardShortcuts=${ showKeyboardShortcuts } />`) }
                <${Input} available=${ available }
                          parentDeckId=${ parentDeckId }
                          candidates=${ candidates }
                          setCandidates=${ setCandidates }
                          onAdd=${ onSelectedAdd }
                          currentlyChosen=${ currentlyChosen }
                          showKeyboardShortcuts=${ showKeyboardShortcuts }/>
               <button onClick=${ onCancelAddDecks }>Cancel</button>
               <button onClick=${ onCommitAddDecks } disabled=${ !canSave }>${ showKeyboardShortcuts && html`Ctrl-Enter`} Save Changes</button>
              </div>`;
}

function SelectedReference({ reference, onRemove, onChangeKind, keyIndex, showKeyboardShortcuts, onChangeAnnotation }) {
  function onClick(e) {
    e.preventDefault();
    onRemove(reference);
  }

  function onKindDropDownSelect(e) {
    onChangeKind(reference, e.target.value);
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "annotation") {
      onChangeAnnotation(reference, value);
    }
  };

  return html`<div class='civsel-reference'>
                ${ showKeyboardShortcuts && html`<span class='civsel-keyboard-shortcut'>Ctrl-${ keyIndex }</span>`}
                <span class='civsel-delete-selected' onClick=${onClick}>[X]</span>
                <select onChange=${onKindDropDownSelect} name="choice">
                  <option value="Ref" selected=${reference.kind == "Ref"}>Generic Reference</option>
                  <option value="RefToParent" selected=${reference.kind == "RefToParent"}>Reference to Parent</option>
                  <option value="RefToChild" selected=${reference.kind == "RefToChild"}>Reference to Child</option>
                  <option value="RefInContrast" selected=${reference.kind == "RefInContrast"}>Contrasting Reference</option>
                  <option value="RefCritical" selected=${reference.kind == "RefCritical"}>Critical Reference</option>
                </select>
                ${reference.name}
                <input class="civsel-annotation"
                  type="text"
                  name="annotation"
                  value=${ reference.annotation }
                  onInput=${ handleChangeEvent } />
              </div>`;
}

function Input({ parentDeckId, available, onAdd, candidates, setCandidates, currentlyChosen, showKeyboardShortcuts }) {
  let [text, setText] = useState('');

  useEffect(() => {
    if (text.length >= 2) {
      refineCandidates();
    } else {
      setCandidates([]);
    }
  }, [text]);

  function alreadySelected(comparisonName) {
    return currentlyChosen.some(cv => { return cv.name.toLowerCase() === comparisonName;});
  }

  function refineCandidates() {
    let lowerText = text.toLowerCase();

    setCandidates(available
                  .filter(op => { return (op.id !== parentDeckId)
                                  && (op.comparisonName.includes(lowerText))
                                  && !alreadySelected(op.comparisonName);  })
                  .sort((a, b) => { return a.comparisonName.length - b.comparisonName.length; }));
  }

  function onInput(e) {
    setText(e.target.value);
  }

  function onSubmit(e) {
    e.preventDefault();

    if (text.length > 0) {
      // search for text in available
      let lowerText = text.toLowerCase();
      let existingOption = available.find(option => { return option.comparisonName === lowerText;});
      if (existingOption) {
        // pre-existing deck
        onAdd(existingOption);
      } else {
        // treat this text as a new idea that needs to be created
        onAdd({ name: text, kind: "Ref", __isNew__: true});
      }
      setText('');
    }
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
                                  keyIndex=${ currentlyChosen.length + 1 + i }
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
                ${ candidate.name }
              </div>`;
}
