import React, { useState } from 'react';

import DeckPoint from './DeckPoint';

export default function ListDeckPoints({ deckPoints, holderId, holderName }) {

  let [showButtons, setShowButtons] = useState(false);
  let [onlyThisPerson, setOnlyThisPerson] = useState(false);
  let [hideBirthsDeaths, setHideBirthsDeaths] = useState(false);

  function toggleShowButtons() {
    setShowButtons(!showButtons);
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    if (name === "only_this_person") {
      setOnlyThisPerson(value);
    }
    if (name === "hide_birth_deaths") {
      setHideBirthsDeaths(value);
    }
  };

  function buildButtons() {
    return (<div>
              <div className="deckpoint-block">
                <input id="only-this-person"
                       type="checkbox"
                       name="only_this_person"
                       checked={ onlyThisPerson }
                       onChange={ handleChangeEvent } />
                <label htmlFor="only-this-person">Only This Person</label>
              </div>
              <div className="deckpoint-block">
                <input id="hide-birth-deaths"
                       type="checkbox"
                       name="hide_birth_deaths"
                       checked={ hideBirthsDeaths }
                       onChange={ handleChangeEvent } />
                <label htmlFor="hide-birth-deaths">Hide Other Birth/Deaths</label>
              </div>
            </div>);
  }

  let arr = deckPoints || [];
  if (onlyThisPerson) {
    arr = arr.filter(e => e.deck_id === holderId);
  }
  if (hideBirthsDeaths) {
    arr = arr.filter(e => e.deck_id === holderId || !(e.point_title === "Born" || e.point_title === "Died"));
  }
  let dps = arr.map(dp => <DeckPoint key={ dp.point_id} holderId={ holderId } deckPoint={ dp }/>);

  return (
    <section>
      <h2 onClick={ toggleShowButtons }>Events during the life of { holderName }</h2>
      { showButtons && buildButtons() }
      <ul>
        { dps }
      </ul>
    </section>
  );
}
