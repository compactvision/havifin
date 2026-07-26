import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    ...typescript.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-useless-assignment': 'off',
            'preserve-caught-error': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/set-state-in-render': 'off',
            'react-hooks/static-components': 'off',
        },
    },
    {
        files: ['print-server/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-control-regex': 'off',
        },
    },
    {
        ignores: [
            'vendor',
            'node_modules',
            'public',
            'bootstrap/ssr',
            'tailwind.config.js',
        ],
    },
    prettier, // Turn off all rules that might conflict with Prettier
];
