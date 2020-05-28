import { jiggle } from './dee3utils';

export default function() {
  var nodes,
      distanceMin2 = 1,
      separatingForce = -900;


  function force(alpha) {
    for (var j = 0; j < nodes.length; j++) {
      for(var i = 0; i < nodes.length; i++) {
        if (i === j) {
          continue;
        }
        let xDelta = nodes[i].x - nodes[j].x;
        let yDelta = nodes[i].y - nodes[j].y;
        let distanceSquared = (xDelta * xDelta) + (yDelta * yDelta);

        if (xDelta === 0) {
          let d = jiggle();
          distanceSquared += d * d;
        }
        if (yDelta === 0) {
          let d = jiggle();
          distanceSquared += d * d;
        }
        if (distanceSquared < distanceMin2) distanceSquared = Math.sqrt(distanceMin2 * distanceSquared);

        let w = separatingForce * alpha / distanceSquared;

        nodes[j].vx += xDelta * w;
        nodes[j].vy += yDelta * w;
      }
    }
  }

  force.initialize = function(_) {
    nodes = _;
  };

  return force;
}
