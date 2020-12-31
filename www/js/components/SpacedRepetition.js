import { html, useState, useEffect, useReducer, Link } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { plural } from '/js/JsUtils.js';

import { useStateValue } from '/js/StateProvider.js';
import buildMarkup from '/js/components/BuildMarkup.js';

const MODE_PRE_TEST = 'pre-test';
const MODE_TEST = 'test';
const MODE_POST_TEST = 'post-test';

const initialState = {
  mode: MODE_PRE_TEST,
  cards: [],
  cardIndex: 0
};

const CARDS_SET = 'cards-set';
const TEST_START = 'test-start';
const CARD_COMPLETED = 'card-completed';

const reducer = (state, action) => {
  switch(action.type) {
  case CARDS_SET: return {
    ...state,
    cards: action.cards
  };
  case TEST_START: return {
    ...state,
    mode: MODE_TEST,
    cardIndex: 0
  };
  case CARD_COMPLETED: {
    let { cards, mode, cardIndex } = state;
    if ((cardIndex + 1) >= cards.length) {
      // reaced the end of the cards to test for
      cardIndex = 0;
      mode = MODE_POST_TEST;
    } else {
      cardIndex += 1;
    }
    return {
      ...state,
      mode,
      cardIndex
    }
  }
  default: throw new Error(`unknown action: ${action}`);
  }
};

export default function SpacedRepetition(props) {
  let [local, localDispatch_] = useReducer(reducer, initialState);
  function localDispatch(type, data) {
    data = data || {};
    localDispatch_({ ...data, type });
  }

  useEffect(() => {
    Net.get('/api/sr').then(cards => {
      localDispatch(CARDS_SET, { cards });
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
      // todo: return a success value from the server, check it here
    });
    localDispatch(CARD_COMPLETED);
  }

  const canTest = local.cards.length > 0;
  const cardsToReview = local.cards.length - local.cardIndex;

  return html`<div>
                <h1>Spaced Repetition</h1>
                ${ local.mode !== MODE_POST_TEST && html`<p>${ plural(cardsToReview, 'card', 's') } to review</p>`}
                ${ local.mode === MODE_PRE_TEST && canTest && html`<button onClick=${ startTest }>
                                                                     Start Test
                                                                   </button>`}
                ${ local.mode === MODE_TEST && html`<${CardTest} card=${local.cards[local.cardIndex]}
                                                                 onRatedCard=${onRatedCard}/>`}
                ${ local.mode === MODE_POST_TEST && html`<p>All Done!</p>`}
              </div>`;
}

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

  const show = localState.showState;

  return html`<div>
                <div class="sr-section">Front</div>
                <div class="note">${localState.promptMarkup}</div>
                ${ show === SHOW_PROMPT && html`<button onClick=${ onShowAnswer }>Show Answer</button>`}
                ${ show === SHOW_ANSWER && buildAnswer(card, localState.answerMarkup)}
                ${ show === SHOW_ANSWER && html`<${CardRating} card=${card}
                                                               onRatedCard=${onRatedCard}/>`}
              </div>`;

}

function buildAnswer(card, answerMarkup) {
  const { id, name, resource } = card.deck_info;
  const href = `/${resource}/${id}`;

  return html`<div>
                <div class="sr-section">Back</div>

<div class="note">
                <div class="spanne">
                  <div class="spanne-entry">
                    <${Link} class="noteref pigment-${ resource }" href=${ href }>${ name }</${Link}>
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
                <div class="sr-section">Rating</div>
                <div class="rating-values" onClick=${ onRated }>
                  <button class="rating-value">0</button>
                  <button class="rating-value">1</button>
                  <button class="rating-value">2</button>
                  <button class="rating-value">3</button>
                  <button class="rating-value">4</button>
                </div>
              </div>`;
}
