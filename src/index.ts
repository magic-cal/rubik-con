import "./assets/css/index.scss";

import TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { LayerModel } from "./layer-model";
import { ProgressBar } from "./libs/progress-bar";
import { Router } from "./libs/router";
import { CUBELET_NAME, RubikCubeModel } from "./rubik-cube-model";
import ScanningLineAnimation from "./scanner";
import { Axis, NotationBase, Toward } from "./types";
import {
  debounce,
  getClosestAxis,
  horizontalRotationAngle,
  randomNotation,
  setOpacity,
  sleep,
  toRotation,
} from "./utils";
import {
  flipCameraAboutOrigin,
  rotateCameraAboutOrigin,
  spinCameraAboutOrigin,
} from "./utils/cameraMotion";
import { RUBICON_PATTERN, SOLVED_PATTERN } from "./utils/cubePatterns";
import { useScannerState } from "./utils/scannerState";
import { EXTENDED_RUBICON_SOLVE } from "./utils/shuffles";
import { degToRad, radToDeg } from "three/src/math/MathUtils";
import { solver } from "./utils/solver";

const notationTable: { [key in Axis]: [NotationBase, Toward][] } = {
  x: [
    ["L", 1],
    ["M", 1],
    ["R", -1],
  ],
  y: [
    ["D", 1],
    ["E", 1],
    ["U", -1],
  ],
  z: [
    ["B", 1],
    ["S", -1],
    ["F", -1],
  ],
};

const MIN_MOVE_DISTANCE = 10;
const ROTATION_RAD_PER_PX = 0.01;

const debug = false;

const router = new Router();

const raycaster = new THREE.Raycaster();
let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;
const screenCenterCoords = new THREE.Vector2(screenWidth / 2, screenHeight / 2);

let draggable = true;
let mouseTarget: THREE.Intersection;
let mouseMoveAxis: "x" | "y";
let initMoveToward: number;
const mouseTargetFaceDirection = new THREE.Vector3(); // Vector3
const mouseCoords = new THREE.Vector2();
const mousedownCoords = new THREE.Vector2();

// Elements
const resetEl = document.querySelector("#reset");
const solveEl = document.querySelector("#solve");
const scanEl = document.querySelector("#scan");
const randomEl = document.querySelector("#random");
const progressBarEl = document.querySelector("#progressbar") as HTMLElement;
const scannerBannerEl = document.querySelector(
  "#scanner-banner"
) as HTMLElement;

const scannerState = useScannerState(scannerBannerEl);

const progress = new ProgressBar(progressBarEl);

const layerGroup = new LayerModel(debug);
const box = new THREE.BoxHelper(layerGroup, "#fff");
box.onBeforeRender = function () {
  this.update();
};

let layerRotationAxis: "x" | "y" | "z";
let layerRotationAxisToward: 1 | -1 = 1;
let lockRotationDirection = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#F1F3F3");

const directionalLight = new THREE.DirectionalLight("#FFF", 0.05);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight("#FFF", 0.05);
directionalLight2.position.set(-10, -10, -10);
scene.add(directionalLight2);

