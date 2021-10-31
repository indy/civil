import { html, useEffect, useState } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

import PointForm from '/js/components/PointForm.js';

const LIFESPAN_STAGE_BIRTH = 0;
const LIFESPAN_STAGE_IS_ALIVE = 1;
const LIFESPAN_STAGE_DEATH = 2;
const LIFESPAN_STAGE_FINISHED = 3;

export default function LifespanForm({ name, onLifespanGiven }) {

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

  function onAddBirthPoint(point) {
    setLocalState({
      ...localState,
      birthPoint: point,
      stage: LIFESPAN_STAGE_IS_ALIVE
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
    return html`<${PointForm} timeLegend="Date of Birth"
                              locationLegend="Birth Location"
                              pointKind="point_begin"
                              point=${ pointBorn }
                              onSubmit=${ onAddBirthPoint }
                              submitMessage="Add Birth"/>`;
  case LIFESPAN_STAGE_IS_ALIVE:
    return html`<div>
                  <span>
                    Is ${ name } still alive?
                    <button onClick=${ onPersonIsAlive }>Yes</button>
                    <button onClick=${ onPersonIsDead }>No</button>
                  </span>
                </div>`;
  case LIFESPAN_STAGE_DEATH:
    return html`<${PointForm} timeLegend="Date of Death"
                              locationLegend="Death Location"
                              pointKind="point_end"
                              point=${ pointDied }
                              onSubmit=${ onAddDeathPoint }
                              submitMessage="Add Death"/>`;
  }
}
