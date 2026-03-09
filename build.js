import fs from "fs"
import {execSync} from "child_process"
import {bundle} from "lightningcss"
import {minify} from "html-minifier-terser"

( async()=>{
  fs.rmSync("build", {recursive: true, force: true});
  fs.mkdirSync("build");

  execSync("npx tsc", { stdio:"inherit" });

  const css_mini = bundle({
    filename:"src/css/style.css",
    minify: true,
    analyzeDependencies: true,
  });
  fs.writeFileSync("build/style.css", css_mini.code);

  const html_buffer = fs.readFileSync("src/index.html");
  const html_mini = await minify(html_buffer.toString(), {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
  });
  fs.writeFileSync("build/index.html", html_mini);

  fs.copyFileSync("src/uPlot.min.css", "build/uPlot.min.css");
  fs.copyFileSync("src/uPlot.iife.min.js", "build/uPlot.iife.min.js");
})();