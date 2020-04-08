import React, { useState } from 'react';

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

  if (props.date) {
    if (props.date.textual && textual === '') {
      setTextual(props.date.textual);
    }
    if (props.date.exact_date && exact_date === '') {
      setExact_date(props.date.exact_date);
    }
    if (props.date.lower_date && lower_date === '') {
      setLower_date(props.date.lower_date);
    }
    if (props.date.upper_date && upper_date === '') {
      setUpper_date(props.date.upper_date);
    }
  }

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
    const parsedLowerDate = parseString(lower);
    const parsedUpperDate = parseString(upper);

    if (parsedLowerDate && parsedUpperDate) {
      textual = asHumanReadableDateRange(parsedLowerDate, parsedUpperDate, is_approx, round_to_year);
    }

    setTextual(textual);
    props.onDateChange(props.id, buildDateStruct(textual, lower, upper));
  };

  const buildReadableDateExact = (exact) => {
    let textual = "";

    // exact
    const parsedDate = parseString(exact);
    if (parsedDate) {
      textual = asHumanReadableDate(parsedDate, is_approx, round_to_year);
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
