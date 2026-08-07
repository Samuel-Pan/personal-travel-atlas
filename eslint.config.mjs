import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", "public/maps/**", "src/data/administrative.json"],
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default config;
