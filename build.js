import fs from "fs"
import {execSync} from "child_process"
import {bundle} from "lightningcss"
import {minify as htmlMinify} from "html-minifier-terser"
import {minify as jsMinify} from "terser"

( async()=>{
  fs.rmSync("build", {recursive: true, force: true});
  fs.mkdirSync("build");

  execSync("npx tsc", { stdio:"inherit" });

  const js_buffer = fs.readFileSync("src/script.js");
  const js_mini   = await jsMinify(js_buffer.toString(), {
    compress: true,
    mangle: false,
    format: {
      comments: false,
    },
  });
  // fs.writeFileSync("build/script.js", js_mini.code);

  const css_mini = bundle({
    filename:"src/css/style.css",
    minify: true,
    analyzeDependencies: true,
  });
  // fs.writeFileSync("build/style.css", css_mini.code);

  const html_buffer = fs.readFileSync("src/index.html");
  var html = html_buffer.toString();
  const uplot_css   = fs.readFileSync("src/uPlot.min.css");
  html = html.replace(
    '<link rel="stylesheet" href="uPlot.min.css">',
    `<style>${uplot_css.toString()}</style>`
  );
  html = html.replace(
    '<link rel="stylesheet" href="style.css">',
    `<style>${css_mini.code}</style>`
  );
  const uplot_js   = fs.readFileSync("src/uPlot.iife.min.js");
  html = html.replace(
    '<script src="uPlot.iife.min.js"></script>',
    `<script>${uplot_js.toString()}</script>`
  );
  html = html.replace(
    '<script src="script.js"></script>',
    `<script>${js_mini.code}</script>`
  );

  const html_mini = await htmlMinify(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
  });
  fs.writeFileSync("build/index.html", html_mini);
})();