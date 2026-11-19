import * as THREE from 'three';

export const skin = new THREE.MeshPhysicalMaterial({
  color: '#8f969f', metalness: 0.5, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
});
export const skinInner = new THREE.MeshStandardMaterial({ color: '#2a2f36', metalness: 0.3, roughness: 0.8, side: THREE.BackSide });
export const darkMetal = new THREE.MeshStandardMaterial({ color: '#2b313a', metalness: 0.8, roughness: 0.38 });
export const alu = new THREE.MeshStandardMaterial({ color: '#b9c0c9', metalness: 0.95, roughness: 0.22 });
export const steel = new THREE.MeshStandardMaterial({ color: '#d9dee5', metalness: 1, roughness: 0.14 });
export const castAlu = new THREE.MeshStandardMaterial({ color: '#8c939c', metalness: 0.85, roughness: 0.42 });
export const rubber = new THREE.MeshStandardMaterial({ color: '#111418', metalness: 0.1, roughness: 0.75 });
export const brass = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.3 });
export const copper = new THREE.MeshStandardMaterial({ color: '#c87a45', metalness: 1, roughness: 0.32 });
export const composite = new THREE.MeshStandardMaterial({ color: '#1b1f25', metalness: 0.2, roughness: 0.55 });
export const glass = new THREE.MeshPhysicalMaterial({ color: '#0b1018', metalness: 0.2, roughness: 0.05, clearcoat: 1, transmission: 0 });
export const radome = new THREE.MeshPhysicalMaterial({ color: '#eef1f4', metalness: 0, roughness: 0.25, clearcoat: 1 });
export const fuelTankMat = new THREE.MeshPhysicalMaterial({ color: '#7d93a8', metalness: 0.6, roughness: 0.28, clearcoat: 0.6, transparent: true, opacity: 0.92 });
export const fuelMat = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.1, roughness: 0.2, emissive: '#6b4400', emissiveIntensity: 0.3 });
export const chuteMat = new THREE.MeshStandardMaterial({ color: '#c26b1a', metalness: 0.2, roughness: 0.65 });
export const pcb = new THREE.MeshStandardMaterial({ color: '#0f5132', metalness: 0.3, roughness: 0.5 });

/** glowing material that blooms (tone mapping off so values > 1 stay bright) */
export const glow = (color, intensity = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false, transparent: true });
