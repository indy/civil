import { jiggle } from './dee3utils';

export default function(links) {
  var strength = defaultStrength,
      strengths,
      distance = 30,            // this was the default in d3
      nodes,
      count,
      bias;

  if (links == null) links = [];

  function defaultStrength(link) {
    return 1 / Math.min(count[link[0]], count[link[1]]);
  }

  function force(alpha) {
    let n = links.length;
    for (var i = 0, link, source, target, x, y, l, b; i < n; ++i) {
      link = links[i];
      source = nodes[link[0]];
      target = nodes[link[1]];
      x = target.x + target.vx - source.x - source.vx || jiggle();
      y = target.y + target.vy - source.y - source.vy || jiggle();
      l = Math.sqrt(x * x + y * y);
      l = (l - distance) / l * alpha * strengths[i];
      x *= l;
      y *= l;
      target.vx -= x * (b = bias[i]);
      target.vy -= y * b;
      source.vx += x * (b = 1 - b);
      source.vy += y * b;
    }

  }

  function initialize() {
    if (!nodes) return;

    var i,
        n = nodes.length,
        m = links.length,
        link;

    count = new Array(n);
    for (i = 0; i < m; ++i) {
      link = links[i];
      count[link[0]] = (count[link[0]] || 0) + 1;
      count[link[1]] = (count[link[1]] || 0) + 1;
    }

    bias = new Array(m);
    for (i = 0; i < m; ++i) {
      link = links[i];
      bias[i] = count[link[0]] / (count[link[0]] + count[link[1]]);
    }

    strengths = new Array(m);
    initializeStrength();

    // console.log(count);
    // console.log(bias);
    // console.log(strengths);
  }

  function initializeStrength() {
    if (!nodes) return;

    for (var i = 0, n = links.length; i < n; ++i) {
      strengths[i] = +strength(links[i], i, links);
    }
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  return force;
}
