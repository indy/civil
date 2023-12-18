import { useEffect, useState } from "preact/hooks";

import { PointKind } from "../enums";
import type { Key, ProtoPoint } from "../types";

import { deltaInYearsRoughly, parseDateStringAsTriple } from "../shared/time";

import PointForm from "./point-form";

enum LifespanStage {
    Birth = 0,
    IsAlive,
    Death,
    Finished,
}

type Props = {
    deckId: Key;
    title: string;
    onLifespanGiven: (id: Key, a: ProtoPoint, b?: ProtoPoint) => void;
    oldestAliveAge: number;
};

export default function LifespanForm({
    deckId,
    title,
    onLifespanGiven,
    oldestAliveAge,
}: Props) {
    type State = {
        stage: LifespanStage;
        birthPoint?: ProtoPoint;
        deathPoint?: ProtoPoint;
    };

    const [localState, setLocalState] = useState<State>({
        stage: LifespanStage.Birth,
        birthPoint: undefined,
        deathPoint: undefined,
    });

    useEffect(() => {
        if (localState.stage === LifespanStage.Finished) {
            // invoking onLifespanGiven will remove this form
            if (localState.birthPoint) {
                onLifespanGiven(
                    deckId,
                    localState.birthPoint,
                    localState.deathPoint,
                );
            }
        }
    }, [localState]);

    function onAddBirthPoint(birthPoint: ProtoPoint) {
        // ask about date of death if the person was born a long time ago
        // otherwise ask the user if the person is still alive
        //
        if (birthPoint.exactDate) {
            let [year, _month, _day]: [number, number, number] =
                parseDateStringAsTriple(birthPoint.exactDate)!;
            let ageInYears = deltaInYearsRoughly(year);

            setLocalState({
                ...localState,
                birthPoint: birthPoint,
                stage:
                    ageInYears > oldestAliveAge
                        ? LifespanStage.Death
                        : LifespanStage.IsAlive,
            });
        }
    }

    function onPersonIsAlive() {
        setLocalState({
            ...localState,
            stage: LifespanStage.Finished,
        });
    }

    function onPersonIsDead() {
        setLocalState({
            ...localState,
            stage: LifespanStage.Death,
        });
    }

    function onAddDeathPoint(point: ProtoPoint) {
        setLocalState({
            ...localState,
            deathPoint: point,
            stage: LifespanStage.Finished,
        });
    }

    switch (localState.stage) {
        case LifespanStage.Birth:
            return <PointBirthForm onSubmit={onAddBirthPoint} />;
        case LifespanStage.IsAlive:
            return (
                <div class="ui">
                    <span>
                        Is {title} still alive?
                        <button onClick={onPersonIsAlive}>Yes</button>
                        <button onClick={onPersonIsDead}>No</button>
                    </span>
                </div>
            );
        case LifespanStage.Death:
            return <PointDeathForm onSubmit={onAddDeathPoint} />;
        default:
            return <div></div>;
    }
}

function PointBirthForm({ onSubmit }: { onSubmit: (p: ProtoPoint) => void }) {
    return (
        <PointForm
            timeLegend="Date of Birth"
            locationLegend="Location of Birth"
            pointKind={PointKind.PointBegin}
            pointTitle="Born"
            onSubmit={onSubmit}
            submitMessage="Add Birth"
        />
    );
}

function PointDeathForm({ onSubmit }: { onSubmit: (p: ProtoPoint) => void }) {
    return (
        <PointForm
            timeLegend="Date of Death"
            locationLegend="Location of Death"
            pointKind={PointKind.PointEnd}
            pointTitle="Died"
            onSubmit={onSubmit}
            submitMessage="Add Death"
        />
    );
}
