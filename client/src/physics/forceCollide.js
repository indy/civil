import { jiggle } from './dee3utils';

export default function() {
  var nodes;
  const muhRadii = 40;

  function force() {
    for (var j = 0; j < nodes.length; j++) {
      for (var i = j + 1; i < nodes.length; i++) {
        let node = nodes[i];
        let data = nodes[j];

        let ri = muhRadii;
        let ri2 = ri * ri;
        let xi = node.x + node.vx;
        let yi = node.y + node.vy;

        let x = xi - (data.x - data.vx);
        let y = yi - (data.y - data.vy);
        let l = (x * x) + (y * y);
        let rj = ri;
        let r = muhRadii + muhRadii;
        if (l < (r * r)) {
          if (x === 0) {
            x = jiggle();
            l += x * x;
          }

          if (y === 0) {
            y = jiggle();
            l += y * y;
          }

          l = (r - (l = Math.sqrt(l))) / l;
          node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
          node.vy += (y *= l) * r;
          data.vx -= x * (r = 1 - r);
          data.vy -= y * r;
        }
      }
    }
  }

  force.initialize = function(_) {
    nodes = _;
  };

  return force;
}
