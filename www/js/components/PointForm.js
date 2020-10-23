import { html, useState } from '/lib/preact/mod.js';

import { capitalise } from '/js/JsUtils.js';
import Net from '/js/Net.js';

export default function PointForm({ point, onSubmit, submitMessage, pointKind }) {

  let initialPoint = {
    title: '',
    title_backup: '',           // store the latest user inputted title value (in case title is replaced with a preset like 'Born' or 'Died' and then the user presses the 'Custom' radio tab, this will allow the previous user defined title to be restored)

    location_textual: '',
    latitude: 0.0,
    longitude: 0.0,
    location_fuzz: 0.0,

    date_textual: '',
    exact_date: '',
    lower_date: '',
    upper_date: '',
    date_fuzz: 0.5
  };

  if (point) {
    for (let [k, v] of Object.entries(point)) {
      if (v !== null) {
        initialPoint[k] = v;
      }
    }
  }

  // console.log(initialPoint);

  const [state, setState] = useState({
    title: initialPoint.title,
    title_backup: initialPoint.title_backup,
    location_textual: initialPoint.location_textual,
    latitude: initialPoint.latitude,
    longitude: initialPoint.longitude,
    location_fuzz: initialPoint.location_fuzz,
    date_textual: initialPoint.date_textual,
    exact_date: initialPoint.exact_date,
    lower_date: initialPoint.lower_date,
    upper_date: initialPoint.upper_date,
    date_fuzz: initialPoint.date_fuzz,
    date_textual_derived_from: '',
    is_approx: false,
    present_as_duration: false,
    round_to_year: false,
    has_typed_title: false,
    kind: pointKind || 'point'
  });

  // build a date_textual from whatever was the last user input date
  const buildReadableDateFromLast = (s) => {
    if (s.date_textual_derived_from === 'exact') {
      return buildReadableDateFromExact(s, true);
    } else if (s.date_textual_derived_from === 'range') {
      return buildReadableDateFromRange(s, true);
    }
    return s;
  };

  const buildReadableDateFromExact = (s, checkOther) => {
    const parsedDate = parseDateStringAsTriple(s.exact_date);
    if (parsedDate) {
      s.date_textual = asHumanReadableDate(parsedDate, s.is_approx, s.round_to_year);
      s.date_textual_derived_from = 'exact';
      s.date_fuzz = 0.5;
    } else if(checkOther) {
      buildReadableDateFromRange(s, false);
    } else {
      let year = parseDateStringAsYearOnly(s.exact_date);
      if (year) {
        s.date_textual = `${year}`;
        s.date_textual_derived_from = 'exact'; // ???
        s.round_to_year = true;
      } else {
        s.date_textual = '';
        s.date_textual_derived_from = '';
        s.round_to_year = false;
      }
    }
    return s;
  };

  const buildReadableDateFromRange = (s, checkOther) => {
    // lower and upper
    const parsedLowerDate = parseDateStringAsTriple(s.lower_date);
    const parsedUpperDate = parseDateStringAsTriple(s.upper_date);

    if (parsedLowerDate && parsedUpperDate) {
      s.date_textual = asHumanReadableDateRange(parsedLowerDate, parsedUpperDate, s.is_approx, s.round_to_year, s.present_as_duration);
      s.date_textual_derived_from = 'range';
      s.date_fuzz = 0.0;
    } else if (checkOther) {
      // at least one of the date ranges is invalid, so check if the exact date is correct
      return buildReadableDateFromExact(s, false);
    } else {
      let year = parseDateStringAsYearOnly(s.exact_date);
      if (year) {
        s.date_textual = `${year}`;
        s.date_textual_derived_from = 'exact'; // ???
        s.round_to_year = true;
      } else {
        s.date_textual = '';
        s.date_textual_derived_from = '';
        s.round_to_year = false;
      }
    }
    return s;
  };

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    let newState = {...state};

    if (name === "title") {
      newState.title = value;
      newState.title_backup = value;
      if (newState.title.length === 0) {
        // re-enable the functionality to autofill title to 'Born'
        // or 'Died' if the title is ever completely deleted
        newState.has_typed_title = false;
      } else {
        newState.has_typed_title = true;
      }
    } else if (name === "pointkind") {
      if (event.target.value === "Custom") {
        newState.title = newState.title_backup;
        newState.kind = 'point';
      } else {
        if (event.target.value === 'Born') {
          console.log('setting kind to point_begin');
          newState.kind = 'point_begin';
        } else if (event.target.value === 'Died') {
          console.log('setting kind to point_end');
          newState.kind = 'point_end';
        }
        if (!newState.has_typed_title || newState.title.length === 0) {
          newState.title = event.target.value; // either Born or Died
        }
      }
    } else if (name === "location_textual") {
      newState.location_textual = value;
    } else if (name === "latitude") {
      newState.latitude = parseFloat(value, 10);
    } else if (name === "longitude") {
      newState.longitude = parseFloat(value, 10);
    } else if (name === "exact_date") {
      newState.exact_date = value;
      newState = buildReadableDateFromExact(newState, true);
    } else if (name === "lower_date") {
      newState.lower_date = value;
      newState = buildReadableDateFromRange(newState, true);
    } else if (name === "upper_date") {
      newState.upper_date = value;
      newState = buildReadableDateFromRange(newState, true);
    } else if (name === "is_approx") {
      newState.is_approx = value;
      newState = buildReadableDateFromLast(newState);
    } else if (name === "present_as_duration") {
      newState.present_as_duration = value;
      newState = buildReadableDateFromLast(newState);
    } else if (name === "round_to_year") {
      newState.round_to_year = value;
      newState = buildReadableDateFromLast(newState);
    }

    // passPointIfValid(newState);
    setState(newState);
  };

  const onFindLocationClicked = async (event) => {
    event.preventDefault();

    let geoResult = await geoGet(state.location_textual);

    let [isOk, latitudeNew, longitudeNew] = getLatitudeLongitude(geoResult);
    if (isOk) {
      let newState = {
        ...state,
        latitude: latitudeNew.toFixed(2),
        longitude: longitudeNew.toFixed(2)
      };
      // props.onPointChange(props.id, newState);
      setState(newState);
    } else {
      console.log(`geoResult failed for ${state.location_textual}`);
      console.log(geoResult);
    }
  };


  function kindToSend(k) {
    if (k === 'point_begin') {
      return 'PointBegin';
    }
    if (k === 'point_end') {
      return 'PointEnd';
    }
    return 'Point';
  }

  const handleSubmit = (e) => {
    let s =  {
      title: state.title.trim(),
      kind: kindToSend(state.kind),
      location_fuzz: 0,
      date_fuzz: 0
    };
    let canSend = false;

    if (state.location_textual !== '') {
      s.location_textual = state.location_textual;
      canSend = true;
    }

    if (state.latitude !== 0 && state.longitude !== 0) {
      s.latitude = state.latitude;
      s.longitude = state.longitude;
      s.location_fuzz = state.location_fuzz;
      canSend = true;
    }

    if (state.date_textual_derived_from === 'exact') {
      s.date_textual = state.date_textual;
      s.exact_date = state.exact_date;
      s.date_fuzz = state.date_fuzz;

      // hack: need more robust date parsing
      if (s.exact_date.length === 4 || (s.exact_date.length === 5 && s.exact_date[0] === '-')) {
        s.exact_date += '-01-01';
        console.log(`rounding exact date to be: ${s.exact_date}`);
      }

      canSend = true;
    } else if (state.date_textual_derived_from === 'range') {
      s.date_textual = state.date_textual;
      s.lower_date = state.lower_date;
      s.upper_date = state.upper_date;
      s.date_fuzz = state.date_fuzz;
      canSend = true;
    }

    if (canSend) {
      onSubmit(s);
    }

    e.preventDefault();
  };

  return html`
    <form class="civil-form" onSubmit=${ handleSubmit }>
      <div class=${ !!pointKind ? 'invisible' : 'point-title'}>
        <fieldset>
          <legend>Title</legend>
          <input id="title"
                 type="text"
                 name="title"
                 value=${ state.title }
                 autoComplete="off"
                 size="11"
                 readOnly=${ !!pointKind }
                 onInput=${ handleChangeEvent }/>
        </fieldset>
      </div>
      <div class=${ !!pointKind ? 'invisible' : 'point-title'}>
        <fieldset>
          <legend>Point Type</legend>
          <input type="radio" id="pointkind-custom" name="pointkind" value="Custom" onInput=${ handleChangeEvent }/>
          <label for="pointkind-custom">Custom</label>
          <input type="radio" id="pointkind-born" name="pointkind" value="Born" onInput=${ handleChangeEvent }/>
          <label for="pointkind-born">Born</label>
          <input type="radio" id="pointkind-died" name="pointkind" value="Died" onInput=${ handleChangeEvent }/>
          <label for="pointkind-died">Died</label>
        </fieldset>
      </div>
      <fieldset>
        <legend>Time</legend>
        <label for="exact-date">Exact Date:</label>
        <input id="exact-date"
               type="text"
               name="exact_date"
               value=${ state.exact_date }
               autoComplete="off"
               size="11"
               onInput=${ handleChangeEvent } />
        <span class="civil-date-hint"> Format: YYYY-MM-DD</span>
        <div class="civil-date-hint-after"/>
        <br/>
        <label for="lower-date">Lower Date:</label>
        <input id="lower-date"
               type="text"
               name="lower_date"
               value=${ state.lower_date }
               autoComplete="off"
               size="11"
               onInput=${ handleChangeEvent } />
        <label for="upper-date">Upper Date:</label>
        <input id="upper-date"
               type="text"
               name="upper_date"
               value=${ state.upper_date }
               autoComplete="off"
               size="11"
               onInput=${ handleChangeEvent } />
        <div class="pointform-block pointform-space-top">
          <input id="round-to-year"
                 class="pointform-checkbox"
                 type="checkbox"
                 name="round_to_year"
                 checked=${ state.round_to_year }
                 onInput=${ handleChangeEvent } />
          <label for="round-to-year">Round to Year</label>
        </div>
        <div class="pointform-block">
          <input id="is-approx"
                 class="pointform-checkbox"
                 type="checkbox"
                 name="is_approx"
                 checked=${ state.is_approx }
                 onInput=${ handleChangeEvent } />
          <label for="is-approx">Is Approx</label>
        </div>
        <div class="pointform-block">
          <input id="present-as-duration"
                 class="pointform-checkbox"
                 type="checkbox"
                 name="present_as_duration"
                 checked=${ state.present_as_duration }
                 onInput=${ handleChangeEvent } />
          <label for="present-as-duration">Present as Duration</label>
        </div>
        <div class="pointform-space-top">
          <label for="date_textual">Displayed Date:</label>
          <input id="date_textual"
                 type="text"
                 name="date_textual"
                 value=${ state.date_textual }
                 size="40"
                 autoComplete="off"
                 readOnly="readOnly" />
        </div>
      </fieldset>
      <br/>
      <fieldset>
        <legend>Location</legend>
        <input id="location_textual"
               type="text"
               name="location_textual"
               autoComplete="off"
               value=${ state.location_textual }
               onInput=${ handleChangeEvent } />
        <p></p>
        <button onClick=${ (event) => { onFindLocationClicked(event);} }>Find location</button>
        <br/>
        <label for="latitude">Latitude:</label>
        <input id="latitude"
               type="number"
               name="latitude"
               step="any"
               value=${ state.latitude }
               onInput=${ handleChangeEvent } />
        <label for="longitude">Longitude:</label>
        <input id="longitude"
               type="number"
               name="longitude"
               step="any"
               value=${ state.longitude }
               onInput=${ handleChangeEvent } />
      </fieldset>
      <input type="submit" value=${ submitMessage }/>
    </form>
`;
}

