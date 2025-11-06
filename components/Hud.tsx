import React from 'react';

const CornerBracket: React.FC<{ position: string }> = ({ position }) => {
    const baseClasses = "absolute w-12 h-12 border-gray-500/70";
    let positionClasses = "";
  
    if (position.includes('top')) positionClasses += ' top-2';
    if (position.includes('bottom')) positionClasses += ' bottom-2';
    if (position.includes('left')) positionClasses += ' left-2';
    if (position.includes('right')) positionClasses += ' right-2';
  
    if (position === 'top-left') positionClasses += ' border-t-2 border-l-2';
    if (position === 'top-right') positionClasses += ' border-t-2 border-r-2';
    if (position === 'bottom-left') positionClasses += ' border-b-2 border-l-2';
    if (position === 'bottom-right') positionClasses += ' border-b-2 border-r-2';
  
    return <div className={`${baseClasses} ${positionClasses}`}></div>;
  };
  

const Hud: React.FC = () => {
  return (
    <div className="hidden md:block absolute inset-0 pointer-events-none z-10">
      {/* Corner Brackets */}
      <CornerBracket position="top-left" />
      <CornerBracket position="top-right" />
      <CornerBracket position="bottom-left" />
      <CornerBracket position="bottom-right" />

      {/* Scanline Effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-repeat opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
        backgroundSize: '100% 4px',
      }}></div>
    </div>
  );
};

export default Hud;