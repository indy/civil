var initialRadius = 10,
    initialAngle = Math.PI * (3 - Math.sqrt(5));

export default function(graphState) {
  var simulation,
      alpha = 1,
      alphaMin = 0.001,
      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
      alphaTarget = 0,
      velocityDecay = 0.6,
      forces = new Map();

  var tickCallback = undefined;

  if (graphState.nodes == null) graphState.nodes = [];

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
    var i, n = graphState.nodes.length, node;

    // if (iterations === undefined) iterations = 1;

    //for (var k = 0; k < iterations; ++k) {
      alpha += (alphaTarget - alpha) * alphaDecay;

      forces.forEach(function(force) {
        force(alpha);
      });

      for (i = 0; i < n; ++i) {
        node = graphState.nodes[i];
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
  // }

    return simulation;
  }

  function initializeNodes() {
    for (var i = 0, n = graphState.nodes.length, node; i < n; ++i) {
      node = graphState.nodes[i];
      node.index = i;
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
  }

  function initializeForce(force) {
    if (force.initialize) force.initialize(graphState.nodes);
    return force;
  }

  initializeNodes();

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
    },

    force: function(name, _) {
      return arguments.length > 1 ? ((_ == null ? forces.delete(name) : forces.set(name, initializeForce(_))), simulation) : forces.get(name);
    }
  };
}
