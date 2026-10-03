"use client";

import { useEffect, useMemo, useRef } from "react";

import { STATUS_LABELS, type HealthStatus } from "./types";
import type { CoreNode } from "./core-nodes";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * =============================================================
 * DEVIL CORE — INFRASTRUCTURE VISUALISATION
 * =============================================================
 *
 * A rotating wireframe core with the application's subsystems
 * orbiting it, each pulsing according to its measured status.
 *
 * Why Canvas 2D rather than Three.js
 * ----------------------------------
 * Three.js and React Three Fiber are not dependencies of this
 * project, and adding them for one panel would mean roughly 600 KB
 * of WebGL runtime for geometry that is a few dozen vertices and
 * lines. The 3D here is real — icosahedral vertices under Euler
 * rotation and perspective projection, depth-sorted and
 * depth-shaded — just rasterised through the 2D context. That keeps
 * the panel at zero dependency cost and a few hundred bytes of
 * geometry, which is what §29's performance budget asks for.
 *
 * The visualisation is decorative. Every node's status is also
 * listed in the accessible table beneath it, so nothing here is the
 * only route to the information.
 */

/** Subsystem relationships, drawn as links between orbiting nodes. */
const LINKS: [string, string][] = [
  ["auth", "api"],
  ["api", "firebase"],
  ["firebase", "database"],
  ["firebase", "storage"],
  ["api", "payment"],
  ["payment", "email"],
  ["auth", "firebase"],
  ["api", "database"],
];

