module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/dev/git-master/apps/web/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/30c20_fed5503f._.js",
  "chunks/[root-of-the-server]__8cfd4089._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/dev/git-master/apps/web/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];