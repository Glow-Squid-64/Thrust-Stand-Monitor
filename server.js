
import { WebSocketServer } from "ws";
import express from "express";
import http from "http";

const app_src = "build";
const host    = "127.0.0.1";
const port    = "8000";

const app = express();
app.use(express.static(app_src));

const server = http.createServer(app);
const socket = new WebSocketServer({ server }, path="/ws");

socket.on("connection", (ws) => {
  console.log("New web socket established");

  ws.send(`{"action":"status.add","data":[{"key":"sq"},{"key":"sw"},{"key":"se"},{"key":"sr"},{"key":"st"}]}`);

  setTimeout(()=>{
     ws.send(`{"action":"status.set","data":[{"key":"sq","value":true},{"key":"sw","value":true},{"key":"se","value":true},{"key":"sr","value":true},{"key":"st","value":true}]}`);
  }, 3000);

  let api = (function() {
    function parse(msg) {
      // console.log(msg);
      const func = msg.action.split('.').reduce((curr, key)=>curr?.[key], api);
      if (msg.data.length > 0) {
        func(msg.data);
      } else {
        func();
      }
    }

    let data = (function() {
      let id = 0;
      let t = 0;
      function start() {
        id = setInterval(()=>{
          ws.send(`{"action":"data.log","data":[{"key":${t},"value":${Math.sin(t*1200)*2+1}}]}`);
          t++;
        }, 50);
      }

      function stop() {
        clearInterval(id);
      }

      return {start, stop};
    })();

    let ignition = (function() {
      let code_buffer = new Array(3);

      function getCode() {
        let code = crypto.randomUUID();
        code_buffer.push(code);
        code_buffer.shift();

        ws.send(`{"action":"ignition.saveCode","data":[{"value":"${code}"}]}`);
      }

      // note data is an array now;
      function start(d) {
        let code = new Map(Array.from(d, (val)=>[val.key, val.value]));
        if (code_buffer.every((v, i)=>(v == code.get(i)))) {
          console.log("kaboom");
          data.start();
        }
      }

      return {getCode, start};
    })();

    return {parse, data, ignition};
  })();

  ws.addEventListener("message", event => {
    // console.log(event.data);
    api.parse(JSON.parse(event.data));
  });
});

server.listen(port, host, () => {
  console.log(`Server deployed on ${host}:${port}`);
});