import { capitalise } from "shared/english";

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
    const re = /^(-?)(\d{4})$/;
    const match = re.exec(value);

    if (!match) {
        // console.log("input doesn't match the required format of [-]YYYY");
        return null;
    }

    const isNegative = match[1] === "-";
    const year = isNegative
        ? parseInt(match[2], 10) * -1
        : parseInt(match[2], 10);

    return year;
}

export function parseDateStringAsTriple(
    value: string
): [number, number, number] | null {
    const re = /^(-?)(\d{4})-(\d{2})-(\d{2})$/;
    const match = re.exec(value);

    if (!match) {
        // console.log("input doesn't match the required format of [-]YYYY-MM-DD");
        return null;
    }

    const isNegative = match[1] === "-";
    const year = isNegative
        ? parseInt(match[2], 10) * -1
        : parseInt(match[2], 10);
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
