import { useRef, useState } from "preact/hooks";

import { PointKind } from "../enums";
import type { GeoResult, ProtoPoint } from "../types";

import { geoGet, getLatitudeLongitude } from "../shared/geo";
import {
    asHumanReadableDate,
    asHumanReadableDateRange,
    parseDateStringAsTriple,
    parseDateStringAsYearOnly,
    normaliseDateString,
} from "../shared/time";

import CivilInput from "./civil-input";
import CivilTextArea from "./civil-text-area";

type PointFormProps = {
    pointKind?: PointKind;
    pointTitle?: string;
    onSubmit?: (p: ProtoPoint) => void;
    submitMessage?: string;
    timeLegend?: string;
    locationLegend?: string;
    onSubmitMultiplePoints?: (ps: Array<ProtoPoint>) => void;
};

type LocalState = {
    title: string;
    titleBackup: string;
    locationTextual: string;
    latitude: number;
    longitude: number;
    locationFuzz: number;
    dateTextual: string;
    exactDate: string;
    lowerDate: string;
    upperDate: string;
    dateFuzz: number;
    dateTextualDerivedFrom: string;
    isApprox: boolean;
    presentAsDuration: boolean;
    roundToYear: boolean;
    hasTypedTitle: boolean;
    kind: PointKind;
};

