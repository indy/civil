import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import Net from '../lib/Net';

class Points extends Component {
  constructor(props) {
    super(props);

    this.state = {
      points: [],
      showAddPointLink: false
    };

    Net.get('/api/points').then(points => {
      this.setState({ points });
    });
  }

  createPointListing = (point) => {
    return <PointListing id={ point.id } key={ point.id } title={ point.title }/>;
  }

  toggleShowAdd = () => {
    this.setState((prevState, props) => ({
      showAddPointLink: !prevState.showAddPointLink
    }));
  }

  render() {
    const { points } = this.state;
    const pointsList = points.map(this.createPointListing);

    return (
      <div>
        <h1 onClick={ this.toggleShowAdd }>Points</h1>
        { this.state.showAddPointLink && <Link to='/add-point'>Add Point</Link> }
        <ul>
          { pointsList }
        </ul>
      </div>
    );
  }
}

const PointListing = props => {
  const href = `/points/${props.id}`;
  return (<li><Link to={ href }>{ props.title }</Link></li>);
};

export default Points;
