// dataform/includes/match_strategy.js

/**
 * Interface for match strategies.
 */
class MatchStrategy {
  match(context) {
    throw new Error("Method 'match' must be implemented.");
  }

  score() {
    throw new Error("Method 'score' must be implemented.");
  }

  describe() {
    throw new Error("Method 'describe' must be implemented.");
  }
}

module.exports = MatchStrategy;