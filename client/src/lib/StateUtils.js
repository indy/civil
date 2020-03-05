
const StateUtils = {
  isEmptyObject: (obj) => {
    return Object.entries(obj).length === 0 && obj.constructor === Object;
  },

  // remove any child objects from obj which are empty
  removeEmptyObjects: (obj) => {
    const keys = Object.keys(obj);
    for(var i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (Object.entries(obj[key]).length === 0 && obj[key].constructor === Object) {
        delete obj[key];
      }
    }
    return obj;
  },


  // remove the keys from obj that have empty strings
  removeEmptyStrings: (obj, keys) => {
    for(var i= 0; i < keys.length; i++) {
      let key = keys[i];
      if (typeof obj[key] === 'string' && obj[key].trim().length === 0) {
        delete obj[key];
      }
    }
    return obj;
  },

  removeKeys: (obj, keys) => {
    for(var i= 0; i < keys.length; i++) {
      let key = keys[i];
      delete obj[key];
    }
    return obj;
  },

};

export default StateUtils;
