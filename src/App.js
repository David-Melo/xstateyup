import React from 'react';

import { useMachine } from '@xstate/react';
import { Machine } from 'xstate';
import * as yup from 'yup';

let schema = yup.object().shape({
  name: yup.string().required()
});

function validateContext(context) {
  console.log(context);
  return schema
    .isValid(context)
    .then(function(valid) {
      console.log(true)
    });
}

const toggleMachine = Machine({
  id: 'toggle',
  initial: 'idle',
  context: {
    name: null
  },
  states: {
    idle: {
      on: {
        START: 'start'
      }
    },
    start: {
      invoke: {
        src: validateContext,
        onDone: {
          target: 'active'
        }
      }
    },
    active: {
      on: { 
        TOGGLE: 'idle' 
      }
    }
  }
});

export const Toggler = () => {
  const [current, send] = useMachine(toggleMachine);

  return (
    <button onClick={() => send('START')}>
      Start
    </button>
  );
};


function App() {
  return (
    <div className="App">
      <Toggler/>
    </div>
  );
}

export default App;
