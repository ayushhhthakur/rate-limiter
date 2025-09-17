import React, { useState, useEffect } from 'react';

const CooldownTimer = ({ timeLeft, lastRequest }) => {
  const [countdown, setCountdown] = useState(timeLeft);

  useEffect(() => {
    setCountdown(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (countdown > 0) {
    return <span className="text-red-600 font-medium">{countdown}s</span>;
  }
  return <span className="text-gray-400">-</span>;
};

export default CooldownTimer;
