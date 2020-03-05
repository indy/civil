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
  }
};

export default DateUtils;
