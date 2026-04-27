import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing a value.
 * Useful for search inputs to delay API calls until the user stops typing.
 *
 * @param {any} value The value to debounce
 * @param {number} delay The debounce delay in milliseconds
 * @returns {any} The debounced value
 */
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    // This is how we prevent debounced value from updating if value is changed ...
    // .. within the delay period. Timeout gets cleared and restarted.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