const STATUS_COLOR: Record<HealthStatus, [number, number, number]> = {
  healthy: [61, 214, 140],
  warning: [245, 165, 36],
  critical: [255, 90, 95],
  offline: [255, 90, 95],
  unknown: [110, 118, 129],
};

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export default function DevilCore({ nodes }: { nodes: CoreNode[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  /**
   * Geometry is rebuilt only when the node set itself changes, so a
   * re-render with the same statuses does no layout work.
   *
   * The draw loop closes over `layout` and the effect lists it as a
   * dependency, so a new scan restarts the loop with fresh colours.
   * Cancelling one animation frame and scheduling another costs
   * nothing next to the scan that triggered it, and it keeps the
   * renderer free of a mutable ref.
   */
  const layout = useMemo(() => buildLayout(nodes), [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let angle = 0;
    let running = true;
    /** Paused while scrolled out of view or on a hidden tab. */
    let visible = true;

    /** Cap the backing store; a retina canvas at 3x costs fill rate. */
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();

      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);

    const intersection = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.01 },
    );

    intersection.observe(wrapper);

    const onVisibilityChange = () => {
      visible = !document.hidden;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const draw = () => {
      if (!running) return;

      if (!visible) {
        frame = requestAnimationFrame(draw);
        return;
      }

      render(context, width, height, angle, layout);

      if (!reducedMotion) {
        angle += 0.0035;
        frame = requestAnimationFrame(draw);
      }
    };

    if (reducedMotion) {
      // One static frame: the geometry still reads, nothing moves.
      render(context, width, height, 0.6, layout);
    } else {
      frame = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [reducedMotion, layout]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
      <div
        ref={wrapperRef}
        className="relative h-[300px] min-w-0 overflow-hidden rounded-lg border border-[var(--dv-line)] bg-[var(--dv-inset)] sm:h-[340px]"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="block" />

        <span className="dv-mono pointer-events-none absolute bottom-2.5 left-3 text-[0.5625rem] uppercase tracking-[0.14em] text-[var(--dv-dim)]">
          Infrastructure topology
          {reducedMotion ? " · motion reduced" : ""}
        </span>
      </div>

      {/* The same information as text, which is the accessible path. */}
      <ul className="grid grid-cols-2 gap-1.5 self-start lg:grid-cols-1">
        {layout.nodes.map((node) => (
          <li
            key={node.id}
            className="dv-status flex items-center gap-2 rounded-md border border-[var(--dv-line)] bg-[var(--dv-raised)] px-2.5 py-1.5"
            data-status={node.status}
          >
            <span className="dv-dot" data-live aria-hidden="true" />
            <span className="dv-mono min-w-0 flex-1 truncate text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-[var(--dv-muted)]">
              {node.label}
            </span>
            <span className="sr-only">{STATUS_LABELS[node.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Geometry                                                           */
/* ------------------------------------------------------------------ */

interface Layout {
  nodes: (CoreNode & { position: Vec3 })[];
  /** Icosahedron vertices, normalised to the core radius. */
  coreVertices: Vec3[];
  coreEdges: [number, number][];
  particles: Vec3[];
}

function buildLayout(nodes: CoreNode[]): Layout {
  /**
   * Fibonacci sphere: evenly distributes an arbitrary node count
   * without clustering at the poles, so the layout holds whether
   * there are five subsystems or fifteen.
   */
  const golden = Math.PI * (3 - Math.sqrt(5));
  const radius = 125;

  const placed = nodes.map((node, index) => {
    const y = nodes.length === 1 ? 0 : 1 - (index / (nodes.length - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;

    return {
      ...node,
      position: {
        x: Math.cos(theta) * ring * radius,
        y: y * radius * 0.78,
        z: Math.sin(theta) * ring * radius,
      },
    };
  });

  /* Icosahedron, from the golden-ratio vertex set. */
  const phi = (1 + Math.sqrt(5)) / 2;

  const raw: Vec3[] = [
    { x: 0, y: 1, z: phi },
    { x: 0, y: -1, z: phi },
    { x: 0, y: 1, z: -phi },
    { x: 0, y: -1, z: -phi },
    { x: 1, y: phi, z: 0 },
    { x: -1, y: phi, z: 0 },
    { x: 1, y: -phi, z: 0 },
    { x: -1, y: -phi, z: 0 },
    { x: phi, y: 0, z: 1 },
    { x: phi, y: 0, z: -1 },
    { x: -phi, y: 0, z: 1 },
    { x: -phi, y: 0, z: -1 },
  ];

  const coreRadius = 46;
  const scale = coreRadius / Math.hypot(1, phi);

  const coreVertices = raw.map((vertex) => ({
    x: vertex.x * scale,
    y: vertex.y * scale,
    z: vertex.z * scale,
  }));

  /* Edges are the vertex pairs at the shortest separation. */
  const coreEdges: [number, number][] = [];
  const edgeLength = 2 * scale;

  for (let a = 0; a < coreVertices.length; a += 1) {
    for (let b = a + 1; b < coreVertices.length; b += 1) {
      const distance = Math.hypot(
        coreVertices[a].x - coreVertices[b].x,
        coreVertices[a].y - coreVertices[b].y,
        coreVertices[a].z - coreVertices[b].z,
      );

      if (Math.abs(distance - edgeLength) < 0.5) coreEdges.push([a, b]);
    }
  }

  /**
   * A fixed particle field. Deterministic placement keeps the panel
   * identical between renders, so it never flickers on a re-scan.
   */
  const particles: Vec3[] = Array.from({ length: 70 }, (_, index) => {
    const t = index * 2.39996;
    const shell = 150 + ((index * 37) % 90);

    return {
      x: Math.cos(t) * shell * (0.4 + ((index * 13) % 60) / 100),
      y: (((index * 29) % 200) - 100) * 1.25,
      z: Math.sin(t) * shell * (0.4 + ((index * 17) % 60) / 100),
    };
  });

  return { nodes: placed, coreVertices, coreEdges, particles };
}

/* ------------------------------------------------------------------ */
/* Renderer                                                           */
/* ------------------------------------------------------------------ */

const FOV = 520;

function project(
  point: Vec3,
  angle: number,
  centreX: number,
  centreY: number,
): { x: number; y: number; depth: number; scale: number } {
  /* Yaw, plus a fixed tilt so the sphere is read from slightly above. */
  const cosY = Math.cos(angle);
  const sinY = Math.sin(angle);

  const x1 = point.x * cosY - point.z * sinY;
  const z1 = point.x * sinY + point.z * cosY;

  const tilt = -0.22;
  const cosX = Math.cos(tilt);
  const sinX = Math.sin(tilt);

  const y2 = point.y * cosX - z1 * sinX;
  const z2 = point.y * sinX + z1 * cosX;

  const scale = FOV / (FOV + z2);

  return {
    x: centreX + x1 * scale,
    y: centreY + y2 * scale,
    depth: z2,
    scale,
  };
}

function render(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  angle: number,
  layout: Layout,
) {
  context.clearRect(0, 0, width, height);

  const centreX = width / 2;
  const centreY = height / 2;

  /* Scale the whole scene down on a narrow viewport. */
  const fit = Math.min(1, width / 520, height / 360);

  const scaled = (point: Vec3): Vec3 => ({
    x: point.x * fit,
    y: point.y * fit,
    z: point.z * fit,
  });

  /* ---- Particles, behind everything ---------------------------- */
  for (const particle of layout.particles) {
    const point = project(scaled(particle), angle * 0.45, centreX, centreY);

    if (point.depth < -FOV * 0.8) continue;

    const alpha = Math.max(0, Math.min(0.5, (point.scale - 0.55) * 0.9));

    context.fillStyle = `rgba(148,156,166,${alpha.toFixed(3)})`;
    context.fillRect(point.x, point.y, 1.2, 1.2);
  }

  /* ---- Core wireframe ------------------------------------------- */
  const coreProjected = layout.coreVertices.map((vertex) =>
    project(scaled(vertex), angle * 1.5, centreX, centreY),
  );

  for (const [a, b] of layout.coreEdges) {
    const from = coreProjected[a];
    const to = coreProjected[b];

    /* Depth shading: far edges recede instead of all reading equally. */
    const depth = (from.scale + to.scale) / 2;
    const alpha = Math.max(0.06, Math.min(0.55, (depth - 0.72) * 2.4));

    context.strokeStyle = `rgba(229,72,77,${alpha.toFixed(3)})`;
    context.lineWidth = depth > 1 ? 1.2 : 0.8;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  /* Core glow, the one place a gradient is used. */
  const glow = context.createRadialGradient(
    centreX,
    centreY,
    0,
    centreX,
    centreY,
    60 * fit,
  );

  glow.addColorStop(0, "rgba(229,72,77,0.20)");
  glow.addColorStop(1, "rgba(229,72,77,0)");

  context.fillStyle = glow;
  context.beginPath();
  context.arc(centreX, centreY, 60 * fit, 0, Math.PI * 2);
  context.fill();

  /* ---- Node positions ------------------------------------------- */
  const projectedNodes = layout.nodes.map((node) => ({
    node,
    point: project(scaled(node.position), angle, centreX, centreY),
  }));

  const byId = new Map(projectedNodes.map((entry) => [entry.node.id, entry]));

  /* ---- Relationship links --------------------------------------- */
  for (const [fromId, toId] of LINKS) {
    const from = byId.get(fromId);
    const to = byId.get(toId);

    if (!from || !to) continue;

    const degraded =
      from.node.status !== "healthy" || to.node.status !== "healthy";

    const offline =
      from.node.status === "offline" || to.node.status === "offline";

    const depth = (from.point.scale + to.point.scale) / 2;
    const alpha = Math.max(0.05, Math.min(0.32, (depth - 0.7) * 1.4));

    context.strokeStyle = degraded
      ? `rgba(245,165,36,${alpha.toFixed(3)})`
      : `rgba(120,132,146,${alpha.toFixed(3)})`;

    context.lineWidth = 0.9;

    /* An offline node's links are drawn broken, not merely dimmed. */
    context.setLineDash(offline ? [3, 5] : []);

    context.beginPath();
    context.moveTo(from.point.x, from.point.y);
    context.lineTo(to.point.x, to.point.y);
    context.stroke();
  }

  context.setLineDash([]);

  /* ---- Nodes, painted back to front ---------------------------- */
  const pulse = (Math.sin(angle * 9) + 1) / 2;

  for (const { node, point } of projectedNodes.sort(
    (a, b) => b.point.depth - a.point.depth,
  )) {
    const [r, g, b] = STATUS_COLOR[node.status];
    const front = point.scale > 0.95;
    const radius = (front ? 5 : 3.6) * Math.max(0.7, point.scale);

    /* A degraded or failed node pulses; a healthy one is steady. */
    const intensity =
      node.status === "healthy" || node.status === "unknown"
        ? 1
        : 0.55 + pulse * 0.45;

    /* Halo */
    context.fillStyle = `rgba(${r},${g},${b},${(0.16 * intensity).toFixed(3)})`;
    context.beginPath();
    context.arc(point.x, point.y, radius * 2.6, 0, Math.PI * 2);
    context.fill();

    /* Body */
    context.fillStyle = `rgba(${r},${g},${b},${(
      Math.max(0.35, Math.min(1, point.scale - 0.2)) * intensity
    ).toFixed(3)})`;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();

    /* Label, on the near hemisphere only, to avoid overlap. */
    if (front) {
      context.font =
        '600 9px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = `rgba(232,235,239,${Math.min(
        0.9,
        point.scale - 0.1,
      ).toFixed(3)})`;
      context.fillText(node.label.toUpperCase(), point.x, point.y - radius - 9);
    }
  }
}
