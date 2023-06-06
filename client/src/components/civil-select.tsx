import { h } from "preact";
import { useEffect } from "preact/hooks";

import {
    DeckKind,
    Key,
    Ref,
    RefKind,
    RefsModified,
    SlimDeck,
    ToolbarMode,
} from "types";

import {
    deckKindToResourceString,
    indexToShortcut,
    sortByResourceThenName,
} from "utils/civil";
import Net from "utils/net";
import { AppStateChange, getAppState } from "app-state";

import { svgCloseShifted } from "components/svg-icons";
import { renderInsignia } from "components/insignias/renderer";
import CivilInput from "components/civil-input";
import useLocalReducer from "components/use-local-reducer";
import { CivRight } from "components/civil-layout";

enum ActionType {
    CandidatesSet,
    CtrlKeyDown,
    EscKeyDown,
    InputGiven,
    ReferenceChangeAnnotation,
    ReferenceChangeKind,
    ReferenceRemove,
    SelectAdd,
    SelectCreate,
    ShortcutCheck,
}

type ActionDataReferenceChangeKind = {
    reference: Ref;
    newKind: RefKind;
};

type ActionDataReferenceChangeAnnotation = {
    reference: Ref;
    annotation: string;
};

type Action = {
    type: ActionType;
    data?:
        | string
        | number
        | Ref
        | SlimDeck
        | ActionDataReferenceChangeKind
        | ActionDataReferenceChangeAnnotation;
};

type State = {
    currentSelection: Array<Ref>;
    referencesUnchanged: Array<Ref>;
    referencesChanged: Array<Ref>;
    referencesRemoved: Array<Ref>;
    referencesAdded: Array<Ref>;
    referencesCreated: Array<Ref>;
    text: string;
    showKeyboardShortcuts: boolean;
    candidates: Array<SlimDeck>;
    canSave: boolean;
    justAddedViaShortcut: boolean;
};

function candidateToAddedRef(candidate: SlimDeck): Ref {
    return {
        id: candidate.id,
        title: candidate.title,
        deckKind: candidate.deckKind,
        refKind: RefKind.Ref,
        noteId: 0, // this noteId isn't used when adding a ref
        insignia: candidate.insignia,
    };
}

function rebuildCurrentSelection(state: State): State {
    state.currentSelection = state.referencesUnchanged.concat(
        state.referencesChanged,
        state.referencesAdded,
        state.referencesCreated
    );
    state.currentSelection.sort(sortByResourceThenName);
    return state;
}

