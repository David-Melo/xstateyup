import React, {Fragment} from "react";
import {Formik} from 'formik';
import _ from 'lodash';
import { buildYup } from "json-schema-to-yup";
import { Row, Col, Form, FormGroup, FormFeedback, Label, Input, Button, Alert} from "reactstrap";
import Select from 'react-select';

// https://jsonschema.net/
//https://beta5.objgen.com/json/local/design

class MultiSelect extends React.Component {
    id = 'values';
    constructor(props){
        super(props);
        this.id = this.props.id;
    }
    handleChange = value => {
        this.props.onChange(this.id, value);
    };
    handleBlur = () => {
        this.props.onBlur(this.id, true);
    };
    render() {
        const validClass = `${ this.props.valid ? 'is-valid' : this.props.touched ? 'is-invalid' : ''}`;
        return (
            <Fragment>
                <Select
                    className={`react-select ${validClass}`}
                    instanceId={this.props.id}
                    id={this.props.id}
                    options={this.props.options}
                    isMulti
                    onChange={this.handleChange}
                    onBlur={this.handleBlur}
                    value={this.props.value}
                    styles={
                        {
                            control: (styles, { data }) => ({
                                ...styles,
                                borderColor: this.props.invalid || ( this.props.touched && !this.props.valid ) ? '#dc3545' : this.props.valid ? '#28a745' : '#ced4da',
                            }),
                            multiValueLabel: (styles, { data }) => ({
                                ...styles,
                                color: 'black',
                                fontWeight: 400
                            })
                        }
                    }
                />
            </Fragment>
        );
    }
}

class CheckBoxGroup extends React.Component {
    render() {
        const validClass = `${ this.props.valid ? 'is-valid' : this.props.touched ? 'is-invalid' : ''}`;
        const props = this.props;
        return (
            <div className={`react-checkbox ${validClass}`}>
                {this.props.options.map((option,k) => (
                    <div key={k}>
                        <label>
                            <input
                                name={props.id}
                                type="checkbox"
                                value={option}
                                checked={props.values[props.id].includes(option)}
                                onChange={() => {
                                    if (props.values[props.id].includes(option)) {
                                        const nextValue = props.values[props.id].filter(
                                            value => value !== option
                                        );
                                        props.setFieldValue(props.id, nextValue);
                                    } else {
                                        const nextValue = props.values[props.id].concat(option);
                                        props.setFieldValue(props.id, nextValue);
                                    }
                                }}
                            />{" "}
                            {option}
                        </label>
                    </div>
                ))}
            </div>
        )
    }
}

