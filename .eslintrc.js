module.exports = {
  "env": {
    "node": true,
    "es6": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "no-console": "off",
    "no-prototype-builtins": "off",
    "no-regex-r-prefix": {
      "create": function(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && 
                node.raw && 
                node.raw.startsWith('r\'') && 
                node.raw.endsWith('\'')) {
              context.report({
                node,
                message: "Python-style raw string notation (r'...') is not valid in JavaScript. Use standard JavaScript string literals."
              });
            }
          },
          TemplateLiteral(node) {
            // Check for r'...' inside template literals
            if (node.quasis && node.quasis.length) {
              for (const quasi of node.quasis) {
                if (quasi.value && quasi.value.raw) {
                  const raw = quasi.value.raw;
                  if (raw.includes("r'") || raw.includes('r"')) {
                    context.report({
                      node: quasi,
                      message: "Python-style raw string notation (r'...') is not valid in JavaScript. Use standard JavaScript string literals."
                    });
                  }
                }
              }
            }
          }
        };
      }
    }
  },
  "parserOptions": {
    "ecmaVersion": 2020
  }
}; 