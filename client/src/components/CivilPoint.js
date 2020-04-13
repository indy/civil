import React, { useState } from 'react';
import Net from '../lib/Net';

export default function CivilPoint(props) {
  let point = {
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

  if (props.point) {
    for (let [k, v] of Object.entries(props.point)) {
      if (v !== null) {
        console.log(k, v);
        point[k] = v;
      }
    }
  }

  console.log(point);

  const [state, setState] = useState({
    location_textual: point.location_textual,
    latitude: point.latitude,
    longitude: point.longitude,
    location_fuzz: point.location_fuzz,
    date_textual: point.date_textual,
    exact_date: point.exact_date,
    lower_date: point.lower_date,
    upper_date: point.upper_date,
    date_fuzz: point.date_fuzz,
    date_textual_derived_from: '',
    is_approx: false,
    round_to_year: false
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
    const parsedDate = parseString(s.exact_date);
    if (parsedDate) {
      s.date_textual = asHumanReadableDate(parsedDate, s.is_approx, s.round_to_year);
      s.date_textual_derived_from = 'exact';
      s.date_fuzz = 0.5;
    } else if(checkOther) {
      buildReadableDateFromRange(s, false);
    } else {
      s.date_textual = '';
      s.date_textual_derived_from = '';
    }
    return s;
  };

  const buildReadableDateFromRange = (s, checkOther) => {
    // lower and upper
    const parsedLowerDate = parseString(s.lower_date);
    const parsedUpperDate = parseString(s.upper_date);

    if (parsedLowerDate && parsedUpperDate) {
      s.date_textual = asHumanReadableDateRange(parsedLowerDate, parsedUpperDate, s.is_approx, s.round_to_year);
      s.date_textual_derived_from = 'range';
      s.date_fuzz = 0.0;
    } else if (checkOther) {
      // at least one of the date ranges is invalid, so check if the exact date is correct
      return buildReadableDateFromExact(s, false);
    } else {
      s.date_textual = '';
      s.date_textual_derived_from = '';
    }
    return s;
  };

  // extract relevent point data
  function passPointIfValid(newState) {
    let s =  {
      location_fuzz: 0,
      date_fuzz: 0
    };
    let canSend = false;

    if (newState.location_textual !== '') {
      s.location_textual = newState.location_textual;
      canSend = true;
    }

    if (newState.latitude !== 0 && newState.longitude !== 0) {
      s.latitude = newState.latitude;
      s.longitude = newState.longitude;
      s.location_fuzz = newState.location_fuzz;
      canSend = true;
    }

    if (newState.date_textual_derived_from === 'exact') {
      s.date_textual = newState.date_textual;
      s.exact_date = newState.exact_date;
      s.date_fuzz = newState.date_fuzz;
      canSend = true;
    } else if (newState.date_textual_derived_from === 'range') {
      s.date_textual = newState.date_textual;
      s.lower_date = newState.lower_date;
      s.upper_date = newState.upper_date;
      s.date_fuzz = newState.date_fuzz;
      canSend = true;
    }

    if (canSend) {
      props.onPointChange(props.id, s);
    }
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    let newState = {...state};

    if (name === "location_textual") {
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
    } else if (name === "round_to_year") {
      newState.round_to_year = value;
      newState = buildReadableDateFromLast(newState);
    }

    passPointIfValid(newState);
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
      props.onPointChange(props.id, newState);
      setState(newState);
    } else {
      console.log(`geoResult failed for ${state.location_textual}`);
      console.log(geoResult);
    }
  };

  return (
    <div>
      <label htmlFor="exact-date">Exact Date:</label>
      <input id="exact-date"
             type="text"
             name="exact_date"
             value={ state.exact_date }
             autoComplete="off"
             size="11"
             onChange={ handleChangeEvent } />
      <span className="civil-date-hint"> Format: YYYY-MM-DD</span>
      <br/>
      <label htmlFor="lower-date">Lower Date:</label>
      <input id="lower-date"
             type="text"
             name="lower_date"
             value={ state.lower_date }
             autoComplete="off"
             size="11"
             onChange={ handleChangeEvent } />
      <label htmlFor="upper-date">Upper Date:</label>
      <input id="upper-date"
             type="text"
             name="upper_date"
             value={ state.upper_date }
             autoComplete="off"
             size="11"
             onChange={ handleChangeEvent } />
      <br/>
      <label htmlFor="is-approx">Is Approx:</label>
      <input id="is-approx"
             type="checkbox"
             name="is_approx"
             checked={ state.is_approx }
             onChange={ handleChangeEvent } />
      <label htmlFor="round-to-year">Round to Year:</label>
      <input id="round-to-year"
             type="checkbox"
             name="round_to_year"
             checked={ state.round_to_year }
             onChange={ handleChangeEvent } />
      <br/>
      <label htmlFor="date_textual">Displayed Date:</label>
      <input id="date_textual"
             type="text"
             name="date_textual"
             value={ state.date_textual }
             size="40"
             autoComplete="off"
             readOnly="readOnly" />
      <br/>
      <label htmlFor="textual">Location:</label>
      <input id="location_textual"
             type="text"
             name="location_textual"
             autoComplete="off"
             value={ state.location_textual }
             onChange={ handleChangeEvent } />
      <button onClick={ (event) => { onFindLocationClicked(event);} }>Find location</button>
      <br/>
      <label htmlFor="latitude">Latitude:</label>
      <input id="latitude"
             type="number"
             name="latitude"
             step="any"
             value={ state.latitude }
             onChange={ handleChangeEvent } />
      <label htmlFor="longitude">Longitude:</label>
      <input id="longitude"
             type="number"
             name="longitude"
             step="any"
             value={ state.longitude }
             onChange={ handleChangeEvent } />
    </div>
  );
}

function parseString(value) {
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

function asHumanReadableDateRange(lowerDate, upperDate, isApprox, roundToYear) {
  // parsedDate is in the form: [year, month, day]

  let res = "";

  if (isApprox) {
    res += "Approx. between ";
  } else {
    if (!roundToYear) {
      res += "Between ";
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

  res += " and ";

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
