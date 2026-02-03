/**
 * gameEngine.js
 * Fruit Catcher 게임의 핵심 로직 (3구역 시스템)
 */

class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // 캔버스 크기 조정 (고해상도 처리)
    // this.resizeCanvas(); // 반응형을 위해 loop에서 처리하거나 init에서 처리

    this.isPlaying = false;
    this.score = 0;
    this.level = 1;
    this.timeLeft = 60;

    this.items = []; // 떨어지는 아이템들
    this.lastSpawnTime = 0;
    this.spawnInterval = 1000; // 1초마다 생성 (레벨업 시 감소)

    // 3구역 정의 (0, 1, 2)
    this.currentLane = 1; // 0:Left, 1:Center, 2:Right (시작은 중앙)

    // 게임 루프용
    this.animationId = null;
    this.lastTime = 0;

    // 리소스 (이미지 대신 간단한 드로잉으로 시작, 추후 이미지 교체 가능)
    this.basketColor = "#8e44ad";
    this.basketImg = new Image();
    this.basketImg.src = "./assets/basket.png";
  }

  start() {
    this.resetGame();
    this.isPlaying = true;

    // 카운트다운 후 시작 로직은 생략하고 바로 시작 (또는 나중에 추가)
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    this.startTimer();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.timerId) clearInterval(this.timerId);

    this.showMessage("게임 종료!", `최종 점수: ${this.score}`);
  }

  resetGame() {
    this.score = 0;
    this.level = 1;
    this.timeLeft = 60;
    this.items = [];
    this.currentLane = 1; // 중앙 시작
    this.spawnInterval = 1500;

    this.updateUI();
    this.hideMessage();

    // 캔버스 크기 맞춤
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.laneWidth = this.canvas.width / 3;
  }

  startTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.timeLeft--;
      this.updateUI();

      // 레벨업 (20초마다)
      if (this.timeLeft === 40 || this.timeLeft === 20) {
        this.levelUp();
      }

      if (this.timeLeft <= 0) {
        this.stop();
      }
    }, 1000);
  }

  levelUp() {
    this.level++;
    this.spawnInterval = Math.max(400, 1500 - (this.level - 1) * 400); // 속도 증가
    // 시각적 알림 효과 추가 가능
  }

  updatePlayerPosition(poseLabel) {
    // 라벨: "왼쪽", "정면", "오른쪽"
    // 포즈에 따라 차선 변경
    if (poseLabel === "왼쪽") this.currentLane = 0;
    else if (poseLabel === "정면") this.currentLane = 1;
    else if (poseLabel === "오른쪽") this.currentLane = 2;
  }

  loop(currentTime) {
    if (!this.isPlaying) return;

    if (!currentTime) currentTime = performance.now();

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.draw();

    this.animationId = requestAnimationFrame(time => this.loop(time));
  }

  update(deltaTime, currentTime) {
    // 1. 아이템 생성
    if (currentTime - this.lastSpawnTime > this.spawnInterval) {
      this.spawnItem();
      this.lastSpawnTime = currentTime;
    }

    // 2. 아이템 이동 및 충돌 처리
    // 캔버스 하단 Y좌표
    const groundY = this.canvas.height;
    const basketY = groundY - 60; // 바구니 높이

    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];

      // 떨어지기
      item.y += item.speed * (deltaTime / 16); // 60fps 기준 보정

      // 바구니 충돌 체크 (같은 라인이고, Y위치가 바구니에 닿았을 때)
      if (item.lane === this.currentLane &&
        item.y >= basketY && item.y < groundY) {

        this.handleCollision(item);
        this.items.splice(i, 1); // 제거
        continue;
      }

      // 바닥에 닿음 (놓침)
      if (item.y > groundY) {
        this.items.splice(i, 1); // 제거
      }
    }
  }

  spawnItem() {
    const lane = Math.floor(Math.random() * 3); // 0, 1, 2 중 랜덤
    const typeRand = Math.random();

    let type = "apple";
    let speed = 3 + (this.level * 1.5); // 레벨별 속도 증가

    if (typeRand < 0.1) {
      type = "bomb"; // 10% 확률 폭탄
    } else if (typeRand < 0.3) {
      type = "grape"; // 20% 확률 포도
      speed *= 1.2; // 포도는 조금 더 빠름
    }

    this.items.push({
      lane: lane,
      y: -50, // 위에서 시작
      type: type,
      speed: speed
    });
  }

  handleCollision(item) {
    if (item.type === "bomb") {
      // 게임 오버
      if (window.soundManager) window.soundManager.playBomb();
      this.score = 0;
      this.stop();
      this.showMessage("GAME OVER 💥", `폭탄을 건드렸어요!`);
      return;
    }

    let points = 0;
    if (item.type === "apple") points = 100;
    if (item.type === "grape") points = 200;

    if (window.soundManager) window.soundManager.playCollect();

    this.score += points;
    this.updateUI();

    // 획득 효과 (간단히 콘솔 로그)
    // console.log(`Got ${item.type}! +${points}`);
  }

  draw() {
    // 화면 지우기
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 라인 그리기 (3구역 구분선)
    this.ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.laneWidth, 0);
    this.ctx.lineTo(this.laneWidth, this.canvas.height);
    this.ctx.moveTo(this.laneWidth * 2, 0);
    this.ctx.lineTo(this.laneWidth * 2, this.canvas.height);
    this.ctx.stroke();

    // 2. 바구니 그리기
    const basketX = (this.currentLane * this.laneWidth) + (this.laneWidth / 2);
    const basketY = this.canvas.height - 70; // 바구니 위치 조정

    if (this.basketImg.complete && this.basketImg.naturalHeight !== 0) {
      // 이미지 그리기 (중앙 정렬)
      const width = 80;
      const height = 80;
      this.ctx.drawImage(this.basketImg, basketX - (width / 2), basketY, width, height);
    } else {
      // 이미지 로딩 전 fallback (기존 로직)
      this.ctx.fillStyle = this.basketColor;
      this.ctx.beginPath();
      this.ctx.arc(basketX, basketY + 40, 30, 0, Math.PI, false);
      this.ctx.fill();
    }

    // 3. 아이템 그리기
    this.items.forEach(item => {
      const itemX = (item.lane * this.laneWidth) + (this.laneWidth / 2);

      if (item.type === "apple") {
        this.ctx.fillStyle = "red";
        this.ctx.beginPath();
        this.ctx.arc(itemX, item.y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        // 잎사귀
        this.ctx.fillStyle = "green";
        this.ctx.fillRect(itemX - 2, item.y - 25, 4, 10);
      } else if (item.type === "grape") {
        this.ctx.fillStyle = "purple";
        this.ctx.beginPath();
        this.ctx.arc(itemX, item.y, 18, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath(); // 포도알 몇개 더
        this.ctx.arc(itemX - 10, item.y - 10, 10, 0, Math.PI * 2);
        this.ctx.arc(itemX + 10, item.y - 10, 10, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (item.type === "bomb") {
        this.ctx.fillStyle = "black";
        this.ctx.beginPath();
        this.ctx.arc(itemX, item.y, 22, 0, Math.PI * 2);
        this.ctx.fill();
        // 심지
        this.ctx.strokeStyle = "orange";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(itemX, item.y - 20);
        this.ctx.lineTo(itemX + 10, item.y - 35);
        this.ctx.stroke();
        // 글자
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 14px sans-serif";
        this.ctx.fillText("!", itemX - 2, item.y + 5);
      }
    });
  }

  updateUI() {
    document.getElementById("score").innerText = this.score;
    document.getElementById("level").innerText = this.level;
    document.getElementById("time").innerText = this.timeLeft;
  }

  showMessage(title, text) {
    const msgEl = document.getElementById("game-message");
    msgEl.innerHTML = `<div>${title}</div><div style='font-size:1.5rem; margin-top:10px;'>${text}</div>`;
    msgEl.classList.remove("hidden");
  }

  hideMessage() {
    document.getElementById("game-message").classList.add("hidden");
  }
}

// requestAnimationFrame 루프에서 currentTime 접근을 위한 수정
// loop 함수 내부에서 `performance.now()` 대신 인자 `time`을 사용해야 함.
// 위 코드의 loop 메소드 수정 필요: `currentTime`이 undefined일 수 있음 초기 호출시.

window.GameEngine = GameEngine;
