const assert = require('assert');
const blockingFunctions = require('../../includes/blocking_functions');
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');

exports.tests = [
  {
    id: 'blocking_functions_zipLast3_valid',
    name: 'zipLast3: Valid zip and last name',
    description: 'Should return the correct blocking key with valid zip and last name',
    type: TestType.UNIT,
    priority: TestPriority.HIGH,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipLast3('12345', 'Smith'), '\`12345Smi\`');
    }
  },
  {
    id: 'blocking_functions_zipLast3_empty_zip',
    name: 'zipLast3: Empty zip code',
    description: 'Should return the correct blocking key with empty zip code',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipLast3('', 'Smith'), '\`Smi\`');
    }
  },
  {
    id: 'blocking_functions_zipLast3_empty_last',
    name: 'zipLast3: Empty last name',
    description: 'Should return the correct blocking key with empty last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipLast3('12345', ''), '\`12345\`');
    }
  },
  {
    id: 'blocking_functions_zipLast3_null_zip',
    name: 'zipLast3: Null zip code',
    description: 'Should return the correct blocking key with null zip code',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipLast3(null, 'Smith'), '\`Smi\`');
    }
  },
  {
    id: 'blocking_functions_zipLast3_null_last',
    name: 'zipLast3: Null last name',
    description: 'Should return the correct blocking key with null last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipLast3('12345', null), '\`12345\`');
    }
  },
  {
    id: 'blocking_functions_zipLast3_special_chars',
    name: 'zipLast3: Special characters',
    description: 'Should return the correct blocking key with special characters',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipLast3('123-45', 'O\'Malley'), '\`123-45O\'M\`');
    }
  },
  {
    id: 'blocking_functions_zipSoundexLastName_valid',
    name: 'zipSoundexLastName: Valid zip and last name',
    description: 'Should return the correct blocking key with valid zip and last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipSoundexLastName('12345', 'Smith'), '\`12345SOUNDEX(\'Smith\')\`');
    }
  },
  {
    id: 'blocking_functions_zipSoundexLastName_empty_zip',
    name: 'zipSoundexLastName: Empty zip code',
    description: 'Should return the correct blocking key with empty zip code',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipSoundexLastName('', 'Smith'), '\`SOUNDEX(\'Smith\')\`');
    }
  },
  {
    id: 'blocking_functions_zipSoundexLastName_empty_last',
    name: 'zipSoundexLastName: Empty last name',
    description: 'Should return the correct blocking key with empty last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipSoundexLastName('12345', ''), '\`12345\`');
    }
  },
  {
    id: 'blocking_functions_zipSoundexLastName_null_zip',
    name: 'zipSoundexLastName: Null zip code',
    description: 'Should return the correct blocking key with null zip code',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipSoundexLastName(null, 'Smith'), '\`SOUNDEX(\'Smith\')\`');
    }
  },
  {
    id: 'blocking_functions_zipSoundexLastName_null_last',
    name: 'zipSoundexLastName: Null last name',
    description: 'Should return the correct blocking key with null last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipSoundexLastName('12345', null), '\`12345\`');
    }
  },
  {
    id: 'blocking_functions_zipSoundexLastName_special_chars',
    name: 'zipSoundexLastName: Special characters in last name',
    description: 'Should return the correct blocking key with special characters in last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipSoundexLastName('12345', 'O\'Malley'), '\`12345SOUNDEX(\'O\'Malley\')\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_valid',
    name: 'stateLast3First3: Valid state, last name, and first name',
    description: 'Should return the correct blocking key with valid state, last name, and first name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3('CA', 'Smith', 'John'), '\`CASmiJoh\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_empty_state',
    name: 'stateLast3First3: Empty state',
    description: 'Should return the correct blocking key with empty state',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3('', 'Smith', 'John'), '\`SmiJoh\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_empty_last',
    name: 'stateLast3First3: Empty last name',
    description: 'Should return the correct blocking key with empty last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3('CA', '', 'John'), '\`CAJoh\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_empty_first',
    name: 'stateLast3First3: Empty first name',
    description: 'Should return the correct blocking key with empty first name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3('CA', 'Smith', ''), '\`CASmi\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_null_state',
    name: 'stateLast3First3: Null state',
    description: 'Should return the correct blocking key with null state',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3(null, 'Smith', 'John'), '\`SmiJoh\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_null_last',
    name: 'stateLast3First3: Null last name',
    description: 'Should return the correct blocking key with null last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3('CA', null, 'John'), '\`CAJoh\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_null_first',
    name: 'stateLast3First3: Null first name',
    description: 'Should return the correct blocking key with null first name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3('CA', 'Smith', null), '\`CASmi\`');
    }
  },
  {
    id: 'blocking_functions_stateLast3First3_special_chars',
    name: 'stateLast3First3: Special characters',
    description: 'Should return the correct blocking key with special characters',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.stateLast3First3('CA', 'O\'Malley', 'Johnny'), '\`CAO\'MJoh\`');
    }
  },
  {
    id: 'blocking_functions_zipStreet5_valid',
    name: 'zipStreet5: Valid zip and street name',
    description: 'Should return the correct blocking key with valid zip and street name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipStreet5('12345', 'Main Street'), '\`12345Main \`');
    }
  },
  {
    id: 'blocking_functions_zipStreet5_empty_zip',
    name: 'zipStreet5: Empty zip code',
    description: 'Should return the correct blocking key with empty zip code',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipStreet5('', 'Main Street'), '\`Main \`');
    }
  },
  {
    id: 'blocking_functions_zipStreet5_empty_street',
    name: 'zipStreet5: Empty street name',
    description: 'Should return the correct blocking key with empty street name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipStreet5('12345', ''), '\`12345\`');
    }
  },
  {
    id: 'blocking_functions_zipStreet5_null_zip',
    name: 'zipStreet5: Null zip code',
    description: 'Should return the correct blocking key with null zip code',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipStreet5(null, 'Main Street'), '\`Main \`');
    }
  },
  {
    id: 'blocking_functions_zipStreet5_null_street',
    name: 'zipStreet5: Null street name',
    description: 'Should return the correct blocking key with null street name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipStreet5('12345', null), '\`12345\`');
    }
  },
  {
    id: 'blocking_functions_zipStreet5_special_chars',
    name: 'zipStreet5: Special characters',
    description: 'Should return the correct blocking key with special characters',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.zipStreet5('123-45', 'Elm St.'), '\`123-45Elm S\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_valid',
    name: 'last3SoundexFirstCity: Valid last name, first name, and city',
    description: 'Should return the correct blocking key with valid last name, first name, and city',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity('Smith', 'John', 'New York'), '\`SmiSOUNDEX(\'John\')New York\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_empty_last',
    name: 'last3SoundexFirstCity: Empty last name',
    description: 'Should return the correct blocking key with empty last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity('', 'John', 'New York'), '\`SOUNDEX(\'John\')New York\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_empty_first',
    name: 'last3SoundexFirstCity: Empty first name',
    description: 'Should return the correct blocking key with empty first name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity('Smith', '', 'New York'), '\`SmiNew York\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_empty_city',
    name: 'last3SoundexFirstCity: Empty city',
    description: 'Should return the correct blocking key with empty city',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity('Smith', 'John', ''), '\`SmiSOUNDEX(\'John\')\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_null_last',
    name: 'last3SoundexFirstCity: Null last name',
    description: 'Should return the correct blocking key with null last name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity(null, 'John', 'New York'), '\`SOUNDEX(\'John\')New York\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_null_first',
    name: 'last3SoundexFirstCity: Null first name',
    description: 'Should return the correct blocking key with null first name',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity('Smith', null, 'New York'), '\`SmiNew York\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_null_city',
    name: 'last3SoundexFirstCity: Null city',
    description: 'Should return the correct blocking key with null city',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity('Smith', 'John', null), '\`SmiSOUNDEX(\'John\')\`');
    }
  },
  {
    id: 'blocking_functions_last3SoundexFirstCity_special_chars',
    name: 'last3SoundexFirstCity: Special characters',
    description: 'Should return the correct blocking key with special characters',
    type: TestType.UNIT,
    testFn: async () => {
      assert.strictEqual(blockingFunctions.last3SoundexFirstCity('O\'Malley', 'Johnny', 'New York City'), '\`O\'MSOUNDEX(\'Johnny\')New York City\`');
    }
  },
  {
    id: 'blocking_functions_approximateLevenshtein_valid',
    name: 'approximateLevenshtein: Valid strings',
    description: 'Should return the approximate Levenshtein distance SQL for valid strings',
    type: TestType.UNIT,
    testFn: async () => {
      const str1 = 'hello';
      const str2 = 'hallo';
      const expectedSQL = `
    (LENGTH(${str1}) + LENGTH(${str2}) - 2 * (
      SELECT
        COUNT(*)
      FROM
        UNNEST(GENERATE_ARRAY(1, LEAST(LENGTH(${str1}), LENGTH(${str2})))) AS offset
      WHERE
        SUBSTR(${str1}, offset, 1) = SUBSTR(${str2}, offset, 1)
    ))
  `;
      assert.strictEqual(blockingFunctions.approximateLevenshtein(str1, str2), expectedSQL);
    }
  },
  {
    id: 'blocking_functions_approximateLevenshtein_empty',
    name: 'approximateLevenshtein: Empty strings',
    description: 'Should return the approximate Levenshtein distance SQL for empty strings',
    type: TestType.UNIT,
    testFn: async () => {
      const str1 = '';
      const str2 = '';
      const expectedSQL = `
    (LENGTH(${str1}) + LENGTH(${str2}) - 2 * (
      SELECT
        COUNT(*)
      FROM
        UNNEST(GENERATE_ARRAY(1, LEAST(LENGTH(${str1}), LENGTH(${str2})))) AS offset
      WHERE
        SUBSTR(${str1}, offset, 1) = SUBSTR(${str2}, offset, 1)
    ))
  `;
      assert.strictEqual(blockingFunctions.approximateLevenshtein(str1, str2), expectedSQL);
    }
  },
  {
    id: 'blocking_functions_approximateLevenshtein_null',
    name: 'approximateLevenshtein: Null strings',
    description: 'Should return the approximate Levenshtein distance SQL for null strings',
    type: TestType.UNIT,
    testFn: async () => {
      const str1 = null;
      const str2 = null;
      const expectedSQL = `
    (LENGTH(${str1}) + LENGTH(${str2}) - 2 * (
      SELECT
        COUNT(*)
      FROM
        UNNEST(GENERATE_ARRAY(1, LEAST(LENGTH(${str1}), LENGTH(${str2})))) AS offset
      WHERE
        SUBSTR(${str1}, offset, 1) = SUBSTR(${str2}, offset, 1)
    ))
  `;
      assert.strictEqual(blockingFunctions.approximateLevenshtein(str1, str2), expectedSQL);
    }
  },
  {
    id: 'blocking_functions_extractFirstLastName_full_name',
    name: 'extractFirstLastName: Full name',
    description: 'Should return first and last name SQL for full name',
    type: TestType.UNIT,
    testFn: async () => {
      const fullName = 'John Smith';
      const expected = {
        first_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(0)]
        ELSE NULL
      END
    `,
        last_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(1)]
        ELSE ${fullName}
      END
    `
      };
      assert.deepStrictEqual(blockingFunctions.extractFirstLastName(fullName), expected);
    }
  },
  {
    id: 'blocking_functions_extractFirstLastName_single_name',
    name: 'extractFirstLastName: Single name',
    description: 'Should return last name SQL and null first name SQL for single name',
    type: TestType.UNIT,
    testFn: async () => {
      const fullName = 'Cher';
      const expected = {
        first_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(0)]
        ELSE NULL
      END
    `,
        last_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(1)]
        ELSE ${fullName}
      END
    `
      };
      assert.deepStrictEqual(blockingFunctions.extractFirstLastName(fullName), expected);
    }
  },
  {
    id: 'blocking_functions_extractFirstLastName_special_chars',
    name: 'extractFirstLastName: Special characters',
    description: 'Should return correct SQL for name with special characters',
    type: TestType.UNIT,
    testFn: async () => {
      const fullName = 'John D\'oh';
      const expected = {
        first_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(0)]
        ELSE NULL
      END
    `,
        last_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(1)]
        ELSE ${fullName}
      END
    `
      };
      assert.deepStrictEqual(blockingFunctions.extractFirstLastName(fullName), expected);
    }
  }
];