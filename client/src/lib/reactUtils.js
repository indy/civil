import React from 'react';
import { useParams } from 'react-router-dom';

export function asShellBlock(ns) {
  let shellLines = ns.map((n, key) => {
    return (<div className="shell-line" key={ key }>{ n }</div>);
  });
  return (<div className="shell-block">{ shellLines }</div>);
}

export const idParam = () => {
  const { id } = useParams();
  return parseInt(id, 10);
};
