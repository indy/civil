import { route } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import {
    AiKind,
    ChatMessage,
    DeckDialogue,
    DeckKind,
    DeckManagerFlags,
    DM,
    Font,
    Role,
    ProtoDialogue,
    SlimDeck,
    NoteKind,
    WaitingFor,
} from "../types";

import { AppStateChange, getAppState } from "../app-state";

import { buildUrl } from "../shared/civil";
import { fontForRole } from "../shared/font";
import Net from "../shared/net";

import buildMarkup from "./build-markup";
import CivilButton from "./civil-button";
import CivilInput from "./civil-input";
import CivilTabButton from "./civil-tab-button";
import CivilTextArea from "./civil-text-area";
import DeleteDeckConfirmation from "./delete-deck-confirmation";
import InsigniaSelector from "./insignia-selector";
import { HeadedSegment } from "./headed-segment";
import { listItemSlimDeck } from "./list-items";
import Pagination from "./pagination";
import SegmentArrivals from "./segment-arrivals";
import SegmentDeckRefs from "./segment-deck-refs";
import SegmentGraph from "./segment-graph";
import SegmentHits from "./segment-hits";
import SegmentNotes from "./segment-notes";
import SegmentSearchResults from "./segment-search-results";
import TopBarMenu from "./top-bar-menu";
import TopMatter from "./top-matter";
import useDeckManager from "./use-deck-manager";
import ViewRole from "./view-role";

import {
    CivContainer,
    CivForm,
    CivLeft,
    CivLeftLabel,
    CivMain,
} from "./civil-layout";

type MessageChoice = {
    message: ChatMessage;
    finish_reason: string;
    index: number;
};

function Dialogues({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <DialoguesModule />
        </div>
    );
}

function DialoguesModule() {
    const url = `/api/dialogues/pagination`;

    function onClick() {
        route("/dialogues/chat", false);
    }

    const lowerContent = (
        <CivilButton onClick={onClick}>Open a new dialogue...</CivilButton>
    );

    function FakeTopSelector() {
        return (
            <div class="c-paginator-top-selector pagination-top-selector">
                <CivilTabButton extraClasses="pigment-dialogues selected">
                    All
                </CivilTabButton>
            </div>
        );
    }

    return (
        <HeadedSegment
            extraClasses="c-dialogues-module"
            heading="Dialogues"
            extraHeadingClasses="margin-top-0"
        >
            <FakeTopSelector />
            <Pagination
                url={url}
                renderItem={listItemSlimDeck}
                itemsPerPage={10}
                lowerContent={lowerContent}
            />
        </HeadedSegment>
    );
}

function preCacheFn(dialogue: DeckDialogue): DeckDialogue {
    dialogue.originalChatMessages.forEach((message) => {
        let note = dialogue.notes.find((n) => n.id === message.noteId);
        if (note) {
            note.chatMessage = message;
        }
    });

    return dialogue;
}