export default function PointForm({
    pointTitle,
    onSubmit,
    submitMessage,
    pointKind,
    timeLegend,
    locationLegend,
    onSubmitMultiplePoints,
}: PointFormProps) {
    timeLegend ||= "Time";
    locationLegend ||= "Location";

    let initialPoint = {
        title: pointTitle || "",
        titleBackup: "", // store the latest user inputted title value (in case title is replaced with a preset like 'Born' or 'Died' and then the user presses the 'Custom' radio tab, this will allow the previous user defined title to be restored)

        locationTextual: "",
        latitude: 0.0,
        longitude: 0.0,
        locationFuzz: 0.0,

        dateTextual: "",
        exactDate: "",
        lowerDate: "",
        upperDate: "",
        dateFuzz: 0.5,
    };

    const [localState, setLocalState] = useState<LocalState>({
        title: initialPoint.title,
        titleBackup: initialPoint.titleBackup,
        locationTextual: initialPoint.locationTextual,
        latitude: initialPoint.latitude,
        longitude: initialPoint.longitude,
        locationFuzz: initialPoint.locationFuzz,
        dateTextual: initialPoint.dateTextual,
        exactDate: initialPoint.exactDate,
        lowerDate: initialPoint.lowerDate,
        upperDate: initialPoint.upperDate,
        dateFuzz: initialPoint.dateFuzz,
        dateTextualDerivedFrom: "",
        isApprox: false,
        presentAsDuration: false,
        roundToYear: false,
        hasTypedTitle: false,
        kind: pointKind || PointKind.Point,
    });

    // build a dateTextual from whatever was the last user input date
    function buildReadableDateFromLast(s: LocalState): LocalState {
        if (s.dateTextualDerivedFrom === "exact") {
            return buildReadableDateFromExact(s, true);
        } else if (s.dateTextualDerivedFrom === "range") {
            return buildReadableDateFromRange(s, true);
        }
        return s;
    }

    function buildReadableDateFromExact(
        s: LocalState,
        checkOther: boolean,
    ): LocalState {
        const parsedDate = parseDateStringAsTriple(s.exactDate);
        if (parsedDate) {
            s.dateTextual = asHumanReadableDate(
                parsedDate,
                s.isApprox,
                s.roundToYear,
            );
            s.dateTextualDerivedFrom = "exact";
            s.dateFuzz = 0.5;
        } else if (checkOther) {
            return buildReadableDateFromRange(s, false);
        } else {
            let year = parseDateStringAsYearOnly(s.exactDate);
            if (year) {
                s.dateTextual = `${year}`;
                s.dateTextualDerivedFrom = "exact"; // ???
                s.roundToYear = true;
            } else {
                s.dateTextual = "";
                s.dateTextualDerivedFrom = "";
                s.roundToYear = false;
            }
        }
        return s;
    }

    function buildReadableDateFromRange(
        s: LocalState,
        checkOther: boolean,
    ): LocalState {
        // lower and upper
        const parsedLowerDate = parseDateStringAsTriple(s.lowerDate);
        const parsedUpperDate = parseDateStringAsTriple(s.upperDate);

        if (parsedLowerDate && parsedUpperDate) {
            s.dateTextual = asHumanReadableDateRange(
                parsedLowerDate,
                parsedUpperDate,
                s.isApprox,
                s.roundToYear,
                s.presentAsDuration,
            );
            s.dateTextualDerivedFrom = "range";
            s.dateFuzz = 0.0;
        } else if (checkOther) {
            // at least one of the date ranges is invalid, so check if the exact date is correct
            return buildReadableDateFromExact(s, false);
        } else {
            let year = parseDateStringAsYearOnly(s.exactDate);
            if (year) {
                s.dateTextual = `${year}`;
                s.dateTextualDerivedFrom = "exact"; // ???
                s.roundToYear = true;
            } else {
                s.dateTextual = "";
                s.dateTextualDerivedFrom = "";
                s.roundToYear = false;
            }
        }
        return s;
    }

    function handleChangeEvent(event: Event) {
        // todo: this is all really old code: fix it and make it more type friendly
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value =
                target.type === "checkbox" ? target.checked : target.value;
            const svalue: string = value as string;

            let newState = { ...localState };

            if (name === "pointkind") {
                if (event.target.value === "Custom") {
                    newState.title = newState.titleBackup;
                    newState.kind = PointKind.Point;
                } else {
                    if (event.target.value === "Born") {
                        newState.kind = PointKind.PointBegin;
                    } else if (event.target.value === "Died") {
                        newState.kind = PointKind.PointEnd;
                    }
                    if (
                        !newState.hasTypedTitle ||
                        newState.title.length === 0
                    ) {
                        newState.title = event.target.value; // either Born or Died
                    }
                }
            } else if (name === "latitude") {
                newState.latitude = parseFloat(svalue);
            } else if (name === "longitude") {
                newState.longitude = parseFloat(svalue);
            } else if (name === "isApprox") {
                let bvalue: boolean = value as boolean;
                newState.isApprox = bvalue;
                newState = buildReadableDateFromLast(newState);
            } else if (name === "presentAsDuration") {
                let bvalue: boolean = value as boolean;
                newState.presentAsDuration = bvalue;
                newState = buildReadableDateFromLast(newState);
            } else if (name === "roundToYear") {
                let bvalue: boolean = value as boolean;
                newState.roundToYear = bvalue;
                newState = buildReadableDateFromLast(newState);
            }

            // passPointIfValid(newState);
            setLocalState(newState);
        }
    }

    function handleContentChange(content: string, name: string) {
        let newState = { ...localState };

        if (name === "title") {
            newState.title = content;
            newState.titleBackup = content;
            if (newState.title.length === 0) {
                // re-enable the functionality to autofill title to 'Born'
                // or 'Died' if the title is ever completely deleted
                newState.hasTypedTitle = false;
            } else {
                newState.hasTypedTitle = true;
            }
        } else if (name === "exactDate") {
            newState.exactDate = content;
            newState = buildReadableDateFromExact(newState, true);
        } else if (name === "lowerDate") {
            newState.lowerDate = content;
            newState = buildReadableDateFromRange(newState, true);
        } else if (name === "upperDate") {
            newState.upperDate = content;
            newState = buildReadableDateFromRange(newState, true);
        } else if (name === "locationTextual") {
            newState.locationTextual = content;
        }

        setLocalState(newState);
    }

    async function onFindLocationClicked(event: Event) {
        event.preventDefault();

        let geoResult: GeoResult | unknown = await geoGet(
            localState.locationTextual,
        );

        if (geoResult) {
            let [isOk, latitudeNew, longitudeNew] = getLatitudeLongitude(
                geoResult as GeoResult,
            );

            if (isOk) {
                let newState = {
                    ...localState,
                    latitude: latitudeNew.toFixed(2) as unknown as number,
                    longitude: longitudeNew.toFixed(2) as unknown as number,
                };
                // props.onPointChange(props.id, newState);
                setLocalState(newState);
            } else {
                console.log(
                    `geoResult failed for ${localState.locationTextual}`,
                );
                console.log(geoResult);
            }
        }
    }

    function handleSubmit(e: Event) {
        let s: ProtoPoint = {
            title: localState.title.trim(),
            kind: localState.kind,
            locationFuzz: 0,
            dateFuzz: 0,
        };
        let canSend = false;

        if (localState.locationTextual !== "") {
            s.locationTextual = localState.locationTextual;
            canSend = true;
        }

        if (localState.latitude !== 0 && localState.longitude !== 0) {
            s.latitude = localState.latitude;
            s.longitude = localState.longitude;
            s.locationFuzz = localState.locationFuzz;
            canSend = true;
        }

        if (localState.dateTextualDerivedFrom === "exact") {
            s.dateTextual = localState.dateTextual;
            s.exactDate = normaliseDateString(localState.exactDate);
            s.dateFuzz = localState.dateFuzz;
            canSend = true;
        } else if (localState.dateTextualDerivedFrom === "range") {
            s.dateTextual = localState.dateTextual;
            s.lowerDate = normaliseDateString(localState.lowerDate);
            s.upperDate = normaliseDateString(localState.upperDate);
            s.dateFuzz = localState.dateFuzz;
            canSend = true;
        }

        if (canSend && onSubmit) {
            onSubmit(s);
        }

        e.preventDefault();
    }

    return (
        <div class="c-point-form">
            <form class="civil-form" onSubmit={handleSubmit}>
                <div class={!!pointKind ? "invisible" : "point-title"}>
                    <fieldset>
                        <legend>Title</legend>
                        <CivilInput
                            id="title"
                            value={localState.title}
                            size={11}
                            readOnly={!!pointKind}
                            onContentChange={handleContentChange}
                        />
                    </fieldset>
                </div>
                <div class={!!pointKind ? "invisible" : "point-title"}>
                    <fieldset>
                        <legend>Point Type</legend>
                        <input
                            type="radio"
                            id="pointkind-custom"
                            name="pointkind"
                            value="Custom"
                            onInput={handleChangeEvent}
                        />
                        <label for="pointkind-custom">Custom</label>
                        <input
                            type="radio"
                            id="pointkind-born"
                            name="pointkind"
                            value="Born"
                            onInput={handleChangeEvent}
                        />
                        <label for="pointkind-born">Born</label>
                        <input
                            type="radio"
                            id="pointkind-died"
                            name="pointkind"
                            value="Died"
                            onInput={handleChangeEvent}
                        />
                        <label for="pointkind-died">Died</label>
                    </fieldset>
                </div>
                <fieldset>
                    <legend>{timeLegend}</legend>
                    <label for="exactDate">Exact Date:</label>
                    <CivilInput
                        id="exactDate"
                        value={localState.exactDate}
                        size={11}
                        onContentChange={handleContentChange}
                    />
                    <span class="civil-date-hint"> Format: YYYY-MM-DD</span>
                    <div class="clear-both" />
                    <br />
                    <label for="lowerDate">Lower Date:</label>
                    <CivilInput
                        id="lowerDate"
                        value={localState.lowerDate}
                        size={11}
                        onContentChange={handleContentChange}
                    />
                    <label for="upperDate">Upper Date:</label>
                    <CivilInput
                        id="upperDate"
                        value={localState.upperDate}
                        size={11}
                        onContentChange={handleContentChange}
                    />
                    <div class="pointform-block pointform-space-top">
                        <input
                            id="round-to-year"
                            class="pointform-checkbox"
                            type="checkbox"
                            name="roundToYear"
                            checked={localState.roundToYear}
                            onInput={handleChangeEvent}
                        />
                        <label for="round-to-year">Round to Year</label>
                    </div>
                    <div class="pointform-block">
                        <input
                            id="is-approx"
                            class="pointform-checkbox"
                            type="checkbox"
                            name="isApprox"
                            checked={localState.isApprox}
                            onInput={handleChangeEvent}
                        />
                        <label for="is-approx">Is Approx</label>
                    </div>
                    <div class="pointform-block">
                        <input
                            id="present-as-duration"
                            class="pointform-checkbox"
                            type="checkbox"
                            name="presentAsDuration"
                            checked={localState.presentAsDuration}
                            onInput={handleChangeEvent}
                        />
                        <label for="present-as-duration">
                            Present as Duration
                        </label>
                    </div>
                    <div class="pointform-space-bottom">
                        <label for="dateTextual">Displayed Date:</label>
                        <CivilInput
                            elementClass="pointform-space-top"
                            id="dateTextual"
                            value={localState.dateTextual}
                            size={40}
                            readOnly={true}
                        />
                    </div>
                </fieldset>
                <br />
                <fieldset>
                    <legend>{locationLegend}</legend>
                    <CivilInput
                        elementClass="pointform-space-top"
                        id="locationTextual"
                        value={localState.locationTextual}
                        onContentChange={handleContentChange}
                    />
                    <p></p>
                    <button
                        onClick={(event) => {
                            onFindLocationClicked(event);
                        }}
                    >
                        Find location
                    </button>
                    <br />
                    <label for="latitude">Latitude:</label>
                    <input
                        id="latitude"
                        type="number"
                        name="latitude"
                        step="any"
                        value={localState.latitude}
                        onInput={handleChangeEvent}
                    />
                    <label for="longitude">Longitude:</label>
                    <input
                        class="pointform-space-bottom"
                        id="longitude"
                        type="number"
                        name="longitude"
                        step="any"
                        value={localState.longitude}
                        onInput={handleChangeEvent}
                    />
                </fieldset>
                <input type="submit" value={submitMessage} />
            </form>
            <OptionalMultiPointInput onSubmit={onSubmitMultiplePoints} />
        </div>
    );
}

