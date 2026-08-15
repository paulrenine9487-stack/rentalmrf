import React from 'react';
import './Hero.css';

export default function HeroGraphic() {
  return (
    <div className="hero-graphic-container">
      <svg
        className="hero-svg-wrapper"
        viewBox="0 0 452 428"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 1. COMPLETELY STATIC MAROON CIRCULAR RING */}
        <circle
          className="hero-ring"
          cx="260"
          cy="214"
          r="110"
          stroke="#8B0000"
          strokeWidth="3"
          fill="none"
        />

        {/* 2. THREE SEMI-TRANSPARENT MAROON NODES (THICKER/RICHER OPACITY: 0.82) */}
        {/* TOP NODE (Fixed X: 243, Y: 86) */}
        <circle
          className="hero-node hero-node-top"
          cx="243"
          cy="86"
          r="34"
          fill="#A83232"
          fillOpacity="0.82"
        />

        {/* RIGHT NODE (Fixed X: 344, Y: 239) */}
        <circle
          className="hero-node hero-node-right"
          cx="344"
          cy="239"
          r="34"
          fill="#A83232"
          fillOpacity="0.82"
        />

        {/* LOWER LEFT NODE (Fixed X: 176, Y: 292) */}
        <circle
          className="hero-node hero-node-left"
          cx="176"
          cy="292"
          r="34"
          fill="#A83232"
          fillOpacity="0.82"
        />
      </svg>
    </div>
  );
}
