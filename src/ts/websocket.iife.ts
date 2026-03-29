/// <reference path="app.ts"/>
/// <reference path="status.iife.ts"/>

window.app.websocket = (function(){
  const app    = window.app;

  type Packet = {
    action: string;
    data: Data[];
  }

  function parse(obj: typeof app, path: string): Function {
    return path.split('.').reduce((curr, key)=>curr?.[key], obj);
  }

  if (!location.host)
    return;

  const socket = new WebSocket("ws://"+location.host+"/ws");

  socket.addEventListener("open", ()=> {
    socket.addEventListener("message", (e)=> {
      try {
        const msg = JSON.parse(e.data);
        const func = parse(app, msg.action);
        if (msg.data.length > 0) {
          msg.data.forEach((e: Data)=>{func(e)});
        } else {
          // For functions that don't require data
          // None exists for now
          func();
        }
      } catch(err) {
        console.error(`Failed to parse websocket message:${err}`);
      }
    });
  });

  function send(action: string, data: Data[]): boolean {
    if (socket.readyState != 1)
      return false;

    let packet: Packet = {
      action: action,
      data: data
    };

    socket.send(JSON.stringify(packet));

    return true;
  }

  return {send};
})();