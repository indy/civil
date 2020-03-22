import React, { useState } from 'react';
import GeoUtils from '../lib/GeoUtils';

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

    let geoResult = await GeoUtils.get(textual);

    let [isOk, latitudeNew, longitudeNew] = GeoUtils.getLatitudeLongitude(geoResult);
    if (isOk) {
      setLatitude(latitudeNew);
      setLongitude(longitudeNew);
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
             value={ latitude }
             size="12"
             onChange={ handleChangeEvent } />
      <label htmlFor="longitude">Longitude:</label>
      <input id="longitude"
             type="number"
             name="longitude"
             value={ longitude }
             size="1"
             onChange={ handleChangeEvent } />
      <br/>
    </div>
  );
}
