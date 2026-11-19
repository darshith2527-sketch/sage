import { canvasTexture, font, type T3 } from "./shared";

// A line of text as a flat object in the 3D world (so the camera can move past it).
export function createTextPlane(
  THREE: T3,
  { text, face, height, color, opacity = 1, letterSpacing = 0 }: { text: string; face: string; height: number; color: string; opacity?: number; letterSpacing?: number },
) {
  const px = 96;
  const canvas = document.createElement("canvas");
  const probe = canvas.getContext("2d")!;
  probe.font = font(face, px);
  if ("letterSpacing" in probe) (probe as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${letterSpacing * px}px`;
  const m = probe.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  const pad = 8;
  canvas.width = Math.ceil(m.width + pad * 2);
  canvas.height = Math.ceil(ascent + descent + pad * 2);
  const ctx = canvas.getContext("2d")!;
  ctx.font = font(face, px);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${letterSpacing * px}px`;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, pad, pad + ascent);
  const texture = canvasTexture(THREE, canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false, depthTest: false });
  // `height` is the size of capital letters in world units.
  const cap = probe.measureText("H").actualBoundingBoxAscent || ascent;
  const unit = height / cap;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(canvas.width * unit, canvas.height * unit), material);
  mesh.renderOrder = 5;
  return {
    mesh,
    material,
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
