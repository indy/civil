import { Edge, Node, GraphCallback, GraphState } from "./types";

var initialRadius = 10,
    initialAngle = Math.PI * (3 - Math.sqrt(5));

var gSimIdCounter = 0;

export function graphPhysics(
    graphState: GraphState,
    tickCallbackFn: GraphCallback,
    setSimIsRunningFn: (b: boolean) => void
) {
    if (Object.keys(graphState).length === 0) {
        // graphState is the empty object
        return;
    }
    if (Object.keys(graphState.nodes).length === 0) {
        // console.log('graph physics given no nodes - nothing to simulate');
        return;
    }

    // simId is required to make sure that only one sim is running at a time
    var simId = ++gSimIdCounter;
    // console.log(`simId = ${simId}`);

    var alpha = 1,
        alphaMin = 0.001,
        alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
        velocityDecay = 0.03;

    if (!graphState.simStats) {
        graphState.simStats = {
            tickCount: 0,
            maxVelocities: [0, 0],
        };
    }

    let { bias, strengths } = initializeGraph(graphState);

    function step() {
        // set this to 300 for guaranteed one step
        let tickIterations = 1; // number of ticks to process per step

        if (simId !== gSimIdCounter) {
            // stopping
            // console.log(`sim ${simId} has stopped because of newer sim`);
        } else {
            // let before = performance.now();
            let continueSimulating = tick(tickIterations);
            if (!continueSimulating) {
                // let after = performance.now();
                // console.log(`physics step took ${after - before}ms (tickCount: ${graphState.simStats.tickCount})`);
            } else {
                // console.log('physics requires another step - ignore the timing info thats about to be shown');
            }

            if (continueSimulating) {
                if (tickCallbackFn) {
                    tickCallbackFn(graphState, simId, gSimIdCounter);
                }

                window.requestAnimationFrame(step);
            } else {
                // console.log("sim has stopped because no need to continue simulation");
                setSimIsRunningFn(false);
            }
        }
    }

    function tick(iterations?: number) {
        iterations = iterations || 1;

        for (let iter = 0; iter < iterations; iter++) {
            if (graphState.simStats) {
                graphState.simStats.tickCount++;
            }

            clearPerTickSimStats(graphState);

            let i: number, j: number, node: Node;
            let nodes = graphState.nodes;
            let nodeKeys = Object.keys(nodes);
            let n = nodeKeys.length;

            alpha -= alpha * alphaDecay;

            forceLink(graphState, strengths, bias, alpha);

            for (j = 0; j < n; j++) {
                for (i = 0; i < n; i++) {
                    if (i === j) {
                        continue;
                    }
                    forceManyBody(
                        nodes[nodeKeys[j]],
                        nodes[nodeKeys[i]],
                        alpha
                    );
                }
            }

            for (j = 0; j < n; j++) {
                for (i = j + 1; i < n; i++) {
                    forceCollide(nodes[nodeKeys[i]], nodes[nodeKeys[j]]);
                }
            }

            for (j = 0; j < n; j++) {
                for (i = j + 1; i < n; i++) {
                    forceCollideBox(nodes[nodeKeys[i]], nodes[nodeKeys[j]]);
                }
            }

            for (i = 0; i < n; i++) {
                node = nodes[nodeKeys[i]];
                forceX(node, alpha);
                forceY(node, alpha);
            }

            gatherSimStats(graphState);

            for (i = 0; i < n; ++i) {
                node = nodes[nodeKeys[i]];
                if (node.fx == null) {
                    node.x += node.vx *= velocityDecay;
                } else {
                    node.x = node.fx;
                    node.vx = 0;
                    alpha = 1.0;
                }

                if (node.fy == null) {
                    node.y += node.vy *= velocityDecay;
                } else {
                    node.y = node.fy;
                    node.vy = 0;
                    alpha = 1.0;
                }
            }

            let s = graphState.simStats;
            // m is the lowest axis-aligned velocity that we should regard as important enough to continue the simulation
            let m = 0.6;

            if (
                alpha < alphaMin ||
                (s &&
                    s.tickCount > 5 &&
                    s.maxVelocities[0] < m &&
                    s.maxVelocities[1] < m)
            ) {
                // stop the simulation
                return false;
            }
        }

        // continue simulating
        return true;
    }

    // start the simulation function
    //
    if (simId === gSimIdCounter) {
        setSimIsRunningFn(true);
        window.requestAnimationFrame(step);
    }
}

function forceLink(graphState: GraphState, strengths, bias, alpha) {
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
        l = ((l - distance) / l) * alpha * strengths[i];
        x *= l;
        y *= l;
        target.vx -= x * (b = bias[i]);
        target.vy -= y * b;
        source.vx += x * (b = 1 - b);
        source.vy += y * b;
    }
}

