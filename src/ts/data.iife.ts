/// <reference path="app.ts"/>
/// <reference path="uPlot.d.ts"/>

window.app.data = (function(){
  const initXRange = 30;
  const initYRange = 10;

  function tooltip() {
    let info: HTMLDivElement;

    let hide = () => {
      info.style.visibility = "collapse";
    };
    let show = () => {
      info.style.visibility = "visible";
    };

    function init(u: uPlot) {
      info = document.createElement("div");
      info.classList.add("tooltip");

      u.over.appendChild(info);

      u.over.addEventListener("mouseleave", hide);
      u.over.addEventListener("mouseenter", show);
    }

    function setCursor(u: uPlot) {
      const idx = u.cursor.idx;
      if (idx == null || idx == undefined)
        return;

      let x = u.data[0][idx] ?? 0;
      let y = u.data[1][idx] ?? 0;
      let s = u.series[1];

      info.textContent = `(${x}, ${y})`;
      info.style.left = `${u.valToPos(x, 'x')}px`;
      info.style.top  = `${u.valToPos(y, s.scale ?? "err")}px`;
    }

    return {
      hooks: {
        init,
        setCursor,
      }
    };
  }
  
  const container = document.querySelector(".data");
  if (container == null || container == undefined)
    throw "Can't find div.data";

  const style = window.getComputedStyle(container, null);
  const h = container.clientHeight - parseFloat(style.paddingTop)
                                   - parseFloat(style.paddingBottom);
  const w = container.clientWidth - parseFloat(style.paddingLeft)
                                  - parseFloat(style.paddingRight);

  const opts = {
    width: w,
    height: h,
    scales: {
      x: {
        // auto: true,
        range: (self: uPlot, fromMin: number, fromMax: number) => {
          return [fromMin??0,Math.max(fromMax, initXRange)] as uPlot.Range.MinMax;
        },
        time: false,
      },
      y: {
        // auto: true,
        range: (self: uPlot, fromMin: number, fromMax: number) => {
          return [fromMin??0,Math.max(fromMax, initYRange)] as uPlot.Range.MinMax;
        },
      }
    },
    series: [
      {},
      {
        show: true,
        spanGaps: true,
        stroke: "red",
        width: 1,
      }
    ],
    axes: [
      {
        values: (self: uPlot, vals: number[]) => vals.map(v => v+ ' s'),
      },
      {
        values: (self: uPlot, vals: number[]) => vals.map(v => v+ ' N'),
      }
    ],
    plugins: [
      tooltip()
    ]
  }

  // let data = [Array(),Array()];
  let points: uPlot.AlignedData = [[], []];

  let plot = new uPlot(opts, points, document.querySelector(".data") as HTMLElement);

  let last_data_len = -1;
  let refresh = ()=> {
    if (last_data_len != points[0].length) {
      last_data_len = points[0].length;
      plot.setData(points);
    }

    window.requestAnimationFrame(refresh);
  };

  const start_button  = document.querySelector("button.start");
  const stop_button   = document.querySelector("button.stop");
  const delete_button = document.querySelector("button.delete");
  const save_button   = document.querySelector("button.save");
  if (!start_button ||
      !stop_button ||
      !delete_button ||
      !save_button
    )
    throw "can't find buttons";

  start_button.addEventListener("click", ()=>{
    window.app.websocket.send("data.start", []);
  });
  stop_button.addEventListener("click", ()=>{
    window.app.websocket.send("data.stop", []);
  });
  delete_button.addEventListener("click", ()=>{
    if (window.confirm("Are you sure? This CANNOT be undone.")) {
      window.app.websocket.send("data.stop", []);
      points = [[], []];
    }
  });
  save_button.addEventListener("click", ()=>{
    const rows = Array.from(points[0], (val, i) => `${val},${points[1][i]}`);
    const csv = rows.join('\n');

    const blob = new Blob([csv], {type: "text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = "data.csv";
    a.click();

    URL.revokeObjectURL(url);
  });

  function log(point: Data) {
    (points[0] as number[]).push(point.key);
    (points[1] as number[]).push(point.value);
  }
  

  refresh();


  return {log};
})();

