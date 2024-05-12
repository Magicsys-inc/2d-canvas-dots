// https://codepen.io/kennethcachia/pen/nPbyoR
let actionTime = 2000;

const S = (() => {
  const init = () => {
    S.Drawing.init(".canvas");
    document.body.classList.add("body--ready");

    S.UI.simulate("Shape|Shifter|Type|to start|#rectangle|#countdown 3||");

    S.Drawing.loop(() => {
      S.Shape.render();
    });
  }

  return {
    init,
  };
})();

S.Drawing = (() => {
  let canvas,
    context,
    renderFn,
    requestFrame =
      window.requestAnimationFrame ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };

  const init = (el) => {
    canvas = document.querySelector(el);
    context = canvas.getContext("2d");
    adjustCanvas(canvas);

    window.addEventListener("resize", (e) => {
      adjustCanvas(canvas);
    });
  };

  const loop = (fn) => {
    renderFn = !renderFn ? fn : renderFn;
    clearFrame();
    renderFn();
    requestFrame.call(window, loop);
  };

  const adjustCanvas = (canvas) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const clearFrame = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getArea = () => {
    return { w: canvas.width, h: canvas.height };
  };

  const drawCircle = (p, c) => {
    context.fillStyle = c.render();
    context.beginPath();
    context.arc(p.x, p.y, p.z, 0, 2 * Math.PI, true);
    context.closePath();
    context.fill();
  };

  return {
    init,
    loop,
    adjustCanvas,
    clearFrame,
    getArea,
    drawCircle,
  };
})();


