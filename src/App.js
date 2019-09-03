import React, {useState} from 'react';
import {useMachine} from '@xstate/react';
import {Machine,assign,send} from 'xstate';
import * as yup from 'yup';
import _ from 'lodash';

import FormComponent from "./components/Form";

const userSchema = require('./json/userDetailsSchema.json');
const userOptions= require('./json/userDetailsOptions.json');

const cardSchema = require('./json/cardDetailsSchema.json');
const cardOptions= require('./json/cardDetailsOptions.json');

let schema = yup.object().shape({
    name: yup.string().required()
});

const process = {
    user: {
        config: {
            schema: userSchema,
            options: userOptions
        },
        data: {
            first_name: 'David'
        }
    },
    card: {
        config: {
            schema: cardSchema,
            options: cardOptions,
        }
    }
};

function mapProcessToContext(process) {
    let count = 1;
    let context = {};
    _.forEach(process,(p,k)=>{
        count++;
        context[count.toString()] = {
            ...p,
            data: p.data || null,
            valid: false
        };
    });
    return context;
}

function mapProcessToSteps(process) {
    let count = 1;
    let steps = {
        '1': {
            entry: ['stepStarted'],
            exit: ['stepEnded'],
            on: {
                NEXT: {
                    target: '2',
                    actions: ['onTransition']
                },
            },
            meta: {
                id: 'start'
            }
        }
    };
    _.forEach(process,(p,k)=>{
        count++;
        let current = count.toString();
        let previous = (count-1).toString();
        let next = (count+1).toString();
        steps[current] = {
            entry: ['stepStarted'],
            exit: ['stepEnded'],
            on: {
                PREV: {
                    target: previous,
                    actions: ['onTransition']
                },
                NEXT: {
                    target: next,
                    actions: ['onTransition','updateContext']
                }
            },
            meta: {
                id: k
            }
        };
    });
    let final = count+1;
    steps[final.toString()] = {
        type: 'final',
        entry: ['stepStarted'],
        on: {
            PREV: {
                target: (final-1).toString(),
                actions: ['onTransition']
            }
        },
        meta: {
            id: 'end'
        }
    };
    return steps;
}

let context = mapProcessToContext(process);
let steps = mapProcessToSteps(process);

const stepMachine = Machine(
    {
        id: 'toggle',
        initial: '1',
        context: context,
        states: steps
    },
    {
        actions: {
            onTransition: (context, event, meta) => {
                console.log('changingState',`${meta.state.history.value}->${meta.state.value}`);
            },
            stepStarted: (context, event, current) => {
                console.log('enteredState',current.state.value);
                let currentStep = current.state.value;
                context = Object.assign(context,{
                    [currentStep]: {
                        ...context[currentStep],
                        started: Date.now()
                    }
                });
            },
            stepEnded: (context, event, current) => {
                console.log('exitedState',current.state.history.value);
                let prevStep = current.state.history.value;
                context = Object.assign(context,{
                    [prevStep]: {
                        ...context[prevStep],
                        completed: Date.now()
                    }
                });
            },
            updateContext: (context, event, current) => {
                console.log('updatingContext',event,current.state.history.value);
                let prevStep = current.state.history.value;
                console.log('--------->',context[prevStep],event.data)
                if(event.data){
                    context = Object.assign(context,{
                        [prevStep]: {
                            ...context[prevStep],
                            data: event.data
                        }
                    });
                }
            }
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

export const StepMachineComponent = () => {

    const [loading, setLoading] = useState(false);

    const [currentState, send] = useMachine(stepMachine);

    let {value, context, matches, meta} = currentState;

    let currentMeta = mergeMeta(meta);

    const navigate = (step) => {
        setLoading(true);
        setTimeout(()=>{
            send(step);
            setLoading(false);
        },200)
    };

    const printDebug = () => {
        return (
            <>
                <pre>State: {value}</pre>
                <pre>Context: {JSON.stringify(context)}</pre>
                <pre>StateMeta: {JSON.stringify(currentMeta)}</pre>
            </>
        );
    };

    let isForm = false;
    let config = null;

    if ( context[value] && context[value].config ) {
        isForm = true;
        config = context[value].config
    } else {
        isForm = false;
    }

    console.log(context[value]);

    return (
        <div>
            <h3>Welcome</h3>
            <hr/>
            {!loading&&isForm&&(
                <FormStep config={config} onSubmit={send} data={context[value].data}/>
            )}
            <hr/>
            <button onClick={() => navigate('PREV')}>PREV</button>
            <button onClick={() => navigate('NEXT')}>NEXT</button>
            {printDebug()}
        </div>
    );

};

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
            user: {
                started: null,
                completed: null,
                config: {
                    schema: userSchema,
                    options: userOptions,
                },
                data: null,
                valid: false
            },
            card: {
                started: null,
                completed: null,
                config: {
                    schema: userSchema,
                    options: userOptions,
                },
                data: null,
                valid: false
            }
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
                    id: 'details'
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
            stepStarted: (context, event, current) => {
                console.log('enteredState',current.state.value);
                let meta = mergeMeta(current.state.meta);
                context = Object.assign(context,{
                    [meta.id]: {
                        ...context[meta.id],
                        started: Date.now()
                    }
                });
            },
            stepEnded: (context, event, current) => {
                console.log('exitedState',current.state.history.value);
                let meta = mergeMeta(current.state.history.meta);
                context = Object.assign(context,{
                    [meta.id]: {
                        ...context[meta.id],
                        completed: Date.now()
                    }
                });
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

class FormStep extends React.Component {
    state = {
        loading: false
    };
    submitForm = (payload) => {
        this.setState({loading:true});
        setTimeout(()=>{
            this.props.onSubmit({type:'NEXT',data:payload});
            this.setState({loading:false});
        },200)
    };
    render() {
        return(
            <div style={{width: 450}}>
                {this.state.loading?<div>Loading...</div>:<FormComponent config={this.props.config} submitForm={this.submitForm} initialData={this.props.data}/>}
            </div>
        )
    }
}

export const Toggler = () => {

    const [currentState, send] = useMachine(toggleMachine);

    let { value, context, matches, meta } = currentState;

    let currentMeta = mergeMeta(meta);

    const [form, setValues] = useState(false);

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
        let { config } = context[currentMeta.id];
        return (
            <div>
                <h3>Invalid</h3>
                <FormStep config={config} onSubmit={send}/>
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
            <StepMachineComponent/>
        </div>
    );
}

export default App;
