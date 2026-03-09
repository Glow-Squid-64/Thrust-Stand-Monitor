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
  fs.writeFileSync("build/script.js", js_mini.code);

  const css_mini = bundle({
    filename:"src/css/style.css",
    minify: true,
    analyzeDependencies: true,
  });
  fs.writeFileSync("build/style.css", css_mini.code);

  const html_buffer = fs.readFileSync("src/index.html");
  const html_mini = await htmlMinify(html_buffer.toString(), {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
  });
  fs.writeFileSync("build/index.html", html_mini);

  fs.copyFileSync("src/uPlot.min.css", "build/uPlot.min.css");
  fs.copyFileSync("src/uPlot.iife.min.js", "build/uPlot.iife.min.js");
})();