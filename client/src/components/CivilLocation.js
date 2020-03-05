import React, { Component } from 'react';
import GeoUtils from '../lib/GeoUtils';

class CivilLocation extends Component {
  constructor(props) {
    super(props);

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

    this.state = {
      textual: location.textual,
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  emptyLocationStructure = () => {
      const empty = {};
      return empty;
  }

  buildLocationStruct = () => {
    if (this.state.textual.trim().length === 0) {
      return this.emptyLocationStructure();
    }

    return {
      textual: this.state.textual,
      latitude: this.state.latitude,
      longitude: this.state.longitude,
      fuzz: 0.0
    };
  }

  updateLocation = (update) => {
    this.setState((prevState, props) => update, () => {
      this.props.onLocationChange(this.props.id, this.buildLocationStruct());
    });
  }

  handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    const update = {
      [name]: value
    };

    this.updateLocation(update);
  }

  onFindLocationClicked = async (event) => {
    event.preventDefault();

    const loc = this.state.textual;
    let geoResult = await GeoUtils.get(loc);

    let [isOk, latitude, longitude] = GeoUtils.getLatitudeLongitude(geoResult);
    if (isOk) {
      this.updateLocation({latitude, longitude});
    } else {
      console.log(`geoResult failed for ${loc}`);
      console.log(geoResult);
    }
  }

  render() {
    const {
      textual,
      latitude,
      longitude,
    } = this.state;

    return (
      <div className="civil-location">
        <label htmlFor="textual">Location:</label>
        <input id="textual"
               type="text"
               name="textual"
               autoComplete="off"
               value={ textual }
               onChange={ this.handleChangeEvent } />
        <button onClick={ (event) => { this.onFindLocationClicked(event);} }>Find location</button>

        <br/>

        <label htmlFor="latitude">Latitude:</label>
        <input id="latitude"
               type="number"
               name="latitude"
               value={ latitude }
               size="12"
               onChange={ this.handleChangeEvent } />

        <label htmlFor="longitude">Longitude:</label>
        <input id="longitude"
               type="number"
               name="longitude"
               value={ longitude }
               size="1"
               onChange={ this.handleChangeEvent } />

        <br/>
      </div>
    );
  }
}

export default CivilLocation;
