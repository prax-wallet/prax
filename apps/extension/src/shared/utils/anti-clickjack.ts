import { useEffect } from 'react';
import { useCountdown } from 'usehooks-ts';

/**
 * A hook that counts down each second from a given number only when the window is focused.
 * If the window is out of focus, the countdown will reset and start from the beginning.
 */
export const useAntiClickjackDelay = (countStart = 2) => {
  const [count, { startCountdown, stopCountdown, resetCountdown }] = useCountdown({
    countStart,
    intervalMs: 500,
  });

  const onFocus = () => {
    resetCountdown();
    startCountdown();
  };

  const onBlur = () => {
    stopCountdown();
  };

  useEffect(() => {
    if (document.hasFocus()) {
      startCountdown();
    }

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [startCountdown]);

  return count;
};