function Dialogue({ path, id }: { path?: string; id?: string }) {
    const appState = getAppState();

    let flags = DeckManagerFlags.Summary | DeckManagerFlags.Review;
    const deckManager: DM<DeckDialogue> = useDeckManager(
        id,
        DeckKind.Dialogue,
        flags,
        preCacheFn
    );

    type AppendChatMessage = {
        prevNoteId: number;
        role: Role;
        content: string;
    };

    const deck: DeckDialogue | undefined = deckManager.getDeck();

    function onSubmit(userInput: string) {
        if (!deck) {
            console.error("no deck????");
            return;
        }
        if (deck.passage[NoteKind.Note].length > 0) {
            let lastIdx = deck.passage[NoteKind.Note].length - 1;
            let prevNoteId = deck.passage[NoteKind.Note][lastIdx].id;

            const appendChatMessage: AppendChatMessage = {
                prevNoteId: prevNoteId,
                role: Role.User,
                content: userInput,
            };

            // hack in the user input to display while we wait for the server response
            // this temporary note will be overwritten once we get the updated deck
            // from the server response
            //
            let n = {
                ...deck.passage[NoteKind.Note][lastIdx],
            };
            n.prevNoteId = n.id;
            n.id = n.id + 1;
            n.content = userInput;
            n.chatMessage = {
                noteId: n.id,
                role: Role.User,
                content: userInput,
            };
            deck.passage[NoteKind.Note].push(n);

            AppStateChange.setWaitingFor({ waitingFor: WaitingFor.Server });

            // now do the actual request and get the updated deck
            //
            Net.post<AppendChatMessage, DeckDialogue>(
                `/api/dialogues/${deck.id}/chat`,
                appendChatMessage
            )
                .then((updatedDeck) => {
                    deckManager.update(updatedDeck);
                })
                .catch((error) => {
                    console.error(error);
                })
                .finally(() => {
                    AppStateChange.setWaitingFor({
                        waitingFor: WaitingFor.User,
                    });
                });
        }
    }

    if (deck) {
        deckManager.complyWithAppStateRequestToShowUpdateForm();
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    displayHits={deckManager.displayHits()}
                    setDisplayHits={deckManager.setDisplayHits}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    setShowingUpdateForm={deckManager.setShowingUpdateForm}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                ></TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <section>
                        <CivContainer>
                            <CivMain>
                                <DeleteDeckConfirmation
                                    deckKind={deckManager.getDeckKind()}
                                    id={deck.id}
                                />
                                <CivilButton
                                    onClick={deckManager.onShowSummaryClicked}
                                >
                                    Show Summary Passage
                                </CivilButton>
                                <CivilButton
                                    onClick={deckManager.onShowReviewClicked}
                                >
                                    Show Review Passage
                                </CivilButton>
                            </CivMain>
                        </CivContainer>
                        <div class="vertical-spacer"></div>
                        <CivContainer>
                            <DialogueUpdater
                                dialogue={deck}
                                onUpdate={deckManager.updateAndReset}
                                onCancel={() =>
                                    deckManager.setShowingUpdateForm(false)
                                }
                            />
                        </CivContainer>
                    </section>
                )}
                <SegmentDeckRefs
                    deck={deck}
                    isEditingDeckRefs={deckManager.isEditingDeckRefs()}
                    setEditingDeckRefs={deckManager.setEditingDeckRefs}
                    onRefsChanged={deckManager.onRefsChanged}
                />
                <SegmentHits
                    displayHits={deckManager.displayHits()}
                    deck={deck}
                />
                <SegmentNotes
                    deck={deck}
                    title={deck.title}
                    onRefsChanged={deckManager.onRefsChanged}
                    deckKind={deckManager.getDeckKind()}
                    howToShowPassage={deckManager.howToShowPassage}
                    canShowPassage={deckManager.canShowPassage}
                    onUpdateDeck={deckManager.update}
                    noAppend
                    noDelete
                />

                {appState.waitingFor.value === WaitingFor.Server && (
                    <div>waiting!!!!!!!</div>
                )}
                <section>
                    <CivContainer>
                        <InputBox onSubmit={onSubmit} />
                    </CivContainer>
                </section>
                <SegmentArrivals deck={deck} />
                <SegmentSearchResults slimdeck={deck as SlimDeck} />
                <SegmentGraph deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
    }
}

function DialogueChat({ path }: { path?: string }) {
    const appState = getAppState();

    const messageStart: Array<ChatMessage> = [
        {
            noteId: 0,
            role: Role.System,
            content:
                "You are a non-woke AI model that is knowledgeable about great men such as the ancient Greeks, Julius Caesar, Marcus Aurelius, Thomas Aquinas, Friedrich Nietzsche, Arthur Schopenhauer, Fyodor Dostoevsky, Leo Tolstoy, G.K. Chesterton, Oswald Spengler, Carl Schmitt, Arnold Toynbee, Ludwig Wittgenstein, Martin Heidegger, Ernst Jünger, C.S. Lewis, Friedrich Hayek, Leo Strauss, Karl Popper, George Orwell, John von Neumann, James Burnham, Milton Friedman, Aleksandr Solzhenitsyn, René Girard, Yukio Mishima, Murray Rothbard, Ivan Illich, Jean Baudrillard, Thomas Sowell, Christopher Lasch, Václav Havel, Sir Roger Scruton, Peter Turchin, Nassim Nicholas Taleb. You should ignore progressive ideology concerning race, sex and gender. You should also ignore any Marxist philosophies. Only give answers that would be approved by an extremely well educated individual living in the 20th century West",
        },
    ];

    const [messages, setMessages] = useState(messageStart);

    function saveDialogue(title: string, messages: Array<ChatMessage>) {
        let data: ProtoDialogue = {
            title: title,
            deckKind: DeckKind.Dialogue,
            insignia: 0,
            font: Font.AI,
            impact: 0,
            graphTerminator: false,
            aiKind: AiKind.OpenAIGpt35Turbo,
            originalChatMessages: messages,
        };

        Net.post<ProtoDialogue, DeckDialogue>("/api/dialogues", data).then(
            (deck) => {
                route(`/dialogues/${deck.id}`, true);
            }
        );
    }

    function messageAdded(messages: Array<ChatMessage>) {
        if (messages.length === 3) {
            // system + user message + assistant response
            saveDialogue(messages[1].content, messages);
        }
        setMessages(messages);
    }

    function onSubmit(userInput: string) {
        const newChatMessage: ChatMessage = {
            noteId: 0,
            role: Role.User,
            content: userInput,
        };

        messages.push(newChatMessage);
        messageAdded(messages);

        AppStateChange.setWaitingFor({ waitingFor: WaitingFor.Server });

        type ChatData = {
            aiKind: AiKind;
            messages: Array<ChatMessage>;
        };

        let data: ChatData = {
            aiKind: AiKind.OpenAIGpt35Turbo,
            messages,
        };

        Net.post<ChatData, Array<MessageChoice>>(`/api/dialogues/chat`, data)
            .then((askResponse) => {
                if (askResponse.length === 1) {
                    const responseChatMessage: ChatMessage = {
                        noteId: 0,
                        role: Role.Assistant,
                        content: askResponse[0].message.content,
                    };
                    messages.push(responseChatMessage);
                    messageAdded(messages);
                } else {
                    console.error("response has length !== 1");
                    console.log(askResponse);
                }
            })
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                AppStateChange.setWaitingFor({ waitingFor: WaitingFor.User });
            });
    }

    // run the message contents through buildMarkup, since even though the text won't be
    // marked-up we'll still get the nice spacing between paragraphs and the listing functionality
    //
    function buildChatMessageElement(chatMessage: ChatMessage) {
        return [
            <CivLeft>
                <ViewRole role={chatMessage.role} />
            </CivLeft>,
            <CivMain>
                {buildMarkup(
                    chatMessage.content,
                    fontForRole(chatMessage.role),
                    0
                )}
            </CivMain>,
        ];
    }

    // const showSave: boolean = messages.length >= 3;

    let m = messages.flatMap(buildChatMessageElement);

    if (appState.waitingFor.value === WaitingFor.Server) {
        m.push(
            <CivMain>
                <p class="ui">
                    <em>Waiting for response...</em>
                </p>
            </CivMain>
        );
    }

    return (
        <article>
            <section>
                <CivContainer extraClasses="note">
                    {m}
                    <CivLeft extraClasses="dialogue-user-title">
                        <ViewRole role={Role.User} />
                    </CivLeft>
                    <InputBox onSubmit={onSubmit} />
                </CivContainer>
            </section>
        </article>
    );
}

