const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");
const {fastKey} = require("core-js/internals/internal-metadata");

// Generate pages object
const pagesObj = {};

const chromeName = ["popup"];

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
        from: path.resolve("src/hot-reload.js"),
        to: `${path.resolve("dist")}/js/hot-reload.js`
    },
    {
        from: path.resolve("src/socket.io.1.2.0.js"),
        to: `${path.resolve("dist")}/js/socket.io.1.2.0.js`
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
