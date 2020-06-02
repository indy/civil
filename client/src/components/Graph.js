import React, { useState, useRef, useEffect } from 'react';
import { useStateValue } from '../lib/StateProvider';
import { buildGraphState } from '../lib/graphUtils';
import graphPhysics from "../lib/graphPhysics";

export default function Graph({ id, depth, onlyIdeas }) {
  const [state] = useStateValue();

  const [data] = useState([]);
  const svgContainerRef = useRef();

  useEffect(() => {
    console.log('useEffect [data]');

    let graphState = buildGraphState(state, id, depth, onlyIdeas);
    let svg = buildSvg(svgContainerRef.current, graphState);
    startSimulation(graphState, svg);

  }, [data]);

  return (<div className="svg-container" ref={ svgContainerRef }>
            <svg viewBox="-300, -300, 900, 900"></svg>
          </div>);
}

function buildSvg(ref, graphState) {
  let svg = {
    container: undefined,
    element: undefined,
    edges: undefined,
    nodes: undefined,
    debug: undefined
  };

  svg.container = ref;

  while(svg.container.firstChild) { svg.container.firstChild.remove();};

  let element = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
  element.setAttribute("viewBox", "-300, -300, 900, 900");
  // svg.setAttribute("viewBox", "-150, -150, 90, 150");
  // svg.setAttribute("viewBox", "-200, -200, 600, 600");

  svg.element = element;
  svg.container.appendChild(svg.element);

  // defs for marker ends
  //
  let defs = document.createElementNS("http://www.w3.org/2000/svg", 'defs');
  let marker = document.createElementNS("http://www.w3.org/2000/svg", 'marker');
  marker.setAttribute("id", "arrow-head");
  marker.setAttribute("viewBox", "0 -5 10 10");
  marker.setAttribute("refX", "15");
  marker.setAttribute("refY", "-0.5");
  marker.setAttribute("markerWidth", "6");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute("orient", "auto");

  let path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
  path.setAttribute("fill", "var(--fg2)");
  path.setAttribute("d", "M0,-5L10,0L0,5");

  marker.appendChild(path);
  defs.appendChild(marker);
  element.appendChild(defs);

  /*
  // g of debug
  svg.debug = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  let text1 = document.createElementNS("http://www.w3.org/2000/svg", 'text');
  text1.setAttribute("fill", "none");
  text1.setAttribute("x", "10");
  text1.setAttribute("y", "0");
  text1.setAttribute("stroke", "var(--fg)");
  text1.setAttribute("stroke-width", "1");
  text1.textContent = "shabba";
  svg.debug.appendChild(text1);
  svg.appendChild(svg.debug);
  */

/*
  // g of axis rendering
  //
  let origin = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  let origin_x = document.createElementNS("http://www.w3.org/2000/svg", 'path');
  origin_x.setAttribute("fill", "none");
  origin_x.setAttribute("stroke-width", `3`);
  origin_x.setAttribute("stroke", 'var(--bg1)');
  origin_x.setAttribute("d", "M-100,0L100,0");
  origin.appendChild(origin_x);
  let origin_y = document.createElementNS("http://www.w3.org/2000/svg", 'path');
  origin_y.setAttribute("fill", "none");
  origin_y.setAttribute("stroke-width", `3`);
  origin_y.setAttribute("stroke", 'var(--bg1)');
  origin_y.setAttribute("d", "M0,-100L0,100");
  origin.appendChild(origin_y);
  svg.appendChild(origin);
*/
  // g of edges
  //
  svg.edges = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  svg.edges.setAttribute("fill", "none");

  // build the edges
  let nodes = graphState.nodes;
  graphState.edges.forEach(e => {
    let sourceNode = nodes[e[0]];
    let targetNode = nodes[e[1]];
    let strength = e[2];
    svg.edges.appendChild(createSvgEdge(sourceNode, targetNode, strength));
  });

  element.appendChild(svg.edges);

  // g of nodes
  //
  svg.nodes = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  svg.nodes.setAttribute("fill", "var(--fg2)");
  svg.nodes.setAttribute("stroke-linecap", "round");
  svg.nodes.setAttribute("stroke-linejoin", "round");

  element.appendChild(svg.nodes);

  graphState.nodes.forEach(n => {
    let [g, textNode] = createSvgNode(n.label, -3.2103189179278937,-9.947329432729548);
    svg.nodes.appendChild(g);

    let textBoundingBox = textNode.getBBox();
    n.textWidth = textBoundingBox.width;
    n.textHeight = textBoundingBox.height;
  });

  return svg;
}