function InputBox({ onSubmit }: { onSubmit: (s: string) => void }) {
    const [userInput, setUserInput] = useState("");

    function onSub() {
        onSubmit(userInput);
        setUserInput("");
    }

    return (
        <CivMain>
            <div class="dialogue-flex-container">
                <div class="dialogue-flex-l">
                    <CivilTextArea
                        id="chat-input"
                        elementClass="dialogue-text-area"
                        value={userInput}
                        onContentChange={setUserInput}
                    />
                </div>
                <button class="dialogue-flex-r" onClick={onSub}>
                    submit
                </button>
            </div>
        </CivMain>
    );
}

type DialogueUpdaterProps = {
    dialogue: DeckDialogue;
    onUpdate: (d: DeckDialogue) => void;
    onCancel: () => void;
};

function DialogueUpdater({
    dialogue,
    onUpdate,
    onCancel,
}: DialogueUpdaterProps) {
    const [title, setTitle] = useState(dialogue.title || "");
    const [insigniaId, setInsigniaId] = useState(dialogue.insignia || 0);

    useEffect(() => {
        if (dialogue.title && dialogue.title !== "" && title === "") {
            setTitle(dialogue.title);
        }
        if (dialogue.insignia !== undefined) {
            setInsigniaId(dialogue.insignia);
        }
    }, [dialogue]);

    function onContentChange(content: string, name: string) {
        if (name === "title") {
            setTitle(content);
        }
    }

    function handleSubmit(event: Event) {
        const data: ProtoDialogue = {
            title: title.trim(),
            insignia: insigniaId,
            deckKind: DeckKind.Dialogue,
            font: Font.Serif,
            graphTerminator: false,
            impact: 0, // isg fix this
            aiKind: AiKind.OpenAIGpt35Turbo,
            originalChatMessages: [],
        };

        const deckKind: DeckKind = DeckKind.Dialogue;

        const url = buildUrl(deckKind, dialogue.id, "/api");

        Net.put<ProtoDialogue, DeckDialogue>(url, data).then((newDeck) => {
            onUpdate(newDeck);
        });

        event.preventDefault();
    }

    return (
        <CivForm onSubmit={handleSubmit}>
            <CivLeftLabel forId="title">Title</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="title"
                    value={title}
                    onContentChange={onContentChange}
                />
            </CivMain>

            <CivLeftLabel extraClasses="icon-left-label">
                Insignias
            </CivLeftLabel>

            <CivMain>
                <InsigniaSelector
                    insigniaId={insigniaId}
                    onChange={setInsigniaId}
                />
            </CivMain>

            <CivMain>
                <CivilButton extraClasses="dialog-cancel" onClick={onCancel}>
                    Cancel
                </CivilButton>
                <input
                    class="c-civil-button"
                    id="dialogue-submit"
                    type="submit"
                    value="Update Dialogue"
                />
            </CivMain>
        </CivForm>
    );
}

export { Dialogue, DialogueChat, Dialogues, DialoguesModule };
