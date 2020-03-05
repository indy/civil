import Net from './Net';

const GeoUtils = {
  get: async (location) => {
    let geoResult = await Net.get(`https://geocode.xyz/${location}?json=1`);
    return geoResult;
  },

  getLatitudeLongitude: (geoResult) => {
    if (geoResult.error) {
      return [false];
    };

    let latt = parseFloat(geoResult.latt);
    let longt = parseFloat(geoResult.longt);

    if (isNaN(latt) || isNaN(longt)) {
      return [false];
    }

    if (latt === 0.0 && longt === 0.0) {
      return [false];
    }

    return [true, latt, longt];
  }
};

export default GeoUtils;
