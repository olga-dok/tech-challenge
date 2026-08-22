import baseConfig from "@repo/eslint-config/base";
import nextConfig from "@repo/eslint-config/next";

const eslintConfig = [...baseConfig, ...nextConfig];

export default eslintConfig;