function reducer(state: State, action: Action) {
    switch (action.type) {
        case ActionType.EscKeyDown:
            return {
                ...state,
                candidates: [],
            };
        case ActionType.CtrlKeyDown: {
            const newState = { ...state };

            if (!state.showKeyboardShortcuts && state.candidates.length) {
                newState.showKeyboardShortcuts = true;
            } else {
                newState.showKeyboardShortcuts = false;
            }

            return newState;
        }
        case ActionType.ShortcutCheck: {
            const index = action.data as number;
            if (
                state.showKeyboardShortcuts &&
                state.candidates.length > index
            ) {
                const newState = reducer(state, {
                    type: ActionType.SelectAdd,
                    data: state.candidates[index],
                });

                newState.justAddedViaShortcut = true; // ActionType.InputGiven will not display this shortcut key
                newState.showKeyboardShortcuts = false;

                return newState;
            } else {
                return state;
            }
        }
        case ActionType.ReferenceRemove: {
            let newState = { ...state };
            let refToRemove = action.data as Ref;

            if (
                state.referencesUnchanged.find((r) => r.id === refToRemove.id)
            ) {
                // remove from the referencesUnchanged and add into referencesRemoved
                newState.referencesUnchanged =
                    newState.referencesUnchanged.filter((r) => {
                        return r.id !== refToRemove.id;
                    });
                newState.referencesRemoved.push(refToRemove);
            } else if (
                state.referencesChanged.find((r) => r.id === refToRemove.id)
            ) {
                // remove from the referencesChanged and add into referencesRemoved
                newState.referencesChanged = newState.referencesChanged.filter(
                    (r) => {
                        return r.id !== refToRemove.id;
                    }
                );
                newState.referencesRemoved.push(refToRemove);
            } else if (
                state.referencesAdded.find((r) => r.id === refToRemove.id)
            ) {
                newState.referencesAdded = newState.referencesAdded.filter(
                    (r) => {
                        return r.id !== refToRemove.id;
                    }
                );
            } else if (
                state.referencesCreated.find((r) => r.id === refToRemove.id)
            ) {
                newState.referencesCreated = newState.referencesCreated.filter(
                    (r) => {
                        return r.id !== refToRemove.id;
                    }
                );
            }

            newState.canSave = true;

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.ReferenceChangeKind: {
            let newState = { ...state };

            let data = action.data as ActionDataReferenceChangeKind;
            let refToChangeKind = data.reference;

            let found = state.referencesUnchanged.find(
                (r) => r.id === refToChangeKind.id
            );
            if (found) {
                // move from unchanged to changed
                newState.referencesUnchanged = state.referencesUnchanged.filter(
                    (r) => r.id !== found!.id
                );
                newState.referencesChanged.push(found);
            }
            if (!found) {
                found = state.referencesChanged.find(
                    (r) => r.id === refToChangeKind.id
                );
            }
            if (!found) {
                found = state.referencesAdded.find(
                    (r) => r.id === refToChangeKind.id
                );
            }
            if (!found) {
                found = state.referencesCreated.find(
                    (r) => r.id === refToChangeKind.id
                );
            }

            if (found) {
                found.refKind = data.newKind;
            }

            newState.canSave = true;

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.ReferenceChangeAnnotation: {
            let newState = { ...state };

            let data = action.data as ActionDataReferenceChangeAnnotation;
            let refToChangeAnnotation = data.reference;

            let found = state.referencesUnchanged.find(
                (r) => r.id === refToChangeAnnotation.id
            );
            if (found) {
                // move from unchanged to changed
                newState.referencesUnchanged = state.referencesUnchanged.filter(
                    (r) => r.id !== found!.id
                );
                newState.referencesChanged.push(found);
            }
            if (!found) {
                found = state.referencesChanged.find(
                    (r) => r.id === refToChangeAnnotation.id
                );
            }
            if (!found) {
                found = state.referencesAdded.find(
                    (r) => r.id === refToChangeAnnotation.id
                );
            }
            if (!found) {
                found = state.referencesCreated.find(
                    (r) => r.id === refToChangeAnnotation.id
                );
            }

            if (found) {
                found.annotation = data.annotation;
            }

            newState.canSave = true;

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.SelectAdd: {
            let newState = { ...state };

            let data = action.data as SlimDeck;

            let refToAdd = candidateToAddedRef(data);

            newState.referencesAdded.push(refToAdd);

            newState.canSave = true;
            newState.text = "";
            newState.candidates = [];

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.SelectCreate: {
            let newState = { ...state };

            let refToCreate = action.data as Ref;

            newState.referencesCreated.push(refToCreate);

            newState.canSave = true;
            newState.text = "";

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.CandidatesSet:
            return {
                ...state,
                candidates: action.data,
            };
        case ActionType.InputGiven: {
            const newState = {
                ...state,
                text: action.data as string,
            };

            if (newState.justAddedViaShortcut) {
                newState.text = "";
                newState.justAddedViaShortcut = false;
            }

            return newState;
        }
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

export default function CivilSelect({
    extraClasses,
    parentDeckId,
    noteId,
    chosen,
    onSave,
    onCancel,
}: {
    extraClasses?: string;
    parentDeckId: Key;
    noteId: Key;
    chosen: Array<Ref>;
    onSave: (changes: RefsModified, allDecksForNote: Array<Ref>) => void;
    onCancel: () => void;
}) {
    const s: State = {
        currentSelection: [], // built by rebuildCurrentSelection

        // make copies of each of the chosen, otherwise cancelling after making edits still shows up on the parent Note
        // (this is because [...chosen] doesn't deep copy the elements of the array)
        referencesUnchanged: (chosen || []).map((ref) =>
            Object.assign({}, ref)
        ),
        referencesChanged: [],
        referencesRemoved: [],
        referencesAdded: [],
        referencesCreated: [],

        text: "",

        showKeyboardShortcuts: false,
        candidates: [],
        canSave: false,

        justAddedViaShortcut: false,
    };
    const [local, localDispatch] = useLocalReducer(
        reducer,
        rebuildCurrentSelection(s)
    );

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            localDispatch(ActionType.EscKeyDown);
        }
        if (e.ctrlKey) {
            localDispatch(ActionType.CtrlKeyDown, e);
        }
        if (
            (e.keyCode >= 49 && e.keyCode <= 57) ||
            (e.keyCode >= 65 && e.keyCode <= 90)
        ) {
            // digit: 1 -> 0, 2 -> 1, ... 9 -> 8       letter: a -> 9, b -> 10, ... z -> 34
            const index =
                e.keyCode >= 49 && e.keyCode <= 57
                    ? e.keyCode - 49
                    : e.keyCode - 65 + 9;
            localDispatch(ActionType.ShortcutCheck, index);
        }
    };

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    function onFinish(changes: RefsModified) {
        type ProtoNoteReferences = RefsModified & {
            noteId: Key;
        };

        type ReferencesApplied = {
            refs: Array<Ref>;
            recents: Array<SlimDeck>;
        };

        let changeData: ProtoNoteReferences = {
            noteId: noteId,
            referencesChanged: changes.referencesChanged,
            referencesRemoved: changes.referencesRemoved,
            referencesAdded: changes.referencesAdded,
            referencesCreated: changes.referencesCreated,
        };

        Net.post<ProtoNoteReferences, ReferencesApplied>(
            "/api/edges/notes_decks",
            changeData
        ).then((response) => {
            AppStateChange.setRecentlyUsedDecks(response.recents);
            onSave(changes, response.refs);
        });
    }

    function onTextChanged(newText: string) {
        refineCandidates(newText);
        localDispatch(ActionType.InputGiven, newText);
    }

    function alreadySelected(title: string) {
        return local.currentSelection.some((cv) => {
            return cv.title === title;
        });
    }

    async function refineCandidates(newText: string) {
        if (!local.justAddedViaShortcut && newText.length > 0) {
            const url = `/api/cmd/namesearch?q=${encodeURI(newText)}`;

            type Response = {
                results: Array<SlimDeck>;
            };

            const searchResponse = await Net.get<Response>(url);
            if (searchResponse.results) {
                const newCandidates = searchResponse.results
                    .filter((op) => {
                        return (
                            op.id !== parentDeckId && !alreadySelected(op.title)
                        );
                    })
                    .sort((a, b) => {
                        return a.title.length - b.title.length;
                    });
                localDispatch(ActionType.CandidatesSet, newCandidates);
            }
        } else {
            localDispatch(ActionType.CandidatesSet, []);
        }
    }

    function onLocalCancel() {
        AppStateChange.toolbarMode(ToolbarMode.View);
        onCancel();
    }

    function onLocalCommit() {
        AppStateChange.toolbarMode(ToolbarMode.View);
        const refsModified: RefsModified = {
            referencesChanged: local.referencesChanged,
            referencesRemoved: local.referencesRemoved,
            referencesAdded: local.referencesAdded,
            referencesCreated: local.referencesCreated,
        };
        onFinish(refsModified);
    }

    let topLevelClasses = "block-width";
    if (extraClasses) {
        topLevelClasses += " " + extraClasses;
    }

    return (
        <div class={topLevelClasses}>
            <label>Connections:</label>
            <RecentDecks
                localState={local}
                onAdd={(recentDeck) =>
                    localDispatch(ActionType.SelectAdd, recentDeck)
                }
            />
            <div class="civsel-main-box">
                {local.currentSelection.map((value, i) => (
                    <SelectedReference
                        reference={value}
                        onRemove={(e) =>
                            localDispatch(ActionType.ReferenceRemove, e)
                        }
                        onChangeKind={(reference: Ref, newKind: RefKind) =>
                            localDispatch(ActionType.ReferenceChangeKind, {
                                reference,
                                newKind,
                            })
                        }
                        onChangeAnnotation={(
                            reference: Ref,
                            annotation: string
                        ) =>
                            localDispatch(
                                ActionType.ReferenceChangeAnnotation,
                                {
                                    reference,
                                    annotation,
                                }
                            )
                        }
                    />
                ))}
                <Input
                    text={local.text}
                    onTextChanged={onTextChanged}
                    candidates={local.candidates}
                    onAdd={(existingDeck) => {
                        localDispatch(ActionType.SelectAdd, existingDeck);
                    }}
                    onCreate={(newDeckInfo) => {
                        localDispatch(ActionType.SelectCreate, newDeckInfo);
                    }}
                    showKeyboardShortcuts={local.showKeyboardShortcuts}
                />
                <button onClick={onLocalCancel}>Cancel</button>
                <button onClick={onLocalCommit} disabled={!local.canSave}>
                    {local.showKeyboardShortcuts && `Ctrl-Enter`} Save Changes
                </button>
            </div>
        </div>
    );
}

function RecentDecks({
    localState,
    onAdd,
}: {
    localState: State;
    onAdd: (deck?: SlimDeck) => void;
}) {
    const appState = getAppState();

    function alreadyAdded(sd: SlimDeck): boolean {
        // have to check title rather than id in case one of the added decks
        // has been newly created (it won't have an id)
        //
        return localState.currentSelection.some((x) => x.title === sd.title);
    }

    function buildRecent(slimDeck: SlimDeck) {
        const dk: string = deckKindToResourceString(slimDeck.deckKind);
        let klass = `civsel-recent-deck pigment-fg-${dk}`;

        return (
            <div class={klass} onClick={() => onAdd(slimDeck)}>
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </div>
        );
    }

    const recent = appState.recentlyUsedDecks.value
        .filter((rd) => !alreadyAdded(rd))
        .map(buildRecent);

    return (
        <CivRight extraClasses="civsel-recent-decks">
            {!!recent.length && <div>Recently Used Refs:</div>}
            {recent}
        </CivRight>
    );
}

type SelectedReferenceProps = {
    reference: Ref;
    onRemove: (r: Ref) => void;
    onChangeKind: (r: Ref, rk: RefKind) => void;
    onChangeAnnotation: (r: Ref, s: string) => void;
};

function stringToRefKind(s: string): RefKind | undefined {
    if (s === "Ref") {
        return RefKind.Ref;
    }
    if (s === "RefToParent") {
        return RefKind.RefToParent;
    }
    if (s === "RefToChild") {
        return RefKind.RefToChild;
    }
    if (s === "RefInContrast") {
        return RefKind.RefInContrast;
    }
    if (s === "RefCritical") {
        return RefKind.RefCritical;
    }
    return undefined;
}

function SelectedReference({
    reference,
    onRemove,
    onChangeKind,
    onChangeAnnotation,
}: SelectedReferenceProps) {
    function onClick(e: Event) {
        e.preventDefault();
        onRemove(reference);
    }

    function onKindDropDownSelect(e: Event) {
        if (e.target instanceof HTMLSelectElement) {
            let refkind: RefKind | undefined = stringToRefKind(e.target.value);
            if (refkind) {
                onChangeKind(reference, refkind);
            } else {
                console.error(`invalid refkind string: ${refkind} ???`);
            }
        }
    }

    function handleContentChange(content: string) {
        onChangeAnnotation(reference, content);
    }

    let topclass = `civsel-reference pigment-${deckKindToResourceString(
        reference.deckKind
    )}`;
    return (
        <div class={topclass}>
            <span class="civsel-delete-selected" onClick={onClick}>
                {svgCloseShifted()}
            </span>
            <select onChange={onKindDropDownSelect} name="choice">
                <option value="Ref" selected={reference.refKind == RefKind.Ref}>
                    Generic Reference
                </option>
                <option
                    value="RefToParent"
                    selected={reference.refKind == RefKind.RefToParent}
                >
                    Reference to Parent
                </option>
                <option
                    value="RefToChild"
                    selected={reference.refKind == RefKind.RefToChild}
                >
                    Reference to Child
                </option>
                <option
                    value="RefInContrast"
                    selected={reference.refKind == RefKind.RefInContrast}
                >
                    Contrasting Reference
                </option>
                <option
                    value="RefCritical"
                    selected={reference.refKind == RefKind.RefCritical}
                >
                    Critical Reference
                </option>
            </select>
            <span class="civsel-name">{reference.title}</span>
            <CivilInput
                elementClass="civsel-annotation"
                id="annotation"
                value={reference.annotation}
                onContentChange={handleContentChange}
            />
        </div>
    );
}

type InputProps = {
    text: string;
    onTextChanged: (s: string) => void;
    onAdd: (c: SlimDeck) => void;
    onCreate: (r: Ref) => void;
    candidates: Array<SlimDeck>;
    showKeyboardShortcuts: boolean;
};

function Input({
    text,
    onTextChanged,
    onAdd,
    onCreate,
    candidates,
    showKeyboardShortcuts,
}: InputProps) {
    function onSubmit(e: Event) {
        e.preventDefault();
        if (text.length > 0) {
            // treat this text as a new idea that needs to be created
            let r: Ref = {
                noteId: 0,
                id: 0,
                title: text,
                deckKind: DeckKind.Idea,
                refKind: RefKind.Ref,
                insignia: 0,
            };
            onCreate(r);
        }
    }

    let cl = candidates.map((c, i) => {
        return (
            <CandidateItem
                candidate={c}
                onSelectedCandidate={onAdd}
                showKeyboardShortcuts={showKeyboardShortcuts}
                keyIndex={i}
            />
        );
    });

    return (
        <form class="civsel-form" onSubmit={onSubmit}>
            <CivilInput
                value={text}
                focus
                autoComplete="off"
                onContentChange={onTextChanged}
            />
            <div class="civsel-candidates">{cl}</div>
        </form>
    );
}

type CandidateItemProps = {
    candidate: SlimDeck;
    onSelectedCandidate: (c: SlimDeck) => void;
    showKeyboardShortcuts: boolean;
    keyIndex: number;
};

function CandidateItem({
    candidate,
    onSelectedCandidate,
    showKeyboardShortcuts,
    keyIndex,
}: CandidateItemProps) {
    function selectedThisCandidate(e: Event) {
        onSelectedCandidate(candidate);
        e.preventDefault();
    }

    const maxShortcuts = 9 + 26; // 1..9 and a..z

    const canShowKeyboardShortcut =
        showKeyboardShortcuts && keyIndex < maxShortcuts;

    const topclass = `civsel-candidate pigment-${deckKindToResourceString(
        candidate.deckKind
    )}`;
    return (
        <div class={topclass} onClick={selectedThisCandidate}>
            {canShowKeyboardShortcut && (
                <span class="keyboard-shortcut">
                    {indexToShortcut(keyIndex)}:{" "}
                </span>
            )}
            {candidate.title}
        </div>
    );
}
