import React, {useState} from 'react';

import {useMachine} from '@xstate/react';
import {Machine,assign} from 'xstate';
import * as yup from 'yup';

let schema = yup.object().shape({
    name: yup.string().required()
});

/*
* 1. Click Validate Action
* 2. Checks Context To Run Validation Condition
* 3. Context Not Valid Goes To Invalid State
* 4. Starts Beeping Activity
* 5. Fill In Needed Data
* 6. Click On Approve Action
* 7. Enters Validate State & Invokes Validate Data Service
* 8  If Not Valid It Triggers Invalid State
* 9. If Valid It Will Update Context With Valid Data And Go To Valid State
* */

const toggleMachine = Machine(
    {
        id: 'toggle',
        initial: 'idle',
        context: {
            data: {
                name: null
            },
            valid: false
        },
        states: {
            idle: {
                entry: ['stepStarted'],
                exit: ['stepEnded'],
                on: {
                    VALIDATE: [
                        {
                            target: 'valid',
                            cond: 'schemaIsValid',
                            actions: ['onTransition'],
                        },
                        {
                            target: 'invalid',
                            cond: 'schemaNotValid',
                            actions: ['onTransition'],
                        }
                    ]
                },
                meta: {
                    id: 1
                }
            },
            validating: {
                entry: ['stepStarted'],
                exit: ['stepEnded'],
                invoke: {
                    id: 'validateData',
                    src: 'validateData',
                    onDone: {
                        target: 'valid',
                        actions: ['onTransition','updateContext']
                    },
                    onError: {
                        target: 'invalid',
                        actions: ['onTransition']
                    }
                },
                meta: {
                    id: 2
                }
            },
            invalid: {
                entry: ['stepStarted'],
                exit: ['stepEnded'],
                activities: ['beeping'],
                on: {
                    VALIDATE: {
                        target: 'validating',
                        actions: ['onTransition']
                    },
                    RESET: {
                        target: 'idle',
                        actions: ['onTransition','resetContext']
                    }
                },
                meta: {
                    id: 3
                }
            },
            valid: {
                entry: ['stepStarted'],
                exit: ['stepEnded'],
                actions: ['onTransition'],
                on: {
                    RESET: {
                        target: 'idle',
                        actions: ['onTransition','resetContext']
                    }
                },
                meta: {
                    id: 4
                }
            }
        }
    },
    {
        actions: {
            onTransition: (context, event, meta) => {
                console.log('changingState',`${meta.state.history.value}->${meta.state.value}`);
            },
            stepStarted: (context, event, meta) => {
                console.log('enteredState',meta.state.value)
            },
            stepEnded: (context, event, meta) => {
                console.log('exitedState',meta.state.history.value)
            },
            updateContext: assign({
                valid: true,
                data: (_, event) => event.data
            }),
            resetContext: assign({
                valid: false,
                data: {
                    name: null
                }
            })
        },
        activities: {
            beeping: () => {
                const interval = setInterval(() => console.log('BEEP!'), 1000);
                return () => clearInterval(interval);
            }
        },
        guards: {
            schemaIsValid: context => context.valid,
            schemaNotValid: context => !context.valid
        },
        services: {
            validateData: (context,event) => {
                console.log(context,event);
                return new Promise((resolve, reject) => {
                    schema
                        .isValid(event.data)
                        .then(function(valid) {
                            setTimeout(()=>{
                                if(valid) return resolve(event.data);
                                return reject('Failed Validation');
                            },1000)
                        });
                });
            }
        }
    }
);

// user
// new, active, inactive

// describe an object
// describe its states
// describe events that relate to the state
// describe final (optional) and initial states
// states can have data associated (context)
// guards check the associated data (context)
// activities run during a state
// actions are one off things that happen on entry, on exit, or on transition
// services

function mergeMeta(meta) {
    return Object.keys(meta).reduce((acc, key) => {
        const value = meta[key];
        Object.assign(acc, value);
        return acc;
    }, {});
}

// const printActions = () => {
//     return (
//         <>
//             {nextEvents.map((e,k)=><button key={k} onClick={() => send(e)}>{e}</button>)}
//         </>
//     );
// };

export const Toggler = () => {

    const [currentState, send] = useMachine(toggleMachine);

    let { value, context, matches, meta } = currentState;

    let currentMeta = mergeMeta(meta);

    const [form, setValues] = useState({
        name: ''
    });

    const printDebug = () => {
        return (
            <>
                <pre>State: {value}</pre>
                <pre>Context: {JSON.stringify(context)}</pre>
                <pre>FormState: {JSON.stringify(form)}</pre>
                <pre>StateMeta: {JSON.stringify(currentMeta)}</pre>
            </>
        );
    };

    const updateField = (e) => {
        setValues({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    if ( matches('idle') ) {
        return (
            <div>
                <h3>Welcome</h3>
                <button onClick={() => send({type:'VALIDATE'})}>START</button>
                {printDebug()}
            </div>
        );
    }

    if ( matches('validating') ) {
        return (
            <div>
                <h3>Validating...</h3>
            </div>
        );
    }

    if ( matches('invalid') ) {
        return (
            <div>
                <h3>Invalid</h3>
                <input
                    value={form.name}
                    name="name"
                    onChange={updateField}
                />
                <button onClick={() => send({type:'VALIDATE',data:form})}>VALIDATE</button>
                <button onClick={() => send({type:'RESET'})}>RESET</button>
                {printDebug()}
            </div>
        );
    }

    if ( matches('valid') ) {
        return (
            <div>
                <h3>Thank You</h3>
                <button onClick={() => send({type:'RESET'})}>RESET</button>
                {printDebug()}
            </div>
        );
    }

};

function App() {
    return (
        <div className="App">
            <Toggler/>
        </div>
    );
}

export default App;
