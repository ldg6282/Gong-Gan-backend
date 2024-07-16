module.exports = {
  env: {
    browser: true,
    node: true,
    es2020: true,
    jest: true,
  },
  extends: ["airbnb", "prettier", "eslint:recommended"],
  plugins: ["prettier"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  rules: {
    "prettier/prettier": ["error", { endOfLine: "auto" }],
    "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 1, maxBOF: 0 }],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    eqeqeq: ["error", "always"],
    "no-console": "off",
  },
};
