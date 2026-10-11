'use client';

import React from 'react';

interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className = 'h-14 w-14' }: BrandLogoProps) {
  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-2xs select-none"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
      >
        <defs>
          {/* Top arc path for 'BILAL' */}
          <path id="topArcPath" d="M 35,100 A 65,65 0 0,1 165,100" fill="none" />
          {/* Bottom arc path for 'CLOTH HOUSE' */}
          <path id="bottomArcPath" d="M 165,100 A 65,65 0 0,1 35,100" fill="none" />
        </defs>

        {/* Outer Circular Ring */}
        <circle cx="100" cy="100" r="94" fill="#ffffff" stroke="#1b3830" strokeWidth="4" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="#1b3830" strokeWidth="1.5" strokeDasharray="4 2" />

        {/* Top Text: BILAL */}
        <text fill="#1b3830" fontSize="19" fontWeight="900" letterSpacing="3" textAnchor="middle">
          <textPath href="#topArcPath" startOffset="50%">
            BILAL
          </textPath>
        </text>

        {/* Bottom Text: CLOTH HOUSE */}
        <text fill="#1b3830" fontSize="13" fontWeight="900" letterSpacing="2" textAnchor="middle">
          <textPath href="#bottomArcPath" startOffset="50%">
            CLOTH HOUSE
          </textPath>
        </text>

        {/* Inner Circle Border around Horse Emblem */}
        <circle cx="100" cy="98" r="44" fill="#f4f7f5" stroke="#1b3830" strokeWidth="2" />

        {/* Stylized Horse & Silk Fabric Vector Artwork */}
        <g fill="#1b3830" transform="translate(100, 98) scale(0.85) translate(-100, -98)">
          {/* Horse Head & Mane Vector */}
          <path d="M85 75 C82 68 88 58 98 56 C105 55 112 60 115 67 C118 73 114 82 108 85 C102 88 94 85 91 80 C88 77 86 78 85 75 Z" />
          <path d="M96 62 C104 60 112 66 110 74 C108 80 100 82 95 78 C92 75 90 70 96 62 Z" fill="#ffffff" />

          {/* Horse Body & Majestic Crest */}
          <path d="M78 115 C72 105 75 92 86 85 C95 80 108 82 115 90 C122 98 120 112 110 118 C100 123 85 122 78 115 Z" />
          <path d="M88 94 C96 90 106 94 108 102 C110 108 104 114 96 114 C90 112 86 104 88 94 Z" fill="#ffffff" />

          {/* Crown & Silk Thread Accent Stars */}
          <polygon points="100,50 103,57 110,57 104,61 106,68 100,64 94,68 96,61 90,57 97,57" fill="#1b3830" />
          <circle cx="72" cy="98" r="3" fill="#1b3830" />
          <circle cx="128" cy="98" r="3" fill="#1b3830" />
        </g>
      </svg>
    </div>
  );
}
