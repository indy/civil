export default function(x) {
  var nodes;
  let isgStrength = 0.2;
  let isgYZ = 0.0;              // the value of x to goto

  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i];
      node.vy += (isgYZ - node.y) * isgStrength * alpha;
    }
  }

  force.initialize = function(_) {
    nodes = _;
  };

  return force;
}
