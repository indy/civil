import React, { useState, useRef, useEffect } from 'react';
import { useStateValue } from '../lib/StateProvider';
import { buildGraphState } from '../lib/graphUtils';
import graphPhysics from "../lib/graphPhysics";

let gContainerSvg = undefined;
let gSvg;
let gSvgEdges = undefined;
let gSvgNodes = undefined;

export default function Graph({ id, depth, onlyIdeas }) {
  const [state] = useStateValue();

  const [data] = useState([]);
  const svgContainerRef = useRef();

  useEffect(() => {
    console.log('useEffect [data]');

    let graphState = buildGraphState(state, id, depth, onlyIdeas);
    buildSvgGraph(svgContainerRef.current, graphState);
    startSimulation(graphState);

  }, [data]);

  return (<div className="svg-container" ref={ svgContainerRef }>
            <svg viewBox="-300, -300, 900, 900"></svg>
          </div>);
}

function buildSvgGraph(ref, graphState) {
  gContainerSvg = ref;

  while(gContainerSvg.firstChild) { gContainerSvg.firstChild.remove();};

  let svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
  svg.setAttribute("viewBox", "-300, -300, 900, 900");
  // svg.setAttribute("viewBox", "-150, -150, 90, 150");
  // svg.setAttribute("viewBox", "-200, -200, 600, 600");

  gSvg = svg;
  gContainerSvg.appendChild(gSvg);

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
  svg.appendChild(defs);
/*
  // g of origin marker
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
  gSvgEdges = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  gSvgEdges.setAttribute("fill", "none");

  // build the edges
  let nodes = graphState.nodes;
  graphState.edges.forEach(e => {
    let sourceNode = nodes[e[0]];
    let targetNode = nodes[e[1]];
    let strength = e[2];
    gSvgEdges.appendChild(createSvgEdge(sourceNode, targetNode, strength));
  });

  svg.appendChild(gSvgEdges);

  // g of nodes
  //
  gSvgNodes = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  gSvgNodes.setAttribute("fill", "var(--fg2)");
  gSvgNodes.setAttribute("stroke-linecap", "round");
  gSvgNodes.setAttribute("stroke-linejoin", "round");

  svg.appendChild(gSvgNodes);

  graphState.nodes.forEach(n => {
    let [g, textNode] = createSvgNode(n.label, -3.2103189179278937,-9.947329432729548);
    gSvgNodes.appendChild(g);

    let textBoundingBox = textNode.getBBox();
    n.textWidth = textBoundingBox.width;
    n.textHeight = textBoundingBox.height;
  });
}

function startSimulation(graphState) {
  const simulation = graphPhysics(graphState);
  simulation.launch(updateGraph);
  return simulation;
}

function updateGraph(graphState) {
  let edges = graphState.edges;
  let nodes = graphState.nodes;

  Array.from(gSvgEdges.children).forEach((svgEdge, i) => {
    let source = nodes[edges[i][0]];
    let target = nodes[edges[i][1]];
    translateEdge(svgEdge, source, target);
  });

  Array.from(gSvgNodes.children).forEach((svgNode, i) => {
    // todo: replace x,y with node
    translateNode(svgNode, nodes[i].x, nodes[i].y);
  });

  let [xmin, ymin, xmax, ymax] = getBoundingBox(graphState.nodes);
  console.log(xmin, ymin, xmax, ymax);
  xmin -= 30;
  ymin -= 30;
  let width = (xmax - xmin) > 700 ? (xmax - xmin) * 1.2 : 800;
  let height = (ymax - ymin) > 700 ? (ymax - ymin) * 1.2 : 800;
  gSvg.setAttribute("viewBox", `${xmin} ${ymin} ${width} ${height}`);

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
