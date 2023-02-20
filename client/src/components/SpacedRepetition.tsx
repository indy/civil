import { h } from "preact";
import { useEffect } from "preact/hooks";
import { Link } from "preact-router";

import { Key, SlimDeck } from "../types";

import Net from "../Net";
import { buildUrl, deckKindToResourceString } from "../CivilUtils";
import { getAppState, AppStateChange } from "../AppState";
import { plural, formattedDate, formattedTime } from "../JsUtils";
import { useLocalReducer } from "../PreactUtils";

import buildMarkup from "./BuildMarkup";

enum Mode {
    PreTest,
    Test,
    PostTest,
}

enum ShowState {
    Prompt,
    Answer,
}

interface ICard {
    id: Key;
    noteId: Key;
    deckInfo: SlimDeck;
    noteContent: string;
    prompt: string;
}

type Card = ICard & {
    showState?: ShowState;
    answer?: string;
    postRatingToServer?: boolean;
};

type State = {
    mode: Mode;
    cards: Array<Card>;
    cardIndex: number;
    practiceCard: Card | undefined;
};

enum ActionType {
    CardsSet,
    TestStart,
    CardCompleted,
    CardShowAnswer,
    PracticeCardSet,
}

type ActionDataCardsSet = { cards: Array<ICard> };
type ActionDataCardCompleted = { rating: number };
type Action = {
    type: ActionType;
    data: Card | ActionDataCardsSet | ActionDataCardCompleted;
};

function augmentCard(card: Card, postRatingToServer: boolean) {
    card.showState = ShowState.Prompt;
    card.prompt = card.prompt;
    card.answer = card.noteContent;
    card.postRatingToServer = postRatingToServer;

    return card;
}

function reducer(state: State, action: Action) {
    switch (action.type) {
        case ActionType.CardsSet: {
            let cs = action.data as ActionDataCardsSet;
            let newState = {
                ...state,
                cards: cs.cards.map((card: ICard) => augmentCard(card, true)),
            };
            // dbg('ActionType.CardsSet', newState);
            return newState;
        }
        case ActionType.CardShowAnswer: {
            let card: Card = action.data as Card;
            card.showState = ShowState.Answer;
            let newState = {
                ...state,
            };
            return newState;
        }
        case ActionType.PracticeCardSet: {
            let card: Card = action.data as Card;
            let newState = {
                ...state,
                practiceCard: augmentCard(card, false),
            };
            // dbg("ActionType.PracticeCardSet", newState);
            return newState;
        }
        case ActionType.TestStart: {
            let newState = {
                ...state,
                mode: Mode.Test,
                cardIndex: 0,
                practiceCard: undefined,
            };
            // dbg("ActionType.TestStart", newState);
            return newState;
        }
        case ActionType.CardCompleted: {
            let { cards, mode, cardIndex } = state;

            // some of the logic for the SM2 algorithm is here:
            // step 7 from the algorithm at https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
            // "After each repetition session of a given day repeat again all items that scored below four in the quality assessment. Continue the repetitions until all of these items score at least four."

            const d = action.data as ActionDataCardCompleted;

            // if the rating had to be sent to the server, it's been sent, so now we can prevent any further posts
            state.cards[cardIndex].postRatingToServer = false;

            if (d.rating < 4) {
                state.cards[cardIndex].showState = ShowState.Prompt;

                // retain this card to test again
                if (cardIndex + 1 >= cards.length) {
                    // reached the end of the cards to test for
                    cardIndex = 0;
                } else {
                    cardIndex += 1;
                }
            } else {
                // this can be removed from the test
                cards.splice(cardIndex, 1);
                if (cards.length <= cardIndex) {
                    cardIndex = 0;
                }
                if (cards.length === 0) {
                    mode = Mode.PostTest;
                }

                AppStateChange.setReviewCount(cards.length);
            }

            let newState = {
                ...state,
                mode,
                cards,
                cardIndex,
            };

            // dbg("ActionType.CardCompleted", newState);

            return newState;
        }
    }
}

