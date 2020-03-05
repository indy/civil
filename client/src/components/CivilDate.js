import React, { Component } from 'react';
import DateUtils from '../lib/DateUtils';

class CivilDate extends Component {
  constructor(props) {
    super(props);

    let date = {};
    if (props.date) {
      date = props.date;
    } else {
      date = {
        textual: '',
        exact_date: '',
        lower_date: '',
        upper_date: '',
      };
    }

    this.state = {
      textual: date.textual,
      exact_date: date.exact_date,
      lower_date: date.lower_date,
      upper_date: date.upper_date,
      is_approx: false,
      round_to_year: false//,
    };
  }

  emptyDateStructure = () => {
      const empty = {};
      return empty;
  }

  buildDateStruct = () => {
    if (this.state.textual.trim().length === 0) {
      return this.emptyDateStructure();
    }

    // the structure that could be sent to the server
    const dateStruct = {
      textual: this.state.textual,
    };

    let haveADate = false;
    if (this.state.exact_date.trim().length > 0) {
      haveADate = true;
      dateStruct.exact_date = this.state.exact_date;
      dateStruct.fuzz = 0.5;    // half a day
    } else if (this.state.lower_date.trim().length > 0 && this.state.upper_date.trim().length > 0) {
      haveADate = true;
      dateStruct.lower_date = this.state.lower_date;
      dateStruct.upper_date = this.state.upper_date;
      dateStruct.fuzz = 0.0;    // upper and lower make fuzz value irrelevent
    }

    if (haveADate === false) {
      return this.emptyDateStructure();
    }

    return dateStruct;
  }

  buildReadableDate = () => {
    let textual = "";
    const isApprox = this.state.is_approx;
    const roundToYear = this.state.round_to_year;

    // exact
    const parsedDate = DateUtils.parseString(this.state.exact_date);
    if (parsedDate) {
      textual = DateUtils.asHumanReadableDate(parsedDate, isApprox, roundToYear);
    } else {
      // lower and upper
      const parsedLowerDate = DateUtils.parseString(this.state.lower_date);
      const parsedUpperDate = DateUtils.parseString(this.state.upper_date);

      if (parsedLowerDate && parsedUpperDate) {
        textual = DateUtils.asHumanReadableDateRange(parsedLowerDate, parsedUpperDate, isApprox, roundToYear);
      }
    }

    const update = {
      textual
    };

    this.setState((prevState, props) => update, () => {
      this.props.onDateChange(this.props.id, this.buildDateStruct());
    });
  }

  handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    const update = {
      [name]: value
    };

    this.setState(update);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.state.is_approx !== prevState.is_approx
        || this.state.lower_date !== prevState.lower_date
        || this.state.upper_date !== prevState.upper_date
        || this.state.round_to_year !== prevState.round_to_year
        || this.state.exact_date !== prevState.exact_date) {
      this.buildReadableDate();
    }
  }

  render() {
    const {
      textual,
      exact_date,
      lower_date,
      upper_date,
    } = this.state;

    return (
      <div>
        <label htmlFor="exact-date">Exact Date:</label>
        <input id="exact-date"
               type="text"
               name="exact_date"
               value={ exact_date }
               autoComplete="off"
               size="11"
               onChange={ this.handleChangeEvent } />
        <span className="civil-date-hint"> Format: YYYY-MM-DD</span>
        <br/>
        <label htmlFor="lower-date">Lower Date:</label>
        <input id="lower-date"
               type="text"
               name="lower_date"
               value={ lower_date }
               autoComplete="off"
               size="11"
               onChange={ this.handleChangeEvent } />
        <label htmlFor="upper-date">Upper Date:</label>
        <input id="upper-date"
               type="text"
               name="upper_date"
               value={ upper_date }
               autoComplete="off"
               size="11"
               onChange={ this.handleChangeEvent } />
        <br/>
        <label htmlFor="is-approx">Is Approx:</label>
        <input id="is-approx"
               type="checkbox"
               name="is_approx"
               checked={this.state.is_approx}
               onChange={ this.handleChangeEvent } />
        <label htmlFor="round-to-year">Round to Year:</label>
        <input id="round-to-year"
               type="checkbox"
               name="round_to_year"
               checked={this.state.round_to_year}
               onChange={ this.handleChangeEvent } />
        <br/>
        <label htmlFor="textual">Displayed Date:</label>
        <input id="textual"
               type="text"
               name="textual"
               value={ textual }
               size="40"
               autoComplete="off"
               readOnly="readOnly" />
      </div>
    );
  }
}

export default CivilDate;