function OptionalMultiPointInput({
    onSubmit,
}: {
    onSubmit?: (ps: Array<ProtoPoint>) => void;
}) {
    if (!onSubmit) {
        return <div></div>;
    }

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [content, setContent] = useState("");
    const [showMultiPointInput, setShowMultiPointInput] = useState(false);

    function onShowMultiPointInputClicked(e: Event) {
        e.preventDefault();
        setShowMultiPointInput(!showMultiPointInput);
    }

    function buildPointItem(date: string, title: string): ProtoPoint {
        let s: ProtoPoint = {
            title: title.trim(),
            kind: PointKind.Point,
            locationFuzz: 0,
            exactDate: date,
            dateFuzz: 0.5,
            dateTextual: "",
        };

        let parsedDate = parseDateStringAsTriple(date);
        if (parsedDate) {
            s.dateTextual = asHumanReadableDate(parsedDate, false, false);
        } else {
            let year = parseDateStringAsYearOnly(date);
            s.dateTextual = `${year}`;
            if (
                s.exactDate &&
                (s.exactDate.length === 4 ||
                    (s.exactDate.length === 5 && s.exactDate[0] === "-"))
            ) {
                s.exactDate += "-01-01";
            }
        }

        return s;
    }

    function handleSubmit(e: Event) {
        e.preventDefault();

        function processLine(line: string): ProtoPoint | undefined {
            let xs = line.split(" ");
            let date = xs[0];
            if (date) {
                let title = xs.slice(1).join(" ");
                if (title) {
                    return buildPointItem(date, title);
                }
            }
            return undefined;
        }

        let points: Array<ProtoPoint> = [];
        content.split("\n").forEach((line) => {
            if (line.trim().length > 0) {
                let p = processLine(line);
                if (p) {
                    points.push(p);
                } else {
                    console.error(`error processing line: "${line}"`);
                }
            }
        });

        console.log(points);
        onSubmit && onSubmit(points); // this stupid check is to please tsc
    }

    function onTextAreaFocus() {}

    function onTextAreaBlur() {}

    if (showMultiPointInput) {
        return (
            <form class="civil-form" onSubmit={handleSubmit}>
                <p>Start each line with a date followed by the title:</p>
                <pre>
                    <code>YYYY-MM-DD some point title</code>
                    <code>YYYY another point title</code>
                </pre>
                <CivilTextArea
                    id="content"
                    value={content}
                    elementRef={textAreaRef}
                    onFocus={onTextAreaFocus}
                    onBlur={onTextAreaBlur}
                    onContentChange={setContent}
                />
                <br />
                <input
                    class="wider-button"
                    type="submit"
                    value="import multiple points"
                />
            </form>
        );
    } else {
        return (
            <button class="wider-button" onClick={onShowMultiPointInputClicked}>
                Multi Point Input...
            </button>
        );
    }
}
