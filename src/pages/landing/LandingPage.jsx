import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

// Import your complete design image
import heroBg from '../../assets/hero-bg.jpg';

const LandingPage = () => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setRotateX(((y - centerY) / centerY) * -4);
    setRotateY(((x - centerX) / centerX) * 4);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePosition({ x: 50, y: 50 });
  };

  return (
    // OUTER CONTAINER: Full screen, no padding, centers the card
    <div
      className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-0 font-sans overflow-hidden"
      style={{ perspective: '2500px' }}
    >
      {/* THE FLOATING CARD — Full width, auto height so nothing is cut off */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full rounded-none overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] bg-white"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        {/* THE IMAGE — Full width, height auto to preserve entire image */}
        <img
          src={heroBg}
          alt="EduSphere LMS Landing Page"
          className="w-full h-auto block"
        />

        {/* MOVING LIGHT GLARE */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 60%)`,
            transition: 'background 0.15s ease-out',
          }}
        ></div>

        {/* --- INVISIBLE CLICKABLE OVERLAYS --- */}

        {/* "I am a Student" Card */}
        <Link
          to="/register"
          className="absolute z-30 rounded-xl hover:bg-white/20 transition-all"
          style={{ bottom: '37%', left: '3.5%', width: '13%', height: '11%' }}
          aria-label="Register as Student"
        ></Link>

        {/* "I am a Teacher" Card */}
        <Link
          to="/register"
          className="absolute z-30 rounded-xl hover:bg-white/20 transition-all"
          style={{ bottom: '37%', left: '19.5%', width: '13%', height: '11%' }}
          aria-label="Register as Teacher"
        ></Link>

        {/* "I am an Administrator" Card */}
        <Link
          to="/register"
          className="absolute z-30 rounded-xl hover:bg-white/20 transition-all"
          style={{ bottom: '37%', left: '35.5%', width: '13%', height: '11%' }}
          aria-label="Register as Administrator"
        ></Link>

        {/* "Login" Link (Top Right) */}
        <Link
          to="/login"
          className="absolute z-30 rounded-lg hover:bg-white/20 transition-all"
          style={{ top: '4%', right: '3%', width: '12%', height: '4%' }}
          aria-label="Login"
        ></Link>
      </div>
    </div>
  );
};

export default LandingPage;