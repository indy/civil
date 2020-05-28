export default function(x) {
  var nodes;
  let isgStrength = 0.1;
  let isgXZ = 0.0;              // the value of x to goto

  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i];
      node.vx += (isgXZ - node.x) * isgStrength * alpha;
    }
  }

  force.initialize = function(_) {
    nodes = _;
  };

  return force;
}