function parseDateStringAsYearOnly(value) {
  const re = /^(-?)(\d{4})$/;
  const match = re.exec(value);

  if (!match) {
    // console.log("input doesn't match the required format of [-]YYYY");
    return null;
  }

  const isNegative = match[1] === "-";
  const year = isNegative ? parseInt(match[2], 10) * -1 : parseInt(match[2], 10);

  return year;
}

function parseDateStringAsTriple(value) {
  const re = /^(-?)(\d{4})-(\d{2})-(\d{2})$/;
  const match = re.exec(value);

  if (!match) {
    // console.log("input doesn't match the required format of [-]YYYY-MM-DD");
    return null;
  }

  const isNegative = match[1] === "-";
  const year = isNegative ? parseInt(match[2], 10) * -1 : parseInt(match[2], 10);
  const month = parseInt(match[3], 10);
  const day = parseInt(match[4], 10);

  if (month < 1 || month > 12) {
    console.log(`month value of ${month} is not in the range 1..12`);
    return null;
  }
  if (day < 1 || day > 31) {
    console.log(`day value of ${day} is not in the range 1..31`);
    return null;
  }

  return [year, month, day];
}

function asHumanReadableDate(parsedDate, isApprox, roundToYear) {
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
    res += (year * -1) + "BC";
  } else {
    res += year;
  }
  return res;
}