function startSimulation(graphState, svg) {
  function updateGraphCallback() {
    let edges = graphState.edges;
    let nodes = graphState.nodes;

    Array.from(svg.edges.children).forEach((svgEdge, i) => {
      let source = nodes[edges[i][0]];
      let target = nodes[edges[i][1]];
      translateEdge(svgEdge, source, target);
    });

    Array.from(svg.nodes.children).forEach((svgNode, i) => {
      // todo: replace x,y with node
      translateNode(svgNode, nodes[i].x, nodes[i].y);
    });

    let [xmin, ymin, xmax, ymax] = getBoundingBox(graphState.nodes);
    xmin -= 30;
    ymin -= 30;
    let width = (xmax - xmin) > 700 ? (xmax - xmin) * 1.2 : 800;
    let height = (ymax - ymin) > 700 ? (ymax - ymin) * 1.2 : 800;
    svg.element.setAttribute("viewBox", `${xmin} ${ymin} ${width} ${height}`);


    // let dbg = svg.debug.children[0];
    // dbg.textContent = `${graphState.simStats.stepCount} ${graphState.simStats.maxVelocities[0]} ${graphState.simStats.maxVelocities[1]}`;
    // dbg.setAttribute("x", xmin + 20);
    // dbg.setAttribute("y", ymin + 20);
  }

  const simulation = graphPhysics(graphState);
  simulation.launch(updateGraphCallback);
  return simulation;
}



function getBoundingBox(nodes) {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;

  nodes.forEach(n => {
    if (n.x < xmin) { xmin = n.x; }
    if (n.y < ymin) { ymin = n.y; }
    if (n.x + n.textWidth > xmin) { xmax = n.x + n.textWidth; }
    if (n.y + n.textHeight > ymin) { ymax = n.y + n.textHeight; }
  });

  // let xmid = (xmin + xmax) / 2;
  // let ymid = (ymin + ymax) / 2;

  return [xmin, ymin, xmax, ymax];
}

function createSvgEdge(sourceNode, targetNode, strength) {
  let path = document.createElementNS("http://www.w3.org/2000/svg", 'path');

  let width = 1.0 + (strength * 0.5);
  path.setAttribute("stroke-width", `${width}`);
  path.setAttribute("stroke", 'var(--fg2)');
  path.setAttribute("marker-end", `url(${window.location}#arrow-head)`);

  translateEdge(path, sourceNode, targetNode);

  return path;
}

// todo: replace params with a single node param
function createSvgNode(label, x, y) {
  let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  translateNode(g, x, y);

  // let circle2 = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
  // circle2.setAttribute("stroke", "var(--fg2)");
  // circle2.setAttribute("stroke-width", "0.5");
  // circle2.setAttribute("r", "40");
  // g.appendChild(circle2);

  let text1 = document.createElementNS("http://www.w3.org/2000/svg", 'text');
  text1.setAttribute("fill", "none");
  text1.setAttribute("x", "10");
  text1.setAttribute("y", "0");
  text1.setAttribute("stroke", "var(--bg)");
  text1.setAttribute("stroke-width", "3");
  text1.textContent = label;
  g.appendChild(text1);

  let circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
  circle.setAttribute("stroke", "var(--fg2)");
  circle.setAttribute("stroke-width", "1.5");
  circle.setAttribute("r", "4");
  g.appendChild(circle);


  let text2 = document.createElementNS("http://www.w3.org/2000/svg", 'text');
  text2.setAttribute("fill", "var(--fg)");
  text2.setAttribute("x", "10");
  text2.setAttribute("y", "0");
  text2.textContent = label;
  g.appendChild(text2);

  return [g, text2];
}

function translateEdge(svgNode, source, target) {
  const r = Math.hypot(target.x - source.x, target.y - source.y);
  let d = `M${source.x},${source.y} A${r},${r} 0 0,1 ${target.x},${target.y}`;
  svgNode.setAttribute("d", d);
}

function translateNode(svgNode, x, y) {
  svgNode.setAttribute("transform", `translate(${x},${y})`);
}
