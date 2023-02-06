import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { parseDateStringAsTriple, deltaInYears } from '../eras';

import { PointBirthForm, PointDeathForm } from './PointForm';

const LIFESPAN_STAGE_BIRTH = 0;
const LIFESPAN_STAGE_IS_ALIVE = 1;
const LIFESPAN_STAGE_DEATH = 2;
const LIFESPAN_STAGE_FINISHED = 3;

export default function LifespanForm({ name, onLifespanGiven, oldestAliveAge }: { name?: any, onLifespanGiven?: any, oldestAliveAge?: any }) {
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

    function onAddBirthPoint(birthPoint?: any) {
        // ask about date of death if the person was born a long time ago
        // otherwise ask the user if the person is still alive
        //
        let [year, month, day]: [number, number, number] = parseDateStringAsTriple(birthPoint.exactDate)!;
        let ageInYears = deltaInYears(year, month, day);

        setLocalState({
            ...localState,
            birthPoint: birthPoint,
            stage: (ageInYears > oldestAliveAge) ? LIFESPAN_STAGE_DEATH : LIFESPAN_STAGE_IS_ALIVE
        });
    }

    function onPersonIsAlive() {
        setLocalState({
            ...localState,
            stage: LIFESPAN_STAGE_FINISHED
        });
    }

    function onPersonIsDead() {
        setLocalState({
            ...localState,
            stage: LIFESPAN_STAGE_DEATH
        });
    }

    function onAddDeathPoint(point?: any) {
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
        return <PointBirthForm  pointBorn={ pointBorn } onSubmit={ onAddBirthPoint }/>;
    case LIFESPAN_STAGE_IS_ALIVE:
        return (
        <div>
            <span>
                Is { name } still alive?
                <button onClick={ onPersonIsAlive }>Yes</button>
                <button onClick={ onPersonIsDead }>No</button>
            </span>
        </div>);
    case LIFESPAN_STAGE_DEATH:
            return <PointDeathForm  pointDied={ pointDied } onSubmit={ onAddDeathPoint }/>;
        default: return <div></div>;
    }
}
