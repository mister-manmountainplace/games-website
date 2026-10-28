(function () {
  "use strict";

  const SAVE_KEYS = {
    runner: "campusArcade.saharaRun",
    safari: "campusArcade.wildHunt",
    napoleon: "campusArcade.cannonDash"
  };

  function loadSave(game, fallback) {
    try {
      return { ...fallback, ...JSON.parse(localStorage.getItem(SAVE_KEYS[game]) || "{}") };
    } catch (error) {
      return { ...fallback };
    }
  }

  function saveGame(game, data) {
    localStorage.setItem(SAVE_KEYS[game], JSON.stringify(data));
  }

  function addPoints(game, save, amount) {
    if (amount <= 0) return;
    save.points += amount;
    saveGame(game, save);
  }

  const runnerCanvas = document.getElementById("runnerGame");
  const safariCanvas = document.getElementById("safariGame");
  const napoleonCanvas = document.getElementById("napoleonGame");

  const keys = new Set();

  document.querySelectorAll(".instructions-button").forEach((button) => {
    button.addEventListener("click", () => {
      const list = button.nextElementSibling;
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      list.hidden = expanded;
    });
  });

  window.addEventListener("keydown", (event) => {
    keys.add(event.key.toLowerCase());
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  function fillPoly(ctx, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  function roundedLabel(ctx, x, y, text, color) {
    ctx.fillStyle = "rgba(255, 250, 240, 0.88)";
    ctx.fillRect(x - 8, y - 22, ctx.measureText(text).width + 16, 30);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawSavannah(ctx, w, h, roadProgress, theme = "sunrise") {
    const horizon = h * 0.48;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, theme === "dusk" ? "#473d73" : "#5d9fca");
    sky.addColorStop(0.58, theme === "dusk" ? "#b66b74" : "#a9d7e5");
    sky.addColorStop(1, theme === "dusk" ? "#e6a35e" : "#f6d18a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);
    ctx.fillStyle = "#f5c15d";
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.16, 38, 0, Math.PI * 2);
    ctx.fill();
    const sand = ctx.createLinearGradient(0, horizon, 0, h);
    sand.addColorStop(0, theme === "dusk" ? "#b86c4d" : "#d8aa57");
    sand.addColorStop(1, theme === "dusk" ? "#714252" : "#9d6b39");
    ctx.fillStyle = sand;
    ctx.fillRect(0, horizon, w, h - horizon);

    for (let i = 0; i < 5; i += 1) {
      const x = ((i * 230 - roadProgress * 180) % (w + 260)) - 130;
      fillPoly(ctx, [[x, horizon + 18], [x + 82, horizon - 40], [x + 188, horizon + 18]], "#78984d");
    }

    ctx.strokeStyle = "rgba(255, 231, 164, 0.34)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const x = ((i * 97 - roadProgress * 420) % (w + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(x, horizon + 28 + (i % 3) * 18);
      ctx.lineTo(x + 34, horizon + 24 + (i % 3) * 18);
      ctx.stroke();
    }

    ctx.fillStyle = "#5a3926";
    for (let i = 0; i < 4; i += 1) {
      const x = ((i * 310 - roadProgress * 250) % (w + 330)) - 80;
      ctx.fillRect(x, horizon - 20, 14, 78);
      fillPoly(ctx, [[x - 58, horizon - 36], [x - 12, horizon - 84], [x + 76, horizon - 46], [x + 48, horizon - 8]], "#2f6040");
    }

    fillPoly(ctx, [[w * 0.28, h], [w * 0.43, horizon], [w * 0.57, horizon], [w * 0.72, h]], "#bd8848");
    fillPoly(ctx, [[w * 0.38, h], [w * 0.47, horizon], [w * 0.53, horizon], [w * 0.62, h]], "#e8b45c");

    // Gravel texture streams from the horizon toward the flag to sell forward motion.
    ctx.save();
    ctx.globalAlpha = 0.46;
    const gravelPhase = (roadProgress * 320) % 52;
    for (let i = 0; i < 34; i += 1) {
      const depth = ((i * 52 + gravelPhase) % 380) / 380;
      const y = horizon + depth * (h - horizon);
      const width = 18 + depth * 250;
      const center = w * 0.5 + Math.sin(i * 2.7) * depth * 30;
      const x = center + (Math.sin(i * 4.1) * 0.5) * width;
      ctx.fillStyle = i % 3 === 0 ? "#7e5c3e" : "#a8784a";
      ctx.fillRect(x, y, 3 + depth * 4, 2 + depth * 3);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(23, 33, 43, 0.22)";
    ctx.lineWidth = 3;
    [0.4, 0.5, 0.6].forEach((lane) => {
      ctx.beginPath();
      ctx.moveTo(w * 0.5, horizon);
      ctx.lineTo(w * lane, h);
      ctx.stroke();
    });
  }

  function drawWesternFlag(ctx, x, y, size, sliding, skin = "western", image = null) {
    const height = sliding ? size * 0.42 : size * 0.62;
    ctx.save();
    ctx.translate(x, y);
    if (image && image.complete && image.naturalWidth) {
      ctx.drawImage(image, -size * 0.5, -height * 0.5, size, height);
      ctx.strokeStyle = "#17212b";
      ctx.lineWidth = 4;
      ctx.strokeRect(-size * 0.5, -height * 0.5, size, height);
      ctx.restore();
      return;
    }
    const palettes = {
      western: ["#17212b", "#ffffff", "#1e8f50", "#c74343"],
      belgium: ["#171717", "#f3c542", "#c74343", "#171717"],
      somalia: ["#4aa7d8", "#4aa7d8", "#4aa7d8", "#ffffff"],
      newzealand: ["#1d4f91", "#1d4f91", "#1d4f91", "#e64c4c"],
      brazil: ["#2e8b57", "#f3c542", "#2e8b57", "#173f8a"],
      micronesia: ["#74b9df", "#74b9df", "#74b9df", "#ffffff"]
    };
    const colors = palettes[skin] || palettes.western;
    ctx.fillStyle = colors[0];
    ctx.fillRect(-size * 0.5, -height * 0.5, size, height / 3);
    ctx.fillStyle = colors[1];
    ctx.fillRect(-size * 0.5, -height * 0.5 + height / 3, size, height / 3);
    ctx.fillStyle = colors[2];
    ctx.fillRect(-size * 0.5, -height * 0.5 + (height / 3) * 2, size, height / 3);
    fillPoly(ctx, [[-size * 0.5, -height * 0.5], [-size * 0.5, height * 0.5], [-size * 0.06, 0]], colors[3]);
    if (["somalia", "newzealand", "micronesia"].includes(skin)) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `${size * 0.3}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(skin === "micronesia" ? "✦" : "★", size * 0.08, 0);
    }
    if (skin === "brazil") {
      ctx.fillStyle = colors[3];
      ctx.beginPath(); ctx.arc(size * 0.08, 0, size * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "#17212b";
    ctx.lineWidth = 4;
    ctx.strokeRect(-size * 0.5, -height * 0.5, size, height);
    ctx.restore();
  }

  function drawMoroccoFlag(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#c74343";
    ctx.fillRect(-size * 0.5, -size * 0.34, size, size * 0.68);
    ctx.fillStyle = "#236d3a";
    ctx.font = `${size * 0.42}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("*", 0, 2);
    ctx.strokeStyle = "#17212b";
    ctx.lineWidth = 4;
    ctx.strokeRect(-size * 0.5, -size * 0.34, size, size * 0.68);
    ctx.restore();
  }

  function drawAnimalObstacle(ctx, animal, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    if (animal === "giraffe") {
      ctx.fillStyle = "#b98542";
      ctx.fillRect(-size * 0.1, -size * 1.62, size * 0.18, size * 1.28);
      ctx.fillRect(-size * 0.44, -size * 0.32, size * 0.82, size * 0.32);
      ctx.fillRect(-size * 0.36, -size * 0.04, size * 0.12, size * 0.42);
      ctx.fillRect(size * 0.2, -size * 0.04, size * 0.12, size * 0.42);
      ctx.fillStyle = "#71431f";
      ctx.fillRect(size * 0.02, -size * 1.62, size * 0.28, size * 0.2);
      ctx.fillStyle = "#e1b866";
      ctx.fillRect(-size * 0.06, -size * 1.42, size * 0.09, size * 0.14);
    } else if (animal === "lion" || animal === "leopard") {
      ctx.fillStyle = animal === "lion" ? "#b76f28" : "#d3a94b";
      ctx.fillRect(-size * 0.48, -size * 0.34, size * 0.84, size * 0.32);
      ctx.fillRect(-size * 0.28, -size * 0.08, size * 0.12, size * 0.34);
      ctx.fillRect(size * 0.18, -size * 0.08, size * 0.12, size * 0.34);
      ctx.fillStyle = animal === "lion" ? "#734019" : "#4d3321";
      ctx.beginPath();
      ctx.arc(size * 0.42, -size * 0.3, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#476a35";
      fillPoly(ctx, [[-size * 0.46, 0], [0, -size * 0.52], [size * 0.46, 0]]);
    }
    ctx.restore();
  }

  function runRunner(canvas) {
    const ctx = canvas.getContext("2d");
    const save = loadSave("runner", { points: 0, unlockedSkins: ["western"], selectedSkin: "western", unlockedThemes: ["sunrise"], selectedTheme: "sunrise" });
    const flagImages = {};
    const flagSources = {
      belgium: "https://flagcdn.com/w160/be.png",
      somalia: "https://flagcdn.com/w160/so.png",
      newzealand: "https://flagcdn.com/w160/nz.png",
      brazil: "https://flagcdn.com/w160/br.png",
      micronesia: "https://flagcdn.com/w160/fm.png"
    };
    Object.entries(flagSources).forEach(([name, source]) => {
      const image = new Image();
      image.src = source;
      flagImages[name] = image;
    });
    let lane = 1;
    let targetLane = 1;
    let yBoost = 0;
    let jumpVelocity = 0;
    let slideTimer = 0;
    let distance = 0;
    let pelts = 0;
    let speed = 7;
    let roadProgress = 0;
    let spawnTimer = 0;
    let pointDistance = 0;
    let over = false;
    const obstacles = [];
    const peltTokens = [];
    const laneXs = [0.39, 0.5, 0.61];

    function reset() {
      lane = 1;
      targetLane = 1;
      yBoost = 0;
      jumpVelocity = 0;
      slideTimer = 0;
      distance = 0;
      pelts = 0;
      speed = 7;
      roadProgress = 0;
      spawnTimer = 0;
      pointDistance = 0;
      over = false;
      obstacles.length = 0;
      peltTokens.length = 0;
    }

    function spawn() {
      const animalTypes = ["lion", "leopard", "giraffe", "bush"];
      obstacles.push({
        lane: Math.floor(Math.random() * 3),
        z: 2.3,
        kind: animalTypes[Math.floor(Math.random() * animalTypes.length)]
      });
      if (Math.random() > 0.35) {
        peltTokens.push({
          lane: Math.floor(Math.random() * 3),
          z: 2.3
        });
      }
    }

    function update() {
      if (over) {
        if (keys.has(" ")) reset();
        return;
      }

      if ((keys.has("arrowleft") || keys.has("a")) && targetLane > 0) {
        targetLane -= 1;
        keys.delete("arrowleft");
        keys.delete("a");
      }
      if ((keys.has("arrowright") || keys.has("d")) && targetLane < 2) {
        targetLane += 1;
        keys.delete("arrowright");
        keys.delete("d");
      }
      if ((keys.has("arrowup") || keys.has("w")) && yBoost === 0) {
        jumpVelocity = 15;
      }
      if (keys.has("arrowdown") || keys.has("s")) {
        slideTimer = 22;
      }

      lane += (targetLane - lane) * 0.22;
      yBoost = Math.max(0, yBoost + jumpVelocity);
      jumpVelocity -= 1.1;
      if (yBoost === 0 && jumpVelocity < 0) jumpVelocity = 0;
      slideTimer = Math.max(0, slideTimer - 1);
      distance += speed * 0.25;
      if (distance - pointDistance >= 100) {
        const earned = Math.floor((distance - pointDistance) / 100);
        pointDistance += earned * 100;
        addPoints("runner", save, earned);
      }
      speed += 0.0025;
      const roadMotion = speed * 0.001615;
      const obstacleMotion = roadMotion * 0.7;
      roadProgress += roadMotion;
      spawnTimer -= speed;
      if (spawnTimer <= 0) {
        spawn();
        spawnTimer = 220 + Math.random() * 90;
      }

      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const obstacle = obstacles[i];
        obstacle.z -= obstacleMotion;
        if (obstacle.z < 0.1) {
          obstacles.splice(i, 1);
          continue;
        }
        const laneHit = Math.abs(obstacle.lane - lane) < 0.42;
        const close = obstacle.z < 0.23;
        const needsJump = obstacle.kind === "bush" || obstacle.kind === "lion" || obstacle.kind === "leopard";
        const needsSlide = obstacle.kind === "giraffe";
        if (laneHit && close && ((needsJump && yBoost < 42) || (needsSlide && slideTimer === 0))) {
          over = true;
        }
      }

      for (let i = peltTokens.length - 1; i >= 0; i -= 1) {
        const token = peltTokens[i];
        token.z -= obstacleMotion;
        if (token.z < 0.1) {
          peltTokens.splice(i, 1);
          continue;
        }
        if (Math.abs(token.lane - lane) < 0.42 && token.z < 0.32) {
          pelts += 1;
          peltTokens.splice(i, 1);
        }
      }
    }

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      drawSavannah(ctx, w, h, roadProgress, save.selectedTheme);

      [...obstacles].sort((a, b) => b.z - a.z).forEach((obstacle) => {
        const scale = Math.max(0, 2.3 - obstacle.z);
        const x = w * laneXs[obstacle.lane] + (obstacle.lane - 1) * 80 * scale;
        const y = h * (0.48 + scale * 0.48);
        drawAnimalObstacle(ctx, obstacle.kind, x, y, 10 + scale * 150);
      });

      peltTokens.forEach((token) => {
        const scale = Math.max(0, 2.3 - token.z);
        const x = w * laneXs[token.lane] + (token.lane - 1) * 72 * scale;
        const y = h * (0.47 + scale * 0.5);
        ctx.fillStyle = "#8a5a37";
        ctx.beginPath();
        ctx.arc(x, y, 10 + scale * 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f1d4a5";
        ctx.beginPath();
        ctx.arc(x - 4, y - 4, 4 + scale * 8, 0, Math.PI * 2);
        ctx.fill();
      });

      const flagBob = Math.sin(distance * 0.1) * 9;
      const chaseBob = Math.sin(distance * 0.1 + Math.PI) * 7;
      drawMoroccoFlag(ctx, w * 0.5, h * 0.86 + chaseBob, 72);
      drawWesternFlag(ctx, w * (0.39 + lane * 0.11), h * 0.69 - yBoost + flagBob, 104, slideTimer > 0, save.selectedSkin, flagImages[save.selectedSkin]);

      ctx.fillStyle = "#17212b";
      ctx.font = "700 22px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      roundedLabel(ctx, 28, 42, `${Math.floor(distance)} m`, "#17212b");
      roundedLabel(ctx, 28, 78, `${pelts} pelts`, "#17212b");
      roundedLabel(ctx, 28, 114, `${save.points} points`, "#17212b");

      if (over) {
        ctx.fillStyle = "rgba(23, 33, 43, 0.72)";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fffaf0";
        ctx.font = "800 46px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Chase caught you", w / 2, h / 2 - 18);
        ctx.font = "700 20px Arial";
        ctx.fillText("Press Space to run again", w / 2, h / 2 + 24);
      }
    }

    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }

    reset();
    loop();
  }

  function drawLowPolyAnimal(ctx, animal, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    const body = animal.includes("fox") ? "#b85e35" : animal.includes("coyote") ? "#9c8061" : animal === "bear" ? "#4d382d" : color;
    const dark = "#49372b";
    const ink = "#17212b";
    ctx.shadowColor = "rgba(23, 33, 43, 0.28)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 6;
    const leg = (xLeg, height, width = 0.13) => {
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(3, size * width);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(xLeg, -size * 0.27);
      ctx.lineTo(xLeg + size * 0.04, size * height * 0.78);
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(xLeg + size * 0.04, size * height * 0.78, size * width * 0.72, size * width * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    const neck = (fromX, fromY, toX, toY, width = 0.14) => {
      ctx.strokeStyle = body;
      ctx.lineWidth = Math.max(4, size * width);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    };
    const eye = (xEye, yEye) => {
      ctx.fillStyle = "#fffaf0";
      ctx.beginPath();
      ctx.arc(xEye, yEye, Math.max(2, size * 0.07), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(xEye + size * 0.02, yEye, Math.max(1, size * 0.035), 0, Math.PI * 2);
      ctx.fill();
    };

    if (["grouse", "duck", "ptarmigan", "capercaillie", "guinea fowl"].includes(animal)) {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-size * 0.12, -size * 0.22, size * 0.72, size * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      fillPoly(ctx, [[size * 0.32, -size * 0.38], [size * 0.98, -size * 0.52], [size * 1.1, -size * 0.23], [size * 0.36, -size * 0.06]], body);
      fillPoly(ctx, [[size * 1.06, -size * 0.45], [size * 1.4, -size * 0.36], [size * 1.06, -size * 0.25]], "#d28b39");
      fillPoly(ctx, [[-size * 0.4, -size * 0.32], [size * 0.12, -size * 0.54], [size * 0.28, -size * 0.04], [-size * 0.36, -size * 0.1]], "rgba(255,255,255,0.2)");
      leg(-size * 0.34, 0.34, 0.08);
      leg(size * 0.2, 0.34, 0.08);
      eye(size * 0.92, -size * 0.4);
    } else if (animal === "bear") {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-size * 0.1, -size * 0.32, size * 0.9, size * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.72, -size * 0.68, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(size * 0.84, -size * 0.56, size * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(size * 0.48, -size * 0.98, size * 0.16, 0, Math.PI * 2);
      ctx.arc(size * 0.92, -size * 1.02, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
      leg(-size * 0.52, 0.52, 0.2); leg(size * 0.25, 0.52, 0.2);
      eye(size * 0.88, -size * 0.78);
    } else if (["boar", "warthog", "buffalo"].includes(animal)) {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-size * 0.12, -size * 0.3, size * 0.96, size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      if (animal === "buffalo") {
        fillPoly(ctx, [[-size * 0.74, -size * 0.46], [-size * 0.45, -size * 0.98], [size * 0.1, -size * 0.72], [size * 0.34, -size * 0.28]], body);
      }
      ctx.beginPath();
      ctx.arc(size * 0.78, -size * 0.48, size * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(size * 1.05, -size * 0.34, size * 0.25, size * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      if (animal === "warthog" || animal === "buffalo") {
        ctx.strokeStyle = "#efe0bb";
        ctx.lineWidth = Math.max(2, size * 0.06);
        ctx.beginPath();
        ctx.arc(size * 0.98, -size * 0.2, size * 0.24, Math.PI * 1.15, Math.PI * 1.9);
        ctx.stroke();
      }
      leg(-size * 0.5, 0.48, 0.16); leg(size * 0.25, 0.48, 0.16);
      eye(size * 0.9, -size * 0.58);
    } else if (["deer", "elk", "roe deer", "antelope", "gazelle"].includes(animal)) {
      const slim = ["antelope", "gazelle"].includes(animal);
      const tall = animal === "elk" || animal === "antelope";
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-size * 0.18, -size * (tall ? 0.42 : 0.38), size * (slim ? 0.74 : 0.84), size * (tall ? 0.4 : 0.36), 0, 0, Math.PI * 2);
      ctx.fill();
      fillPoly(ctx, [[size * 0.3, -size * 0.5], [size * 0.56, -size * (tall ? 1.18 : 1.08)], [size * 0.76, -size * (tall ? 1.32 : 1.2)], [size * 0.88, -size * 0.52]], body);
      ctx.beginPath();
      ctx.arc(size * 0.84, -size * (tall ? 1.34 : 1.22), size * 0.22, 0, Math.PI * 2);
      ctx.fill();
      leg(-size * 0.56, 0.82, 0.075); leg(-size * 0.27, 0.76, 0.065);
      leg(size * 0.18, 0.82, 0.075); leg(size * 0.42, 0.76, 0.065);
      ctx.strokeStyle = "rgba(23,33,43,0.35)";
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(-size * 0.48, -size * 0.56); ctx.lineTo(-size * 0.26, -size * 0.24);
      ctx.moveTo(size * 0.18, -size * 0.54); ctx.lineTo(size * 0.38, -size * 0.24);
      ctx.stroke();
      ctx.strokeStyle = dark;
      ctx.lineWidth = Math.max(2, size * 0.045);
      ctx.beginPath();
      ctx.moveTo(size * 0.78, -size * (tall ? 1.45 : 1.34)); ctx.lineTo(size * 0.62, -size * (tall ? 1.8 : 1.65));
      ctx.moveTo(size * 0.72, -size * (tall ? 1.62 : 1.51)); ctx.lineTo(size * 0.52, -size * (tall ? 1.84 : 1.68));
      if (["elk", "deer", "roe deer"].includes(animal)) {
        ctx.moveTo(size * 0.86, -size * 1.45); ctx.lineTo(size * 1.08, -size * 1.72);
        ctx.moveTo(size * 1.01, -size * 1.63); ctx.lineTo(size * 1.2, -size * 1.63);
      }
      ctx.stroke();
      ctx.fillStyle = slim ? "#f2d29d" : "rgba(255,255,255,0.28)";
      ctx.beginPath(); ctx.ellipse(-size * 0.4, -size * 0.46, size * 0.18, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      eye(size * 0.96, -size * (tall ? 1.38 : 1.26));
    } else if (["red fox", "coyote"].includes(animal)) {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-size * 0.2, -size * 0.34, size * 0.78, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      fillPoly(ctx, [[-size * 0.66, -size * 0.35], [-size * 1.42, -size * 0.78], [-size * 1.1, -size * 0.08], [-size * 0.7, -size * 0.06]], body);
      fillPoly(ctx, [[size * 0.38, -size * 0.52], [size * 0.98, -size * 0.84], [size * 1.2, -size * 0.36], [size * 0.64, -size * 0.18]], body);
      leg(-size * 0.5, 0.62, 0.1); leg(size * 0.2, 0.62, 0.1);
      eye(size * 1.04, -size * 0.64);
    } else if (animal === "hare" || animal === "springhare") {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-size * 0.2, -size * 0.34, size * 0.62, size * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.42, -size * 0.62, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      fillPoly(ctx, [[size * 0.28, -size * 0.8], [size * 0.28, -size * 1.55], [size * 0.48, -size * 0.9]], body);
      fillPoly(ctx, [[size * 0.58, -size * 0.82], [size * 0.76, -size * 1.48], [size * 0.78, -size * 0.76]], body);
      leg(-size * 0.52, 0.22, 0.2); leg(size * 0.16, 0.22, 0.12);
      eye(size * 0.56, -size * 0.7);
    } else {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(-size * 0.1, -size * 0.34, size * 0.8, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size * 0.7, -size * 0.55, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      leg(-size * 0.5, 0.55, 0.12); leg(size * 0.22, 0.55, 0.12);
      eye(size * 0.82, -size * 0.64);
    }
    // Layered highlights, markings, and connective anatomy keep the silhouettes readable.
    if (["grouse", "duck", "ptarmigan", "capercaillie", "guinea fowl"].includes(animal)) {
      neck(size * 0.25, -size * 0.32, size * 0.85, -size * 0.43, 0.16);
      ctx.strokeStyle = "rgba(255,255,255,0.38)";
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.beginPath();
      ctx.moveTo(-size * 0.45, -size * 0.28); ctx.lineTo(size * 0.05, -size * 0.48);
      ctx.moveTo(-size * 0.3, -size * 0.14); ctx.lineTo(size * 0.18, -size * 0.36);
      ctx.stroke();
    } else if (animal === "bear") {
      neck(size * 0.42, -size * 0.48, size * 0.74, -size * 0.68, 0.24);
      ctx.fillStyle = "#2f241e";
      ctx.beginPath(); ctx.arc(size * 0.9, -size * 0.53, size * 0.06, 0, Math.PI * 2); ctx.fill();
    } else if (["boar", "warthog", "buffalo"].includes(animal)) {
      neck(size * 0.28, -size * 0.34, size * 0.7, -size * 0.48, 0.2);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = Math.max(2, size * 0.04);
      ctx.beginPath(); ctx.moveTo(-size * 0.48, -size * 0.42); ctx.lineTo(size * 0.25, -size * 0.55); ctx.stroke();
    } else if (["deer", "elk", "roe deer", "antelope", "gazelle"].includes(animal)) {
      neck(size * 0.3, -size * 0.45, size * 0.72, -size * 1.1, 0.16);
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.beginPath(); ctx.moveTo(-size * 0.55, -size * 0.48); ctx.lineTo(size * 0.1, -size * 0.57); ctx.stroke();
    } else if (["red fox", "coyote"].includes(animal)) {
      neck(size * 0.28, -size * 0.42, size * 0.78, -size * 0.68, 0.14);
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = Math.max(2, size * 0.04);
      ctx.beginPath(); ctx.moveTo(-size * 0.75, -size * 0.42); ctx.lineTo(-size * 1.18, -size * 0.57); ctx.stroke();
    } else if (animal === "hare" || animal === "springhare") {
      neck(size * 0.2, -size * 0.4, size * 0.45, -size * 0.65, 0.14);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = Math.max(2, size * 0.04);
      ctx.beginPath(); ctx.moveTo(-size * 0.42, -size * 0.3); ctx.lineTo(size * 0.02, -size * 0.45); ctx.stroke();
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  function runSafari(canvas) {
    const ctx = canvas.getContext("2d");
    const save = loadSave("safari", { points: 0, trophies: 0, unlockedMaps: ["forest"] });
    const buttons = Array.from(document.querySelectorAll(".map-button"));
    const unlocks = { forest: true, siberia: save.unlockedMaps.includes("siberia"), savannah: save.unlockedMaps.includes("savannah"), tundra: save.unlockedMaps.includes("tundra"), wetlands: save.unlockedMaps.includes("wetlands") };
    const animals = {
      forest: ["grouse", "duck", "red fox", "coyote", "deer", "ptarmigan"],
      siberia: ["elk", "boar", "hare", "capercaillie", "roe deer", "bear"],
      savannah: ["warthog", "antelope", "guinea fowl", "gazelle", "buffalo", "springhare"],
      tundra: ["ptarmigan", "hare", "elk", "coyote", "bear", "roe deer"],
      wetlands: ["duck", "grouse", "boar", "buffalo", "gazelle", "red fox"]
    };
    const palettes = {
      forest: ["#93b874", "#2f6040", "#bfd7ea", "#6b8e4e"],
      siberia: ["#dbe9ee", "#5d7280", "#b9d3df", "#8ba3ad"],
      savannah: ["#d2a24a", "#476a35", "#8ecae6", "#b98542"],
      tundra: ["#dcecf2", "#6c8e9b", "#b9d9e8", "#9ab5bd"],
      wetlands: ["#8db79c", "#2f6040", "#b8dce7", "#557850"]
    };
    const animalProfiles = {
      grouse: { size: 30, color: "#665343" }, duck: { size: 28, color: "#6d8b70" },
      ptarmigan: { size: 28, color: "#e7edf0" }, capercaillie: { size: 34, color: "#304b46" },
      "guinea fowl": { size: 29, color: "#52636b" }, "red fox": { size: 43, color: "#b85e35" },
      coyote: { size: 45, color: "#9c8061" }, deer: { size: 51, color: "#b98542" },
      elk: { size: 66, color: "#765037" }, "roe deer": { size: 42, color: "#aa7748" },
      bear: { size: 73, color: "#4d382d" }, boar: { size: 53, color: "#685548" },
      hare: { size: 30, color: "#9b876e" }, warthog: { size: 50, color: "#7b6650" },
      antelope: { size: 48, color: "#c69a5b" }, gazelle: { size: 44, color: "#bd8b4e" },
      buffalo: { size: 75, color: "#4e473e" }, springhare: { size: 32, color: "#a88660" }
    };
    let currentMap = "forest";
    let timer = 45;
    let lastSecond = performance.now();
    let targets = [];
    let crosshair = { x: canvas.width / 2, y: canvas.height / 2 };
    let hoveredTarget = null;
    let message = "Forest map ready";

    function syncButtons() {
      buttons.forEach((button) => {
        const map = button.dataset.map;
        button.classList.toggle("active", map === currentMap);
        button.classList.toggle("locked", !unlocks[map]);
      });
    }

    function spawnTarget() {
      const list = animals[currentMap];
      const animal = list[Math.floor(Math.random() * list.length)];
      const profile = animalProfiles[animal] || { size: 44, color: "#8a6b4b" };
      targets.push({
        animal,
        x: 140 + Math.random() * (canvas.width - 280),
        y: 250 + Math.random() * 160,
        size: profile.size * (0.92 + Math.random() * 0.16),
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1.3),
        color: profile.color
      });
    }

    function resetRound() {
      timer = 45;
      targets = [];
      for (let i = 0; i < 4; i += 1) spawnTarget();
      lastSecond = performance.now();
    }

    function unlockMaps() {
      syncButtons();
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const map = button.dataset.map;
        if (!unlocks[map]) {
          message = "Unlock this map in the Wild Hunt shop";
          return;
        }
        currentMap = map;
        message = `${button.textContent} map ready`;
        resetRound();
        syncButtons();
      });
    });

    function pointFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height
      };
    }

    canvas.addEventListener("pointermove", (event) => {
      crosshair = pointFromEvent(event);
      hoveredTarget = targets.slice().reverse().find((target) => {
        return Math.hypot(crosshair.x - target.x, crosshair.y - target.y) < target.size * 1.2;
      }) || null;
    });

    canvas.addEventListener("pointerdown", (event) => {
      crosshair = pointFromEvent(event);
      for (let i = targets.length - 1; i >= 0; i -= 1) {
        const target = targets[i];
        const dx = crosshair.x - target.x;
        const dy = crosshair.y - target.y;
        if (Math.hypot(dx, dy) < target.size * 1.15) {
          const previousPoints = Math.floor(save.trophies / 5);
          save.trophies += 1;
          const newPoints = Math.floor(save.trophies / 5);
          addPoints("safari", save, newPoints - previousPoints);
          saveGame("safari", save);
          message = `Tagged ${target.animal}`;
          targets.splice(i, 1);
          spawnTarget();
          unlockMaps();
          return;
        }
      }
      message = "Missed shot";
    });

    function update() {
      const now = performance.now();
      if (now - lastSecond > 1000) {
        timer -= 1;
        lastSecond = now;
      }
      if (timer <= 0) {
        message = "Round reset";
        resetRound();
      }
      targets.forEach((target) => {
        target.x += target.vx;
        if (target.x < 70 || target.x > canvas.width - 70) target.vx *= -1;
      });
    }

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      const palette = palettes[currentMap];
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.58);
      sky.addColorStop(0, palette[2]);
      sky.addColorStop(1, currentMap === "forest" ? "#d9e4d0" : palette[0]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.58);
      const ground = ctx.createLinearGradient(0, h * 0.5, 0, h);
      ground.addColorStop(0, palette[0]);
      ground.addColorStop(1, currentMap === "siberia" ? "#8299a2" : "#536e3e");
      ctx.fillStyle = ground;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      ctx.fillStyle = currentMap === "siberia" ? "#a7c4cf" : "rgba(60, 93, 56, 0.55)";
      for (let i = 0; i < 7; i += 1) {
        const x = i * 170 - 50;
        fillPoly(ctx, [[x, h * 0.5], [x + 85, h * 0.22 + (i % 2) * 20], [x + 190, h * 0.5]], ctx.fillStyle);
      }

      for (let i = 0; i < 8; i += 1) {
        const x = i * 145 + 30;
        const trunk = currentMap === "siberia" ? "#5d5044" : "#5a3926";
        ctx.fillStyle = trunk;
        ctx.fillRect(x, h * 0.33, 16, 116);
        fillPoly(ctx, [[x - 40, h * 0.38], [x + 8, h * 0.14], [x + 58, h * 0.38]], palette[1]);
        if (currentMap === "siberia") {
          fillPoly(ctx, [[x - 28, h * 0.29], [x + 8, h * 0.18], [x + 42, h * 0.29]], "#eef7f7");
        }
      }

      targets.forEach((target) => {
        drawLowPolyAnimal(ctx, target.animal, target.x, target.y, target.size, target.color);
      });

      if (hoveredTarget && targets.includes(hoveredTarget)) {
        const label = hoveredTarget.animal.toUpperCase();
        ctx.font = "800 15px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelWidth = ctx.measureText(label).width + 20;
        ctx.fillStyle = "rgba(255, 250, 240, 0.94)";
        ctx.fillRect(hoveredTarget.x - labelWidth / 2, hoveredTarget.y + hoveredTarget.size * 0.72, labelWidth, 25);
        ctx.fillStyle = "#17212b";
        ctx.fillText(label, hoveredTarget.x, hoveredTarget.y + hoveredTarget.size * 0.72 + 13);
      }

      ctx.strokeStyle = "#17212b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(crosshair.x, crosshair.y, 24, 0, Math.PI * 2);
      ctx.moveTo(crosshair.x - 36, crosshair.y);
      ctx.lineTo(crosshair.x + 36, crosshair.y);
      ctx.moveTo(crosshair.x, crosshair.y - 36);
      ctx.lineTo(crosshair.x, crosshair.y + 36);
      ctx.stroke();

      ctx.fillStyle = "#17212b";
      ctx.font = "700 20px Arial";
      ctx.textAlign = "left";
      roundedLabel(ctx, 28, 42, `${save.trophies} trophies`, "#17212b");
      roundedLabel(ctx, 28, 78, `${save.points} points`, "#17212b");
      roundedLabel(ctx, 28, 114, `${timer}s`, "#17212b");
      roundedLabel(ctx, 28, 150, message, "#17212b");
    }

    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }

    resetRound();
    syncButtons();
    loop();
  }

  function runNapoleon(canvas) {
    const ctx = canvas.getContext("2d");
    const save = loadSave("napoleon", { points: 0, unlockedSkins: ["napoleon"], selectedSkin: "napoleon" });
    let y = 0;
    let vy = 0;
    let score = 0;
    let speed = 7;
    let nextSpawnDistance = 18;
    let over = false;
    let jumpCount = 0;
    let pointDistance = 0;
    const cannonballs = [];

    function reset() {
      y = 0;
      vy = 0;
      score = 0;
      speed = 7;
      nextSpawnDistance = 18;
      over = false;
      jumpCount = 0;
      pointDistance = 0;
      cannonballs.length = 0;
    }

    function jump() {
      if (jumpCount < 2) {
        // Faster cannonballs tighten the jump arc so the timing stays demanding.
        vy = Math.max(12.5, 16 - score * 0.012);
        jumpCount += 1;
      }
    }

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === " " || key === "arrowup" || key === "w") {
        if (over && key === " ") reset();
        if (!over) jump();
      }
    });

    function update() {
      if (over) return;
      score += 0.12;
      if (score - pointDistance >= 50) {
        const earned = Math.floor((score - pointDistance) / 50);
        pointDistance += earned * 50;
        addPoints("napoleon", save, earned);
      }
      speed += 0.0022;
      y = Math.max(0, y + vy);
      vy -= 0.9 + Math.min(0.55, score * 0.0012);
      if (y === 0 && vy < 0) {
        vy = 0;
        jumpCount = 0;
      }
      if (score >= nextSpawnDistance) {
        cannonballs.push({
          x: canvas.width + 40,
          r: 16 + Math.random() * 11.2,
          rotation: 0,
          approachSpeed: speed + Math.min(8, score * 0.025)
        });
        // Score is measured in metres, so every pair starts at least 10 m apart.
        nextSpawnDistance = score + 10 + Math.random() * 5;
      }
      cannonballs.forEach((ball) => {
        ball.approachSpeed += 0.002;
        ball.x -= ball.approachSpeed;
        ball.rotation -= 0.12;
      });
      while (cannonballs[0] && cannonballs[0].x < -60) {
        cannonballs.shift();
      }

      const player = { x: 180, y: canvas.height - 122 - y, w: 54, h: 92 };
      cannonballs.forEach((ball) => {
        const bx = ball.x;
        const by = canvas.height - 70;
        if (
          bx + ball.r > player.x &&
          bx - ball.r < player.x + player.w &&
          by + ball.r > player.y &&
          by - ball.r < player.y + player.h
        ) {
          over = true;
        }
      });
    }

    function drawNapoleon(x, groundY) {
      ctx.save();
      ctx.translate(x, groundY - y);
      const skins = {
        napoleon: { coat: "#263044", trim: "#c74343", hat: "#17212b", face: "#f0c28f" },
        washington: { coat: "#314a68", trim: "#d4b16a", hat: "#40352e", face: "#e7b98b" },
        augustus: { coat: "#7e3d34", trim: "#d9bd76", hat: "#f0e2c2", face: "#d9a97d" },
        cleopatra: { coat: "#236d73", trim: "#e8c55c", hat: "#152f4a", face: "#d9a078" }
      };
      const skin = skins[save.selectedSkin] || skins.napoleon;
      ctx.lineCap = "round";
      if (save.selectedSkin === "washington") {
        ctx.fillStyle = skin.coat;
        ctx.beginPath(); ctx.moveTo(-27, -82); ctx.lineTo(-19, -107); ctx.lineTo(18, -107); ctx.lineTo(28, -82); ctx.lineTo(22, -25); ctx.lineTo(-23, -25); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#f4eee0";
        ctx.fillRect(-18, -75, 36, 9);
        ctx.fillStyle = skin.face; ctx.beginPath(); ctx.arc(3, -112, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = skin.hat;
        ctx.fillRect(-27, -130, 58, 7); ctx.fillRect(-15, -139, 30, 12);
        ctx.fillStyle = skin.trim; ctx.fillRect(-25, -84, 7, 50); ctx.fillRect(18, -84, 7, 50);
        ctx.strokeStyle = "#f0d9aa"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, -104); ctx.lineTo(5, -83); ctx.stroke();
        ctx.fillStyle = "#17212b"; ctx.fillRect(-15, -25, 11, 31); ctx.fillRect(11, -25, 11, 31);
      } else if (save.selectedSkin === "augustus") {
        ctx.fillStyle = skin.coat;
        ctx.beginPath(); ctx.moveTo(-28, -83); ctx.lineTo(-17, -106); ctx.lineTo(18, -106); ctx.lineTo(29, -83); ctx.lineTo(23, -24); ctx.lineTo(-23, -24); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#efe0bb"; ctx.fillRect(-5, -96, 10, 65);
        ctx.fillStyle = skin.face; ctx.beginPath(); ctx.arc(2, -113, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = skin.hat; ctx.beginPath(); ctx.ellipse(2, -130, 31, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-14, -137, 32, 9);
        ctx.fillStyle = skin.trim; ctx.fillRect(-25, -42, 50, 9);
        ctx.strokeStyle = "#f0e2c2"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-19, -81); ctx.lineTo(-31, -25); ctx.moveTo(20, -81); ctx.lineTo(31, -25); ctx.stroke();
        ctx.fillStyle = "#8a6a36"; ctx.fillRect(-16, -24, 12, 30); ctx.fillRect(10, -24, 12, 30);
      } else if (save.selectedSkin === "cleopatra") {
        ctx.fillStyle = skin.coat;
        ctx.beginPath(); ctx.moveTo(-30, -83); ctx.lineTo(-19, -107); ctx.lineTo(19, -107); ctx.lineTo(30, -83); ctx.lineTo(22, -22); ctx.lineTo(-22, -22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e8c55c"; ctx.fillRect(-25, -78, 50, 8); ctx.fillRect(-6, -104, 12, 78);
        ctx.fillStyle = skin.face; ctx.beginPath(); ctx.arc(2, -113, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = skin.hat; ctx.fillRect(-22, -136, 48, 10); ctx.fillRect(-12, -145, 28, 12);
        ctx.fillStyle = "#d8c6a0"; ctx.fillRect(-16, -22, 12, 30); ctx.fillRect(10, -22, 12, 30);
        ctx.strokeStyle = "#f3da72"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(2, -113, 18, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = skin.coat;
        ctx.beginPath(); ctx.moveTo(-24, -82); ctx.lineTo(-19, -107); ctx.lineTo(18, -107); ctx.lineTo(24, -82); ctx.lineTo(22, -24); ctx.lineTo(-21, -24); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#1f2530"; ctx.fillRect(-14, -24, 12, 30); ctx.fillRect(10, -24, 12, 30);
        ctx.fillStyle = skin.face; ctx.fillRect(-10, -108, 24, 24);
        ctx.fillStyle = skin.hat; fillPoly(ctx, [[-32, -108], [2, -132], [38, -108], [12, -98]], skin.hat);
        ctx.fillStyle = skin.trim; ctx.fillRect(-20, -70, 44, 8);
        ctx.fillStyle = "#f0d6ad"; ctx.fillRect(-18, -91, 5, 17); ctx.fillRect(14, -91, 5, 17);
      }
      ctx.restore();
    }

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#cfe2ef";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#8e997c";
      ctx.fillRect(0, h - 84, w, 84);
      ctx.fillStyle = "#67775f";
      for (let i = 0; i < 14; i += 1) {
        const x = ((((i * 150 - score * 12) % (w + 300)) + (w + 300)) % (w + 300)) - 150;
        fillPoly(ctx, [[x, h - 84], [x + 50, h - 170 - (i % 3) * 16], [x + 112, h - 84]], i % 2 ? "#6d8a56" : "#718b60");
      }
      ctx.strokeStyle = "#17212b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h - 84);
      ctx.lineTo(w, h - 84);
      ctx.stroke();

      drawNapoleon(188, h - 70);

      cannonballs.forEach((ball) => {
        const by = h - 70;
        const ballGradient = ctx.createRadialGradient(
          ball.x - ball.r * 0.34, by - ball.r * 0.38, ball.r * 0.12,
          ball.x, by, ball.r
        );
        ballGradient.addColorStop(0, "#89939a");
        ballGradient.addColorStop(0.34, "#4f5960");
        ballGradient.addColorStop(1, "#20262b");
        ctx.save();
        ctx.translate(ball.x, by);
        ctx.rotate(ball.rotation);
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(12, 16, 19, 0.62)";
        ctx.lineWidth = Math.max(2, ball.r * 0.12);
        ctx.beginPath();
        ctx.ellipse(0, 0, ball.r * 0.78, ball.r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(220, 226, 229, 0.2)";
        ctx.lineWidth = Math.max(1, ball.r * 0.07);
        ctx.beginPath();
        ctx.arc(-ball.r * 0.28, -ball.r * 0.28, ball.r * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      ctx.fillStyle = "#17212b";
      ctx.font = "700 22px Arial";
      ctx.textAlign = "left";
      roundedLabel(ctx, 28, 42, `${Math.floor(score)} m`, "#17212b");
      roundedLabel(ctx, 28, 78, `${save.points} points`, "#17212b");

      if (over) {
        ctx.fillStyle = "rgba(23, 33, 43, 0.72)";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fffaf0";
        ctx.font = "800 46px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Cannonball hit", w / 2, h / 2 - 18);
        ctx.font = "700 20px Arial";
        ctx.fillText("Press Space to dash again", w / 2, h / 2 + 24);
      }
    }

    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }

    reset();
    loop();
  }

  function renderShop(game) {
    const balance = document.getElementById("shopBalance");
    const items = document.getElementById("shopItems");
    const message = document.getElementById("shopMessage");
    const defaults = {
      runner: { points: 0, unlockedSkins: ["western"], selectedSkin: "western", unlockedThemes: ["sunrise"], selectedTheme: "sunrise" },
      safari: { points: 0, trophies: 0, unlockedMaps: ["forest"] },
      napoleon: { points: 0, unlockedSkins: ["napoleon"], selectedSkin: "napoleon" }
    };
    const save = loadSave(game, defaults[game]);
    const catalogs = {
      runner: [
        { id: "western", name: "Western Sahara flag", type: "skin", cost: 0, description: "Return to the original Western Sahara flag." },
        { id: "belgium", name: "Belgium flag", type: "skin", cost: 2, description: "Run behind the black, gold, and red tricolor." },
        { id: "somalia", name: "Somalia flag", type: "skin", cost: 3, description: "A bright blue flag with a guiding star." },
        { id: "newzealand", name: "New Zealand flag", type: "skin", cost: 4, description: "A navy flag with a red-star accent." },
        { id: "brazil", name: "Brazil flag", type: "skin", cost: 5, description: "Bring green, gold, and blue to the desert." },
        { id: "micronesia", name: "Micronesia flag", type: "skin", cost: 6, description: "A sky-blue flag with a bright star." },
        { id: "sunrise", name: "Normal theme", type: "theme", cost: 0, description: "Return to the original daytime Sahara theme." },
        { id: "dusk", name: "Dusk theme", type: "theme", cost: 4, description: "Swap the sunrise for a warm purple sunset." }
      ],
      safari: [
        { id: "siberia", name: "Siberia map", type: "map", cost: 4, description: "Hunt through snowy forests." },
        { id: "savannah", name: "Savannah map", type: "map", cost: 7, description: "Track animals across golden grasslands." },
        { id: "tundra", name: "Tundra map", type: "map", cost: 10, description: "A frozen expedition with hardy game." },
        { id: "wetlands", name: "Wetlands map", type: "map", cost: 13, description: "A lush new route full of movement." }
      ],
      napoleon: [
        { id: "napoleon", name: "Napoleon", type: "skin", cost: 0, description: "Return to the original Cannon Dash commander." },
        { id: "washington", name: "George Washington", type: "skin", cost: 4, description: "Dash as the American general." },
        { id: "augustus", name: "Augustus Caesar", type: "skin", cost: 7, description: "Trade the bicorne for a Roman commander." },
        { id: "cleopatra", name: "Cleopatra", type: "skin", cost: 9, description: "A royal teal-and-gold runner." }
      ]
    };
    const collection = (item) => item.type === "map" ? save.unlockedMaps : item.type === "theme" ? save.unlockedThemes : save.unlockedSkins;
    const isOwned = (item) => collection(item).includes(item.id);
    const isSelected = (item) => item.type === "map" ? false : (item.type === "theme" ? save.selectedTheme === item.id : save.selectedSkin === item.id);

    function paint() {
      balance.textContent = `${save.points} points available${game === "safari" ? ` · ${save.trophies} trophies` : ""}`;
      items.innerHTML = catalogs[game].map((item) => {
        const owned = isOwned(item);
        const selected = isSelected(item);
        const action = owned ? (item.type === "map" ? "Unlocked" : selected ? "Selected" : "Select") : `Unlock · ${item.cost} points`;
        return `<article class="shop-card"><div class="shop-art ${game}-${item.id}"></div><div><p class="eyebrow">${item.type}</p><h2>${item.name}</h2><p>${item.description}</p><button class="shop-button" data-item="${item.id}" ${selected || (owned && item.type === "map") ? "disabled" : ""}>${action}</button></div></article>`;
      }).join("");
      items.querySelectorAll(".shop-button").forEach((button) => {
        button.addEventListener("click", () => {
          const item = catalogs[game].find((entry) => entry.id === button.dataset.item);
          const owned = isOwned(item);
          if (!owned) {
            if (save.points < item.cost) { message.textContent = "You need more points for that unlock."; return; }
            save.points -= item.cost;
            collection(item).push(item.id);
            saveGame(game, save);
            message.textContent = `${item.name} unlocked.`;
          } else if (item.type !== "map") {
            if (item.type === "theme") save.selectedTheme = item.id;
            else save.selectedSkin = item.id;
            saveGame(game, save);
            message.textContent = `${item.name} selected.`;
          }
          paint();
        });
      });
    }
    paint();
  }

  if (document.body.dataset.shopGame) renderShop(document.body.dataset.shopGame);

  if (runnerCanvas) runRunner(runnerCanvas);
  if (safariCanvas) runSafari(safariCanvas);
  if (napoleonCanvas) runNapoleon(napoleonCanvas);
}());
