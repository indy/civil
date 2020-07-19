import { h, createContext, createRef, render } from '/js/ext/preact.module.js';
import { useState, useReducer, useEffect, useLayoutEffect, useRef, useImperativeHandle, useMemo, useCallback, useContext, useDebugValue } from '/js/ext/hooks.module.js';
import htm from '/js/ext/htm.js';
import { Router, Route, Link, route } from '/js/ext/preact-router.js';

const html = htm.bind(h);

export { h, html, render, createContext, createRef, useState, useReducer, useEffect, useLayoutEffect, useRef, useImperativeHandle, useMemo, useCallback, useContext, useDebugValue, Router, Route, Link, route };