S.UI = (() => {
  const input = document.querySelector(".ui-input");
  const ui = document.querySelector(".ui");
  const help = document.querySelector(".help");
  const commands = document.querySelector(".commands");
  const overlay = document.querySelector(".overlay");
  const canvas = document.querySelector(".canvas");
  let interval;
  const isTouch = "ontouchstart" in window || navigator.msMaxTouchPoints;
  let currentAction;
  let resizeTimer;
  let time;
  const maxShapeSize = 30;
  let firstAction = true;
  let sequence = [];
  const cmd = "#";

  const formatTime = (date) => {
    const h = date.getHours();
    let m = date.getMinutes();
    m = m < 10 ? "0" + m : m;
    return h + ":" + m;
  }

  const getValue = (value) => {
    return value && value.split(" ")[1];
  }

  const getAction = (value) => {
    value = value && value.split(" ")[0];
    return value && value[0] === cmd && value.substring(1);
  }

  const timedAction = (fn, delay, max, reverse) => {
    clearInterval(interval);
    currentAction = reverse ? max : 1;
    fn(currentAction);

    if (!max || (!reverse && currentAction < max) || (reverse && currentAction > 0)) {
      interval = setInterval(() => {
        currentAction = reverse ? currentAction - 1 : currentAction + 1;
        fn(currentAction);

        if ((!reverse && max && currentAction === max) || (reverse && currentAction === 0)) {
          clearInterval(interval);
        }
      }, delay);
    }
  }

  const reset = (destroy) => {
    clearInterval(interval);
    sequence = [];
    time = null;
    destroy && S.Shape.switchShape(S.ShapeBuilder.letter(""));
  }

  const performAction = (value) => {
    let action, current;
    overlay.classList.remove("overlay--visible");
    sequence = Array.isArray(value) ? value : sequence.concat(value.split("|"));
    input.value = "";
    checkInputWidth();

    timedAction(
      (index) => {
        current = sequence.shift();
        action = getAction(current);
        value = getValue(current);

        switch (action) {
          case "countdown":
            value = parseInt(value) || 10;
            value = value > 0 ? value : 10;

            timedAction(
              (index) => {
                if (index === 0) {
                  if (sequence.length === 0) {
                    S.Shape.switchShape(S.ShapeBuilder.letter(""));
                  } else {
                    performAction(sequence);
                  }
                } else {
                  S.Shape.switchShape(S.ShapeBuilder.letter(index), true);
                }
              },
              1000,
              value,
              true
            );
            break;

          case "rectangle":
            value = value && value.split("x");
            value =
              value && value.length === 2
                ? value
                : [maxShapeSize, maxShapeSize / 2];

            S.Shape.switchShape(
              S.ShapeBuilder.rectangle(
                Math.min(maxShapeSize, parseInt(value[0])),
                Math.min(maxShapeSize, parseInt(value[1]))
              )
            );
            break;

          case "circle":
            value = parseInt(value) || maxShapeSize;
            value = Math.min(value, maxShapeSize);
            S.Shape.switchShape(S.ShapeBuilder.circle(value));
            break;

          case "time":
            let t = formatTime(new Date());

            if (sequence.length > 0) {
              S.Shape.switchShape(S.ShapeBuilder.letter(t));
            } else {
              timedAction(() => {
                t = formatTime(new Date());
                if (t !== time) {
                  time = t;
                  S.Shape.switchShape(S.ShapeBuilder.letter(time));
                }
              }, 1000);
            }
            break;

          default:
            S.Shape.switchShape(
              S.ShapeBuilder.letter(current[0] === cmd ? "What?" : current)
            );
        }
      },
      actionTime, // time out
      sequence.length
    );
  }

  const checkInputWidth = (e) => {
    ui.classList.toggle("ui--wide", input.value.length > 18);
    ui.classList.toggle("ui--enter", firstAction && input.value.length > 0);
  }

  const bindEvents = () => {
    document.body.addEventListener("keydown", (e) => {
      input.focus();

      if (e.key === "Enter") {
        firstAction = false;
        reset();
        performAction(input.value);
      }
    });

    input.addEventListener("input", checkInputWidth);
    input.addEventListener("change", checkInputWidth);
    input.addEventListener("focus", checkInputWidth);

    help.addEventListener("click", (e) => {
      overlay.classList.toggle("overlay--visible");
      overlay.classList.contains("overlay--visible") && reset(true);
    });

    commands.addEventListener("click", (e) => {
      let el, info, demo, url;
      if (e.target.classList.contains("commands-item")) {
        el = e.target;
      } else {
        el = e.target.parentNode.classList.contains("commands-item")
          ? e.target.parentNode
          : e.target.parentNode.parentNode;
      }
      info = el && el.querySelector(".commands-item-info");
      demo = el && info.getAttribute("data-demo");
      url = el && info.getAttribute("data-url");

      if (info) {
        overlay.classList.remove("overlay--visible");

        if (demo) {
          input.value = demo;
          isTouch ? (reset(), performAction(input.value)) : input.focus();
        } else if (url) {
          window.location = url;
        }
      }
    });

    canvas.addEventListener("click", (e) => {
      overlay.classList.remove("overlay--visible");
    });
  }

  const init = () => {
    bindEvents();
    input.focus();
    isTouch && document.body.classList.add("touch");
  }

  // Init
  init();

  return {
    simulate: function (action) {
      performAction(action);
    },
  };
})();

S.UI.Tabs = (() => {
  const tabs = document.querySelector(".tabs");
  const labels = document.querySelector(".tabs-labels");
  const triggers = document.querySelectorAll(".tabs-label");
  const panels = document.querySelectorAll(".tabs-panel");

  const activate = (i) => {
    triggers[i].classList.add("tabs-label--active");
    panels[i].classList.add("tabs-panel--active");
  }

  const bindEvents = () => {
    labels.addEventListener("click", (e) => {
      const el = e.target;
      let index;

      if (el.classList.contains("tabs-label")) {
        for (let t = 0; t < triggers.length; t++) {
          triggers[t].classList.remove("tabs-label--active");
          panels[t].classList.remove("tabs-panel--active");

          if (el === triggers[t]) {
            index = t;
          }
        }

        activate(index);
      }
    });
  }

  const init = () => {
    activate(0);
    bindEvents();
  }

  // Init
  init();
})();

class Point {
  constructor({ x, y, z, a, h }) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.a = a; // alpha (transparency) value
    this.h = h; // height value
  }
}

class Color {
  constructor(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a; // alpha (transparency) value
  }

