import React, { useState } from 'react';
import DateUtils from '../lib/DateUtils';

export default function CivilDate(props) {
  let date = {};
  if (props.date) {
    date = props.date;
  } else {
    date = {
      textual: '',
      exact_date: '',
      lower_date: '',
      upper_date: '',
    };
  }
  const [textual, setTextual] = useState(date.textual);
  const [exact_date, setExact_date] = useState(date.exact_date);
  const [lower_date, setLower_date] = useState(date.lower_date);
  const [upper_date, setUpper_date] = useState(date.upper_date);
  const [is_approx, setIs_approx] = useState(false);
  const [round_to_year, setRound_to_year] = useState(false);

  const emptyDateStructure = () => {
      const empty = {};
      return empty;
  };

  const buildDateStruct = (textualLatest, d1, d2) => {
    if (textualLatest.trim().length === 0) {
      return emptyDateStructure();
    }

    // the structure that could be sent to the server
    const dateStruct = {
      textual: textualLatest
    };

    let haveADate = false;
    if ((!d2 || d2.length === 0) && d1.trim().length > 0) {
      haveADate = true;
      dateStruct.exact_date = d1;
      dateStruct.fuzz = 0.5;    // half a day
    } else if (d1.trim().length > 0 && d2.trim().length > 0) {
      haveADate = true;
      dateStruct.lower_date = d1;
      dateStruct.upper_date = d2;
      dateStruct.fuzz = 0.0;    // upper and lower make fuzz value irrelevent
    }

    if (haveADate === false) {
      return emptyDateStructure();
    }

    console.log(dateStruct);
    return dateStruct;
  };

  const buildReadableDateRange = (lower, upper) => {
    let textual = "";

    // lower and upper
    const parsedLowerDate = DateUtils.parseString(lower);
    const parsedUpperDate = DateUtils.parseString(upper);

    if (parsedLowerDate && parsedUpperDate) {
      textual = DateUtils.asHumanReadableDateRange(parsedLowerDate, parsedUpperDate, is_approx, round_to_year);
    }

    setTextual(textual);
    props.onDateChange(props.id, buildDateStruct(textual, lower, upper));
  };

  const buildReadableDateExact = (exact) => {
    let textual = "";

    // exact
    const parsedDate = DateUtils.parseString(exact);
    if (parsedDate) {
      textual = DateUtils.asHumanReadableDate(parsedDate, is_approx, round_to_year);
    }

    setTextual(textual);
    props.onDateChange(props.id, buildDateStruct(textual, exact));
  };

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    if (name === "exact_date") {
      console.log('set exact date');
      setExact_date(value);
      buildReadableDateExact(value);
    } else if (name === "lower_date") {
      setLower_date(value);
      buildReadableDateRange(value, upper_date);
    } else if (name === "upper_date") {
      setUpper_date(value);
      buildReadableDateRange(lower_date, value);
    } else if (name === "is_approx") {
      setIs_approx(value);
    } else if (name === "round_to_year") {
      setRound_to_year(value);
    }
  };

  return (
    <div>
      <label htmlFor="exact-date">Exact Date:</label>
      <input id="exact-date"
             type="text"
             name="exact_date"
             value={ exact_date }
             autoComplete="off"
             size="11"
             onChange={ handleChangeEvent } />
      <span className="civil-date-hint"> Format: YYYY-MM-DD</span>
      <br/>
      <label htmlFor="lower-date">Lower Date:</label>
      <input id="lower-date"
             type="text"
             name="lower_date"
             value={ lower_date }
             autoComplete="off"
             size="11"
             onChange={ handleChangeEvent } />
      <label htmlFor="upper-date">Upper Date:</label>
      <input id="upper-date"
             type="text"
             name="upper_date"
             value={ upper_date }
             autoComplete="off"
             size="11"
             onChange={ handleChangeEvent } />
      <br/>
      <label htmlFor="is-approx">Is Approx:</label>
      <input id="is-approx"
             type="checkbox"
             name="is_approx"
             checked={ is_approx }
             onChange={ handleChangeEvent } />
      <label htmlFor="round-to-year">Round to Year:</label>
      <input id="round-to-year"
             type="checkbox"
             name="round_to_year"
             checked={ round_to_year }
             onChange={ handleChangeEvent } />
      <br/>
      <label htmlFor="textual">Displayed Date:</label>
      <input id="textual"
             type="text"
             name="textual"
             value={ textual }
             size="40"
             autoComplete="off"
             readOnly="readOnly" />
    </div>
  );
}
