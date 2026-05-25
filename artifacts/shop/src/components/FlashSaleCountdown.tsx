import { useState, useEffect } from "react";

interface FlashSaleCountdownProps {
  endTime: string;
  className?: string;
  theme?: "dark" | "light";
}

export function FlashSaleCountdown({ endTime, className = "", theme = "dark" }: FlashSaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endTime) - +new Date();
      let timeLeftObj = { hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        timeLeftObj = {
          hours: Math.floor(difference / (1000 * 60 * 60)),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return timeLeftObj;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const padZero = (num: number) => String(num).padStart(2, "0");

  const boxClass = theme === "dark" 
    ? "bg-amber-950 text-amber-400 border border-amber-500/20 px-2.5 py-1.5 font-mono text-xs md:text-sm font-bold rounded-xs min-w-[36px]"
    : "bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2.5 py-1.5 font-mono text-xs md:text-sm font-bold rounded-xs min-w-[36px]";

  const colonClass = theme === "dark" ? "text-amber-500 font-bold" : "text-amber-700 font-bold";

  return (
    <div className={`flex gap-2 text-center items-center ${className}`}>
      <div className={boxClass}>
        {padZero(timeLeft.hours)}h
      </div>
      <span className={colonClass}>:</span>
      <div className={boxClass}>
        {padZero(timeLeft.minutes)}m
      </div>
      <span className={colonClass}>:</span>
      <div className={boxClass}>
        {padZero(timeLeft.seconds)}s
      </div>
    </div>
  );
}
