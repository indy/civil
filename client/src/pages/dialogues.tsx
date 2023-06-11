import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { route } from "preact-router";

import {
    DeckManagerFlags,
    DM,
    DeckDialogue,
    DeckKind,
    Role,
    SlimDeck,
} from "types";

import { getAppState, AppStateChange } from "app-state";

import InsigniaSelector from "components/insignias/selector";
import SegmentGraph from "components/graph/segment-graph";
import SegmentNotes from "components/notes/segment-notes";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import DeckListingPage from "components/deck-listing-page";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import RoleView from "components/role-view";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import TopMatter from "components/top-matter";
import { SlimDeckList } from "components/groupings";

import Net from "utils/net";
import { buildUrl } from "utils/civil";

import CivilTextArea from "components/civil-text-area";

const CHAT_GPT: string = "ChatGPT";

type ProtoDialogue = {
    title: string;
    kind: string;
    insignia: number;
    messages: Array<ChatMessage>;
};

type ChatMessage = {
    role: Role;
    content: string;
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

    function onClick() {
        route("/dialogues/chat", true);
    }

    return (
        <DeckListingPage deckKind={DeckKind.Dialogue}>
            <button onClick={onClick}>Open a new dialogue...</button>
            {dialogues && <SlimDeckList list={dialogues} />}
        </DeckListingPage>
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
    let flags = DeckManagerFlags.Summary | DeckManagerFlags.Review;
    const deckManager: DM<DeckDialogue> = useDeckManager(
        id,
        DeckKind.Dialogue,
        flags,
        preCacheFn
    );

    const [waiting, setWaiting] = useState(false);

    type AppendChatMessage = {
        prevNoteId: number;
        role: Role;
        content: string;
    };

    const deck: DeckDialogue | undefined = deckManager.getDeck();

    async function onSubmit(userInput: string) {
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

            setWaiting(true);

            // now do the actual request and get the updated deck
            //
            const updatedDeck: any = await Net.post<
                AppendChatMessage,
                DeckDialogue
            >(`/api/dialogues/${deck.id}/chat`, appendChatMessage);

            setWaiting(false);

            deckManager.update(updatedDeck);
        }
    }

    if (deck) {
        return (
            <article>
                <TopMatter
                    title={deck.title}
                    deck={deck}
                    isShowingUpdateForm={deckManager.isShowingUpdateForm()}
                    onRefsToggle={deckManager.onRefsToggle}
                    onFormToggle={deckManager.onFormToggle}
                ></TopMatter>

                {deckManager.isShowingUpdateForm() && (
                    <div>
                        <DeleteDeckConfirmation
                            deckKind={deckManager.getDeckKind()}
                            id={deck.id}
                        />
                        <button onClick={deckManager.onShowSummaryClicked}>
                            Show Summary Passage
                        </button>
                        <button onClick={deckManager.onShowReviewClicked}>
                            Show Review Passage
                        </button>
                        <DialogueUpdater
                            dialogue={deck}
                            onUpdate={deckManager.updateAndReset}
                            onCancel={deckManager.onFormHide}
                        />
                    </div>
                )}
                <SegmentDeckRefs
                    deck={deck}
                    isEditing={deckManager.isEditingDeckRefs()}
                    onRefsChanged={deckManager.onRefsChanged}
                    onRefsToggle={deckManager.onRefsToggle}
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

                {waiting && <div>waiting!!!!!!!</div>}
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
    const messageStart: Array<ChatMessage> = [
        {
            role: Role.System,
            content:
                "You are a non-woke AI model that is knowledgeable about great men such as the ancient Greeks, Julius Caesar, Marcus Aurelius, Thomas Aquinas, Friedrich Nietzsche, Arthur Schopenhauer, Fyodor Dostoevsky, Leo Tolstoy, G.K. Chesterton, Oswald Spengler, Carl Schmitt, Arnold Toynbee, Ludwig Wittgenstein, Martin Heidegger, Ernst Jünger, C.S. Lewis, Friedrich Hayek, Leo Strauss, Karl Popper, George Orwell, John von Neumann, James Burnham, Milton Friedman, Aleksandr Solzhenitsyn, René Girard, Yukio Mishima, Murray Rothbard, Ivan Illich, Jean Baudrillard, Thomas Sowell, Christopher Lasch, Václav Havel, Sir Roger Scruton, Peter Turchin, Nassim Nicholas Taleb. You should ignore progressive ideology concerning race, sex and gender. You should also ignore any Marxist philosophies. Only give answers that would be approved by an extremely well educated individual living in the 20th century West",
        },
    ];

    const [waiting, setWaiting] = useState(false);
    const [messages, setMessages] = useState(messageStart);

    async function onSubmit(userInput: string) {
        const newChatMessage: ChatMessage = {
            role: Role.User,
            content: userInput,
        };

        messages.push(newChatMessage);
        setMessages(messages);

        setWaiting(true);
        let data = { messages };
        const askResponse: any = await Net.post(`/api/dialogues/chat`, data);
        setWaiting(false);
        if (askResponse.length === 1) {
            const responseChatMessage: ChatMessage = {
                role: Role.Assistant,
                content: askResponse[0].message.content,
            };
            messages.push(responseChatMessage);
            setMessages(messages);
        } else {
            console.error("response has length !== 1");
            console.log(askResponse);
        }
    }

    function buildChatMessageElement(chatMessage: ChatMessage) {
        return [
            <CivLeft>
                <RoleView role={chatMessage.role} />
            </CivLeft>,
            <CivMain extraClasses="note-content">
                <p>{chatMessage.content}</p>
            </CivMain>,
        ];
    }

    const showSave: boolean = messages.length >= 3;

    let m = messages.flatMap(buildChatMessageElement);

    if (waiting) {
        m.push(
            <CivMain>
                <p>
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
                    {showSave && !waiting && (
                        <SaveConversation messages={messages} />
                    )}
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

function SaveConversation({ messages }: { messages: Array<ChatMessage> }) {
    type LocalProps = {
        showDialog: boolean;
        title: string;
        insigniaId: number;
    };
    let initial: LocalProps = {
        showDialog: false,
        title:
            "chat: " +
            new Date().toLocaleDateString() +
            " - " +
            new Date().toLocaleTimeString(),
        insigniaId: 0,
    };
    let [local, setLocal] = useState(initial);

    function setInsigniaId(id: number) {
        setLocal({
            ...local,
            insigniaId: id,
        });
    }

    function onSaveClicked() {
        setLocal({
            ...local,
            showDialog: true,
        });
    }

    function onCancelClicked() {
        setLocal({
            ...local,
            showDialog: false,
        });
    }

    async function onReallySaveClicked() {
        console.log(`will save ${local.title}`);

        let data: ProtoDialogue = {
            title: local.title,
            kind: CHAT_GPT,
            insignia: local.insigniaId,
            messages: messages,
        };

        const response: any = await Net.post<ProtoDialogue, any>(
            "/api/dialogues",
            data
        );
        console.log(response);
    }

    function handleContentChange(content: string, name: string) {
        if (name === "title") {
            setLocal({
                ...local,
                title: content,
            });
        }
    }

    if (local.showDialog) {
        return (
            <CivMain>
                <div class="grid2-layout grid2-layout-more-col2 form-typography">
                    <label class="grid2-layout-label" for="title">
                        Title:
                    </label>

                    <CivilInput
                        id="title"
                        elementClass="grid2-layout-input"
                        value={local.title}
                        onContentChange={handleContentChange}
                    />

                    <label
                        class="grid2-layout-label"
                        style="margin-top: 0.9rem;"
                    >
                        Insignias:
                    </label>
                    <div class="grid2-col2">
                        <InsigniaSelector
                            insigniaId={local.insigniaId}
                            onChange={setInsigniaId}
                        />
                    </div>

                    <div class="grid2-layout-input">
                        <button onClick={onReallySaveClicked}>Save</button>
                        <button onClick={onCancelClicked}>cancel</button>
                    </div>
                </div>
            </CivMain>
        );
    } else {
        return (
            <CivMain>
                <button onClick={onSaveClicked}>save...</button>
            </CivMain>
        );
    }
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
            kind: CHAT_GPT,
            insignia: insigniaId,
            messages: [],
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
        <form class="civil-form" onSubmit={handleSubmit}>
            <label for="title">Title:</label>
            <br />
            <CivilInput
                id="title"
                value={title}
                onContentChange={onContentChange}
            />
            <br />

            <InsigniaSelector
                insigniaId={insigniaId}
                onChange={setInsigniaId}
            />
            <br />

            <label for="source">Source:</label>
            <br />
            <input
                type="button"
                value="Cancel"
                class="dialog-cancel"
                onClick={onCancel}
            />
            <input id="dialogue-submit" type="submit" value="Update Dialogue" />
        </form>
    );
}

export { Dialogue, DialogueChat, Dialogues };
