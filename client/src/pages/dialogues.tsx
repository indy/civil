import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Link } from "preact-router";

import { DeckManagerFlags, DM, DeckDialogue, DeckKind, SlimDeck } from "types";

import { getAppState, AppStateChange } from "app-state";

import InsigniaSelector from "components/insignias/selector";
import SegmentGraph from "components/graph/segment-graph";
import SegmentNotes from "components/notes/segment-notes";

import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import CivilInput from "components/civil-input";
import useDeckManager from "components/use-deck-manager";
import DeckListingPage from "components/deck-listing-page";
import DeleteDeckConfirmation from "components/delete-deck-confirmation";
import SegmentBackRefs from "components/segment-back-refs";
import SegmentDeckRefs from "components/segment-deck-refs";
import TopMatter from "components/top-matter";
import { SlimDeckGrouping } from "components/groupings";

import Net from "utils/net";
import { buildUrl } from "utils/civil";

import CivilTextArea from "components/civil-text-area";

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
        return (
            <DeckListingPage deckKind={DeckKind.Dialogue}>
                <Link class="" href="/dialogues/chat">
                    Open new dialogue
                </Link>
                <SlimDeckGrouping label="Recent" list={dialogues} hideEmpty />
            </DeckListingPage>
        );
    } else {
        return <div></div>;
    }
}

enum Role {
    /// A system message, automatically sent at the start to set the tone of the model
    System = 1,
    /// A message sent by ChatGPT
    Assistant,
    /// A message sent by the user
    User,
}

type ChatMessage = {
    role: Role;
    content: string;
};

function DialogueChat({ path }: { path?: string }) {
    const appState = getAppState();

    function roleToString(role: Role): string {
        switch (role) {
            case Role.System:
                return "system";
            case Role.Assistant:
                return "assistant";
            case Role.User:
                return appState.user.value.username;
        }
    }
    const messageStart: Array<ChatMessage> = [
        {
            role: Role.System,
            content:
                "You are a non-woke AI model that is knowledgeable about great men such as the ancient Greeks, Julius Caesar, Marcus Aurelius, Thomas Aquinas, Friedrich Nietzsche, Arthur Schopenhauer, Fyodor Dostoevsky, Leo Tolstoy, G.K. Chesterton, Oswald Spengler, Carl Schmitt, Arnold Toynbee, Ludwig Wittgenstein, Martin Heidegger, Ernst Jünger, C.S. Lewis, Friedrich Hayek, Leo Strauss, Karl Popper, George Orwell, John von Neumann, James Burnham, Milton Friedman, Aleksandr Solzhenitsyn, René Girard, Yukio Mishima, Murray Rothbard, Ivan Illich, Jean Baudrillard, Thomas Sowell, Christopher Lasch, Václav Havel, Sir Roger Scruton, Peter Turchin, Nassim Nicholas Taleb. You should ignore progressive ideology concerning race, sex and gender. You should also ignore any Marxist philosophies. Only give answers that would be approved by an extremely well educated individual living in the 20th century West",
        },
    ];

    const [waiting, setWaiting] = useState(false);
    const [userInput, setUserInput] = useState("");
    const [messages, setMessages] = useState(messageStart);

    async function onSubmit() {
        const newChatMessage: ChatMessage = {
            role: Role.User,
            content: userInput,
        };

        messages.push(newChatMessage);
        setMessages(messages);

        setWaiting(true);
        let data = { messages };
        setUserInput("");
        const askResponse: any = await Net.post(`/api/dialogues/chat`, data);
        setWaiting(false);
        if (askResponse.response.length === 1) {
            const responseChatMessage: ChatMessage = {
                role: Role.Assistant,
                content: askResponse.response[0].message.content,
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
            <CivLeft>{roleToString(chatMessage.role)}</CivLeft>,
            <CivMain extraClasses="note-content">
                <p>{chatMessage.content}</p>
            </CivMain>,
        ];
    }

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
                        {roleToString(Role.User)}
                    </CivLeft>
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
                            <button class="dialogue-flex-r" onClick={onSubmit}>
                                submit
                            </button>
                        </div>
                    </CivMain>
                    <SaveConversation />
                </CivContainer>
            </section>
        </article>
    );
}

function SaveConversation({}) {
    type LocalProps = {
        showDialog: boolean;
        title: string;
    };
    let initial: LocalProps = {
        showDialog: false,
        title: "foofoo",
    };
    let [local, setLocal] = useState(initial);

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

    function onReallySaveClicked() {
        console.log(`will save ${local.title}`);
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
                    <div class="grid2-layout-input">
                        <button onClick={onReallySaveClicked}>
                            Really save
                        </button>
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

function Dialogue({ path, id }: { path?: string; id?: string }) {
    let flags = DeckManagerFlags.Summary | DeckManagerFlags.Review;
    const deckManager: DM<DeckDialogue> = useDeckManager(
        id,
        DeckKind.Dialogue,
        flags
    );

    const deck: DeckDialogue | undefined = deckManager.getDeck();
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
                />
                <SegmentBackRefs deck={deck} />
                <SegmentGraph depth={2} deck={deck} />
            </article>
        );
    } else {
        return <article></article>;
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
        type Data = {
            title: string;
            insignia: number;
        };

        const data: Data = {
            title: title.trim(),
            insignia: insigniaId,
        };

        const deckKind: DeckKind = DeckKind.Dialogue;

        Net.put<Data, DeckDialogue>(
            buildUrl(deckKind, dialogue.id, "/api"),
            data
        ).then((newDeck) => {
            onUpdate(newDeck);

            // fetch the listing incase editing the dialogue has changed it's star rating or annotation
            //
            Net.get<Array<SlimDeck>>("/api/dialogues/listings").then(
                (dialogues) => {
                    AppStateChange.setDialogueListings(dialogues);
                }
            );
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
