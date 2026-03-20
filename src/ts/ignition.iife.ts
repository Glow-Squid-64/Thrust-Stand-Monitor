/// <reference path="app.ts"/>

window.app.ignition = (function(){
  const TIMEOUT   = 5;
  const COUNTDOWN = 3;

  type State = "LOCKED"|"SLIDING"|"PRIMED"|"COUNTDOWN"|"FIRED";
  
  let code_buffer = new Array<string>(3);
  function saveCode(code: Data) {
    code_buffer.push(code.value);
    code_buffer.shift();
  }
  function getCode() {
    window.app.websocket.send("ignition.getCode", []);
  }
  function clamp(min: number, x: number, max: number) {
    return Math.max(min, Math.min(x, max));
  }

  function setColor(element: HTMLElement, color: string) {
    element.classList.remove("red", "orange", "green");
    element.classList.add(color);
  }

  const button = document.querySelector(".trigger.button")
  if (!button)
    return null;

  const safety   = button.querySelector<HTMLElement>(".trigger.safety");
  const slider   = button.querySelector<HTMLElement>(".trigger.slider");
  const progress = button.querySelector<HTMLElement>(".trigger.progress");
  const text     = button.querySelector<HTMLElement>(".trigger.text");

  if (!safety || !slider || !progress || !text)
    return null;

  const minY = button.getBoundingClientRect().top;
  const maxY = button.getBoundingClientRect().bottom;
  const safetyWidth = safety.getBoundingClientRect().width;
  let startX: number;
  const maxDeltaX = button.getBoundingClientRect().width - safetyWidth;
  
  const resetEvent = new CustomEvent("reset");

  let state: State = "LOCKED";

  function lock() {
    state = "LOCKED";
    
    setColor(button as HTMLElement, "green");

    text!.textContent = "Locked";

    safety!.style.translate  = "0";
    safety!.style.visibility = "visible";

    slider!.style.width      = "0";
    slider!.style.visibility = "visible";

    progress!.style.visibility         = "collapse";
    progress!.style.transitionDuration = "0s";
    progress!.style.width = "0";
  }

  function startSlide(event: PointerEvent) {
    if (window.app.status.ready()) {
      state = "SLIDING";
      startX = event.clientX;
    }
  }

  function onSlide(event: PointerEvent) {
    let deltaX = event.clientX - startX;

    if (event.clientY > maxY || event.clientY < minY || deltaX < 0) {
      document.body.dispatchEvent(resetEvent);
      return;
    }

    safety!.style.translate = `${clamp(0, deltaX, maxDeltaX)}px`;
    slider!.style.width     = `${clamp(0, deltaX+safetyWidth/2, maxDeltaX)}px`;

    if (deltaX > maxDeltaX) {
      state = "PRIMED";

      text!.textContent = "Primed";
      setColor(button as HTMLElement, "orange");
      safety!.style.visibility = "collapse";
      slider!.style.visibility = "collapse";

      setTimeout(()=>{
        if (state == "PRIMED") {
          document.body.dispatchEvent(resetEvent);
        }
      }, TIMEOUT*1000);

      return;
    }
  }

  function startCountdown() {
    state = "COUNTDOWN";

    let time = COUNTDOWN;

    text!.textContent = time.toString();
    getCode();
    // Using css animation, this gets handled automatically
    progress!.style.visibility = "visible";
    progress!.style.transitionDuration = `${COUNTDOWN}s`;
    progress!.style.width              = "100%";

    let id = setInterval(() => {
      if (state != "COUNTDOWN") {
        clearInterval(id);
        return;
      }

      time--;
      text!.textContent = time.toString();

      if (time <= 0) {
        
        clearInterval(id);
        state = "FIRED";
        dispatch(resetEvent);

        text!.textContent = "Fired";
        window.app.websocket.send("ignition.start",
          Array.from(code_buffer,
            (val, i): Data => (
              {key:i, value:val}
            )
          )
        );
      } else {
        // we don't need to get code when time reaches 0
        getCode();
      }
    }, 1000);
  }
  
  function dispatch(event: Event) {
    // stops double firing
    event.stopPropagation();
    event.preventDefault();
    if (state == "FIRED") {
      safety!.removeEventListener("pointerdown", dispatch);
      button!.removeEventListener("pointerdown", dispatch);
      document.body.removeEventListener("pointermove", dispatch);
      document.body.removeEventListener("pointerup", dispatch);
      document.body.removeEventListener("pointercancel", dispatch);
      document.body.removeEventListener("reset", dispatch);
      return;
    }

    switch(event.type) {
      case "pointercancel":
      case "pointerup":
        if (state == "PRIMED")
          break;
      case "reset":
        lock();
        break;
      case "pointerdown":
        if (state == "LOCKED") {
          startSlide(event as PointerEvent);
        } else if (state == "PRIMED") {
          startCountdown();
        }
        break;
      case "pointermove":
        if (state == "SLIDING")
          onSlide(event as PointerEvent);
        break;
    }
  }

  safety.addEventListener("pointerdown", dispatch);
  button.addEventListener("pointerdown", dispatch);
  document.body.addEventListener("pointermove", dispatch);
  document.body.addEventListener("pointerup", dispatch);
  document.body.addEventListener("pointercancel", dispatch);
  document.body.addEventListener("reset", dispatch);

  lock();

  return {saveCode};
})();