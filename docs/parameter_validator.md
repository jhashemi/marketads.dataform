# Parameter Validator

The Parameter Validator is a utility for validating parameters in JavaScript objects. It provides a consistent way to validate required parameters, parameter types, apply constraints, and validate against JSON schemas.

## Basic Usage

```javascript
const { validateParameters } = require('../includes/validation/parameter_validator');

// Define validation rules
const validationRules = {
  required: ['name', 'age'],
  types: {
    name: 'string',
    age: 'number',
    email: 'string'
  },
  defaults: {
    active: true
  }
};

// Validate parameters
const options = { name: 'John', age: 30 };
const validatedOptions = validateParameters(options, validationRules, 'User');

// Result: { name: 'John', age: 30, active: true }
```

## Validation Rules

The validation rules object supports the following properties:

### Required Parameters

```javascript
required: ['param1', 'param2']
```

You can also specify conditional requirements:

```javascript
required: [
  'param1',
  { 
    name: 'param2', 
    condition: { ifPresent: 'triggerParam' } 
  }
]
```

This means `param2` is only required if `triggerParam` is present.

### Parameter Types

```javascript
types: {
  stringParam: 'string',
  numberParam: 'number',
  booleanParam: 'boolean',
  arrayParam: 'array',
  objectParam: 'object',
  functionParam: 'function',
  dateParam: 'date',
  regexpParam: 'regexp'
}
```

You can also specify union types:

```javascript
types: {
  param: ['string', 'number']
}
```

### Default Values

```javascript
defaults: {
  param1: 'default value',
  param2: 100,
  param3: true,
  param4: []
}
```

### Alternative Parameters

```javascript
alternatives: {
  param1: 'altParam1',
  param2: ['altParam2A', 'altParam2B']
}
```

This means if `param1` is not provided but `altParam1` is, the value of `altParam1` will be used for `param1`.

### Custom Error Messages

```javascript
messages: {
  param1: 'This parameter is required for core functionality.'
}
```

### Parameter Constraints

```javascript
constraints: {
  numberParam: {
    min: 1,
    max: 100,
    integer: true,
    positive: true
  },
  stringParam: {
    minLength: 3,
    maxLength: 50,
    pattern: '^[a-zA-Z0-9]+$',
    format: 'email'
  },
  arrayParam: {
    minItems: 1,
    maxItems: 10,
    uniqueItems: true
  },
  enumParam: {
    enum: ['option1', 'option2', 'option3']
  },
  customParam: {
    validator: (value) => {
      if (isValid(value)) {
        return true;
      }
      return 'Custom validation error message';
    }
  }
}
```

## Conditional Requirements

The parameter validator supports various condition types:

### ifPresent

```javascript
condition: { ifPresent: 'triggerParam' }
```

The parameter is required if `triggerParam` is present.

### ifEquals

```javascript
condition: { ifEquals: { param: 'triggerParam', value: 'specificValue' } }
```

The parameter is required if `triggerParam` equals `specificValue`.

### ifNotEquals

```javascript
condition: { ifNotEquals: { param: 'triggerParam', value: 'specificValue' } }
```

The parameter is required if `triggerParam` does not equal `specificValue`.

### ifOneOf

```javascript
condition: { ifOneOf: { param: 'triggerParam', values: ['value1', 'value2'] } }
```

The parameter is required if `triggerParam` is one of the specified values.

### ifAllOf

```javascript
condition: { 
  ifAllOf: [
    { ifPresent: 'param1' },
    { ifEquals: { param: 'param2', value: 'value' } }
  ]
}
```

The parameter is required if all conditions are met.

### ifAnyOf

```javascript
condition: { 
  ifAnyOf: [
    { ifPresent: 'param1' },
    { ifEquals: { param: 'param2', value: 'value' } }
  ]
}
```

The parameter is required if any of the conditions are met.

## JSON Schema Validation

The parameter validator also supports JSON schema validation:

```javascript
const { validateSchema } = require('../includes/validation/parameter_validator');

const schema = {
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: { 
      type: 'string',
      minLength: 2,
      maxLength: 50
    },
    age: { 
      type: 'integer',
      minimum: 0,
      maximum: 120
    },
    email: {
      type: 'string',
      format: 'email'
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      uniqueItems: true
    },
    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        zipCode: { type: 'string' }
      },
      required: ['street', 'city']
    }
  }
};

const user = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  tags: ['user', 'premium'],
  address: {
    street: '123 Main St',
    city: 'Anytown'
  }
};

try {
  const validatedUser = validateSchema(user, schema, 'User');
  console.log('User is valid:', validatedUser);
} catch (error) {
  console.error('Validation error:', error.message);
}
```

## API Reference

### validateParameters(options, validationRules, className)

Validates parameters according to validation rules.

- `options`: The options object to validate
- `validationRules`: Validation rules
- `className`: Name of the class for error messages
- Returns: Validated options with defaults applied

### validateRequiredParameters(options, validationRules, className)

Validates that required parameters are present in options object.

- `options`: The options object to validate
- `validationRules`: Validation rules for parameters
- `className`: Name of the class for error messages
- Throws: Error if required parameters are missing

### validateParameterTypes(options, validationRules, className)

Validates that parameter values are of the correct type.

- `options`: The options object to validate
- `validationRules`: Validation rules for parameters
- `className`: Name of the class for error messages
- Throws: Error if parameters are of incorrect type

### validateConstraints(options, validationRules, className)

Validates parameter constraints (min, max, pattern, enum, etc.).

- `options`: The options object to validate
- `validationRules`: Validation rules for parameters
- `className`: Name of the class for error messages
- Throws: Error if parameters fail constraint validation

### applyDefaults(options, validationRules)

Applies defaults to options object.

- `options`: The options object
- `validationRules`: Validation rules with defaults
- Returns: Options object with defaults applied

### validateSchema(obj, schema, className)

Validates an object against a JSON schema.

- `obj`: The object to validate
- `schema`: JSON schema
- `className`: Name of the class for error messages
- Returns: Validated object
- Throws: Error if validation fails 