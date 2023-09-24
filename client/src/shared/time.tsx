import { capitalise } from "../shared/english";

export function prettyPrintTimeSpan(deltaMS: number): string {

    let diffSecs = deltaMS / (1000);
    let diffMins = deltaMS / (1000 * 60);
    let diffHours = deltaMS / (1000 * 60 * 60);
    let diffDays = diffHours / 24;
    let diffWeeks = diffDays / 7;
    let diffYears = diffDays / 365.25;


    let unit = "";
    let val = 0;

    if (diffYears > 1) {
        unit = "year";
        val = diffYears;
    } else if (diffWeeks > 1) {
        unit = "week";
        val = diffWeeks;
    } else if (diffDays > 1) {
        unit = "day";
        val = diffDays;
    } else if (diffHours > 1) {
        unit = "hour";
        val = diffHours;
    } else if (diffMins > 1) {
        unit = "minute";
        val = diffMins;
    } else if (diffSecs > 1) {
        unit = "second";
        val = diffSecs;
    } else {
        unit = "millisecond";
        val = deltaMS;
    }

    let roundedVal = val.toFixed(2);
    if (roundedVal !== "1.00") {
        unit += "s";
    } else {
        roundedVal = "1";
    }

    return `${roundedVal} ${unit}`;
}

export function formattedDate(timestamp: string) {
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    const d = new Date(timestamp);
    const textual = d.toLocaleDateString("en-GB", options);

    return textual;
}

export function formattedTime(timestamp: string) {
    const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
    };
    const d = new Date(timestamp);
    const textual = d.toLocaleTimeString("en-GB", options);

    return textual;
}

// given a date, return the number of years since that date
export function deltaInYears(year: number, month: number, day: number) {
    let earlier: number = new Date(Date.UTC(year, month, day)).valueOf();
    let current = Date.now();

    let deltaMS = current - earlier;

    // convert ms to years
    return deltaMS / (1000 * 60 * 60 * 24 * 365.25);
}

export function calcAgeInYears(
    toTriple: [number, number, number],
    fromTriple: [number, number, number]
) {
    let years = toTriple[0] - fromTriple[0];
    if (toTriple[1] < fromTriple[1]) {
        years -= 1;
    } else if (toTriple[1] === fromTriple[1]) {
        if (toTriple[2] < fromTriple[2]) {
            years -= 1;
        }
    }
    return years;
}

export function dateStringAsTriple(
    dateString: string
): [number, number, number] {
    let triple = dateString.split("-").map((d) => parseInt(d, 10));
    if (dateString[0] == "-") {
        // triple will contain 4 elements, 1st is a NaN
        triple = triple.slice(1);
        triple[0] = -triple[0];
    }

    let ret: [number, number, number] = [triple[0], triple[1], triple[2]];
    return ret; // triple is [year, month, day]
}

export function parseDateStringAsYearOnly(value: string) {
    let r = parseDateStringLiberally(value);
    if (!r) {
        return undefined;
    }
    let [isNegative, year, _month, _day] = r;


    if (isNegative) {
        year *= -1;
    }

    return year;
}

export function parseDateStringLiberallyIntoStringTriple(date: string | undefined): string | undefined {
    let r = parseDateStringLiberally(date);
    if (!r) {
        return undefined;
    }
    let [isNegative, year, month, day] = r;

    let yearString = isNegative ?  '-' : '';
    yearString += `${year}`.padStart(4, '0');
    const monthString = `${month}`.padStart(2, '0');
    const dayString = `${day}`.padStart(2, '0');

    return `${yearString}-${monthString}-${dayString}`;
}

export function parseDateStringAsTriple(date: string | undefined): [number, number, number] | undefined {
    let r = parseDateStringLiberally(date);
    if (!r) {
        return undefined;
    }
    let [isNegative, year, month, day] = r;
    if (isNegative) {
        year *= -1;
    }

    return [year, month, day];
}

function parseDateStringLiberally(date: string | undefined): [boolean, number, number, number] | undefined {
    if (!date) {
        return undefined;
    }

    const re = /^(-?)(\d{1,4})-?(\d{1,2})?-?(\d{1,2})?$/;
    const match = re.exec(date);

    if (!match) {
        console.error("input doesn't match any recognisable date format");
        return undefined;
    }

    if (!match[2]) {
        console.error("no year given");
        return undefined;
    }

    const isNegative = match[1] === "-";
    const year = parseInt(match[2], 10);

    let month = 1;
    if (match[3]) {
        month = parseInt(match[3], 10);
    }
    if (month < 1 || month > 12) {
        console.error(`month value of ${month} is not in the range 1..12`);
        return undefined;
    }

    let day = 1;
    if (match[4]) {
        day = parseInt(match[4], 10);
    }
    if (day < 1 || day > 31) {
        console.error(`day value of ${day} is not in the range 1..31`);
        return undefined;
    }

    return [isNegative, year, month, day];
}

export function asHumanReadableDate(
    parsedDate: [number, number, number],
    isApprox: boolean,
    roundToYear: boolean
) {
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

export function asHumanReadableDateRange(
    lowerDate: [number, number, number],
    upperDate: [number, number, number],
    isApprox: boolean,
    roundToYear: boolean,
    presentAsDuration: boolean
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

export function daysUntil(date: string) {
    let nextTestDate = new Date(date);
    let todayDate = new Date();

    let delta = nextTestDate.getTime() - todayDate.getTime();
    let deltaDays = delta / (1000 * 3600 * 24);

    return Math.round(deltaDays);
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
