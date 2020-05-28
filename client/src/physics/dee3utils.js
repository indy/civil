export function constant(x) {
  return function() {
    return x;
  };
}

export function jiggle() {
  return (Math.random() - 0.5) * 1e-6;
}
