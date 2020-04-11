// The code in this file is based on react-console-emulator, here is their license:

// MIT License

// Copyright (c) 2018 Linus Willner and Curtis Fowler

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import React, { useState, useEffect } from 'react';
import html from 'react-inner-html';
import { useStateValue } from '../lib/state';

export default function Console(props) {
  const [state, dispatch] = useStateValue();

  const [consoleRoot] = useState(React.createRef());
  const [consoleInput] = useState(React.createRef());

  useEffect(() => {
    if (props.promptLabel) {
      dispatch({
        type: 'setPromptLabel',
        promptLabel: props.promptLabel
      });
    }

    if (props.autoFocus) {
      focusConsole();
    }
    scrollToBottom();
  }, []);

  function focusConsole() {
    // Only focus the console if text isn't being copied
    const isTextSelected = window.getSelection().type === 'Range';
    if (!isTextSelected) {
      consoleInput.current.focus();
    }
  }

  function scrollToBottom() {
    const rootNode = consoleRoot.current;

    // This may look ridiculous, but it is necessary to decouple execution for just a millisecond in order to scroll all the way
    setTimeout(() => { rootNode.scrollTop = rootNode.scrollHeight; }, 1);
  }

  function showHelp() {
    for (const c in props.commands) {
      const cmdObj = props.commands[c];
      const usage = cmdObj.usage ? ` - ${cmdObj.usage}` : '';

      pushToStdout(`${c} - ${cmdObj.description}${usage}`);
    }
  }

  function pushToStdout(message, rawInput) {
    let action = {
      type: 'pushStdout',
      message: message
    };

    if (rawInput) { // Only supplied if history is enabled
      action.rawInput = rawInput;
    }
    dispatch(action);
  }

  function getStdout() {
    return state.console.stdout.map((line, i) => <ConsoleMessage key={i} content={line} />);
  }

  function clearInput() {
    dispatch({
      type: 'clearInput'
    });

    consoleInput.current.value = '';
  }

  function clearStdout() {
    dispatch({
      type: 'clearStdout'
    });
    consoleInput.current.value = '';
  }

  async function processCommand() {
    const commandResult = { command: null, args: [], rawInput: null, result: null };
    const rawInput = consoleInput.current.value;

    if (!props.noAutomaticStdout) {
      if (!props.noHistory) {
        pushToStdout(`${state.console.promptLabel || '$'} ${rawInput}`, rawInput);
      } else {
        pushToStdout(`${state.console.promptLabel || '$'} ${rawInput}`);
      }
    }

    if (rawInput) {
      const input = rawInput.split(' ');
      const command = input.splice(0, 1)[0]; // Removed portion is returned...
      const args = input; // ...and the rest can be used

      commandResult.rawInput = rawInput;
      commandResult.command = command;
      commandResult.args = args;

      if (command === 'help') {
        showHelp();
      } else if (command === 'clear') {
        clearStdout();
        return;
      } else {
        const cmdObj = props.commands[command];

        if (!cmdObj) {
          pushToStdout(props.errorText ?
                       props.errorText.replace(/\[command\]/gi, command) :
                       `Command '${command}' not found!`);
        }
        else {

          let res;
          try {
            res = await cmdObj.fn(...args);
          } catch(e) {
            res = e.toString();
          }

          pushToStdout(res);
          commandResult.result = res;

        }
      }
    }

    clearInput();
    if (!props.noAutoScroll) {
      scrollToBottom();
    }
    if (props.commandCallback) {
      props.commandCallback(commandResult);
    }
  }

  function scrollHistoryFun(direction) {
    const toUpdate = scrollHistory(
      direction,
      state.console.history,
      state.console.historyPosition,
      state.console.previousHistoryPosition,
      consoleInput,
      props.noAutomaticStdout
    );

    if (toUpdate) {
      dispatch({
        type: 'scrollHistory',
        historyPosition: toUpdate.historyPosition,
        previousHistoryPosition: toUpdate.previousHistoryPosition
      });
    }
  }

  function handleInput(event) {
    switch (event.key) {
    case 'Enter': processCommand(); break;
    case 'ArrowUp': scrollHistoryFun('up'); break;
    case 'ArrowDown': scrollHistoryFun('down'); break;
    default: return;
    }
  }

  return (
    <div
      ref={consoleRoot}
      name={'react-console-emulator'}
      className={props.className}
      style={styles.container}
      onClick={focusConsole}
    >
      {/* Content */}
      <div
        name={'react-console-emulator__content'}
        className={props.contentClassName}
        style={styles.content}
      >
        {/* Stdout */}
        {getStdout()}
        {/* Input area */}
        <div
          name={'react-console-emulator__inputArea'}
          className={props.inputAreaClassName}
          style={styles.inputArea}
        >
          {/* Prompt label */}
          <span
            name={'react-console-emulator__promptLabel'}
            className={state.console.promptLabelClassName}
            style={styles.promptLabel}
          >
            {state.console.promptLabel || '$'}
          </span>
          {/* Input */}
          <input
            ref={consoleInput}
            name={'react-console-emulator__input'}
            className={props.inputClassName}
            style={styles.input}
            onKeyDown={handleInput}
            type={'text'}
            autoComplete={'off'}
            disabled={
              props.disableOnProcess && state.console.processing
            }
          />
        </div>
      </div>
    </div>
  );

}