export default function SpacedRepetition({ path }: { path?: string }) {
    const appState = getAppState();

    const initialState: State = {
        mode: Mode.PreTest,
        cards: [],
        cardIndex: 0,
        practiceCard: undefined,
    };
    let [local, localDispatch] = useLocalReducer(reducer, initialState);

    useEffect(() => {
        Net.get<Array<ICard>>("/api/sr").then((cards) => {
            localDispatch(ActionType.CardsSet, { cards });
        });
    }, []);

    function startTest(e: Event) {
        e.preventDefault();
        localDispatch(ActionType.TestStart);
    }

    function onRatedCard(card: Card, rating: number) {
        // cards will be re-tested during the same session if they're rated
        // below a 4 but we should only send the first ratings to the server
        //
        if (card.postRatingToServer) {
            Net.post<ActionDataCardCompleted, boolean>(
                `/api/sr/${card.id}/rated`,
                {
                    rating,
                }
            ).then((success) => {
                if (!success) {
                    console.error(`POST /api/sr/${card.id}/rated failed`);
                }
            });
        }
        localDispatch(ActionType.CardCompleted, { rating });
    }

    function onShowAnswer(card: Card) {
        localDispatch(ActionType.CardShowAnswer, card);
    }

    function onPracticeClicked(e: Event) {
        e.preventDefault();
        Net.get<ICard>("/api/sr/practice").then((card) => {
            localDispatch(ActionType.PracticeCardSet, card);
        });
    }

    const canTest = local.cards.length > 0;
    const cardsToReview = local.cards.length; // - local.cardIndex;

    let nextTestInfo = "";
    if (local.mode === Mode.PreTest && !canTest) {
        const nextReviewDate = formattedDate(
            Date.parse(
                appState.srEarliestReviewDate.value!
            ) as unknown as string
        );
        const nextReviewTime = formattedTime(
            Date.parse(
                appState.srEarliestReviewDate.value!
            ) as unknown as string
        );
        nextTestInfo = `The next test will be available at ${nextReviewTime} on ${nextReviewDate}`;
    }

    return (
        <div>
            <h1 class="ui">Spaced Repetition</h1>
            {local.mode !== Mode.PostTest && (
                <p class="ui">{plural(cardsToReview, "card", "s")} to review</p>
            )}
            {local.mode === Mode.PreTest && !canTest && <p>{nextTestInfo}</p>}
            {local.mode === Mode.PreTest && canTest && (
                <button onClick={startTest}>Start Test</button>
            )}
            {local.mode === Mode.Test && (
                <CardTest
                    card={local.cards[local.cardIndex]}
                    onRatedCard={onRatedCard}
                    onShowAnswer={onShowAnswer}
                />
            )}
            {local.mode === Mode.PostTest && <p>All Done!</p>}
            {cardsToReview === 0 && (
                <p>
                    You have no cards to review, maybe try a practice flashcard?
                </p>
            )}
            {cardsToReview === 0 && (
                <button onClick={onPracticeClicked}>
                    View Practice Flashcard
                </button>
            )}
            {local.practiceCard && (
                <CardTest
                    card={local.practiceCard}
                    onShowAnswer={onShowAnswer}
                />
            )}
        </div>
    );
}

// if onRatedCard isn't passed in, the user won't be able to rate a card (useful when showing a practice card)
//
type CardTestProps = {
    card: Card;
    onRatedCard?: (c: Card, r: number) => void;
    onShowAnswer?: (c: Card) => void;
};

function CardTest({ card, onRatedCard, onShowAnswer }: CardTestProps) {
    function onShowAnswerClicked(e: Event) {
        e.preventDefault();
        if (onShowAnswer) {
            onShowAnswer(card);
        }
    }

    const show = card.showState;

    return (
        <div>
            <div class="sr-section">Front</div>
            <div class="note">{buildMarkup(card.prompt)}</div>
            {show === ShowState.Prompt && (
                <button onClick={onShowAnswerClicked}>Show Answer</button>
            )}
            {show === ShowState.Answer && <Answer card={card} />}
            {show === ShowState.Answer && onRatedCard && (
                <CardRating card={card} onRatedCard={onRatedCard} />
            )}
        </div>
    );
}

function Answer({ card }: { card: Card }) {
    const { id, title, deckKind } = card.deckInfo;
    const href = buildUrl(deckKind, id);
    const klass = `ref pigment-${deckKindToResourceString(deckKind)}`;
    return (
        <div>
            <div class="sr-section">Back</div>
            <div class="note">
                <div class="left-margin">
                    <div class="left-margin-entry">
                        <Link class={klass} href={href}>
                            {title}
                        </Link>
                    </div>
                </div>
                {card.answer && buildMarkup(card.answer)}
            </div>
        </div>
    );
}

type CardRatingProps = {
    card: Card;
    onRatedCard: (c: Card, r: number) => void;
};
function CardRating({ card, onRatedCard }: CardRatingProps) {
    function onRated(e: Event) {
        if (e.target instanceof HTMLInputElement) {
            e.preventDefault();
            const rating = parseInt(e.target.textContent!, 10);
            onRatedCard(card, rating);
        }
    }

    return (
        <div>
            <div class="sr-section">
                Rating
                <ul class="right-margin sr-rating-descriptions">
                    <li>5 - perfect response</li>
                    <li>4 - correct response after a hesitation</li>
                    <li>
                        3 - correct response recalled with serious difficulty
                    </li>
                    <li>
                        2 - incorrect response; where the correct one seemed
                        easy to recall
                    </li>
                    <li>1 - incorrect response; the correct one remembered</li>
                    <li>0 - complete blackout.</li>
                </ul>
            </div>
            <div class="rating-values" onClick={onRated}>
                <button class="rating-value">0</button>
                <button class="rating-value">1</button>
                <button class="rating-value">2</button>
                <button class="rating-value">3</button>
                <button class="rating-value">4</button>
                <button class="rating-value">5</button>
            </div>
        </div>
    );
}
