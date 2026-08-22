import eslint from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "build/**",
            "coverage/**",
            ".next/**",
        ],
    },

    eslint.configs.recommended,

    ...tseslint.configs.recommendedTypeChecked,

    prettierRecommended,

    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            parserOptions: {
                projectService: {
                    allowDefaultProject: [
                        "eslint.config.mjs",
                        "postcss.config.mjs",
                    ],
                },
            },
        },
    },

    {
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "no-console": ["error", { allow: ["error", "warn"] }],
            "prettier/prettier": ["error", { endOfLine: "auto" }],
        },
    },
);