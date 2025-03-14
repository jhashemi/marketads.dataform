// dataform/includes/match_strategies/exact_match_strategy.js

const { MatchStrategy } = require("../match_strategy");
const functions = require("../functions");

class ExactMatchStrategy extends MatchStrategy {
  constructor(col1, col2) {
    super('exact', { col1, col2 });
    this.col1 = col1;
    this.col2 = col2;
  }

  match(context) {
    const { c1, c2 } = context;
    return `
      ${functions.normalizeString(`${c1}.${this.col1}`)} = ${functions.normalizeString(`${c2}.${this.col2}`)}
    `;
  }

  // ... score and describe methods ...
}

module.exports = ExactMatchStrategy;




// ... other strategy implementations ...