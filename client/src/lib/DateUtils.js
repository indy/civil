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

const DateUtils = {
  parseString: (value) => {
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
  },

  asHumanReadableDate: (parsedDate, isApprox, roundToYear) => {
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
  },

  asHumanReadableDateRange: (lowerDate, upperDate, isApprox, roundToYear) => {
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
  },

  calculateAge : (birth, death) => {
    if (!birth) {
      return "";
    }

    let earlier = ymd_from_object(birth);
    let later = death ? ymd_from_object(death) : ymd_from_now();

    let a_ymd = earlier.ymd;
    let b_ymd = later.ymd;

    let years = b_ymd[0] - a_ymd[0];
    if (b_ymd[1] < a_ymd[1]) {
      years -= 1;
    } else if ((b_ymd[1] === a_ymd[1]) && (b_ymd[2] < a_ymd[2])) {
        years -= 1;
    };

    let res = (!earlier.isExact || !later.isExact) ? "Approx " : "";
    res += `${years}`;

    return res;
  }
};

// ymd == Year, Month, Day

function ymd_from_now() {
  const d = new Date();
  return {
    ymd: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
    isExact: true
  };
}

function ymd_from_object(date) {
  if (date.exact_date) {
    // happy days
    return {
      ymd: parse_ymd_from_string(date.exact_date),
      isExact: true
    };
  }

  if (date.lower_date && date.upper_date) {
    // get a year roughly inbetween the lower and upper bounds
    let lower = parse_ymd_from_string(date.lower_date);
    let upper = parse_ymd_from_string(date.upper_date);

    return {
      ymd: [Math.floor((lower[0] + upper[0]) / 2), lower[1], lower[2]],
      isExact: false
    };
  }

  if (date.lower_date) {
    return {
      ymd: parse_ymd_from_string(date.lower_date),
      isExact: false
    };
  }

  if (date.upper_date) {
    return {
      ymd: parse_ymd_from_string(date.upper_date),
      isExact: false
    };
  }

  console.error(`can't determine year/month/day from ${date}`);
  return undefined;
}

function parse_ymd_from_string(s) {
  let res = [];
  let parts = s.split("-");
  if (parts.length === 4) {
    res = [-parseInt(parts[1], 10), parseInt(parts[2], 10), parseInt(parts[3], 10)];
  } else if (parts.length === 3) {
    res = [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
  } else {
    console.error(`invalid date string given to parse_ymd_from_string: ${s}`);
  }

  return res;
}

export default DateUtils;
