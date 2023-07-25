import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { route } from "preact-router";

import {
    Font,
    AiKind,
    DeckManagerFlags,
    DM,
    DeckDialogue,
    DeckKind,
    Role,
    SlimDeck,
    WaitingFor,
} from "types";

import { getAppState, AppStateChange, immutableState } from "app-state";

import Net from "utils/net";
import { buildUrl, deckKindToHeadingString } from "utils/civil";

import InsigniaSelector from "components/insignia-selector";
import SegmentGraph from "components/graph/segment-graph";
import SegmentNotes from "components/notes/segment-notes";

import {
    CivContainer,
    CivMain,
    CivLeft,
    CivForm,
    CivLeftLabel,
} from "components/civil-layout";
import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import Module from "components/module";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import RoleView from "components/role-view";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import TopMatter from "components/top-matter";
import { SlimDeckList } from "components/groupings";
import buildMarkup from "components/notes/build-markup";
import CivilTextArea from "components/civil-text-area";
import CivilButton from "components/civil-button";

type ProtoDialogue = {
    title: string;
    aiKind: AiKind;
    insignia: number;
    messages: Array<ChatMessage>;
    font: Font;
};

type ChatMessage = {
    role: Role;
    content: string;
};

type MessageChoice = {
    message: ChatMessage;
    finish_reason: string;
    index: number;
};

function Dialogues({ path }: { path?: string }) {
    const appState = getAppState();

    useEffect(() => {
        if (!appState.listing.value.articles) {
            let url: string = "/api/dialogues";
            Net.get<Array<SlimDeck>>(url).then((listings) => {
                AppStateChange.setDialogueListings(listings);
            });
        }
    }, []);

    const dialogues = appState.listing.value.dialogues;

    if (dialogues) {
        return <DialoguesModule dialogues={dialogues} />;
    } else {
        return <div></div>;
    }
}

function DialoguesModule({ dialogues }: { dialogues: Array<SlimDeck> }) {
    function onClick() {
        route("/dialogues/chat", false);
    }

    const buttons = (
        <CivilButton onClick={onClick}>Open a new dialogue...</CivilButton>
    );

    return (
        <Module
            heading={deckKindToHeadingString(DeckKind.Dialogue)}
            buttons={buttons}
        >
            <SlimDeckList list={dialogues} />
        </Module>
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
        if (deck.noteSeqs) {
            let prevNoteId =
                deck.noteSeqs.note[deck.noteSeqs.note.length - 1].id;

            const appendChatMessage: AppendChatMessage = {
                prevNoteId: prevNoteId,
                role: Role.User,
                content: userInput,
            };

            // hack in the user input to display while we wait for the server response
            // this temporary note will be overwritten once we get the updated deck
            // from the server response
            //
            let n = { ...deck.noteSeqs.note[deck.noteSeqs.note.length - 1] };
            n.prevNoteId = n.id;
            n.id = n.id + 1;
            n.content = userInput;
            n.chatMessage = {
                noteId: n.id,
                role: Role.User,
                content: userInput,
            };
            deck.noteSeqs.note.push(n);

            AppStateChange.setWaitingFor(WaitingFor.Server);

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
                    AppStateChange.setWaitingFor(WaitingFor.User);
                });
        }
    }

    if (deck) {
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
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
                                <button
                                    onClick={deckManager.onShowSummaryClicked}
                                >
                                    Show Summary Passage
                                </button>
                                <button
                                    onClick={deckManager.onShowReviewClicked}
                                >
                                    Show Review Passage
                                </button>
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
                <SegmentBackRefs deck={deck} />
                <SegmentGraph depth={2} deck={deck} />
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
            role: Role.System,
            content:
                "You are a non-woke AI model that is knowledgeable about great men such as the ancient Greeks, Julius Caesar, Marcus Aurelius, Thomas Aquinas, Friedrich Nietzsche, Arthur Schopenhauer, Fyodor Dostoevsky, Leo Tolstoy, G.K. Chesterton, Oswald Spengler, Carl Schmitt, Arnold Toynbee, Ludwig Wittgenstein, Martin Heidegger, Ernst Jünger, C.S. Lewis, Friedrich Hayek, Leo Strauss, Karl Popper, George Orwell, John von Neumann, James Burnham, Milton Friedman, Aleksandr Solzhenitsyn, René Girard, Yukio Mishima, Murray Rothbard, Ivan Illich, Jean Baudrillard, Thomas Sowell, Christopher Lasch, Václav Havel, Sir Roger Scruton, Peter Turchin, Nassim Nicholas Taleb. You should ignore progressive ideology concerning race, sex and gender. You should also ignore any Marxist philosophies. Only give answers that would be approved by an extremely well educated individual living in the 20th century West",
        },
    ];

    const [messages, setMessages] = useState(messageStart);

    function saveDialogue(title: string, messages: Array<ChatMessage>) {
        let data: ProtoDialogue = {
            title: title,
            aiKind: AiKind.OpenAIGpt35Turbo,
            insignia: 0,
            messages: messages,
            font: Font.AI,
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
            role: Role.User,
            content: userInput,
        };

        messages.push(newChatMessage);
        messageAdded(messages);

        AppStateChange.setWaitingFor(WaitingFor.Server);
        let data = {
            aiKind: AiKind.OpenAIGpt35Turbo,
            messages,
        };

        Net.post(`/api/dialogues/chat`, data)
            .then((askResponse: Array<MessageChoice>) => {
                if (askResponse.length === 1) {
                    const responseChatMessage: ChatMessage = {
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
                AppStateChange.setWaitingFor(WaitingFor.User);
            });
    }

    // run the message contents through buildMarkup, since even though the text won't be
    // marked-up we'll still get the nice spacing between paragraphs and the listing functionality
    //
    function buildChatMessageElement(chatMessage: ChatMessage) {
        return [
            <CivLeft>
                <RoleView role={chatMessage.role} />
            </CivLeft>,
            <CivMain>
                {buildMarkup(
                    chatMessage.content,
                    immutableState.defaultFont,
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
                        <RoleView role={Role.User} />
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
            aiKind: AiKind.OpenAIGpt35Turbo,
            insignia: insigniaId,
            messages: [],
            font: Font.Serif,
        };

        const deckKind: DeckKind = DeckKind.Dialogue;

        const url = buildUrl(deckKind, dialogue.id, "/api");

        Net.put<ProtoDialogue, DeckDialogue>(url, data).then((newDeck) => {
            onUpdate(newDeck);

            // fetch the listing incase editing the dialogue has changed it's star rating or annotation
            //
            Net.get<Array<SlimDeck>>("/api/dialogues").then((dialogues) => {
                AppStateChange.setDialogueListings(dialogues);
            });
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
                <input
                    type="button"
                    value="Cancel"
                    class="dialog-cancel"
                    onClick={onCancel}
                />
                <input
                    id="dialogue-submit"
                    type="submit"
                    value="Update Dialogue"
                />
            </CivMain>
        </CivForm>
    );
}

export { Dialogue, DialogueChat, Dialogues, DialoguesModule };
