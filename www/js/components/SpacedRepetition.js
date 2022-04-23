import { html, useState, useEffect, Link } from '/lib/preact/mod.js';

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

const PRACTICE_CARD_SET = 'practice-card-set';

function reducer(state, action) {
    switch(action.type) {
    case CARDS_SET: return {
        ...state,
        cards: action.data
    };
    case PRACTICE_CARD_SET: return {
        ...state,
        practiceCard: action.data
    };
    case TEST_START: return {
        ...state,
        mode: MODE_TEST,
        cardIndex: 0,
        practiceCard: undefined
    };
    case CARD_COMPLETED: {
        let { cards, mode, cardIndex } = state;

        // some of the logic for the SM2 algorithm is here:
        // step 7 from the algorithm at https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
        // "After each repetition session of a given day repeat again all items that scored below four in the quality assessment. Continue the repetitions until all of these items score at least four."

        const {
            rating,
            globalDispatch
        } = action.data;

        if (rating < 4) {
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

            globalDispatch({
                type: 'setReviewCount',
                srReviewCount: cards.length
            });
        }

        return {
            ...state,
            mode,
            cards,
            cardIndex
        }
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
            localDispatch(CARDS_SET, cards);
        });
    }, []);

    function startTest(e) {
        e.preventDefault();
        localDispatch(TEST_START);
    }

    function onRatedCard(card, rating) {
        Net.post(`/api/sr/${card.id}/rated`, {
            rating
        }).then(success => {
            if (success) {
                localDispatch(CARD_COMPLETED, {
                    rating: rating,
                    globalDispatch: dispatch // the local logic decides if the global review count should be changed
                });
            }
        });
    }

    function onPracticeClicked(e) {
        e.preventDefault();
        Net.get('/api/sr/practice').then(card => {
            localDispatch(PRACTICE_CARD_SET, card);
        });
    }

    const canTest = local.cards.length > 0;
    const cardsToReview = local.cards.length - local.cardIndex;

    let nextTestInfo = "";
    if (local.mode === MODE_PRE_TEST && !canTest) {
        const nextReviewDate = formattedDate(Date.parse(state.srEarliestReviewDate));
        const nextReviewTime = formattedTime(Date.parse(state.srEarliestReviewDate));
        nextTestInfo = `The next test will be available at ${nextReviewTime} on ${nextReviewDate}`;
    }

    return html`<div>
                <h1 class="ui">Spaced Repetition</h1>
                ${ local.mode !== MODE_POST_TEST && html`<p class="ui">${ plural(cardsToReview, 'card', 's') } to review</p>`}
                ${ local.mode === MODE_PRE_TEST && !canTest && html`<p>${nextTestInfo}</p>`}
                ${ local.mode === MODE_PRE_TEST && canTest && html`<button onClick=${ startTest }>
        Start Test
    </button>`}
                ${ local.mode === MODE_TEST && html`<${CardTest} card=${local.cards[local.cardIndex]}
    onRatedCard=${onRatedCard}/>`}
                ${ local.mode === MODE_POST_TEST && html`<p>All Done!</p>`}

                ${ cardsToReview === 0 && html`<p>You have no cards to review, maybe try a practice flashcard?</p>`}
                ${ cardsToReview === 0 && html`<button onClick=${ onPracticeClicked }>View Practice Flashcard</button>`}
                ${ local.practiceCard && html`<${CardTest} card=${local.practiceCard}/>`}

              </div>`;
}

// if onRatedCard isn't passed in, the user won't be able to rate a card (useful when showing a practice card)
//
function CardTest({ card, onRatedCard }) {
    const SHOW_PROMPT = 'prompt';
    const SHOW_ANSWER = 'answer';

    const [state, dispatch] = useStateValue();

    const [localState, setLocalState] = useState({
        showState: SHOW_PROMPT,
        answerMarkup: undefined,
        promptMarkup: undefined
    });

    useEffect(() => {
        setLocalState({
            ...localState,
            showState: SHOW_PROMPT,
            promptMarkup: buildMarkup(card.prompt, state.imageDirectory)
        });
    }, [card]);

    function onShowAnswer(e) {
        e.preventDefault();

        function setAnswer(note) {
            setLocalState({
                ...localState,
                showState: SHOW_ANSWER,
                answerMarkup: buildMarkup(note.content, state.imageDirectory)
            })
        }

        const cachedDeck = state.cache.deck[card.deck_info.id];
        if (cachedDeck) {
            // console.log('note is already cached');
            const note = cachedDeck.notes.find(n => n.id === card.note_id);
            setAnswer(note);
        } else {
            // console.log('fetching note from server');
            Net.get(`/api/notes/${card.note_id}`, {}).then(note => {
                setAnswer(note);
            });
        }
    }

    function onRated(card, rating) {
        // when a card has been rated and the next card is about to be shown
        // the useEffect will reset the state of CardTest to SHOW_PROMPT
        //
        // however this fails if there's only one card to test and it's been
        // rated at 3 or below, at which point it needs to be shown again.
        // Because it's the same card, the useEffect isn't triggered and so
        // this CardTest remains in the SHOW_ANSWER state
        //
        // therefore we have to intercept the onRatedCard callback and manually
        // set the state to SHOW_PROMPT just in case we're in the '1 card only,
        // rated at 3 or below' situation.
        //
        // Bugger
        //
        setLocalState({
            ...localState,
            showState: SHOW_PROMPT
        });

        onRatedCard(card, rating);
    }

    const show = localState.showState;

    return html`<div>
                <div class="sr-section">Front</div>
                <div class="note">${localState.promptMarkup}</div>
                ${ show === SHOW_PROMPT && html`<button onClick=${ onShowAnswer }>Show Answer</button>`}
                ${ show === SHOW_ANSWER && buildAnswer(card, localState.answerMarkup)}
                ${ show === SHOW_ANSWER && onRatedCard && html`<${CardRating} card=${card}
    onRatedCard=${onRated}/>`}
              </div>`;

}

function buildAnswer(card, answerMarkup) {
    const { id, name, resource } = card.deck_info;
    const href = `/${resource}/${id}`;

    return html`<div>
                <div class="sr-section">Back</div>

<div class="note">
                <div class="left-margin">
                  <div class="left-margin-entry">
                    <${Link} class="ref pigment-${ resource }" href=${ href }>${ name }</${Link}>
                  </div>
                </div>
                ${answerMarkup}
              </div>
</div>`;
}

function CardRating({ card, onRatedCard }) {
    function onRated(e) {
        e.preventDefault();
        const rating = parseInt(e.target.textContent, 10);
        onRatedCard(card, rating);
    }

    return html`<div>
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
