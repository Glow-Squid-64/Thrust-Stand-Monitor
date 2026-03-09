"use strict";
window.app = window.app || {};
/// <reference path="app.ts"/>
/// <reference path="uPlot.d.ts"/>
window.app.data = (function () {
    const initXRange = 30;
    const initYRange = 10;
    function tooltip() {
        let info;
        let hide = () => {
            info.style.visibility = "collapse";
        };
        let show = () => {
            info.style.visibility = "visible";
        };
        function init(u) {
            info = document.createElement("div");
            info.classList.add("tooltip");
            u.over.appendChild(info);
            u.over.addEventListener("mouseleave", hide);
            u.over.addEventListener("mouseenter", show);
        }
        function setCursor(u) {
            const idx = u.cursor.idx;
            if (idx == null || idx == undefined)
                return;
            let x = u.data[0][idx] ?? 0;
            let y = u.data[1][idx] ?? 0;
            let s = u.series[1];
            info.textContent = `(${x}, ${y})`;
            info.style.left = `${u.valToPos(x, 'x')}px`;
            info.style.top = `${u.valToPos(y, s.scale ?? "err")}px`;
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
                range: (self, fromMin, fromMax) => {
                    return [fromMin ?? 0, Math.max(fromMax, initXRange)];
                },
                time: false,
            },
            y: {
                // auto: true,
                range: (self, fromMin, fromMax) => {
                    return [fromMin ?? 0, Math.max(fromMax, initYRange)];
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
                values: (self, vals) => vals.map(v => v + ' s'),
            },
            {
                values: (self, vals) => vals.map(v => v + ' N'),
            }
        ],
        plugins: [
            tooltip()
        ]
    };
    // let data = [Array(),Array()];
    let points = [[], []];
    let plot = new uPlot(opts, points, document.querySelector(".data"));
    let last_data_len = -1;
    let refresh = () => {
        if (last_data_len != points[0].length) {
            last_data_len = points[0].length;
            plot.setData(points);
        }
        window.requestAnimationFrame(refresh);
    };
    const start_button = document.querySelector("button.start");
    const stop_button = document.querySelector("button.stop");
    const delete_button = document.querySelector("button.delete");
    const save_button = document.querySelector("button.save");
    if (!start_button ||
        !stop_button ||
        !delete_button ||
        !save_button)
        throw "can't find buttons";
    start_button.addEventListener("click", () => {
        window.app.websocket.send("data.start", []);
    });
    stop_button.addEventListener("click", () => {
        window.app.websocket.send("data.stop", []);
    });
    delete_button.addEventListener("click", () => {
        if (window.confirm("Are you sure? This CANNOT be undone.")) {
            window.app.websocket.send("data.stop", []);
            points = [[], []];
        }
    });
    save_button.addEventListener("click", () => {
        const rows = Array.from(points[0], (val, i) => `${val},${points[1][i]}`);
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "data.csv";
        a.click();
        URL.revokeObjectURL(url);
    });
    function log(point) {
        points[0].push(point.key);
        points[1].push(point.value);
    }
    refresh();
    return { log };
})();
/// <reference path="app.ts"/>
window.app.ignition = (function () {
    const TIMEOUT = 5;
    const COUNTDOWN = 3;
    let code_buffer = new Array(3);
    function saveCode(code) {
        code_buffer.push(code.value);
        code_buffer.shift();
    }
    function getCode() {
        window.app.websocket.send("ignition.getCode", []);
    }
    function clamp(min, x, max) {
        return Math.max(min, Math.min(x, max));
    }
    function setColor(element, color) {
        element.classList.remove("red", "orange", "green");
        element.classList.add(color);
    }
    const button = document.querySelector(".trigger.button");
    if (!button)
        return null;
    const safety = button.querySelector(".trigger.safety");
    const slider = button.querySelector(".trigger.slider");
    const progress = button.querySelector(".trigger.progress");
    const text = button.querySelector(".trigger.text");
    if (!safety || !slider || !progress || !text)
        return null;
    const minY = button.getBoundingClientRect().top;
    const maxY = button.getBoundingClientRect().bottom;
    const safetyWidth = safety.getBoundingClientRect().width;
    let startX;
    const maxDeltaX = button.getBoundingClientRect().width - safetyWidth;
    const resetEvent = new CustomEvent("reset");
    let state = "LOCKED";
    function lock() {
        state = "LOCKED";
        setColor(button, "green");
        text.textContent = "Locked";
        safety.style.translate = "0";
        safety.style.visibility = "visible";
        slider.style.width = "0";
        slider.style.visibility = "visible";
        progress.style.visibility = "collapse";
        progress.style.width = "0";
    }
    function startSlide(event) {
        if (window.app.status.ready()) {
            state = "SLIDING";
            startX = event.clientX;
        }
    }
    function onSlide(event) {
        let deltaX = event.clientX - startX;
        if (event.clientY > maxY || event.clientY < minY || deltaX < 0) {
            document.body.dispatchEvent(resetEvent);
            return;
        }
        safety.style.translate = `${clamp(0, deltaX, maxDeltaX)}px`;
        slider.style.width = `${clamp(0, deltaX + safetyWidth / 2, maxDeltaX)}px`;
        if (deltaX > maxDeltaX) {
            state = "PRIMED";
            text.textContent = "Primed";
            setColor(button, "orange");
            safety.style.visibility = "collapse";
            slider.style.visibility = "collapse";
            setTimeout(() => {
                if (state == "PRIMED") {
                    document.body.dispatchEvent(resetEvent);
                }
            }, TIMEOUT * 1000);
            return;
        }
    }
    function startCountdown() {
        state = "COUNTDOWN";
        let time = COUNTDOWN;
        text.textContent = time.toString();
        getCode();
        // Using css animation, this gets handled automatically
        progress.style.visibility = "visible";
        progress.style.width = "100%";
        let id = setInterval(() => {
            if (state != "COUNTDOWN") {
                clearInterval(id);
                return;
            }
            time--;
            text.textContent = time.toString();
            if (time <= 0) {
                clearInterval(id);
                state = "FIRED";
                dispatch(resetEvent);
                text.textContent = "Fired";
                window.app.websocket.send("ignition.start", Array.from(code_buffer, (val, i) => ({ key: i, value: val })));
            }
            else {
                // we don't need to get code when time reaches 0
                getCode();
            }
        }, 1000);
    }
    function dispatch(event) {
        // stops double firing
        event.stopPropagation();
        event.preventDefault();
        if (state == "FIRED") {
            safety.removeEventListener("pointerdown", dispatch);
            button.removeEventListener("pointerdown", dispatch);
            document.body.removeEventListener("pointermove", dispatch);
            document.body.removeEventListener("pointerup", dispatch);
            document.body.removeEventListener("pointercancel", dispatch);
            document.body.removeEventListener("reset", dispatch);
            return;
        }
        switch (event.type) {
            case "pointercancel":
            case "pointerup":
                if (state == "PRIMED")
                    break;
            case "reset":
                lock();
                break;
            case "pointerdown":
                if (state == "LOCKED") {
                    startSlide(event);
                }
                else if (state == "PRIMED") {
                    startCountdown();
                }
                break;
            case "pointermove":
                if (state == "SLIDING")
                    onSlide(event);
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
    return { saveCode };
})();
/// <reference path="app.ts"/>
window.app.status = (function () {
    class StatusCard {
        name;
        isRdy = false;
        handle;
        set status(status) {
            this.isRdy = status;
            if (this.isRdy == false) {
                this.handle.classList.remove("green");
                this.handle.classList.add("red");
                this.handle.textContent = this.name + ": Not ready";
            }
            else {
                this.handle.classList.remove("red");
                this.handle.classList.add("green");
                this.handle.textContent = this.name + ": Ready";
            }
        }
        get status() {
            return this.isRdy;
        }
        constructor(str) {
            this.handle = document.createElement("div");
            this.handle.classList.add("card");
            document.querySelector(".status-list")?.appendChild(this.handle);
            this.name = str;
            this.status = false;
        }
    }
    let card_map = {};
    function add(obj) {
        card_map[obj.key] = new StatusCard(obj.key);
    }
    function set(obj) {
        card_map[obj.key].status = obj.value;
    }
    function ready() {
        let val = Object.values(card_map);
        return val.length > 0 && val.every(obj => obj.status);
    }
    return { add, set, ready };
})();
/// <reference path="app.ts"/>
/// <reference path="status.iife.ts"/>
window.app.websocket = (function () {
    const app = window.app;
    function parse(obj, path) {
        return path.split('.').reduce((curr, key) => curr?.[key], obj);
    }
    if (!location.host)
        return;
    const socket = new WebSocket("ws://" + location.host);
    socket.addEventListener("open", () => {
        socket.addEventListener("message", (e) => {
            try {
                const msg = JSON.parse(e.data);
                const func = parse(app, msg.action);
                if (msg.data.length > 0) {
                    msg.data.forEach((e) => { func(e); });
                }
                else {
                    // For functions that don't require data
                    // None exists for now
                    func();
                }
            }
            catch (err) {
                console.error(`Failed to parse websocket message:${err}`);
            }
        });
    });
    function send(action, data) {
        if (socket.readyState != 1)
            return false;
        let packet = {
            action: action,
            data: data
        };
        socket.send(JSON.stringify(packet));
        return true;
    }
    return { send };
})();
