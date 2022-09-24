import { html, useState, useEffect, Link } from '/lib/preact/mod.js';

import { sc_setReviewCount } from '/js/AppState.js';
import Net from '/js/Net.js';
import { plural, formattedDate, formattedTime } from '/js/JsUtils.js';
import { useLocalReducer } from '/js/PreactUtils.js';

import { useStateValue } from '/js/StateProvider.js';
import buildMarkup from '/js/components/BuildMarkup.js';

const MODE_PRE_TEST = 'pre-test';
const MODE_TEST = 'test';
const MODE_POST_TEST = 'post-test';


const CARDS_SET = 'cards-set';
const TEST_START = 'test-start';
const CARD_COMPLETED = 'card-completed';
const CARD_SHOW_ANSWER = 'card-show-answer';

const PRACTICE_CARD_SET = 'practice-card-set';

const SHOW_PROMPT = 'prompt';
const SHOW_ANSWER = 'answer';

function dbg(mode, state) {
    console.group(mode);
    console.log(`state.mode = ${state.mode}`);
    console.log(`state.cardIndex = ${state.cardIndex}`);
    console.log(`state.cards = ${state.cards.length}`);
    console.log(state.cards);
    console.groupEnd();
}

function augmentCard(state, card, postRatingToServer) {
    card.showState = SHOW_PROMPT;
    card.prompt = card.prompt;
    card.answer = card.noteContent;
    card.postRatingToServer = postRatingToServer;

    return card;
}

function reducer(state, action) {
    switch(action.type) {
    case CARDS_SET: {
        let newState = {
            ...state,
            cards: action.data.cards.map(card => augmentCard(action.data.state, card, true))
        }
        // dbg('CARDS_SET', newState);
        return newState;
    };
    case CARD_SHOW_ANSWER: {
        let card = action.data;
        card.showState = SHOW_ANSWER;
        let newState = {
            ...state,
        }
        return newState;
    };
    case PRACTICE_CARD_SET: {
        let newState = {
            ...state,
            practiceCard: augmentCard(action.data.state, action.data.card, false)
        };
        // dbg("PRACTICE_CARD_SET", newState);
        return newState;
    };
    case TEST_START: {
        let newState = {
            ...state,
            mode: MODE_TEST,
            cardIndex: 0,
            practiceCard: undefined
        };
        // dbg("TEST_START", newState);
        return newState;
    };
    case CARD_COMPLETED: {
        let { cards, mode, cardIndex } = state;

        // some of the logic for the SM2 algorithm is here:
        // step 7 from the algorithm at https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
        // "After each repetition session of a given day repeat again all items that scored below four in the quality assessment. Continue the repetitions until all of these items score at least four."

        const {
            rating,
            appState
        } = action.data;

        // if the rating had to be sent to the server, it's been sent, so now we can prevent any further posts
        state.cards[cardIndex].postRatingToServer = false;

        if (rating < 4) {
            state.cards[cardIndex].showState = SHOW_PROMPT;

            // retain this card to test again
            if ((cardIndex + 1) >= cards.length) {
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
                mode = MODE_POST_TEST;
            }

            sc_setReviewCount(appState, cards.length);
        }

        let newState = {
            ...state,
            mode,
            cards,
            cardIndex
        };

        // dbg("CARD_COMPLETED", newState);

        return newState;
    }
    default: throw new Error(`unknown action: ${action}`);
    }
};

