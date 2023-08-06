import TWEEN from "@tweenjs/tween.js";

export function spinCameraAboutOrigin(
  camera: THREE.Camera,
  time: number = 1000
) {
  const currentRadian = Math.atan2(camera.position.x, camera.position.z);
  const current = { rad: currentRadian };
  const end = { rad: Math.PI * 2 };

  new TWEEN.Tween(current)
    .to(end, time)
    .easing(TWEEN.Easing.Quadratic.Out)
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
    .easing(TWEEN.Easing.Quadratic.Out)
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
    .easing(TWEEN.Easing.Quadratic.Out)
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
