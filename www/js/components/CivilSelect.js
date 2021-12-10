import { html, useState, useEffect } from '/lib/preact/mod.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { svgCloseShifted } from '/js/svgIcons.js';

import { referencesSortFunction } from '/js/CivilUtils.js';

const ESC_KEY_DOWN = 'esc-key-down';
const CTRL_KEY_DOWN = 'ctrl-key-down';
const CTRL_KEY_UP = 'ctrl-key-up';
const REFERENCE_REMOVE = 'reference-remove';
const REFERENCE_CHANGE_KIND = 'reference-change-kind';
const REFERENCE_CHANGE_ANNOTATION = 'reference-change-annotation';
const CANDIDATES_SET = 'candidate-set';
const CURRENTLY_CHOSEN_RESET = 'currently-chosen-reset';
const SELECT_ADD = 'select-add';
const SELECT_CREATE = 'select-create';


function rebuildCurrentSelection(state) {
  state.currentSelection = state.referencesUnchanged.concat(state.referencesChanged).concat(state.referencesAdded).concat(state.referencesCreated);

  state.currentSelection.sort(referencesSortFunction);
  return state;
}

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

      if (digit - 1 < newState.currentSelection.length) {
        // delete from currently chosen
        newState.currentSelection = newState.currentSelection.filter((cv, i) => i !== digit - 1);
      } else {
        const indexToAdd = digit - newState.currentSelection.length - 1;

        if (newState.candidates.length > indexToAdd) {
          newState.canSave = true;
          newState.currentSelection = newState.currentSelection.concat([newState.candidates[indexToAdd]]);
        }
      }
    }

    return newState;
  }
  case CTRL_KEY_UP: return {
    ...state,
    showKeyboardShortcuts: false
  };
  case REFERENCE_REMOVE: {
    let newState = { ...state };

    let refToRemove = action.data;

    if (state.referencesUnchanged.find(r => r.id === refToRemove.id)) {
      // remove from the referencesUnchanged and add into referencesRemoved
      newState.referencesUnchanged = newState.referencesUnchanged.filter(r => { return r.id !== refToRemove.id; });
      newState.referencesRemoved.push(refToRemove);
    } else if (state.referencesChanged.find(r => r.id === refToRemove.id)) {
      // remove from the referencesChanged and add into referencesRemoved
      newState.referencesChanged = newState.referencesChanged.filter(r => { return r.id !== refToRemove.id; });
      newState.referencesRemoved.push(refToRemove);
    } else if (state.referencesAdded.find(r => r.id === refToRemove.id)) {
      newState.referencesAdded = newState.referencesAdded.filter(r => { return r.id !== refToRemove.id; });
    } else if (state.referencesCreated.find(r => r.id === refToRemove.id)) {
      newState.referencesCreated = newState.referencesCreated.filter(r => { return r.id !== refToRemove.id; });
    }

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case REFERENCE_CHANGE_KIND: {
    let newState = { ...state };

    let refToChangeKind = action.data.reference;

    let found = state.referencesUnchanged.find(r => r.id === refToChangeKind.id);
    if (found) {
      // move from unchanged to changed
      newState.referencesUnchanged = state.referencesUnchanged.filter(r => r.id !== found.id);
      newState.referencesChanged.push(found);
    }
    if (!found) {
      found = state.referencesChanged.find(r => r.id === refToChangeKind.id);
    }
    if (!found) {
      found = state.referencesAdded.find(r => r.id === refToChangeKind.id);
    }
    if (!found) {
      found = state.referencesCreated.find(r => r.id === refToChangeKind.id);
    }

    if (found) {
      found.ref_kind = action.data.newKind;
    }

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case REFERENCE_CHANGE_ANNOTATION: {
    let newState = { ...state };

    let refToChangeAnnotation = action.data.reference;

    let found = state.referencesUnchanged.find(r => r.id === refToChangeAnnotation.id);
    if (found) {
      // move from unchanged to changed
      newState.referencesUnchanged = state.referencesUnchanged.filter(r => r.id !== found.id);
      newState.referencesChanged.push(found);
    }
    if (!found) {
      found = state.referencesChanged.find(r => r.id === refToChangeAnnotation.id);
    }
    if (!found) {
      found = state.referencesAdded.find(r => r.id === refToChangeAnnotation.id);
    }
    if (!found) {
      found = state.referencesCreated.find(r => r.id === refToChangeAnnotation.id);
    }

    if (found) {
      found.annotation = action.data.annotation;
    }

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  };
  case SELECT_ADD: {
    let newState = { ...state };

    let refToAdd = action.data;

    newState.referencesAdded.push(refToAdd);

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case SELECT_CREATE: {
    let newState = { ...state };

    let refToCreate = action.data;

    newState.referencesCreated.push(refToCreate);

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case CANDIDATES_SET: return {
    ...state,
    candidates: action.data
  }
  // the annotations and ref kinds persist across notes, this explicitly clears them.
  case CURRENTLY_CHOSEN_RESET: {
    return state;
    // return {
    //   ...state,
    //   currentSelection: state.currentSelection.map(cv => {
    //     delete cv.annotation;
    //     cv.ref_kind = "Ref";
    //     return cv;
    //   })
    // }
  }
  default: throw new Error(`unknown action: ${action}`);
  }

}

export default function CivilSelect({ parentDeckId, chosen, available, onFinish }) {

  let s = {
    currentSelection: undefined, // built by rebuildCurrentSelection

    referencesUnchanged: chosen || [],
    referencesChanged: [],
    referencesRemoved: [],
    referencesAdded: [],
    referencesCreated: [],

    showKeyboardShortcuts: false,
    candidates: [],
    canSave: false
  };
  const [local, localDispatch] = useLocalReducer(reducer, rebuildCurrentSelection(s));

  const onKeyDown = e => {
    if (e.key === "Escape") {
      localDispatch(ESC_KEY_DOWN);
    }
    if (e.ctrlKey) {
      localDispatch(CTRL_KEY_DOWN, e);
      if (e.key === "Enter") {
        // Ctrl+Enter == save
        onFinish();
      }
    }
  };

  const onKeyUp = e => {
    if (e.key === "Control") {
      localDispatch(CTRL_KEY_UP);
    }
  };

  /*
  useEffect(() => {
    // no 'kind' value is populated if the default is used, so we have to manually add it
    // (fuck the web, the entire thing needs to be burnt to the ground)
    //
    let cv = local.currentSelection.map(c => {
      if (!c.ref_kind) {
        c.ref_kind = "Ref";
      }
      return c;
    });

    onChange(cv); // <- this is how changes to the selection are passed up to the parent note
  }, [local]);
  */

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
                  onRemove=${ (e) => localDispatch(REFERENCE_REMOVE, e) }
                  onChangeKind=${ (reference, newKind) => localDispatch(REFERENCE_CHANGE_KIND, { reference, newKind })}
                  onChangeAnnotation=${ (reference, annotation) => localDispatch(REFERENCE_CHANGE_ANNOTATION, { reference, annotation})}
                  keyIndex=${ i + 1 }
                  showKeyboardShortcuts=${ local.showKeyboardShortcuts } />`;
  }

  function onLocalCancel(e) {
    onFinish();
    localDispatch(CURRENTLY_CHOSEN_RESET);
  }

  function onLocalCommit(e) {
    onFinish({
      referencesUnchanged: local.referencesUnchanged,
      referencesChanged: local.referencesChanged,
      referencesRemoved: local.referencesRemoved,
      referencesAdded: local.referencesAdded,
      referencesCreated: local.referencesCreated
    });
    localDispatch(CURRENTLY_CHOSEN_RESET);
  }

  return html`<div class='civsel-main-box'>
                ${ local.currentSelection.map((value, i) => buildSelectedReference(value, i)) }
                <${Input} available=${ available }
                          parentDeckId=${ parentDeckId }
                          candidates=${ local.candidates }
                          setCandidates=${ (candidates) => localDispatch(CANDIDATES_SET, candidates) }
                          onAdd=${ (existingDeck) => localDispatch(SELECT_ADD, existingDeck) }
                          onCreate=${ (newDeckInfo) => localDispatch(SELECT_CREATE, newDeckInfo) }
                          currentSelection=${ local.currentSelection }
                          showKeyboardShortcuts=${ local.showKeyboardShortcuts }/>
               <button onClick=${ onLocalCancel }>Cancel</button>
               <button onClick=${ onLocalCommit } disabled=${ !local.canSave }>${ local.showKeyboardShortcuts && html`Ctrl-Enter`} Save Changes</button>
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

  return html`<div class='civsel-reference pigment-${reference.resource}'>
                ${ showKeyboardShortcuts && html`<span class='civsel-keyboard-shortcut'>Ctrl-${ keyIndex }</span>`}
                <span class='civsel-delete-selected' onClick=${onClick}>${svgCloseShifted()}</span>
                <select onChange=${onKindDropDownSelect} name="choice">
                  <option value="Ref" selected=${reference.ref_kind == "Ref"}>Generic Reference</option>
                  <option value="RefToParent" selected=${reference.ref_kind == "RefToParent"}>Reference to Parent</option>
                  <option value="RefToChild" selected=${reference.ref_kind == "RefToChild"}>Reference to Child</option>
                  <option value="RefInContrast" selected=${reference.ref_kind == "RefInContrast"}>Contrasting Reference</option>
                  <option value="RefCritical" selected=${reference.ref_kind == "RefCritical"}>Critical Reference</option>
                </select>
                <span class="civsel-name">${reference.name}</span>
                <input class="civsel-annotation"
                  type="text"
                  name="annotation"
                  value=${ reference.annotation }
                  onInput=${ handleChangeEvent } />
              </div>`;
}

function Input({ parentDeckId, available, onAdd, onCreate, candidates, setCandidates, currentSelection, showKeyboardShortcuts }) {
  let [text, setText] = useState('');

  useEffect(() => {
    if (text.length >= 2) {
      refineCandidates();
    } else {
      setCandidates([]);
    }
  }, [text]);

  function alreadySelected(comparisonName) {
    return currentSelection.some(cv => { return cv.name.toLowerCase() === comparisonName;});
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

  function candidateToRef(candidate) {
    return {
      id: candidate.id,
      name: candidate.name,
      resource: candidate.resource,
      annotation: null,
      ref_kind: "Ref"
    }
  }

  function onSubmit(e) {
    e.preventDefault();

    if (text.length > 0) {
      // search for text in available
      let lowerText = text.toLowerCase();
      let existingOption = available.find(option => { return option.comparisonName === lowerText;});
      if (existingOption) {
        // pre-existing deck
        onAdd(candidateToRef(existingOption));
      } else {
        // treat this text as a new idea that needs to be created
        onCreate({ name: text, resource: "ideas", ref_kind: "Ref", annotation: null });
      }
      setText('');
    }
  }

  function onSelectedCandidate(c) {
    onAdd(candidateToRef(c));
    setText('');
    setCandidates([]);
  }

  let cl = candidates.map((c, i) => {
    return html`<${CandidateItem} candidate=${c}
                                  onSelectedCandidate=${ onSelectedCandidate }
                                  showKeyboardShortcuts=${ showKeyboardShortcuts }
                                  keyIndex=${ currentSelection.length + 1 + i }
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

  return html`<div class="civsel-candidate pigment-${candidate.resource}" onClick=${selectedThisCandidate}>
                ${ canShowKeyboardShortcut && html`<span class='civsel-keyboard-shortcut'>Ctrl-${ keyIndex }</span>`}
                ${ candidate.name }
              </div>`;
}