export default function SpacedRepetition(props) {
    const [state, dispatch] = useStateValue();

    const initialState = {
        mode: MODE_PRE_TEST,
        cards: [],
        cardIndex: 0,
        practiceCard: undefined
    };
    let [local, localDispatch] = useLocalReducer(reducer, initialState);

    useEffect(() => {
        Net.get('/api/sr').then(cards => {
            localDispatch(CARDS_SET, { cards, state });
        });
    }, []);

    function startTest(e) {
        e.preventDefault();
        localDispatch(TEST_START);
    }

    function onRatedCard(card, rating) {
        // cards will be re-tested during the same session if they're rated
        // below a 4 but we should only send the first ratings to the server
        //
        if (card.postRatingToServer) {
            Net.post(`/api/sr/${card.id}/rated`, {
                rating
            }).then(success => {
                if (!success) {
                    console.error(`POST /api/sr/${card.id}/rated failed`);
                }
            });
        }
        localDispatch(CARD_COMPLETED, {
            rating: rating,
            appState: state
        });
    }

    function onShowAnswer(card) {
        localDispatch(CARD_SHOW_ANSWER, card);
    }

    function onPracticeClicked(e) {
        e.preventDefault();
        Net.get('/api/sr/practice').then(card => {
            localDispatch(PRACTICE_CARD_SET, { card, state });
        });
    }

    const canTest = local.cards.length > 0;
    const cardsToReview = local.cards.length;// - local.cardIndex;

    let nextTestInfo = "";
    if (local.mode === MODE_PRE_TEST && !canTest) {
        const nextReviewDate = formattedDate(Date.parse(state.sigs.srEarliestReviewDate.value));
        const nextReviewTime = formattedTime(Date.parse(state.sigs.srEarliestReviewDate.value));
        nextTestInfo = `The next test will be available at ${nextReviewTime} on ${nextReviewDate}`;
    }

    return html`
    <div>
        <h1 class="ui">Spaced Repetition</h1>
        ${ local.mode !== MODE_POST_TEST && html`
            <p class="ui">${ plural(cardsToReview, 'card', 's') } to review</p>
        `}
        ${ local.mode === MODE_PRE_TEST && !canTest && html`
            <p>${nextTestInfo}</p>
        `}
        ${ local.mode === MODE_PRE_TEST && canTest && html`
            <button onClick=${ startTest }>
                Start Test
            </button>
        `}
        ${ local.mode === MODE_TEST && html`
            <${CardTest} card=${local.cards[local.cardIndex]}
                         onRatedCard=${onRatedCard}
                         onShowAnswer=${onShowAnswer}/>
        `}
        ${ local.mode === MODE_POST_TEST && html`
            <p>All Done!</p>
        `}
        ${ cardsToReview === 0 && html`
            <p>You have no cards to review, maybe try a practice flashcard?</p>
        `}
        ${ cardsToReview === 0 && html`
            <button onClick=${ onPracticeClicked }>View Practice Flashcard</button>
        `}
        ${ local.practiceCard && html`
            <${CardTest} card=${local.practiceCard}
                         onShowAnswer=${onShowAnswer}/>
        `}
    </div>`;
}

// if onRatedCard isn't passed in, the user won't be able to rate a card (useful when showing a practice card)
//
function CardTest({ card, onRatedCard, onShowAnswer }) {
    function onShowAnswerClicked(e) {
        e.preventDefault();
        onShowAnswer(card);
    }

    const show = card.showState;

    return html`
    <div>
        <div class="sr-section">Front</div>
        <div class="note">${buildMarkup(card.prompt)}</div>
        ${ show === SHOW_PROMPT && html`
            <button onClick=${ onShowAnswerClicked }>Show Answer</button>
        `}
        ${ show === SHOW_ANSWER && html`
            <${Answer} card=${card}/>
        `}
        ${ show === SHOW_ANSWER && onRatedCard && html`
            <${CardRating} card=${card} onRatedCard=${onRatedCard}/>
        `}
    </div>`;
}

function Answer({ card }) {
    const { id, name, resource } = card.deckInfo;
    const href = `/${resource}/${id}`;

    return html`
    <div>
        <div class="sr-section">Back</div>
        <div class="note">
            <div class="left-margin">
                <div class="left-margin-entry">
                    <${Link} class="ref pigment-${ resource }" href=${ href }>${ name }</${Link}>
                </div>
            </div>
            ${buildMarkup(card.answer)}
        </div>
    </div>`;
}

function CardRating({ card, onRatedCard }) {
    function onRated(e) {
        e.preventDefault();
        const rating = parseInt(e.target.textContent, 10);
        onRatedCard(card, rating);
    }

    return html`
    <div>
        <div class="sr-section">
            Rating
            <ul class="right-margin sr-rating-descriptions">
                <li>5 - perfect response</li>
                <li>4 - correct response after a hesitation</li>
                <li>3 - correct response recalled with serious difficulty</li>
                <li>2 - incorrect response; where the correct one seemed easy to recall</li>
                <li>1 - incorrect response; the correct one remembered</li>
                <li>0 - complete blackout.</li>
            </ul>
        </div>
        <div class="rating-values" onClick=${ onRated }>
            <button class="rating-value">0</button>
            <button class="rating-value">1</button>
            <button class="rating-value">2</button>
            <button class="rating-value">3</button>
            <button class="rating-value">4</button>
            <button class="rating-value">5</button>
        </div>
    </div>`;
}
