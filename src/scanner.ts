import * as THREE from "three";

class ScanningLineAnimation {
  public scanningLine: THREE.Line;

  constructor(scene: THREE.Scene) {
    const scanningLineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
    });
    const scanningLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);
    this.scanningLine = new THREE.Line(
      scanningLineGeometry,
      scanningLineMaterial
    );
    scene.add(this.scanningLine);
  }

  updateAnimation(time: number = 1) {
    const y = Math.sin(time) * 1.5;
    this.scanningLine.position.setY(y);
  }
}
export default ScanningLineAnimation;
