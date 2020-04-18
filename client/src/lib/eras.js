export const era = {
  uncategorisedYear: 9999,
  ancientCutoff: 354,
  medievalCutoff: 1469,
  modernCutoff: 1856
};

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

function yearFrom(dateString) {
  let res = 0;
  if (dateString[0] === '-') {
    res = parseInt(dateString.slice(0, 5), 10);
  } else {
    res = parseInt(dateString.slice(0, 4), 10);
  }
  return res;
}
