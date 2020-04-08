import React, { useState } from 'react';
import Net from '../lib/Net';

export default function CivilLocation(props) {
  let location = {};
  if (props.location) {
    location = props.location;
  } else {
    location = {
      textual: '',
      latitude: 0.0,
      longitude: 0.0,
    };
  }

  const [textual, setTextual] = useState(location.textual);
  const [latitude, setLatitude] = useState(location.latitude);
  const [longitude, setLongitude] = useState(location.longitude);

  if (props.location) {
    if (props.location.textual && textual === '') {
      setTextual(props.location.textual);
    }
    if (props.location.latitude && latitude === 0) {
      setLatitude(props.location.latitude);
    }
    if (props.location.longitude && longitude === 0) {
      setLongitude(props.location.longitude);
    }
  }

  const emptyLocationStructure = () => {
      const empty = {};
      return empty;
  };

  const buildLocationStruct = () => {
    if (textual.trim().length === 0) {
      return emptyLocationStructure();
    }

    return {
      textual: textual,
      latitude: Number(latitude),
      longitude: Number(longitude),
      fuzz: 0.0
    };
  };

  const updateLocation = () => {
    props.onLocationChange(props.id, buildLocationStruct());
  };

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "textual") {
      setTextual(value);
    } else if (name === "latitude") {
      setLatitude(value);
    } else if (name === "longitude") {
      setLongitude(value);
    }

    updateLocation();
  };

  const onFindLocationClicked = async (event) => {
    event.preventDefault();

    let geoResult = await geoGet(textual);

    let [isOk, latitudeNew, longitudeNew] = getLatitudeLongitude(geoResult);
    if (isOk) {
      setLatitude(latitudeNew.toFixed(2));
      setLongitude(longitudeNew.toFixed(2));
      updateLocation();
    } else {
      console.log(`geoResult failed for ${textual}`);
      console.log(geoResult);
    }
  };

  return (
    <div className="civil-location">
      <label htmlFor="textual">Location:</label>
      <input id="textual"
             type="text"
             name="textual"
             autoComplete="off"
             value={ textual }
             onChange={ handleChangeEvent } />
      <button onClick={ (event) => { onFindLocationClicked(event);} }>Find location</button>
      <br/>
      <label htmlFor="latitude">Latitude:</label>
      <input id="latitude"
             type="number"
             name="latitude"
             step="any"
             value={ latitude }
             onChange={ handleChangeEvent } />
      <label htmlFor="longitude">Longitude:</label>
      <input id="longitude"
             type="number"
             name="longitude"
             step="any"
             value={ longitude }
             onChange={ handleChangeEvent } />
      <br/>
    </div>
  );
}

async function geoGet(location) {
  let geoResult = await Net.get(`https://geocode.xyz/${location}?json=1`);
  return geoResult;
}

function getLatitudeLongitude(geoResult) {
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