class FormComponent extends React.Component {
    config = {};
    validation = {};
    fields = [];
    values = {};
    state = {
        errorMessage: null,
        successMessage: null
    };
    constructor(props) {
        super(props);
        if ( typeof props.config === 'string' && props.config.length) {
            this.config = JSON.parse(props.config);
        } else
        if ( typeof props.config === 'object' ) {
            this.config = props.config;
        }
        this.config.options.log = true;
        this.config.options.err = (msg) => {
            console.error(`ERROR: ${msg}`);
        };
        if (props.validation){
            this.validation = props.validation;
        } else {
            this.validation = buildYup(this.config.schema, this.config.options);
        }
        _.each(this.config.schema.properties,(i,k) => {
            switch (i.input) {
                case 'multi-select':
                case 'checkbox':
                    this.values[k] = [];
                    break;
                case 'text':
                case 'email':
                default:
                    this.values[k] = '';
                    break;
            }
            if ( i.type === 'array' ) {
                i.options = i.items.enum;
            }
            this.fields.push({
                id: k,
                label: i.title,
                type: i.type,
                input: i.input,
                grid: typeof i.grid != 'undefined' ? i.grid : 12,
                required: typeof i.grid != 'undefined' ? i.required : false,
                options: typeof i.options != 'undefined' && Array.isArray(i.options)  ? i.options : [],
            });
        });
        if (this.props.initialData) {
            this.values = {
                ...this.values,
                ...this.props.initialData
            };
        }
        console.log(this.values)
    }
    onSubmit = (values, {setSubmitting,resetForm}) => {
        this.setState({
            errorMessage: null,
            successMessage: null
        });
        let payload = {
            ...values
        };
        _.each(this.config.schema.properties,function(i,k){
            switch (i.input) {
                case 'multi-select':
                    payload[k] = Array.isArray(values[k]) ? values[k].map(t => t.value).join('; ') : "";
                    break;
                case 'checkbox':
                    payload[k] = Array.isArray(values[k]) ? values[k].map(t => t).join('; ') : "";
                    break;
                default:
                    break;
            }
        });
        this.props.submitForm(payload);
            // .then(e => {
            //     if (!e.success) {
            //         this.setState({
            //             errorMessage: e.message
            //         });
            //     }
            //     setSubmitting(false);
            //     resetForm();
            //     this.setState({
            //         successMessage: this.config.options.successMessage
            //     });
            // })
            // .catch(e => {
            //     console.log(e);
            //     this.setState({
            //         errorMessage: e.message
            //     });
            //     setSubmitting(false);
            // });
    };
    render() {
        return (
            <Formik
                initialValues={this.values}
                validationSchema={this.validation}
                onSubmit={this.onSubmit}
            >
                {({values,errors,touched,handleChange,handleBlur,handleSubmit,isSubmitting,setFieldValue,setFieldTouched}) => (
                    <Form onSubmit={handleSubmit}>

                        {!this.state.successMessage &&
                        <Row>

                            {this.fields.map((i,k) => (
                                <Col key={k} md={i.grid}>
                                    <FormGroup >

                                        <Label for={i.id} className={!!errors[i.id]?'text-danger':''}>
                                            <strong>
                                                {i.label}
                                                {' '}
                                                {i.required && (
                                                    <span className="text-danger">*</span>
                                                )}
                                            </strong>
                                        </Label>

                                        {(()=>{

                                            switch (i.input) {
                                                case 'text':
                                                case 'textarea':
                                                case 'email':
                                                    return <Input type={i.input} name={i.id} onChange={handleChange} onBlur={handleBlur} value={values[i.id]} valid={touched[i.id]&&!errors[i.id]} invalid={!!errors[i.id]}/>;
                                                case 'multi-select':
                                                    return <MultiSelect
                                                        id={i.id}
                                                        value={values[i.id]}
                                                        options={i.options}
                                                        onChange={setFieldValue}
                                                        onBlur={setFieldTouched}
                                                        valid={touched[i.id]&&!errors[i.id]}
                                                        invalid={!!errors[i.id]}
                                                        touched={touched[i.id]}
                                                    />;
                                                case 'checkbox':
                                                    return <CheckBoxGroup
                                                        id={i.id}
                                                        options={i.options}
                                                        valid={touched[i.id]&&!errors[i.id]}
                                                        invalid={!!errors[i.id]}
                                                        touched={touched[i.id]}
                                                        values={values}
                                                        setFieldValue={setFieldValue}
                                                    />;
                                                default:
                                                    return null;

                                            }
                                        })()}

                                        {errors[i.id] && touched[i.id] && <FormFeedback>{errors[i.id]}</FormFeedback>}

                                    </FormGroup>
                                </Col>
                            ))}

                        </Row>
                        }

                        {this.state.successMessage &&
                        <Alert color="success" className="mb-0">
                            {this.state.successMessage}
                        </Alert>
                        }

                        {this.state.errorMessage &&
                        <Alert color="danger">
                            {this.state.errorMessage}
                        </Alert>
                        }

                        {!this.state.successMessage &&
                        <Button type="submit" size="lg" block color="primary" disabled={isSubmitting}>
                            { isSubmitting ? 'Loading...' : 'Submit' }
                        </Button>
                        }

                    </Form>
                )}
            </Formik>
        );
    }
}

export default FormComponent;
