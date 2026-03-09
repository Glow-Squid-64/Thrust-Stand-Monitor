/// <reference path="app.ts"/>

window.app.status = (function(){
  class StatusCard {
    private name: string;
    private isRdy = false;
    handle: HTMLDivElement;

    set status(status: boolean) {
      this.isRdy = status;

      if (this.isRdy == false) {
        this.handle.classList.remove("green");
        this.handle.classList.add("red");
        this.handle.textContent = this.name+": Not ready";
      } else {
        this.handle.classList.remove("red");
        this.handle.classList.add("green");
        this.handle.textContent = this.name+": Ready";
      }
    }

    get status() {
      return this.isRdy;
    }

    constructor(str: string) {
      this.handle = document.createElement("div");
      this.handle.classList.add("card");
      document.querySelector(".status-list")?.appendChild(this.handle);
      
      this.name = str;
      this.status = false;
    }
  }

  let card_map: Dictionary<StatusCard> = {};

  function add(obj: Data) {
    card_map[obj.key] = new StatusCard(obj.key);
  }

  function set(obj: Data) {
    card_map[obj.key].status = obj.value;
  }

  function ready(): boolean {
    let val = Object.values(card_map);
    return val.length>0 && val.every(obj => obj.status);
  }

  return {add, set, ready};
})();