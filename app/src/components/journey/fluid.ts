import type * as Three from "three";

// A small GPU fluid simulation (the classic "stable fluids" steps: advect, add vorticity,
// make the flow incompressible). The pointer stirs it; the hero reads two textures:
// - velocity: which way the air is moving (pushes particles)
// - dye: where it was stirred recently, fading over a few seconds (boosts light rays)
// Everything runs in WebGL render targets; nothing is read back to the CPU.

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const HEADER = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uTexel;
`;

const ADVECT = /* glsl */ `${HEADER}
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform float uDt;
  uniform float uDissipation;
  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
    gl_FragColor = uDissipation * texture2D(uSource, coord);
  }
`;

const SPLAT = /* glsl */ `${HEADER}
  uniform sampler2D uTarget;
  uniform vec2 uPoint;
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uAspect;
  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
    gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
  }
`;

const CURL = /* glsl */ `${HEADER}
  uniform sampler2D uVelocity;
  void main() {
    float l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
  }
`;

// Vorticity confinement: puts back the small swirls that the grid would otherwise smooth away.
const VORTICITY = /* glsl */ `${HEADER}
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float uStrength;
  uniform float uDt;
  void main() {
    float l = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
    float c = texture2D(uCurl, vUv).x;
    vec2 force = vec2(abs(t) - abs(b), abs(l) - abs(r));
    force /= length(force) + 1e-4;
    force *= uStrength * c;
    vec2 vel = texture2D(uVelocity, vUv).xy + force * uDt;
    gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
  }
`;

const DIVERGENCE = /* glsl */ `${HEADER}
  uniform sampler2D uVelocity;
  void main() {
    // Walls at the edges: mirror the velocity so nothing flows out of the screen.
    vec2 c = texture2D(uVelocity, vUv).xy;
    float l = vUv.x - uTexel.x < 0.0 ? -c.x : texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float r = vUv.x + uTexel.x > 1.0 ? -c.x : texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float b = vUv.y - uTexel.y < 0.0 ? -c.y : texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    float t = vUv.y + uTexel.y > 1.0 ? -c.y : texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
  }
`;

const SCALE = /* glsl */ `${HEADER}
  uniform sampler2D uTarget;
  uniform float uValue;
  void main() {
    gl_FragColor = uValue * texture2D(uTarget, vUv);
  }
`;

const PRESSURE = /* glsl */ `${HEADER}
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main() {
    float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
  }
