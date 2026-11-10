import React from 'react';

const Wordmark: React.FC<{ className?: string }> = ({ className = 'text-[22px]' }) => (
  <span className={`font-extrabold tracking-[-0.03em] leading-none ${className}`}>
    Progetta<span className="text-signal">.</span>
  </span>
);

export default Wordmark;