  render() {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`;
  }
}

class Dot {
  constructor(x, y) {
    this.p = new Point({
      x: x,
      y: y,
      z: 5,
      a: 1,
      h: 0,
    });
    this.e = 0.07; // easing factor
    this.s = true; // dot active
    this.c = new Color(255, 255, 255, this.p.a);
    this.t = this.clone(); // target point
    this.q = []; // store movement queue for the dot
  }

  clone() {
    return new Point({
      x: this.p.x,
      y: this.p.y,
      z: this.p.z,
      a: this.p.a,
      h: this.p.h,
    });
  }

  _draw() {
    this.c.a = this.p.a;
    S.Drawing.drawCircle(this.p, this.c);
  }

  _moveTowards(n) {
    let details = this.distanceTo(n, true);
    let dx = details[0];
    let dy = details[1];
    let d = details[2];
    let e = this.e * d;

    if (this.p.h === -1) {
      this.p.x = n.x;
      this.p.y = n.y;
      return true;
    }

    if (d > 1) {
      this.p.x -= (dx / d) * e;
      this.p.y -= (dy / d) * e;
    } else {
      if (this.p.h > 0) {
        this.p.h--;
      } else {
        return true;
      }
    }

    return false;
  }

  _update() {
    if (this._moveTowards(this.t)) {
      let p = this.q.shift();

      if (p) {
        this.t.x = p.x || this.p.x;
        this.t.y = p.y || this.p.y;
        this.t.z = p.z || this.p.z;
        this.t.a = p.a || this.p.a;
        this.p.h = p.h || 0;
      } else {
        if (this.s) {
          this.p.x -= Math.sin(Math.random() * 3.142);
          this.p.y -= Math.sin(Math.random() * 3.142);
        } else {
          this.move(
            new Point({
              x: this.p.x + Math.random() * 50 - 25,
              y: this.p.y + Math.random() * 50 - 25,
            })
          );
        }
      }
    }

    let d = this.p.a - this.t.a;
    this.p.a = Math.max(0.1, this.p.a - d * 0.05);
    d = this.p.z - this.t.z;
    this.p.z = Math.max(1, this.p.z - d * 0.05);
  }

  distanceTo(n, details) {
    let dx = this.p.x - n.x;
    let dy = this.p.y - n.y;
    let d = Math.sqrt(dx * dx + dy * dy);

    return details ? [dx, dy, d] : d;
  }

  move(p, avoidStatic) {
    if (!avoidStatic || (avoidStatic && this.distanceTo(p) > 1)) {
      this.q.push(p);
    }
  }

  render() {
    this._update();
    this._draw();
  }
}


S.ShapeBuilder = (() => {
  const gap = 14; // gap between dots
  const shapeCanvas = document.createElement("canvas");
  const shapeContext = shapeCanvas.getContext("2d");
  const fontSize = 500;
  const fontFamily = "Avenir, Helvetica Neue, Helvetica, Arial, sans-serif";

  const fit = () => {
    shapeCanvas.width = Math.floor(window.innerWidth / gap) * gap; // evenly spaced patterns -- grid system
    shapeCanvas.height = Math.floor(window.innerHeight / gap) * gap;
    shapeContext.fillStyle = "red";
    shapeContext.textBaseline = "middle";
    shapeContext.textAlign = "center";
  }

  const processCanvas = () => {
    const pixels = shapeContext.getImageData(
      0,
      0,
      shapeCanvas.width,
      shapeCanvas.height
    ).data;
    const dots = [];
    let x = 0;
    let y = 0;
    let fx = shapeCanvas.width;
    let fy = shapeCanvas.height;
    let w = 0;
    let h = 0;

    for (let p = 0; p < pixels.length; p += 4 * gap) {
      if (pixels[p + 3] > 0) {
        dots.push(
          new Point({
            x: x,
            y: y,
          })
        );

        w = x > w ? x : w;
        h = y > h ? y : h;
        fx = x < fx ? x : fx;
        fy = y < fy ? y : fy;
      }

      x += gap;

      if (x >= shapeCanvas.width) {
        x = 0;
        y += gap;
        p += gap * 4 * shapeCanvas.width;
      }
    }

    return { dots: dots, w: w + fx, h: h + fy };
  }

  const setFontSize = (s) => {
    shapeContext.font = "bold " + s + "px " + fontFamily;
  }

  const isNumber = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  const init = () => {
    fit();
    window.addEventListener("resize", fit);
  }

  // Init
  init();

  return {
    imageFile: (url, callback) => {
      const image = new Image();
      const a = S.Drawing.getArea();

      image.onload = () => {
        shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
        // shapeContext.drawImage(image, 0, 0, a.h * 0.6, a.h * 0.6); 
        shapeContext.drawImage(image, 0, 0, a.w * 0.6, a.h * 0.6); 
        callback(processCanvas());
      };

      image.onerror = () => {
        callback(S.ShapeBuilder.letter("What?")); // ??
      };

      image.src = url;
    },

    circle: (d) => {
      const r = Math.max(0, d) / 2;
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      shapeContext.beginPath();
      shapeContext.arc(r * gap, r * gap, r * gap, 0, 2 * Math.PI, false);
      shapeContext.fill();
      shapeContext.closePath();

      return processCanvas();
    },

    letter: (l) => {
      let s = 0;

      setFontSize(fontSize);
      s = Math.min(
        fontSize,
        (shapeCanvas.width / shapeContext.measureText(l).width) *
          0.8 *
          fontSize,
        (shapeCanvas.height / fontSize) * (isNumber(l) ? 1 : 0.45) * fontSize
      );
      setFontSize(s);

      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      shapeContext.fillText(l, shapeCanvas.width / 2, shapeCanvas.height / 2);

      return processCanvas();
    },

    rectangle: (w, h) => {
      const dots = [];
      const width = gap * w;
      const height = gap * h;

      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          dots.push(
            new Point({
              x: x,
              y: y,
            })
          );
        }
      }

      return { dots: dots, w: width, h: height };
    },
  };
})();

S.Shape = (() => {
  let dots = [];
  let width = 0;
  let height = 0;
  let cx = 0;
  let cy = 0;

  const compensate = () => {
    const a = S.Drawing.getArea();
    cx = a.w / 2 - width / 2;
    cy = a.h / 2 - height / 2;
  }

  return {
    shuffleIdle: () => {
      const a = S.Drawing.getArea();
      for (let d = 0; d < dots.length; d++) {
        if (!dots[d].s) {
          dots[d].move({
            x: Math.random() * a.w,
            y: Math.random() * a.h,
          });
        }
      }
    },

    switchShape: (n, fast) => {
      let size;
      const a = S.Drawing.getArea();
      width = n.w;
      height = n.h;
      compensate();

      if (n.dots.length > dots.length) {
        size = n.dots.length - dots.length;
        for (let d = 1; d <= size; d++) {
          dots.push(new Dot(a.w / 2, a.h / 2));
        }
      }

      let d = 0;
      let i = 0;

      while (n.dots.length > 0) {
        i = Math.floor(Math.random() * n.dots.length);
        dots[d].e = fast ? 0.25 : dots[d].s ? 0.14 : 0.11;

        if (dots[d].s) {
          dots[d].move(
            new Point({
              z: Math.random() * 20 + 10,
              a: Math.random(),
              h: 18,
            })
          );
        } else {
          dots[d].move(
            new Point({
              z: Math.random() * 5 + 5,
              h: fast ? 18 : 30,
            })
          );
        }

        dots[d].s = true;
        dots[d].move(
          new Point({
            x: n.dots[i].x + cx,
            y: n.dots[i].y + cy,
            a: 1,
            z: 5,
            h: 0,
          })
        );

        n.dots = n.dots.slice(0, i).concat(n.dots.slice(i + 1));
        d++;
      }

      for (let i = d; i < dots.length; i++) {
        if (dots[i].s) {
          dots[i].move(
            new Point({
              z: Math.random() * 20 + 10,
              a: Math.random(),
              h: 20,
            })
          );

          dots[i].s = false;
          dots[i].e = 0.04;
          dots[i].move(
            new Point({
              x: Math.random() * a.w,
              y: Math.random() * a.h,
              a: 0.3,
              z: Math.random() * 4,
              h: 0,
            })
          );
        }
      }
    },

    render: () => {
      for (let d = 0; d < dots.length; d++) {
        dots[d].render();
      }
    },
  };
})();

S.init();
