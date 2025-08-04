import TWEEN from "@tweenjs/tween.js";
import { Vector3 } from "three/src/math/Vector3";

export function spinCameraAboutOrigin(
  camera: THREE.Camera,
  time: number = 1000
) {
  const currentRadian = Math.atan2(camera.position.x, camera.position.z);
  const current = { rad: currentRadian };
  const end = { rad: Math.PI * 2 };

  new TWEEN.Tween(current)
    .to(end, time)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.x = Math.sin(current.rad) * 5;
      camera.position.z = Math.cos(current.rad) * 5;
      camera.lookAt(0, 0, 0);
    })
    .start(undefined);
}

export function rotateCameraAboutOrigin(
  camera: THREE.Camera,
  degrees: number,
  time: number = 1000
) {
  const currentRadian = Math.atan2(camera.position.x, camera.position.z);
  const current = { rad: currentRadian };
  const end = { rad: currentRadian + (degrees * Math.PI) / 180 };

  const tween = new TWEEN.Tween(current)
    .to(end, time)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.x = Math.sin(current.rad) * 5;
      camera.position.z = Math.cos(current.rad) * 5;
      camera.lookAt(0, 0, 0);
    })
    .start(undefined);

  return new Promise((resolve) => {
    tween.onComplete(resolve);
  });
}

export function flipCameraAboutOrigin(
  camera: THREE.Camera,
  degrees: number,
  time: number = 1000
) {
  const currentRadian = Math.atan2(camera.position.y, camera.position.x);
  const current = { rad: currentRadian };

  // move camera up over the top of the origin
  const end = { rad: currentRadian + (degrees * Math.PI) / 180 };

  const tween = new TWEEN.Tween(current)
    .to(end, time)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.y = Math.sin(current.rad) * 5;
      camera.position.x = Math.cos(current.rad) * 5;
      camera.lookAt(0, 0, 0);
    })
    .start(undefined);

  return new Promise((resolve) => {
    tween.onComplete(resolve);
  });
}

export function setCameraToOrigin(camera: THREE.Camera, time: number = 1000) {
  setCameraToPosition(camera, new Vector3(0, 0, 0), time);
}

export const setCameraToPosition = (
  camera: THREE.Camera,
  position: THREE.Vector3,
  time: number = 1000
) => {
  const current = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  };
  const end = { x: position.x, y: position.y, z: position.z };

  const tween = new TWEEN.Tween(current)
    .to(end, time)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.set(current.x, current.y, current.z);
      camera.lookAt(0, 0, 0);
    })
    .start(undefined);

  return new Promise((resolve) => {
    tween.onComplete(resolve);
  });
};

export const stopAllTweens = () => {
  const tweens = TWEEN.getAll();
  for (const tween of tweens) {
    tween.stop();
  }
};
