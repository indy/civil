import { html, useState, useEffect } from '/lib/preact/mod.js';
import { useLocalReducer } from '/js/PreactUtils.js';

const ESC_KEY_DOWN = 'esc-key-down';
const CTRL_KEY_DOWN = 'ctrl-key-down';
const CTRL_KEY_UP = 'ctrl-key-up';
const REFERENCE_REMOVE = 'reference-remove';
const REFERENCE_CHANGE_KIND = 'reference-change-kind';
const REFERENCE_CHANGE_ANNOTATION = 'reference-change-annotation';
const CANDIDATES_SET = 'candidate-set';
const SELECT_ADD = 'select-add';

function reducer(state, action) {
  switch(action.type) {
  case ESC_KEY_DOWN: return {
    ...state,
    candidates: []
  };
  case CTRL_KEY_DOWN: {
    const e = action.data;

    const newState = {
      ...state,
      showKeyboardShortcuts: true
    };

    if (e.keyCode >= 49 && e.keyCode <= 57) {
      // Ctrl + digit
      const digit = e.keyCode - 48;

      if (digit - 1 < newState.currentlyChosen.length) {
        // delete from currently chosen
        newState.currentlyChosen = newState.currentlyChosen.filter((cv, i) => i !== digit - 1);
      } else {
        const indexToAdd = digit - newState.currentlyChosen.length - 1;

        if (newState.candidates.length > indexToAdd) {
          newState.canSave = true;
          newState.currentlyChosen = newState.currentlyChosen.concat([newState.candidates[indexToAdd]]);
        }
      }
    }

    return newState;
  }
  case CTRL_KEY_UP: return {
    ...state,
    showKeyboardShortcuts: false
  };
  case REFERENCE_REMOVE: return {
    ...state,
    canSave: true,
    currentlyChosen: state.currentlyChosen.filter(cv => { return cv.name !== action.data;})
  }
  case REFERENCE_CHANGE_KIND: return {
      ...state,
      canSave: true,
      currentlyChosen: state.currentlyChosen.map(cv => {
        if (cv.id === action.data.reference.id) {
          cv.kind = action.data.newKind;
        }
        return cv;
      })
  }
  case REFERENCE_CHANGE_ANNOTATION: return {
    ...state,
    canSave: true,
    currentlyChosen: state.currentlyChosen.map(cv => {
      if (cv.id === action.data.reference.id) {
        cv.annotation = action.data.annotation;
      }
      return cv;
    })
  };
  case SELECT_ADD: return {
    ...state,
    canSave: true,
    currentlyChosen: state.currentlyChosen.concat([action.data])
  }
  case CANDIDATES_SET: return {
    ...state,
    candidates: action.data
  }
  default: throw new Error(`unknown action: ${action}`);
  }

}

export default function CivilSelect({ parentDeckId, chosen, available, onChange, onCancelAddDecks, onCommitAddDecks }) {
  const [local, localDispatch] = useLocalReducer(reducer, {
    currentlyChosen: chosen || [],
    showKeyboardShortcuts: false,
    candidates: [],
    canSave: false
  });

  const onKeyDown = e => {
    if (e.key === "Escape") {
      localDispatch(ESC_KEY_DOWN);
    }
    if (e.ctrlKey) {
      localDispatch(CTRL_KEY_DOWN, e);
      if (e.key === "Enter") {
        // Ctrl+Enter == save
        onCommitAddDecks();
      }
    }
  };

  const onKeyUp = e => {
    if (e.key === "Control") {
      localDispatch(CTRL_KEY_UP);
    }
  };

  useEffect(() => {
    // no 'kind' value is populated if the the default is used, so we have to manually add it
    // (fuck the web, the entire thing needs to be burnt to the ground)
    //
    let cv = local.currentlyChosen.map(c => {
      if (!c.kind) {
        c.kind = "Ref";
      }
      return c;
    });

    onChange(cv); // <- this is how changes to the selection are passed up to the parent note
  }, [local]);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [])

  function buildSelectedReference(value, i) {
    return html`<${SelectedReference}
                  reference=${value}
                  onRemove=${ (e) => localDispatch(REFERENCE_REMOVE, e.name) }
                  onChangeKind=${ (reference, newKind) => localDispatch(REFERENCE_CHANGE_KIND, { reference, newKind })}
                  onChangeAnnotation=${ (reference, annotation) => localDispatch(REFERENCE_CHANGE_ANNOTATION, { reference, annotation})}
                  keyIndex=${ i + 1 }
                  showKeyboardShortcuts=${ local.showKeyboardShortcuts } />`;
  }

  return html`<div class='civsel-main-box'>
                ${ local.currentlyChosen.map((value, i) => buildSelectedReference(value, i)) }
                <${Input} available=${ available }
                          parentDeckId=${ parentDeckId }
                          candidates=${ local.candidates }
                          setCandidates=${ (candidates) => localDispatch(CANDIDATES_SET, candidates) }
                          onAdd=${ (candidate) => localDispatch(SELECT_ADD, candidate) }
                          currentlyChosen=${ local.currentlyChosen }
                          showKeyboardShortcuts=${ local.showKeyboardShortcuts }/>
               <button onClick=${ onCancelAddDecks }>Cancel</button>
               <button onClick=${ onCommitAddDecks } disabled=${ !local.canSave }>${ local.showKeyboardShortcuts && html`Ctrl-Enter`} Save Changes</button>
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
