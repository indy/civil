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
