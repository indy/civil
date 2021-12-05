import { html, useEffect, useState } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

import { useStateValue } from '/js/StateProvider.js';
import { PointForm, PointBirthForm, PointDeathForm } from '/js/components/PointForm.js';

import { deltaInYears } from '/js/eras.js';


const LIFESPAN_STAGE_BIRTH = 0;
const LIFESPAN_STAGE_IS_ALIVE = 1;
const LIFESPAN_STAGE_DEATH = 2;
const LIFESPAN_STAGE_FINISHED = 3;

export default function LifespanForm({ name, onLifespanGiven }) {
  const [state, dispatch] = useStateValue();

  const [localState, setLocalState] = useState({
    stage: LIFESPAN_STAGE_BIRTH,
    birthPoint: undefined,
    deathPoint: undefined
  });

  useEffect(() => {
    if (localState.stage === LIFESPAN_STAGE_FINISHED) {
      // invoking onLifespanGiven will remove this form
      onLifespanGiven(localState.birthPoint, localState.deathPoint);
    }
  }, [localState]);

  function onAddBirthPoint(birthPoint) {
    // ask about date of death if the person was born a long time ago
    // otherwise ask the user if the person is still alive
    //
    let year = parseInt(birthPoint.exact_date[0]);
    let month = parseInt(birthPoint.exact_date[1]);
    let day = parseInt(birthPoint.exact_date[2]);
    let ageInYears = deltaInYears(year, month, day);

    setLocalState({
      ...localState,
      birthPoint: birthPoint,
      stage: (ageInYears > state.oldestAliveAge) ? LIFESPAN_STAGE_DEATH : LIFESPAN_STAGE_IS_ALIVE
    });
  }

  function onPersonIsAlive(e) {
    setLocalState({
      ...localState,
      stage: LIFESPAN_STAGE_FINISHED
    });
  }

  function onPersonIsDead(e) {
    setLocalState({
      ...localState,
      stage: LIFESPAN_STAGE_DEATH
    });
  }

  function onAddDeathPoint(point) {
    setLocalState({
      ...localState,
      deathPoint: point,
      stage: LIFESPAN_STAGE_FINISHED
    });
  }

  let pointBorn = { title: 'Born' };
  let pointDied = { title: 'Died' };

  switch(localState.stage) {
  case LIFESPAN_STAGE_BIRTH:
    return html`<${PointBirthForm}  pointBorn=${ pointBorn } onSubmit=${ onAddBirthPoint }/>`;
  case LIFESPAN_STAGE_IS_ALIVE:
    return html`<div>
                  <span>
                    Is ${ name } still alive?
                    <button onClick=${ onPersonIsAlive }>Yes</button>
                    <button onClick=${ onPersonIsDead }>No</button>
                  </span>
                </div>`;
  case LIFESPAN_STAGE_DEATH:
    return html`<${PointDeathForm}  pointDied=${ pointDied } onSubmit=${ onAddDeathPoint }/>`;
  }
}