`;

const GRADIENT = /* glsl */ `${HEADER}
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main() {
    float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    vec2 vel = texture2D(uVelocity, vUv).xy - vec2(r - l, t - b);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

type Target = Three.WebGLRenderTarget;
type Pair = { read: Target; write: Target; swap: () => void };

export type FluidOptions = {
  simRes?: number; // grid size of the flow (short side)
  dyeRes?: number; // grid size of the dye (short side)
  curl?: number;
  pressureIterations?: number;
  velocityDissipation?: number; // per second
  dyeDissipation?: number; // per second
  radius?: number; // splat size, as a fraction of the screen height
};

export class HeroFluid {
  readonly velocity: Pair;
  readonly dye: Pair;
  private readonly pressure: Pair;
  private readonly divergence: Target;
  private readonly curl: Target;
  private readonly scene: Three.Scene;
  private readonly camera: Three.Camera;
  private readonly mesh: Three.Mesh;
  private readonly materials: Record<string, Three.ShaderMaterial> = {};
  private readonly opts: Required<FluidOptions>;
  private aspect = 1;
  private splats: { x: number; y: number; dx: number; dy: number }[] = [];
  private idle = 0; // seconds since the last stir; the sim sleeps once everything has faded

  constructor(
    private readonly THREE: typeof Three,
    private readonly renderer: Three.WebGLRenderer,
    options: FluidOptions = {},
  ) {
    this.opts = {
      simRes: 96,
      dyeRes: 256,
      curl: 18,
      pressureIterations: 12,
      velocityDissipation: 0.6,
      dyeDissipation: 0.45,
      radius: 0.0035,
      ...options,
    };
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera(); // the shaders write clip-space positions themselves
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    const make = (name: string, fragmentShader: string) => {
      this.materials[name] = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader,
        uniforms: {
          uTexel: { value: new THREE.Vector2() },
          uVelocity: { value: null },
          uSource: { value: null },
          uTarget: { value: null },
          uCurl: { value: null },
          uPressure: { value: null },
          uDivergence: { value: null },
          uDt: { value: 0 },
          uDissipation: { value: 1 },
          uPoint: { value: new THREE.Vector2() },
          uColor: { value: new THREE.Vector3() },
          uRadius: { value: this.opts.radius },
          uAspect: { value: 1 },
          uStrength: { value: this.opts.curl },
          uValue: { value: 0.8 },
        },
        depthTest: false,
        depthWrite: false,
      });
    };
    make("advect", ADVECT);
    make("splat", SPLAT);
    make("curl", CURL);
    make("vorticity", VORTICITY);
    make("divergence", DIVERGENCE);
    make("scale", SCALE);
    make("pressure", PRESSURE);
    make("gradient", GRADIENT);

    this.velocity = this.pair();
    this.dye = this.pair();
    this.pressure = this.pair();
    this.divergence = this.target();
    this.curl = this.target();
    this.resize(1, 1);
  }

  // True when this browser can render into floating-point textures (needed for the sim).
  static supported(renderer: Three.WebGLRenderer) {
    return renderer.capabilities.isWebGL2 && renderer.extensions.has("EXT_color_buffer_float");
  }

  private target() {
    const T = this.THREE;
    return new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType,
      format: T.RGBAFormat,
      minFilter: T.LinearFilter,
      magFilter: T.LinearFilter,
      wrapS: T.ClampToEdgeWrapping,
      wrapT: T.ClampToEdgeWrapping,
      depthBuffer: false,
    });
  }

  private pair(): Pair {
    const p = { read: this.target(), write: this.target(), swap: () => {} };
    p.swap = () => {
      const t = p.read;
      p.read = p.write;
      p.write = t;
    };
    return p;
  }

  private grid(res: number, w: number, h: number) {
    const aspect = w / h;
    return aspect >= 1 ? [Math.round(res * aspect), res] : [res, Math.round(res / aspect)];
  }

  resize(width: number, height: number) {
    this.aspect = width / Math.max(1, height);
    const [sw, sh] = this.grid(this.opts.simRes, width, height);
    const [dw, dh] = this.grid(this.opts.dyeRes, width, height);
    for (const t of [this.velocity.read, this.velocity.write, this.pressure.read, this.pressure.write, this.divergence, this.curl]) t.setSize(sw, sh);
    for (const t of [this.dye.read, this.dye.write]) t.setSize(dw, dh);
  }

  // Stir at (x, y) in 0..1 screen coordinates (y up), moving by (dx, dy) since the last stir.
  splat(x: number, y: number, dx: number, dy: number) {
    this.splats.push({ x, y, dx, dy });
    this.idle = 0;
  }

  private run(name: string, out: Target, set: (u: Record<string, Three.IUniform>) => void) {
    const m = this.materials[name];
    m.uniforms.uTexel.value.set(1 / out.width, 1 / out.height);
    set(m.uniforms);
    this.mesh.material = m;
    this.renderer.setRenderTarget(out);
    this.renderer.render(this.scene, this.camera);
  }

  step(dt: number) {
    this.idle += dt;
    if (this.idle > 6) return; // fully faded: skip the work until the next stir
    const v = this.velocity;
    const simTexel = (u: Record<string, Three.IUniform>) => u.uTexel.value.set(1 / v.read.width, 1 / v.read.height);

    for (const s of this.splats) {
      this.run("splat", v.write, (u) => {
        u.uTarget.value = v.read.texture;
        u.uPoint.value.set(s.x, s.y);
        u.uAspect.value = this.aspect;
        u.uRadius.value = this.opts.radius;
        u.uColor.value.set(s.dx * 6000, s.dy * 6000, 0);
      });
      v.swap();
      const amount = Math.min(1, Math.hypot(s.dx * this.aspect, s.dy) * 30);
      this.run("splat", this.dye.write, (u) => {
        u.uTarget.value = this.dye.read.texture;
        u.uPoint.value.set(s.x, s.y);
        u.uAspect.value = this.aspect;
        u.uRadius.value = this.opts.radius;
        u.uColor.value.set(0.25 * amount, 0.55 * amount, 1.0 * amount);
      });
      this.dye.swap();
    }
    this.splats = [];

    this.run("curl", this.curl, (u) => {
      u.uVelocity.value = v.read.texture;
    });
    this.run("vorticity", v.write, (u) => {
      u.uVelocity.value = v.read.texture;
      u.uCurl.value = this.curl.texture;
      u.uStrength.value = this.opts.curl;
      u.uDt.value = dt;
    });
    v.swap();
    this.run("divergence", this.divergence, (u) => {
      u.uVelocity.value = v.read.texture;
    });
    this.run("scale", this.pressure.write, (u) => {
      u.uTarget.value = this.pressure.read.texture;
      u.uValue.value = 0.8;
    });
    this.pressure.swap();
    for (let i = 0; i < this.opts.pressureIterations; i++) {
      this.run("pressure", this.pressure.write, (u) => {
        u.uPressure.value = this.pressure.read.texture;
        u.uDivergence.value = this.divergence.texture;
      });
      this.pressure.swap();
    }
    this.run("gradient", v.write, (u) => {
      u.uPressure.value = this.pressure.read.texture;
      u.uVelocity.value = v.read.texture;
    });
    v.swap();
    this.run("advect", v.write, (u) => {
      simTexel(u);
      u.uVelocity.value = v.read.texture;
      u.uSource.value = v.read.texture;
      u.uDt.value = dt;
      u.uDissipation.value = Math.exp(-this.opts.velocityDissipation * dt);
    });
    v.swap();
    this.run("advect", this.dye.write, (u) => {
      simTexel(u);
      u.uVelocity.value = v.read.texture;
      u.uSource.value = this.dye.read.texture;
      u.uDt.value = dt;
      u.uDissipation.value = Math.exp(-this.opts.dyeDissipation * dt);
    });
    this.dye.swap();
    this.renderer.setRenderTarget(null);
  }

  dispose() {
    for (const p of [this.velocity, this.dye, this.pressure]) {
      p.read.dispose();
      p.write.dispose();
    }
    this.divergence.dispose();
    this.curl.dispose();
    this.mesh.geometry.dispose();
    for (const m of Object.values(this.materials)) m.dispose();
  }
}
