// remove any child objects from obj which are empty
export function removeEmptyObjects(obj) {
  const keys = Object.keys(obj);
  for(var i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (Object.entries(obj[key]).length === 0 && obj[key].constructor === Object) {
      delete obj[key];
    }
  }
  return obj;
}

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
