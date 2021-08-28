// remove the keys from obj that have empty strings
export function removeEmptyStrings(obj, keys) {
  for(var i= 0; i < keys.length; i++) {
    let key = keys[i];
    if (typeof obj[key] === 'string' && obj[key].trim().length === 0) {
      delete obj[key];
    }
  }
  return obj;
}

export function nonEmptyArray(arr) {
  return arr && arr.length > 0;
}

export function capitalise(text) {
  const capitaliseWord = word => word.slice(0, 1).toUpperCase() + word.slice(1);
  return text.split(' ').map(capitaliseWord).join(' ');
}

export function plural(num, phrase, suffix) {
  return (num === 1) ? `${num} ${phrase}` : `${num} ${phrase}${suffix}`;
}

export function formattedDate(timestamp) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const d = new Date(timestamp);
  const textual = d.toLocaleDateString("en-GB", options);

  return textual;
}

export function formattedTime(timestamp) {
  const options = { hour: '2-digit', minute: '2-digit' };
  const d = new Date(timestamp);
  const textual = d.toLocaleTimeString("en-GB", options);

  return textual;
}

export function daysUntil(date) {
  let nextTestDate  = new Date(date);
  let todayDate = new Date();


  let delta = nextTestDate.getTime() - todayDate.getTime();
  let deltaDays = delta / (1000 * 3600 * 24);

  return Math.round(deltaDays);
}


export function opposingKind(kind) {
  switch(kind) {
  case 'ref': return 'ref';
  case 'ref_to_parent': return 'ref_to_child';
  case 'ref_to_child': return 'ref_to_parent';
  case 'ref_in_contrast': return 'ref_in_contrast';
  case 'ref_critical': return 'ref_critical';
  default: {
    console.log(`opposing_kind error: ${kind}`);
    return 'opposing_kind ERROR';
  }
  }
}
