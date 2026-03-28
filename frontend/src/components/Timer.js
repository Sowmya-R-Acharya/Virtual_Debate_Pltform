import { useEffect, useState } from "react";

export default function Timer({ minutes = 1 }) {
  const [time, setTime] = useState(minutes * 60);

  useEffect(() => {
    if (time === 0) return;
    const t = setInterval(() => setTime(time - 1), 1000);
    return () => clearInterval(t);
  }, [time]);

  return <h3>Time Left: {Math.floor(time / 60)}:{time % 60}</h3>;
}