const styles = {
  container: {
    minWidth: '500px',
    minHeight: '300px',
    maxWidth: '100%', // Fill parent before overflowing
    maxHeight: '100%', // Fill parent before overflowing
    borderRadius: '5px',
    overflow: 'auto',
    cursor: 'text',
    background: 'rgb(237, 101, 1, 0.06)',
    backgroundSize: 'cover'
  },
  content: {
    padding: '20px',
    height: '100%',
    fontSize: '15px',
    color: '#444444',
    fontFamily: 'monospace'
  },
  inputArea: {
    display: 'inline-flex',
    width: '100%'
  },
  promptLabel: {
    paddingTop: '3px',
    color: '#db6b2d'
  },
  input: {
    border: '0',
    padding: '0 0 0 7px',
    margin: '0',
    flexGrow: '100',
    width: '100%',
    height: '22px',
    background: 'transparent',
    fontSize: '15px',
    color: '#db6b2d',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    outline: 'none' // Fix for outline showing up on some browsers
  }
};

function scrollHistory (direction, commandHistory, historyPosition, previousHistoryPosition, consoleInput, noAutomaticStdout) {
  const history = cleanArray(commandHistory).reverse(); // Clean empty items and reverse order to ease position tracking
  const position = historyPosition;
  const previousPosition = previousHistoryPosition;
  const termNode = consoleInput.current;

  if (!noAutomaticStdout && history.length > 0) { // Only run if history is non-empty and in use
    switch (direction) {
    case 'up':
      if (position === null) {
        // If at no position, get most recent entry
        termNode.value = history[0];
        return { historyPosition: 0, previousHistoryPosition: null };
      } else if (position + 1 === history.length) {
        // If the first entry will be reached on this press, get it and decrement position by 1 to avoid confusing downscroll
        termNode.value = history[history.length - 1];
        return { historyPosition: history.length - 1, previousHistoryPosition: history.length - 2 };
      } else {
        // Normal increment by one
        termNode.value = history[position + 1];
        return { historyPosition: position + 1, previousHistoryPosition: position };
      }
    case 'down':
      if (position === null || !history[position]) {
        // If at initial or out of range, clear (Unix-like behaviour)
        termNode.value = '';
        return { historyPosition: null, previousHistoryPosition: null };
      } else if (position - 1 === -1) {
        // Clear because user pressed up once and is now pressing down again => clear or is reaching bottom
        if (previousPosition === null || (position === 0 && previousPosition === 1)) {
          termNode.value = '';
        } else {
          termNode.value = history[0];
        }
        return { historyPosition: null, previousHistoryPosition: null };
      } else {
        // Normal decrement by one
        termNode.value = history[position - 1];
        return {
          historyPosition: position - 1,
          previousHistoryPosition: position };
      }
    default:
      return undefined;
    }
  }


  return undefined;
}

function cleanArray (dirtyArray) {
  const newArray = Array.from(dirtyArray);
  return newArray.filter(i => i !== undefined);
}

function ConsoleMessage({ content, dangerMode }) {
    const message = {
      lineHeight: '21px'
    };

    return dangerMode
         ? <div style={message} {...html(content)}/>
         : <div style={message}>{content}</div>;

}
