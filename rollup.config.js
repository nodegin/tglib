import json from "rollup-plugin-json";
import pkg from "./package.json";

export default [
    // ES module (for Node) build.
    {
        input: "src/main.node.js",
        external: [],
        output: [
            { file: pkg.main, format: "cjs" }
        ],
        plugins: [
            json()
        ]
    },
    // ES module (for browser bundlers) build.
    {
        input: "src/main.module.js",
        external: [],
        output: [
            { file: pkg.module, format: "es" }
        ],
        plugins: [
            json()
        ]
    },
];
