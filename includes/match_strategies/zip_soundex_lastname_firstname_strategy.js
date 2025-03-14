// dataform/includes/match_strategies/zip_soundex_lastname_firstname_strategy.js

const { MatchStrategy } = require("../match_strategy");
const functions = require("../functions");
const blocking_functions = require("../blocking_functions");

class ZipSoundexLastNameFirstNameStrategy extends MatchStrategy {
  constructor(zipCol, lastNameCol, firstNameCol) {
    super('zip_soundex_lastname_firstname', { zipCol, lastNameCol, firstNameCol });
    this.zipCol = zipCol;
    this.lastNameCol = lastNameCol;
    this.firstNameCol = firstNameCol;
  }

  match(context) {
    const { c1, c2 } = context;
    return `
      ${blocking_functions.zipSoundexLastName(`${c1}.${this.zipCol}`, `${c1}.${this.lastNameCol}`)} = ${blocking_functions.zipSoundexLastName(`${c2}.${this.zipCol}`, `${c2}.${this.lastNameCol}`)}
      AND ${functions.normalizeString(`${c1}.${this.firstNameCol}`)} = ${functions.normalizeString(`${c2}.${this.firstNameCol}`)}
      AND ${blocking_functions.approximateLevenshtein(`${c1}.${this.lastNameCol}`, `${c2}.${this.lastNameCol}`)} < 2
    `;
  }

  // ... score and describe methods ...
}

module.exports = { ZipSoundexLastNameFirstNameStrategy };