function asHumanReadableDateRange(lowerDate, upperDate, isApprox, roundToYear, presentAsDuration) {
  // parsedDate is in the form: [year, month, day]

  let res = "";

  let firstWord = presentAsDuration ? "from" : 'between';
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
      res += (year * -1) + "BC";
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
      res += (upperYear * -1) + "BC";
    } else {
      res += upperYear;
    }
  } else {
    res += "sometime later";
  }


  return res;
}


function textualMonth(month) {
  switch (month) {
  case 1: return "January";
  case 2: return "February";
  case 3: return "March";
  case 4: return "April";
  case 5: return "May";
  case 6: return "June";
  case 7: return "July";
  case 8: return "August";
  case 9: return "September";
  case 10: return "October";
  case 11: return "November";
  case 12: return "December";
  default: return "MONTH ERROR"; // should never get here
  }
}

function textualDay(day) {
  switch(day) {
  case 1: return '1st';
  case 2: return '2nd';
  case 3: return '3rd';
  case 21: return '21st';
  case 22: return '22nd';
  case 23: return '23rd';
  case 31: return '31st';
  default: return `${day}th`;
  }
}

async function geoGet(location) {
  // have to use getCORS because we're not allowed to set 'content-type'
  let geoResult = await Net.getCORS(`https://geocode.xyz/${location}?json=1`);
  return geoResult;
}

function getLatitudeLongitude(geoResult) {
  if (geoResult.error) {
    return [false];
  };

  let latt = parseFloat(geoResult.latt);
  let longt = parseFloat(geoResult.longt);

  if (isNaN(latt) || isNaN(longt)) {
    return [false];
  }

  if (latt === 0.0 && longt === 0.0) {
    return [false];
  }

  return [true, latt, longt];
}
