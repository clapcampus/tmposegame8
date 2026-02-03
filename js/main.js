/**
 * main.js
 * 애플리케이션 진입점
 * PoseEngine(웹캠/AI)과 GameEngine(게임 로직)을 초기화하고 연결합니다.
 */

let poseEngine;
let gameEngine;
let stabilizer;

/**
 * 초기화 함수 (Start 버튼 클릭 시 실행)
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;
  startBtn.innerText = "로딩 중...";

  try {
    // 1. PoseEngine 초기화 (Teachable Machine 모델 로드)
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 200, // 웹캠 크기 (작아도 인식 잘됨)
      flip: true // 거울 모드
    });

    // 2. 웹캠 캔버스를 화면에 추가
    const webcamContainer = document.getElementById("webcam-wrapper");
    webcamContainer.innerHTML = ""; // 기존 내용 제거
    webcamContainer.appendChild(webcam.canvas);

    // 3. Stabilizer 초기화 (예측값 튐 방지)
    stabilizer = new PredictionStabilizer({
      threshold: 0.85, // 85% 이상 확률일 때만 인정
      smoothingFrames: 5 // 5프레임 동안 안정적이어야 인정
    });

    // 4. GameEngine 초기화
    const gameCanvas = document.getElementById("game-canvas");
    gameEngine = new GameEngine(gameCanvas);

    // 5. 라벨 컨테이너 초기화
    const labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
        const div = document.createElement("div");
        div.style.marginBottom = "4px";
        labelContainer.appendChild(div);
    }

    // 6. 콜백 연결
    
    // 포즈 예측 될 때마다 실행
    poseEngine.setPredictionCallback((predictions, pose) => {
      handlePrediction(predictions);
      if (pose) {
        // 포즈 스켈레톤 그리기는 선택사항 (지금은 웹캠 캔버스에 자동 그려짐)
        // poseEngine.drawPose(pose); 
      }
    });

    // 7. 실행 시작
    poseEngine.start(); // 웹캠/예측 루프 시작
    gameEngine.start(); // 게임 루프 시작

    // UI 업데이트
    startBtn.innerText = "게임 중...";
    stopBtn.disabled = false;

  } catch (error) {
    console.error("Initialization failed:", error);
    alert("초기화에 실패했습니다. (카메라 권한을 확인해주세요)");
    startBtn.disabled = false;
    startBtn.innerText = "게임 시작 (Start)";
  }
}

/**
 * 종료 함수 (Stop 버튼 클릭)
 */
function stop() {
  if (poseEngine) poseEngine.stop();
  if (gameEngine) gameEngine.stop();
  if (stabilizer) stabilizer.reset();

  document.getElementById("startBtn").disabled = false;
  document.getElementById("startBtn").innerText = "게임 시작 (Start)";
  document.getElementById("stopBtn").disabled = true;
  
  document.getElementById("current-pose_display").innerText = "대기중";
}

/**
 * 예측 결과 처리 및 게임 연결
 */
function handlePrediction(predictions) {
  // 1. 안정화된 예측값 얻기
  const stabilized = stabilizer.stabilize(predictions);
  
  // 2. 확률 바 업데이트 (디버깅용)
  const labelContainer = document.getElementById("label-container");
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + (predictions[i].probability * 100).toFixed(0) + "%";
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  // 3. 인식된 포즈를 화면에 표시
  const poseDisplay = document.getElementById("current-pose_display");
  if (stabilized.className) {
    poseDisplay.innerText = stabilized.className;
    poseDisplay.style.color = "#1a73e8";
    
    // 4. 게임 엔진에 포즈 전달 (핵심 연결 고리!)
    if (gameEngine && gameEngine.isPlaying) {
        gameEngine.updatePlayerPosition(stabilized.className);
    }
  } else {
    poseDisplay.innerText = "...";
    poseDisplay.style.color = "#999";
  }
}
