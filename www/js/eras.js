export const era = {
    uncategorisedYear: 9999,
    ancientCutoff: 354,
    medievalCutoff: 1469,
    modernCutoff: 1856
};

// given a date, return the number of years since that date
export function deltaInYears(year, month, day) {
    let earlier = new Date(Date.UTC(year, month, day));
    let current = Date.now();

    let deltaMS = current - earlier;

    // convert ms to years
    return deltaMS / (1000 * 60 * 60 * 24 * 365.25);
}

export function calcAgeInYears(to_triple, from_triple) {
    let years = to_triple[0] - from_triple[0];
    if (to_triple[1] < from_triple[1]) {
        years -= 1;
    } else if (to_triple[1] === from_triple[1]) {
        if (to_triple[2] < from_triple[2]) {
            years -= 1;
        }
    }
    return years;
}

export function dateStringAsTriple(dateString) {
    let triple = dateString.split('-').map(d => parseInt(d, 10));
    if (dateString[0] == '-') {
        // triple will contain 4 elements, 1st is a NaN
        triple = triple.slice(1);
        triple[0] = -triple[0];
    }
    return triple;                // triple is [year, month, day]
}

export function filterBefore(objs, year) {
    return objs
        .filter(o => o.sort_year < year)
        .sort((a, b) => a.sort_year > b.sort_year);

}

export function filterBetween(objs, early, late) {
    return objs
        .filter(o => o.sort_year >= early && o.sort_year < late)
        .sort((a, b) => a.sort_year > b.sort_year);
}

export function filterAfter(objs, year) {
    return objs
        .filter(o => o.sort_year >= year)
        .sort((a, b) => a.sort_year > b.sort_year);
}

export function addSortYear(p) {
    if (p.sort_date) {
        p.sort_year = extractYear(p.sort_date);
    } else {
        p.sort_year = era.uncategorisedYear;
    }
}

export function addChronologicalSortYear(p) {
    if (p.exact_date) {
        p.sort_year = extractYear(p.exact_date);
    } else if (p.lower_date) {
        p.sort_year = extractYear(p.lower_date);
    } else {
        p.sort_year = era.uncategorisedYear;
    }
    return p;
}

function extractYear(dateString) {
    let res = 0;
    if (!dateString) {
        res = 9999;                 // if an event has been created via quickForm and has only title information
    } else if (dateString[0] === '-') {
        res = parseInt(dateString.slice(0, 5), 10);
    } else {
        res = parseInt(dateString.slice(0, 4), 10);
    }
    return res;
}


export function parseDateStringAsYearOnly(value) {
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

export function parseDateStringAsTriple(value) {
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
