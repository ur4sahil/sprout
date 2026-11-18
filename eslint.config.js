import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.wrangler', '.e2e', 'review', 'playwright-report', 'test-results', '.claude', '.voice-audit'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use src/engine/rng.ts.' },
        { object: 'window', property: 'open', message: 'No window.open. Use an <a> in parent mode.' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/clock.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Use now() from src/lib/clock.ts.' },
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'Use now() from src/lib/clock.ts.' },
      ],
    },
  },
);
