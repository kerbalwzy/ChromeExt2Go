const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const {fastKey} = require("core-js/internals/internal-metadata");

// Generate pages object
const pagesObj = {};

const chromeName = ["console"];

chromeName.forEach(name => {
    pagesObj[name] = {
        entry: `src/${name}/index.js`,
        template: "public/index.html",
        filename: `html/${name}.html`
    };
});

const plugins = [
    {
        from: path.resolve("src/manifest.json"),
        to: `${path.resolve("dist")}/manifest.json`
    },
    {
        from: path.resolve("src/background.js"),
        to: `${path.resolve("dist")}/js/background.js`
    },
    {
        from: path.resolve("src/libs"),
        to: `${path.resolve("dist")}/libs`
    },
    {
        from: path.resolve("src/assets"),
        to: `${path.resolve("dist")}/assets`
    },
]


module.exports = {
    runtimeCompiler: true,
    filenameHashing: false,
    pages: pagesObj,
    configureWebpack: {
        plugins: [CopyWebpackPlugin(plugins)],
        entry: {},
        output: {},
    },
    css: {
        extract: {
            filename: 'css/[name].css'
        }
    },
};
