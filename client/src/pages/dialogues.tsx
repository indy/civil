import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Link } from "preact-router";

import { DeckManagerFlags, DM, DeckDialogue, DeckKind, SlimDeck } from "types";

import { getAppState, AppStateChange } from "app-state";

import InsigniaSelector from "components/insignias/selector";
import SegmentGraph from "components/graph/segment-graph";
import SegmentNotes from "components/notes/segment-notes";

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
    System,
    /// A message sent by ChatGPT
    Assistant,
    /// A message sent by the user
    User,
}

type ChatMessage = {
    role: Role;
    content: string;
};

function roleToString(role: Role): string {
    switch (role) {
        case Role.System: return "system";
        case Role.Assistant: return "assistant";
        case Role.User: return "user";
    }
}

function DialogueChat({ path }: { path?: string }) {
    const fake: Array<ChatMessage> = [
        { role: Role.User, content: "hello"},
        { role: Role.Assistant, content: "this is a response"}];

    const [waiting, setWaiting] = useState(false);
    const [content, setContent] = useState("type here");
    const [messages, setMessages] = useState(fake);

    async function onSubmit() {
        const newChatMessage: ChatMessage = {
            role: Role.User,
            content,
        };

        messages.push(newChatMessage);
        setMessages(messages);

        const url = `/api/dialogues/ask?q=${encodeURI(content)}`;
        setWaiting(true);
        const askResponse: any = await Net.post(url, {});
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

        setContent("");
    }

    function buildChatMessageElement(chatMessage: ChatMessage) {
        return [
            <div class="left-margin">
                {roleToString(chatMessage.role)}
            </div>,
            <div class="note-content muh-content">
                <p>
                    {chatMessage.content}
                </p>
            </div>
        ];
    }

    let m = messages.flatMap(buildChatMessageElement);

    if (waiting) {
        m.push(<div class="note-content muh-content">
                <p>
                    <em>Waiting for response...</em>
                </p>
            </div>);
    }

    return (
        <article>
            <section>
            <div class="note muh-container">
            {m}
            </div>
            <div class="dialogue-chat-input">
                <CivilTextArea
                    id="chat-input"
                    value={content}
                    onContentChange={setContent}
                />
                <button onClick={onSubmit}>submit</button>
            </div>
            </section>
        </article>
    );
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
