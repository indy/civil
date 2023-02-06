import { h } from "preact";
import { useState, useRef } from "preact/hooks";

import Net from "../Net";
import { capitalise } from "../JsUtils";
import { parseDateStringAsTriple, parseDateStringAsYearOnly } from "../eras";

import CivilInput from "./CivilInput";
import CivilTextArea from "./CivilTextArea";

export function PointBirthForm({
    pointBorn,
    onSubmit,
}: {
    pointBorn: any;
    onSubmit: any;
}) {
    return (
        <PointForm
            timeLegend="Date of Birth"
            locationLegend="Birth Location"
            pointKind="pointBegin"
            point={pointBorn}
            onSubmit={onSubmit}
            submitMessage="Add Birth"
        />
    );
}

export function PointDeathForm({
    pointDied,
    onSubmit,
}: {
    pointDied: any;
    onSubmit: any;
}) {
    return (
        <PointForm
            timeLegend="Date of Death"
            locationLegend="DeathLocation"
            pointKind="pointEnd"
            point={pointDied}
            onSubmit={onSubmit}
            submitMessage="Add Death"
        />
    );
}

export function PointForm({
    point,
    onSubmit,
    submitMessage,
    pointKind,
    timeLegend,
    locationLegend,
    onSubmitMultiplePoints,
}: {
    point?: any;
    onSubmit?: any;
    submitMessage?: any;
    pointKind?: any;
    timeLegend?: any;
    locationLegend?: any;
    onSubmitMultiplePoints?: any;
}) {
    timeLegend ||= "Time";
    locationLegend ||= "Location";

    let initialPoint = {
        title: "",
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

    if (point) {
        for (let [k, v] of Object.entries(point)) {
            if (v !== null) {
                initialPoint[k] = v;
            }
        }
    }

    const [state, setState] = useState({
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
        kind: pointKind || "point",
        showMultiPointInput: false,
    });

    // build a dateTextual from whatever was the last user input date
    function buildReadableDateFromLast(s: any) {
        if (s.dateTextualDerivedFrom === "exact") {
            return buildReadableDateFromExact(s, true);
        } else if (s.dateTextualDerivedFrom === "range") {
            return buildReadableDateFromRange(s, true);
        }
        return s;
    }

    function buildReadableDateFromExact(s, checkOther) {
        const parsedDate = parseDateStringAsTriple(s.exactDate);
        if (parsedDate) {
            s.dateTextual = asHumanReadableDate(
                parsedDate,
                s.isApprox,
                s.roundToYear
            );
            s.dateTextualDerivedFrom = "exact";
            s.dateFuzz = 0.5;
        } else if (checkOther) {
            buildReadableDateFromRange(s, false);
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

    function buildReadableDateFromRange(s: any, checkOther: any) {
        // lower and upper
        const parsedLowerDate = parseDateStringAsTriple(s.lowerDate);
        const parsedUpperDate = parseDateStringAsTriple(s.upperDate);

        if (parsedLowerDate && parsedUpperDate) {
            s.dateTextual = asHumanReadableDateRange(
                parsedLowerDate,
                parsedUpperDate,
                s.isApprox,
                s.roundToYear,
                s.presentAsDuration
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

            let newState = { ...state };

            if (name === "title") {
                newState.title = svalue;
                newState.titleBackup = svalue;
                if (newState.title.length === 0) {
                    // re-enable the functionality to autofill title to 'Born'
                    // or 'Died' if the title is ever completely deleted
                    newState.hasTypedTitle = false;
                } else {
                    newState.hasTypedTitle = true;
                }
            } else if (name === "pointkind") {
                if (event.target.value === "Custom") {
                    newState.title = newState.titleBackup;
                    newState.kind = "point";
                } else {
                    if (event.target.value === "Born") {
                        console.log("setting kind to pointBegin");
                        newState.kind = "pointBegin";
                    } else if (event.target.value === "Died") {
                        console.log("setting kind to pointEnd");
                        newState.kind = "pointEnd";
                    }
                    if (
                        !newState.hasTypedTitle ||
                        newState.title.length === 0
                    ) {
                        newState.title = event.target.value; // either Born or Died
                    }
                }
            } else if (name === "locationTextual") {
                newState.locationTextual = svalue;
            } else if (name === "latitude") {
                newState.latitude = parseFloat(svalue);
            } else if (name === "longitude") {
                newState.longitude = parseFloat(svalue);
            } else if (name === "exactDate") {
                newState.exactDate = svalue;
                newState = buildReadableDateFromExact(newState, true);
            } else if (name === "lowerDate") {
                newState.lowerDate = svalue;
                newState = buildReadableDateFromRange(newState, true);
            } else if (name === "upperDate") {
                newState.upperDate = svalue;
                newState = buildReadableDateFromRange(newState, true);
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
            setState(newState);
        }
    }

    async function onFindLocationClicked(event: Event) {
        event.preventDefault();

        let geoResult = await geoGet(state.locationTextual);

        let [isOk, latitudeNew, longitudeNew] = getLatitudeLongitude(geoResult);

        if (isOk) {
            let newState = {
                ...state,
                latitude: latitudeNew.toFixed(2) as unknown as number,
                longitude: longitudeNew.toFixed(2) as unknown as number,
            };
            // props.onPointChange(props.id, newState);
            setState(newState);
        } else {
            console.log(`geoResult failed for ${state.locationTextual}`);
            console.log(geoResult);
        }
    }

    function kindToSend(k: string) {
        if (k === "pointBegin") {
            return "PointBegin";
        }
        if (k === "pointEnd") {
            return "PointEnd";
        }
        return "Point";
    }

    interface IPointSubmitData {
        title: string;
        kind: string;
        locationFuzz: number;
        dateFuzz: number;

        locationTextual?: string;
        latitude?: number;
        longitude?: number;
        dateTextual?: string;
        exactDate?: string;
        lowerDate?: string;
        upperDate?: string;
    }

    function handleSubmit(e: Event) {
        let s: IPointSubmitData = {
            title: state.title.trim(),
            kind: kindToSend(state.kind),
            locationFuzz: 0,
            dateFuzz: 0,
        };
        let canSend = false;

        if (state.locationTextual !== "") {
            s.locationTextual = state.locationTextual;
            canSend = true;
        }

        if (state.latitude !== 0 && state.longitude !== 0) {
            s.latitude = state.latitude;
            s.longitude = state.longitude;
            s.locationFuzz = state.locationFuzz;
            canSend = true;
        }

        if (state.dateTextualDerivedFrom === "exact") {
            s.dateTextual = state.dateTextual;
            s.exactDate = state.exactDate;
            s.dateFuzz = state.dateFuzz;

            // hack: need more robust date parsing
            if (
                s.exactDate.length === 4 ||
                (s.exactDate.length === 5 && s.exactDate[0] === "-")
            ) {
                s.exactDate += "-01-01";
                console.log(`rounding exact date to be: ${s.exactDate}`);
            }

            canSend = true;
        } else if (state.dateTextualDerivedFrom === "range") {
            s.dateTextual = state.dateTextual;
            s.lowerDate = state.lowerDate;
            s.upperDate = state.upperDate;
            s.dateFuzz = state.dateFuzz;
            canSend = true;
        }

        if (canSend) {
            onSubmit(s);
        }

        e.preventDefault();
    }

    function onShowMultiPointInputClicked(e) {
        e.preventDefault();
        setState({
            ...state,
            showMultiPointInput: !state.showMultiPointInput,
        });
    }

    return (
        <div>
            <form class="civil-form" onSubmit={handleSubmit}>
                <div class={!!pointKind ? "invisible" : "point-title"}>
                    <fieldset>
                        <legend>Title</legend>
                        <CivilInput
                            id="title"
                            value={state.title}
                            size="11"
                            readOnly={!!pointKind}
                            onInput={handleChangeEvent}
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
                        value={state.exactDate}
                        size="11"
                        onInput={handleChangeEvent}
                    />
                    <span class="civil-date-hint"> Format: YYYY-MM-DD</span>
                    <div class="civil-date-hint-after" />
                    <br />
                    <label for="lowerDate">Lower Date:</label>
                    <CivilInput
                        id="lowerDate"
                        value={state.lowerDate}
                        size="11"
                        onInput={handleChangeEvent}
                    />
                    <label for="upperDate">Upper Date:</label>
                    <CivilInput
                        id="upperDate"
                        value={state.upperDate}
                        size="11"
                        onInput={handleChangeEvent}
                    />
                    <div class="pointform-block pointform-space-top">
                        <input
                            id="round-to-year"
                            class="pointform-checkbox"
                            type="checkbox"
                            name="roundToYear"
                            checked={state.roundToYear}
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
                            checked={state.isApprox}
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
                            checked={state.presentAsDuration}
                            onInput={handleChangeEvent}
                        />
                        <label for="present-as-duration">
                            Present as Duration
                        </label>
                    </div>
                    <div class="pointform-space-top">
                        <label for="dateTextual">Displayed Date:</label>
                        <CivilInput
                            id="dateTextual"
                            value={state.dateTextual}
                            size="40"
                            readOnly="readOnly"
                        />
                    </div>
                </fieldset>
                <br />
                <fieldset>
                    <legend>{locationLegend}</legend>
                    <CivilInput
                        id="locationTextual"
                        value={state.locationTextual}
                        onInput={handleChangeEvent}
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
                        value={state.latitude}
                        onInput={handleChangeEvent}
                    />
                    <label for="longitude">Longitude:</label>
                    <input
                        id="longitude"
                        type="number"
                        name="longitude"
                        step="any"
                        value={state.longitude}
                        onInput={handleChangeEvent}
                    />
                </fieldset>
                <input type="submit" value={submitMessage} />
            </form>
            {onSubmitMultiplePoints && (
                <button onClick={onShowMultiPointInputClicked}>
                    Multi Point Input...
                </button>
            )}
            {state.showMultiPointInput && (
                <MultiPointInput onSubmit={onSubmitMultiplePoints} />
            )}
        </div>
    );
}

function MultiPointInput({ onSubmit }: { onSubmit?: any }) {
    const textAreaRef = useRef(null);
    const [content, setContent] = useState("");

    function buildPointItem(date: any, title: string) {
        let s = {
            title: title.trim(),
            kind: "Point",
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
                s.exactDate.length === 4 ||
                (s.exactDate.length === 5 && s.exactDate[0] === "-")
            ) {
                s.exactDate += "-01-01";
            }
        }

        return s;
    }

    function handleSubmit(e) {
        e.preventDefault();

        function processLine(line) {
            let xs = line.split(" ");
            let date = xs[0];
            let title = xs.slice(1).join(" ");

            return buildPointItem(date, title);
        }

        let points = content.split("\n").map(processLine);

        //console.log(points);
        onSubmit(points);
    }

    function onInput(event) {
        const target = event.target;
        setContent(target.value);
    }

    function onTextAreaFocus() {}

    function onTextAreaBlur() {}

    return (
        <form class="civil-form" onSubmit={handleSubmit}>
            <CivilTextArea
                id="content"
                value={content}
                elementRef={textAreaRef}
                onFocus={onTextAreaFocus}
                onBlur={onTextAreaBlur}
                onInput={onInput}
            />
            <br />
            <input type="submit" value="import multiple points" />
        </form>
    );
}

function asHumanReadableDate(parsedDate: any, isApprox: any, roundToYear: any) {
    // parsedDate is in the form: [year, month, day]

    let res = "";
    const [year, month, day] = parsedDate;

    if (isApprox) {
        if (roundToYear) {
            res += "c. ";
        } else {
            res += "Approx. ";
        }
    }

    if (!roundToYear) {
        res += textualDay(day) + " ";
        res += textualMonth(month) + ", ";
    }

    if (year < 0) {
        res += year * -1 + "BC";
    } else {
        res += year;
    }
    return res;
}

function asHumanReadableDateRange(
    lowerDate: any,
    upperDate: any,
    isApprox: any,
    roundToYear: any,
    presentAsDuration: any
) {
    // parsedDate is in the form: [year, month, day]

    let res = "";

    let firstWord = presentAsDuration ? "from" : "between";
    if (isApprox) {
        res += `Approx. ${firstWord} `;
    } else {
        if (!roundToYear) {
            res += `${capitalise(firstWord)} `;
        }
    }

    if (lowerDate) {
        const [year, month, day] = lowerDate;

        if (!roundToYear) {
            res += textualDay(day) + " ";
            res += textualMonth(month) + ", ";
        }

        if (year < 0) {
            res += year * -1 + "BC";
        } else {
            res += year;
        }
    } else {
        res += " some date";
    }

    res += presentAsDuration ? " to " : " and ";

    if (upperDate) {
        const [upperYear, upperMonth, upperDay] = upperDate;

        if (!roundToYear) {
            res += textualDay(upperDay) + " ";
            res += textualMonth(upperMonth) + ", ";
        }

        if (upperYear < 0) {
            res += upperYear * -1 + "BC";
        } else {
            res += upperYear;
        }
    } else {
        res += "sometime later";
    }

    return res;
}

function textualMonth(month: number) {
    switch (month) {
        case 1:
            return "January";
        case 2:
            return "February";
        case 3:
            return "March";
        case 4:
            return "April";
        case 5:
            return "May";
        case 6:
            return "June";
        case 7:
            return "July";
        case 8:
            return "August";
        case 9:
            return "September";
        case 10:
            return "October";
        case 11:
            return "November";
        case 12:
            return "December";
        default:
            return "MONTH ERROR"; // should never get here
    }
}

function textualDay(day: number) {
    switch (day) {
        case 1:
            return "1st";
        case 2:
            return "2nd";
        case 3:
            return "3rd";
        case 21:
            return "21st";
        case 22:
            return "22nd";
        case 23:
            return "23rd";
        case 31:
            return "31st";
        default:
            return `${day}th`;
    }
}

async function geoGet(location: any) {
    // have to use getCORS because we're not allowed to set 'content-type'
    let geoResult = await Net.getCORS(`https://geocode.xyz/${location}?json=1`);
    return geoResult;
}

function getLatitudeLongitude(geoResult: any): [boolean, number, number] {
    if (geoResult.error) {
        return [false, 0.0, 0.0];
    }

    let latt = parseFloat(geoResult.latt);
    let longt = parseFloat(geoResult.longt);

    if (isNaN(latt) || isNaN(longt)) {
        return [false, 0.0, 0.0];
    }

    if (latt === 0.0 && longt === 0.0) {
        return [false, 0.0, 0.0];
    }

    return [true, latt, longt];
}