function gatherSimStats(graphState: GraphState) {
    let nodes = graphState.nodes;

    let maxx = 0.0;
    let maxy = 0.0;

    for (const key in nodes) {
        let n = nodes[key];

        let absx = Math.abs(n.vx);
        let absy = Math.abs(n.vy);

        if (absx > maxx) {
            maxx = absx;
        }
        if (absy > maxy) {
            maxy = absy;
        }
    }

    if (graphState.simStats) {
        graphState.simStats.maxVelocities = [maxx, maxy];
    }
}

function clearPerTickSimStats(graphState: GraphState) {
    if (graphState.simStats) {
        graphState.simStats.maxVelocities = [0.0, 0.0];
    }
}

function initializeGraph(graphState: GraphState): { bias: Array<number>, strengths: Array<number>} {
    let nodes = graphState.nodes;
    let links = graphState.edges;
    var i: number,
    m = links.length,
    link: Edge,
    node: Node;

    for (const key in nodes) {
        node = nodes[key];

        if (node.fx != null) node.x = node.fx;
        if (node.fy != null) node.y = node.fy;
        if (isNaN(node.x) || isNaN(node.y)) {
            var radius = initialRadius * Math.sqrt(0.5),
                angle = initialAngle;
            node.x = radius * Math.cos(angle);
            node.y = radius * Math.sin(angle);
        }
        if (isNaN(node.vx) || isNaN(node.vy)) {
            node.vx = node.vy = 0;
        }
    }

    let count = {};
    for (i = 0; i < m; ++i) {
        link = links[i];
        count[link[0]] = (count[link[0]] || 0) + 1;
        count[link[1]] = (count[link[1]] || 0) + 1;
    }

    let bias = new Array(m);
    for (i = 0; i < m; ++i) {
        link = links[i];
        bias[i] = count[link[0]] / (count[link[0]] + count[link[1]]);
    }

    function defaultStrength(link: Edge) {
        return 1 / Math.min(count[link[0]], count[link[1]]);
    }

    let strengths = new Array(m);
    for (i = 0; i < m; ++i) {
        strengths[i] = defaultStrength(links[i]);
    }

    return { bias, strengths };
}

function jiggle(): number {
    return (Math.random() - 0.5) * 1e-6;
}

function forceManyBody(nodeA: Node, nodeB: Node, alpha: number) {
    let distanceMin2 = 1;
    let separatingForce = -900;

    let xDelta = nodeB.x - nodeA.x;
    let yDelta = nodeB.y - nodeA.y;
    let distanceSquared = xDelta * xDelta + yDelta * yDelta;

    if (xDelta === 0) {
        let d = jiggle();
        distanceSquared += d * d;
    }
    if (yDelta === 0) {
        let d = jiggle();
        distanceSquared += d * d;
    }
    if (distanceSquared < distanceMin2)
        distanceSquared = Math.sqrt(distanceMin2 * distanceSquared);

    let w = (separatingForce * alpha) / distanceSquared;

    nodeA.vx += xDelta * w;
    nodeA.vy += yDelta * w;
}

function forceCollideBox(nodeA: Node, nodeB: Node) {
    let xa = nodeA.x;
    let ya = nodeA.y;

    let xb = nodeB.x;
    let yb = nodeB.y;

    // if there's an overlap then move boxes up/down
    let overlappingX = false;
    let overlappingY = false;

    if (nodeA.textWidth && nodeB.textWidth
       && nodeA.textHeight && nodeB.textHeight) {
        if (xa < xb && xa + nodeA.textWidth > xb) {
            overlappingX = true; // left overlap
        } else if (xa >= xb && xa + nodeA.textWidth < xb + nodeB.textWidth) {
            overlappingX = true; // completely enclosed
        } else if (xb < xa && xb + nodeB.textWidth > xa) {
            overlappingX = true;
        } else if (xb >= xa && xb + nodeB.textWidth < xa + nodeA.textWidth) {
            overlappingX = true; // completely enclosed
        }

        if (ya < yb && ya + nodeA.textHeight > yb) {
            overlappingY = true;
        } else if (yb < ya && yb + nodeB.textHeight > ya) {
            overlappingY = true;
        }

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
}

function forceCollide(nodeA: Node, nodeB: Node) {
    let ri = 40;
    let ri2 = ri * ri;

    let xi = nodeA.x + nodeA.vx;
    let yi = nodeA.y + nodeA.vy;

    let x = xi - (nodeB.x - nodeB.vx);
    let y = yi - (nodeB.y - nodeB.vy);
    let l = x * x + y * y;
    let rj = ri;
    let r = ri + ri;
    if (l < r * r) {
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

function forceX(node: Node, alpha: number) {
    let xStrength = 0.1;
    let xZ = 0.0; // the value of x to goto

    node.vx += (xZ - node.x) * xStrength * alpha;
}

function forceY(node: Node, alpha: number) {
    let yStrength = 0.12;
    let yZ = 0.0; // the value of y to goto

    node.vy += (yZ - node.y) * yStrength * alpha;
}
