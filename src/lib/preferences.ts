import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ps:show-advanced';

export function getShowAdvanced(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

export function setShowAdvanced(value: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

export function useShowAdvanced(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(getShowAdvanced);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setValue(e.newValue === '1');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setAndPersist = (newValue: boolean) => {
    setValue(newValue);
    setShowAdvanced(newValue);
  };

  return [value, setAndPersist];
}
