import React, { useEffect, useRef } from "react";

interface PurpleParticleOrbProps {
  className?: string;
  particleCount?: number;
  radius?: number;
  interactive?: boolean;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  origX: number;
  origY: number;
  origZ: number;
  size: number;
  color: string;
  alpha: number;
  speed: number;
  isLetter: boolean;
}

export const PurpleParticleOrb: React.FC<PurpleParticleOrbProps> = ({
  className = "",
  particleCount = 750,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Neon violet / electric purple palette
    const colors = [
      "#c084fc", // Bright Purple 400
      "#a855f7", // Vivid Purple 500
      "#d8b4fe", // Neon Lilac 300
      "#e9d5ff", // Crystal Violet 200
      "#818cf8", // Electric Indigo 400
      "#6366f1", // Deep Indigo 500
      "#ffffff", // Core Spark White
    ];

    // Generate Points forming a prominent 3D "S" shape + Ambient Halo
    const points: Particle3D[] = [];

    // Helper: Sample the "S" parametric curve
    // Upper loop of S (t from 0 to PI), Middle diagonal, Lower loop of S (t from PI to 2*PI)
    const letterParticlesCount = Math.floor(particleCount * 0.78);
    const scaleS = Math.min(width, height) * 0.38; // Size of S

    for (let i = 0; i < letterParticlesCount; i++) {
      const u = i / letterParticlesCount; // 0 to 1
      let sx = 0;
      let sy = 0;
      let sz = (Math.random() - 0.5) * 55; // 3D depth thickness

      if (u < 0.45) {
        // Upper curve of S: from right top (arc around (0, -0.45))
        const t = (u / 0.45) * Math.PI * 1.25 - 0.25;
        sx = Math.cos(t) * 0.42 * scaleS;
        sy = (-0.45 + Math.sin(t) * 0.45) * scaleS;
      } else if (u < 0.55) {
        // Center crossover
        const progress = (u - 0.45) / 0.1;
        const xStart = Math.cos(Math.PI) * 0.42 * scaleS;
        const yStart = 0;
        const xEnd = Math.cos(0) * 0.42 * scaleS;
        const yEnd = 0;
        sx = xStart + (xEnd - xStart) * progress + (Math.random() - 0.5) * 15;
        sy = (progress - 0.5) * 0.25 * scaleS;
      } else {
        // Lower curve of S: from left to bottom right (arc around (0, 0.45))
        const t = ((u - 0.55) / 0.45) * Math.PI * 1.25 + Math.PI - 0.25;
        sx = Math.cos(t) * 0.42 * scaleS;
        sy = (0.45 + Math.sin(t) * 0.45) * scaleS;
      }

      // Add slight volume/thickness jitter
      const jitterX = (Math.random() - 0.5) * 16;
      const jitterY = (Math.random() - 0.5) * 16;

      const finalX = sx + jitterX;
      const finalY = sy + jitterY;
      const finalZ = sz + (Math.random() - 0.5) * 35;

      points.push({
        x: finalX,
        y: finalY,
        z: finalZ,
        origX: finalX,
        origY: finalY,
        origZ: finalZ,
        size: Math.random() * 2.8 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.65 + 0.35,
        speed: Math.random() * 0.003 + 0.001,
        isLetter: true,
      });
    }

    // Outer Floating Cosmic Cloud / Orbiting Halo
    const haloCount = particleCount - letterParticlesCount;
    for (let i = 0; i < haloCount; i++) {
      const radius = scaleS * (1.1 + Math.random() * 0.65);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      const hx = radius * Math.cos(theta) * Math.cos(phi);
      const hy = radius * Math.sin(phi);
      const hz = radius * Math.sin(theta) * Math.cos(phi);

      points.push({
        x: hx,
        y: hy,
        z: hz,
        origX: hx,
        origY: hy,
        origZ: hz,
        size: Math.random() * 1.8 + 0.8,
        color: colors[Math.floor(Math.random() * (colors.length - 1))],
        alpha: Math.random() * 0.5 + 0.15,
        speed: Math.random() * 0.002 + 0.0008,
        isLetter: false,
      });
    }

    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - width / 2;
      const clientY = e.clientY - rect.top - height / 2;
      targetRotY = (clientX / width) * 0.55;
      targetRotX = -(clientY / height) * 0.55;
    };

    if (interactive) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    let time = 0;

    const render = () => {
      time += 0.014;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Deep Purple Glowing Aura in Background
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        15,
        centerX,
        centerY,
        scaleS * 1.6
      );
      glowGrad.addColorStop(0, "rgba(168, 85, 247, 0.28)"); // Bright Violet Core
      glowGrad.addColorStop(0.3, "rgba(139, 92, 246, 0.16)"); // Purple
      glowGrad.addColorStop(0.65, "rgba(88, 28, 135, 0.07)"); // Deep Violet
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaleS * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Smooth rotation with slight auto-wobble
      rotX += (targetRotX - rotX) * 0.045 + Math.sin(time * 0.8) * 0.0006;
      rotY += (targetRotY - rotY) * 0.045 + Math.cos(time * 0.6) * 0.0018;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Project 3D particles to 2D
      const projected = points.map((p, idx) => {
        // Organic pulse / breathing wave through the "S"
        const wave = Math.sin(time * 2 + idx * 0.08) * (p.isLetter ? 4.5 : 8);
        const curX = p.origX + (p.isLetter ? Math.cos(time + idx) * 1.5 : 0);
        const curY = p.origY + wave;
        const curZ = p.origZ + (p.isLetter ? Math.sin(time * 1.5 + idx) * 2 : 0);

        // Rotate Y
        const x1 = curX * cosY + curZ * sinY;
        const z1 = -curX * sinY + curZ * cosY;

        // Rotate X
        const y2 = curY * cosX - z1 * sinX;
        const z2 = curY * sinX + z1 * cosX;

        // 3D Perspective Projection
        const fov = 520;
        const scale = fov / (fov + z2);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        return {
          projX,
          projY,
          scale,
          z: z2,
          size: p.size * scale,
          color: p.color,
          alpha: p.isLetter
            ? Math.min(1, Math.max(0.35, ((z2 + 200) / 400) * 0.8 + 0.2))
            : Math.min(0.6, Math.max(0.1, ((z2 + 250) / 500) * 0.5 + 0.1)),
          isLetter: p.isLetter,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      // Draw Glowing Energy Lines connecting nearby "S" particles
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projected.length; i += 4) {
        if (!projected[i].isLetter) continue;
        for (let j = i + 1; j < Math.min(i + 8, projected.length); j++) {
          if (!projected[j].isLetter) continue;
          const dx = projected[i].projX - projected[j].projX;
          const dy = projected[i].projY - projected[j].projY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 38) {
            const lineAlpha = (1 - dist / 38) * 0.32 * projected[i].alpha;
            ctx.strokeStyle = `rgba(192, 132, 252, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].projX, projected[i].projY);
            ctx.lineTo(projected[j].projX, projected[j].projY);
            ctx.stroke();
          }
        }
      }

      // Draw Glowing Particles
      for (const p of projected) {
        ctx.save();
        ctx.globalAlpha = p.alpha;

        // Intense neon glow effect
        if (p.isLetter) {
          ctx.shadowBlur = 10 * p.scale;
          ctx.shadowColor = p.color;
        } else {
          ctx.shadowBlur = 4 * p.scale;
          ctx.shadowColor = p.color;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, Math.max(0.8, p.size), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (interactive) {
        window.removeEventListener("mousemove", handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full ${className}`}
    />
  );
};
