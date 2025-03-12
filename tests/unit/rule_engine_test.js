const assert = require('assert');
const ruleEngine = require('../../includes/rule_engine');

describe('rule_engine', () => {
  describe('createRule', () => {
    it('should create a new rule with valid configuration', () => {
      const config = {
        name: 'test_rule',
        description: 'Test rule',
        confidence: 0.9,
        requiredFields: ['field1', 'field2'],
        generateSql: () => 'test_sql',
        priority: 95,
        strategy: 'test_strategy'
      };
      const rule = ruleEngine.createRule(config);
      assert.deepStrictEqual(rule, config, 'Rule does not match configuration');
    });

    it('should throw an error if name is missing', () => {
      assert.throws(() => {
        ruleEngine.createRule({ confidence: 0.9 });
      }, Error, 'Missing name did not throw an error');
    });

    it('should throw an error if confidence is missing or invalid', () => {
      assert.throws(() => {
        ruleEngine.createRule({ name: 'test_rule' });
      }, Error, 'Missing confidence did not throw an error');

      assert.throws(() => {
        ruleEngine.createRule({ name: 'test_rule', confidence: -0.1 });
      }, Error, 'Invalid confidence did not throw an error');

      assert.throws(() => {
        ruleEngine.createRule({ name: 'test_rule', confidence: 1.1 });
      }, Error, 'Invalid confidence did not throw an error');
    });
    
    it('should use default values for optional fields', () => {
        const config = {
            name: 'default_rule',
            confidence: 0.8
        };
        const rule = ruleEngine.createRule(config);
        assert.strictEqual(rule.description, '', 'Default description is incorrect');
        assert.deepStrictEqual(rule.requiredFields, [], 'Default requiredFields is incorrect');
        assert.strictEqual(typeof rule.generateSql, 'function', 'Default generateSql is not a function');
        assert.strictEqual(rule.priority, 80, 'Default priority is incorrect');
        assert.strictEqual(rule.strategy, 'deterministic', 'Default strategy is incorrect');
    });
  });

  describe('RuleEngine', () => {
    it('should add a rule to the engine and maintain priority order', () => {
      const engine = new ruleEngine.RuleEngine();
      const rule1 = ruleEngine.createRule({ name: 'rule1', confidence: 0.8, priority: 80 });
      const rule2 = ruleEngine.createRule({ name: 'rule2', confidence: 0.9, priority: 90 });
      engine.addRule(rule1);
      engine.addRule(rule2);
      assert.deepStrictEqual(engine.rules, [rule2, rule1], 'Rules are not added or sorted correctly');
    });

    it('should add a standardizer function', () => {
      const engine = new ruleEngine.RuleEngine();
      engine.addStandardizer('test_standardizer', 'TEST SQL');
      assert.strictEqual(engine.standardizers.test_standardizer, 'TEST SQL', 'Standardizer not added correctly');
    });

    it('should add a similarity function', () => {
      const engine = new ruleEngine.RuleEngine();
      engine.addSimilarityFunction('test_similarity', 'TEST SQL');
      assert.strictEqual(engine.similarityFunctions.test_similarity, 'TEST SQL', 'Similarity function not added correctly');
    });

    it('should generate waterfall SQL (placeholder)', () => {
      const engine = new ruleEngine.RuleEngine();
      // Add some rules for testing (we'll need more specific rules later)
      engine.addRule(ruleEngine.createRule({ name: 'rule1', confidence: 0.8, generateSql: () => 'RULE1_SQL' }));
      engine.addRule(ruleEngine.createRule({ name: 'rule2', confidence: 0.9, generateSql: () => 'RULE2_SQL' }));
      const sql = engine.generateWaterfallSql('source', 'target');
      assert.ok(sql.includes('RULE1_SQL'), 'Generated SQL does not include rule1');
      assert.ok(sql.includes('RULE2_SQL'), 'Generated SQL does not include rule2');
    });

    it('should generate function definitions (placeholder)', () => {
      const engine = new ruleEngine.RuleEngine();
      engine.addStandardizer('test_standardizer', 'TEST SQL');
      engine.addSimilarityFunction('test_similarity', 'TEST SQL');
      const sql = engine.generateFunctionDefinitions();
      assert.ok(sql.includes('test_standardizer'), 'Generated SQL does not include standardizer');
      assert.ok(sql.includes('test_similarity'), 'Generated SQL does not include similarity function');
    });
  });
});