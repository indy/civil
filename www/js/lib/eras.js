export const era = {
  uncategorisedYear: 9999,
  ancientCutoff: 354,
  medievalCutoff: 1469,
  modernCutoff: 1856
};

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
    p.sort_year = yearFrom(p.sort_date);
  } else {
    p.sort_year = era.uncategorisedYear;
  }
}

export function addChronologicalSortYear(p) {
  if (p.exact_date) {
    p.sort_year = yearFrom(p.exact_date);
  } else if (p.lower_date) {
    p.sort_year = yearFrom(p.lower_date);
  } else {
    p.sort_year = era.uncategorisedYear;
  }
  return p;
}

export function yearFrom(dateString) {
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
