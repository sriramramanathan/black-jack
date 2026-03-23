module.exports = {
  root: true, // stop ESLint looking for configs in parent folders
  parser: '@typescript-eslint/parser', // understands TypeScript syntax
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended', // standard JS rules (no undefined vars, etc.)
    'plugin:@typescript-eslint/recommended', // TypeScript-specific rules
    'prettier', // disables ESLint rules that conflict with Prettier formatting
  ],
  rules: {
    'prettier/prettier': 'error', // Prettier violations show as ESLint errors
    // Variables prefixed with _ are intentionally unused (e.g. _env, _sessionId)
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off', // TypeScript infers return types fine
    'no-console': 'warn', // remind us to remove debug logs before shipping
  },
  env: {
    node: true, // allow process, require, etc.
    es2020: true, // allow modern JS (optional chaining, nullish coalescing, etc.)
  },
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', 'web-build/', 'coverage/'],
};
