var initialRadius = 10,
    initialAngle = Math.PI * (3 - Math.sqrt(5));

export default function(graphState) {
  var strengths,
      count,
      bias;

  var simulation,
      alpha = 1,
      alphaMin = 0.001,
      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
      alphaTarget = 0,
      velocityDecay = 0.6;

  var tickCallback = undefined;

  if (graphState.nodes == null) graphState.nodes = [];

  function forceLink() {
    var i;
    let nodes = graphState.nodes;
    let links = graphState.edges;
    let m = links.length;

    let distance = 30;
    var link, source, target, x, y, l, b;
    for (i = 0; i < m; ++i) {
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

  function step() {
    tick();
    // event.call("tick", simulation);
    if (tickCallback) {
      tickCallback(graphState);
    }

    if (alpha < alphaMin) {
      console.log('stopping requestAnimationFrame');
      // stepper.stop();
      // event.call("end", simulation);
    } else {
      window.requestAnimationFrame(step);
    }
  }

  function tick(iterations) {
    let i, j, node;
    let nodes = graphState.nodes;
    let n = nodes.length;

    alpha += (alphaTarget - alpha) * alphaDecay;

    forceLink();

    for (j = 0; j < n; j++) {
      for (i = 0; i < n; i++) {
        if (i === j) {
          continue;
        }
        forceManyBody(nodes[j], nodes[i], alpha);
      }
    }

    for (j = 0; j < n; j++) {
      for (i = j + 1; i < n; i++) {
        forceCollide(nodes[i], nodes[j]);
      }
    }

    for (j = 0; j < n; j++) {
      for (i = j + 1; i < n; i++) {
        forceCollideBox(nodes[i], nodes[j]);
      }
    }

    for (i = 0; i < n; i++) {
      node = nodes[i];
      forceX(node, alpha);
      forceY(node, alpha);
    }

    for (i = 0; i < n; ++i) {
      node = nodes[i];
      if (node.fx == null) {
        node.x += node.vx *= velocityDecay;
      } else {
        node.x = node.fx;
        node.vx = 0;
      }

      if (node.fy == null) {
        node.y += node.vy *= velocityDecay;
      } else {
        node.y = node.fy;
        node.vy = 0;
      }
    }

    return simulation;
  }

  function initializeGraph() {
    let nodes = graphState.nodes;
    let links = graphState.edges;
    var i,
        n = nodes.length,
        m = links.length,
        link,
        node;

    for (i = 0; i < n; ++i) {
      node = graphState.nodes[i];
      if (node.fx != null) node.x = node.fx;
      if (node.fy != null) node.y = node.fy;
      if (isNaN(node.x) || isNaN(node.y)) {
        var radius = initialRadius * Math.sqrt(0.5 + i), angle = i * initialAngle;
        node.x = radius * Math.cos(angle);
        node.y = radius * Math.sin(angle);
      }
      if (isNaN(node.vx) || isNaN(node.vy)) {
        node.vx = node.vy = 0;
      }
    }

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
    for (i = 0; i < m; ++i) {
      strengths[i] = defaultStrength(links[i]);
    }
  }

  function defaultStrength(link) {
    return 1 / Math.min(count[link[0]], count[link[1]]);
  }

  initializeGraph();

  return simulation = {
    tick: tick,

    launch: function(tickCallbackFn) {
      tickCallback = tickCallbackFn;
      window.requestAnimationFrame(step);
    },

    restart: function() {
      console.log('restart');
      // return stepper.restart(step), simulation;
      return simulation;
    },

    alphaTarget: function(_) {
      console.log('alphaTarget');
      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
    }
  };
}

function jiggle() {
  return (Math.random() - 0.5) * 1e-6;
}

function forceManyBody(nodeA, nodeB, alpha) {
  let distanceMin2 = 1;
  let separatingForce = -900;


  let xDelta = nodeB.x - nodeA.x;
  let yDelta = nodeB.y - nodeA.y;
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

  nodeA.vx += xDelta * w;
  nodeA.vy += yDelta * w;

}

function forceCollideBox(nodeA, nodeB) {
  let xa = nodeA.x;
  let ya = nodeA.y;

  let xb = nodeB.x;
  let yb = nodeB.y;

  // if there's an overlap then move boxes up/down
  let overlappingX = false;
  let overlappingY = false;

  if ((xa < xb) && (xa + nodeA.textWidth > xb)) {
    overlappingX = true;        // left overlap
  } else if ((xa >= xb) && (xa + nodeA.textWidth < xb + nodeB.textWidth)) {
    overlappingX = true;        // completely enclosed
  } else if ((xb < xa) && (xb + nodeB.textWidth > xa)) {
    overlappingX = true;
  } else if ((xb >= xa) && (xb + nodeB.textWidth < xa + nodeA.textWidth)) {
    overlappingX = true;        // completely enclosed
  };

  if ((ya < yb) && (ya + nodeA.textHeight > yb)) {
    overlappingY = true;
  } else if ((yb < ya) && (yb + nodeB.textHeight > ya)) {
    overlappingY = true;
  };

  if (overlappingX && overlappingY) {
    if (ya === yb) {
      nodeA.vy -= jiggle();
      nodeB.vy += jiggle();
    } else {
      // move a and b apart
      nodeA.vy -= (yb - ya) / 32;
      nodeB.vy += (yb - ya) / 32;
    }
  }

}

function forceCollide(nodeA, nodeB) {
  let ri = 40;
  let ri2 = ri * ri;

  let xi = nodeA.x + nodeA.vx;
  let yi = nodeA.y + nodeA.vy;

  let x = xi - (nodeB.x - nodeB.vx);
  let y = yi - (nodeB.y - nodeB.vy);
  let l = (x * x) + (y * y);
  let rj = ri;
  let r = ri+ri;
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
    nodeA.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
    nodeA.vy += (y *= l) * r;
    nodeB.vx -= x * (r = 1 - r);
    nodeB.vy -= y * r;
  }
}

function forceX(node, alpha) {
  let isgXStrength = 0.1;
  let isgXZ = 0.0;              // the value of x to goto

  node.vx += (isgXZ - node.x) * isgXStrength * alpha;
}

function forceY(node, alpha) {
  let isgYStrength = 0.12;
  let isgYZ = 0.0;              // the value of y to goto

  node.vy += (isgYZ - node.y) * isgYStrength * alpha;
}