const camera = new THREE.PerspectiveCamera(
  75,
  screenWidth / screenHeight,
  0.1,
  30
);
if (screenWidth < 576) {
  camera.position.set(4, 4, 4);
} else {
  camera.position.set(3, 3, 3);
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setSize(screenWidth, screenHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.rotateSpeed = 1.5;
controls.minDistance = debug ? 1 : 3;
controls.maxDistance = debug ? 20 : 10;

let rubikCube = new RubikCubeModel(router.search.fd);
let cubeletModels = rubikCube.model.children;
scene.add(rubikCube.model);
scene.add(layerGroup);

const scanner = new ScanningLineAnimation(scene);

// const laser = new Laser();
// scene.add(laser);

if (debug) {
  const gridHelper = new THREE.GridHelper(10, 10);
  gridHelper.position.y = -1.5;
  scene.add(gridHelper);
}

let disabled = false;
function lock(func: Function) {
  return async function () {
    console.log("lock");
    if (disabled) {
      return;
    }

    disabled = true;
    try {
      await func();
    } finally {
      disabled = false;
    }
  };
}

const generateRandomMoves = (amount: number) => {
  const moves = [];
  let lastNotation = "";
  while (moves.length < amount) {
    const notation = randomNotation();
    if (lastNotation && notation[0] === lastNotation[0]) {
      continue;
    }
    lastNotation = notation;
    moves.push(notation);
  }
  return moves;
};

const performMoves = async (moves: string[]) => {
  lock(async () => {
    console.log({ moves });
    draggable = false;
    progress.start();

    const total = moves.length;

    for (let i = 0; i < total; i++) {
      const move = moves[i];

      const [layerRorationAxis, axisValue, rotationRad] = toRotation(move);
      rubikCube.move(move);

      layerGroup.group(layerRorationAxis, axisValue, cubeletModels);
      const promise = rotationTransition(layerRorationAxis, rotationRad);

      progress.setPercentage(i / total);
      await promise;
      router.search.fd = rubikCube.asString();
    }

    progress.done();
    mouseTarget = null;
    layerRotationAxis = null;
    mouseMoveAxis = null;
    draggable = true;
  })();
};

function animate(time?: number) {
  requestAnimationFrame(animate);
  if (controls) {
    controls.update();
  }
  TWEEN.update(time);
  renderer.render(scene, camera);
}
animate();

async function rotationTransition(axis: Axis, endRad: number) {
  await layerGroup.rotationAnimation(axis, endRad);
  layerGroup.ungroup(rubikCube.model);
  layerGroup.resetRotationValues();
}

function getNotation(
  axis: "x" | "y" | "z",
  value: number,
  sign: number,
  endDeg: number
) {
  if (endDeg < 90) {
    throw new Error(`Wrong endDeg: ${endDeg}`);
  }
  // -1 0 1 -> 0 1 2
  const index = value + 1;
  const layerRotationNotation = notationTable[axis][index];
  let notation = "";
  // Use url search params to record cube colors
  if (endDeg > 0 && layerRotationNotation) {
    let toward = layerRotationNotation[1];
    if (sign < 0) {
      toward *= -1;
    }
    let baseStr = layerRotationNotation[0];
    if (toward < 0) {
      baseStr += `'`;
    }
    baseStr += " ";
    for (let i = 0; i < Math.floor(endDeg / 90); i++) {
      notation += baseStr;
    }
  }
  return notation;
}

async function handleMouseUp() {
  if (debug && mouseTarget) {
    const cubeletModel = mouseTarget.object;
    setOpacity(cubeletModel as THREE.Mesh, 1);
  }

  controls.enabled = true;

  if (!layerRotationAxis || !draggable) {
    return;
  }

  // current rotation deg
  const deg = Math.abs(radToDeg(layerGroup.rotation[layerRotationAxis])) % 360;
  const sign = Math.sign(layerGroup.rotation[layerRotationAxis]);

  let endDeg;
  if (0 <= deg && deg <= 40) {
    endDeg = 0;
  } else if (40 < deg && deg <= 90 + 40) {
    endDeg = 90;
  } else if (90 + 40 < deg && deg <= 180 + 40) {
    endDeg = 180;
  } else if (180 + 40 < deg && deg <= 270 + 40) {
    endDeg = 270;
  } else if (270 + 40 < deg && deg <= 360) {
    endDeg = 360;
  }

  if (endDeg > 0) {
    // Get Singmaster notation according the rotation axis and mouse movement direction
    const position = mouseTarget.object.position;
    // // -1 0 1 -> 0 1 2
    // const index = position[layerRorationAxis] + 1;
    const value = position[layerRotationAxis];
    const notation = getNotation(layerRotationAxis, value, sign, endDeg);
    rubikCube.move(notation);

    router.search.fd = rubikCube.asString();
  }

  // const startRad =(THREE as any).Math.degToRad(deg * sign);
  const endRad = degToRad(endDeg * sign);

  draggable = false;
  // Must use await
  // Disable drag cube until the transition is complete
  await rotationTransition(layerRotationAxis, endRad);
  draggable = true;

  lockRotationDirection = false;
  mouseTarget = null;
  layerRotationAxisToward = 1;
  initMoveToward = null;

  layerRotationAxis = null;
  mouseMoveAxis = null;
}

function handleMouseDown() {
  const x = (mouseCoords.x / screenWidth) * 2 - 1;
  const y = -(mouseCoords.y / screenHeight) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersects = raycaster.intersectObjects(rubikCube.model.children);

  // Disable camera control when playing rotation animation
  if (
    intersects.length ||
    raycaster.intersectObjects(layerGroup.children).length
  ) {
    controls.enabled = false;
  }
  // Fix bug: Incorrect fd value (url) when rotating layer after random shuffle
  // Don't move the code up.
  // Otherwise the above controls.enabled will not be executed
  if (!draggable) {
    return;
  }

  if (intersects.length) {
    // Show hand when the mouse is over the cube
    document.body.classList.add("cursor-pointer");
    mousedownCoords.copy(mouseCoords);

    mouseTarget = intersects.filter((i) => i.object.name === CUBELET_NAME)[0];
    if (debug) {
      const cubeletModel = mouseTarget.object as THREE.Mesh;
      setOpacity(cubeletModel, 0.5);
    }
  }
}

function handleMouseMove() {
  const x = (mouseCoords.x / screenWidth) * 2 - 1;
  const y = -(mouseCoords.y / screenHeight) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const intersects = raycaster.intersectObjects(rubikCube.model.children);
  if (intersects.length) {
    document.body.classList.add("cursor-pointer");
  } else {
    document.body.classList.remove("cursor-pointer");
  }

  if (!mouseTarget || !draggable) {
    return;
  }

  if (!lockRotationDirection) {
    const mouseMoveDistance = mousedownCoords.distanceTo(mouseCoords);
    if (Math.abs(mouseMoveDistance) < MIN_MOVE_DISTANCE) {
      return;
    }

    lockRotationDirection = true;

    const direction = new THREE.Vector2();
    direction.subVectors(mouseCoords, mousedownCoords).normalize();
    mouseMoveAxis = Math.abs(direction.x) > Math.abs(direction.y) ? "x" : "y";

    mouseTargetFaceDirection.copy(mouseTarget.face.normal);
    mouseTargetFaceDirection.transformDirection(mouseTarget.object.matrixWorld);

    const point = mouseTarget.point;
    const mouseDirection = new THREE.Vector3()
      .subVectors(point, new THREE.Vector3(0, 0, 0))
      .normalize();
    // Don't use mouseTargetFaceDirection
    // The rounded corners of the box may face the other way.
    // const closestAxis = getClosestAxis(mouseTargetFaceDirection);
    const closestAxis = getClosestAxis(mouseDirection);
    const axisValue = mouseDirection[closestAxis];
    mouseTargetFaceDirection.set(0, 0, 0);
    mouseTargetFaceDirection[closestAxis] = Math.sign(axisValue);

    // Get the rotation axis according to the direction of mouse movement and target face normal
    if (mouseTargetFaceDirection.y > 0.9) {
      // Top  face
      const rad = horizontalRotationAngle(camera.position);
      direction.rotateAround(new THREE.Vector2(0, 0), rad * -1);
      mouseMoveAxis = Math.abs(direction.x) > Math.abs(direction.y) ? "x" : "y";

      if (mouseMoveAxis === "y") {
        layerRotationAxis = "x";
      } else if (mouseMoveAxis === "x") {
        layerRotationAxis = "z";
        layerRotationAxisToward = -1;
      }
    } else if (mouseTargetFaceDirection.y < -0.9) {
      // Down face
      const rad = horizontalRotationAngle(camera.position);
      direction.rotateAround(new THREE.Vector2(0, 0), rad * 1);
      mouseMoveAxis = Math.abs(direction.x) > Math.abs(direction.y) ? "x" : "y";

      if (mouseMoveAxis === "y") {
        layerRotationAxis = "x";
      } else if (mouseMoveAxis === "x") {
        layerRotationAxis = "z";
      }
    } else if (mouseTargetFaceDirection.x < -0.9) {
      // Left  face
      if (mouseMoveAxis === "y") {
        layerRotationAxis = "z";
      } else if (mouseMoveAxis === "x") {
        layerRotationAxis = "y";
      }
    } else if (mouseTargetFaceDirection.x > 0.9) {
      // Right face
      if (mouseMoveAxis === "y") {
        layerRotationAxis = "z";
        layerRotationAxisToward = -1;
      } else if (mouseMoveAxis === "x") {
        layerRotationAxis = "y";
      }
    } else if (mouseTargetFaceDirection.z > 0.9) {
      // Front face
      if (mouseMoveAxis === "y") {
        // Vertical movement
        layerRotationAxis = "x";
      } else if (mouseMoveAxis === "x") {
        // Horizontal movement
        layerRotationAxis = "y";
      }
    } else if (mouseTargetFaceDirection.z < -0.9) {
      // Back face
      if (mouseMoveAxis === "y") {
        layerRotationAxis = "x";
        layerRotationAxisToward = -1;
      } else if (mouseMoveAxis === "x") {
        layerRotationAxis = "y";
      }
    } else {
      throw new Error(
        `Wrong mouseTargetFaceDirection: ${mouseTargetFaceDirection}`
      );
    }

    const value = mouseTarget.object.position[layerRotationAxis];
    layerGroup.group(layerRotationAxis, value, cubeletModels);
  } else {
    let mouseMoveDistance =
      mouseCoords[mouseMoveAxis] - mousedownCoords[mouseMoveAxis];
    // Get the moving distance by the camera rotation angle relative to origin when clicking on the top face and down face
    if (
      mouseTargetFaceDirection &&
      Math.abs(mouseTargetFaceDirection.y) > 0.9
    ) {
      const yAxisDirection = Math.sign(mouseTargetFaceDirection.y) * -1;
      const dir = new THREE.Vector3();
      dir
        .subVectors(camera.position, new THREE.Vector3(0, camera.position.y, 0))
        .normalize();
      const rad = new THREE.Vector2(dir.z, dir.x).angle();
      const mouseCurrentRotation = new THREE.Vector2().copy(mouseCoords);
      mouseCurrentRotation.rotateAround(
        screenCenterCoords,
        rad * yAxisDirection
      );
      const mouseDownRotation = new THREE.Vector2().copy(mousedownCoords);
      mouseDownRotation.rotateAround(screenCenterCoords, rad * yAxisDirection);

      mouseMoveDistance =
        mouseCurrentRotation[mouseMoveAxis] - mouseDownRotation[mouseMoveAxis];
    }

    if (!initMoveToward) {
      initMoveToward = Math.sign(mouseMoveDistance);
    }
    if (layerGroup.children.length && layerRotationAxis) {
      layerGroup.rotation[layerRotationAxis] =
        (mouseMoveDistance - MIN_MOVE_DISTANCE * initMoveToward) *
        ROTATION_RAD_PER_PX *
        layerRotationAxisToward;
    }
  }
}

const setCubeNewPattern = async (pattern: string, stepDelayMs?: number) => {
  await resetCube(rubikCube.asString()); // reset cube rotation positions to prevent the cube from rotating when changing the pattern
  await lock(async () => {
    // change the pattern of the cube one by one
    const newRubikCube = new RubikCubeModel(pattern);
    const newCubeletModels = newRubikCube.model.children;

    console.log({ cubeletModels, newCubeletModels });
    for (let i = 0; i < cubeletModels.length; i++) {
      cubeletModels[i] = newCubeletModels[i];
      await sleep(stepDelayMs);
    }

    scene.remove(rubikCube.model);
    rubikCube.dispose();

    cubeletModels = newRubikCube.model.children;
    rubikCube = newRubikCube;
    scene.add(rubikCube.model);
  })();
};

const scanCubeToPatternFake = async (pattern: string) => {
  scannerState.showScanner();
  await rotateCameraAboutOrigin(camera, 45);
  await sleep(2000);

  for (let i = 0; i < 4; i++) {
    await rotateCameraAboutOrigin(camera, 90);
    await sleep(2000);
  }

  await flipCameraAboutOrigin(camera, 30);
  await sleep(2000);
  await flipCameraAboutOrigin(camera, -135);
  await sleep(2000);
  await flipCameraAboutOrigin(camera, 120);
  await rotateCameraAboutOrigin(camera, 45);
  await setCubeNewPattern(pattern, 500);
  await sleep(2000);
  await spinCameraAboutOrigin(camera, 5000);

  scannerState.hideScanner();
};

const resetCube = async (pattern?: string) => {
  await lock(async () => {
    scene.remove(rubikCube.model);
    rubikCube.dispose();
    rubikCube = new RubikCubeModel(pattern);
    cubeletModels = rubikCube.model.children;
    scene.add(rubikCube.model);

    router.search.fd = rubikCube.asString();
  })();
};

const registerEventListeners = () => {
  window.addEventListener("keydown", async (e) => {
    if (e.key === " ") {
      scanCubeToPatternFake(RUBICON_PATTERN);
    }
  });

  renderer.domElement.addEventListener("mousedown", handleMouseDown);
  renderer.domElement.addEventListener("mouseup", handleMouseUp);
  renderer.domElement.addEventListener("touchend", handleMouseUp);

  renderer.domElement.addEventListener("touchstart", function (e) {
    const touch = e.changedTouches[0];
    mouseCoords.set(touch.clientX, touch.clientY);
    handleMouseDown();
  });

  renderer.domElement.addEventListener("mousemove", function (e) {
    mouseCoords.set(e.clientX, e.clientY);
    handleMouseMove();
  });

  renderer.domElement.addEventListener("touchmove", function (e) {
    const touch = e.changedTouches[0];
    mouseCoords.set(touch.clientX, touch.clientY);
    handleMouseMove();
  });

  window.addEventListener(
    "resize",
    debounce(function () {
      screenWidth = window.innerWidth;
      screenHeight = window.innerHeight;
      screenCenterCoords.set(screenWidth / 2, screenHeight / 2);

      camera.aspect = screenWidth / screenHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(screenWidth, screenHeight);
    })
  );

  // Custom events

  scanEl.addEventListener("click", async () => {
    await scanCubeToPatternFake(RUBICON_PATTERN);
  });

  solveEl.addEventListener("click", async () => {
    if (rubikCube.asString() === SOLVED_PATTERN) {
      return;
    }
    if (rubikCube.asString() === RUBICON_PATTERN) {
      await performMoves(EXTENDED_RUBICON_SOLVE);
      return;
    }
    const moves = solver(rubikCube.asString());
    await performMoves(moves);
  });

  randomEl.addEventListener("click", () => {
    const moves = generateRandomMoves(20);
    performMoves(moves);
  });

  resetEl.addEventListener("click", () => {
    resetCube();
  });
};

registerEventListeners();
