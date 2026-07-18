'use client';

import { useState, useEffect } from 'react';

export function useDemoMode() {
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    // Read initial value safely on client-side
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theseus_demo_mode');
      setDemoMode(saved === 'true');

      const handleStorageChange = () => {
        const val = localStorage.getItem('theseus_demo_mode');
        setDemoMode(val === 'true');
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('theseus_demo_mode_changed', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('theseus_demo_mode_changed', handleStorageChange);
      };
    }
  }, []);

  const toggleDemoMode = (val: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theseus_demo_mode', String(val));
      setDemoMode(val);
      window.dispatchEvent(new Event('theseus_demo_mode_changed'));
    }
  };

  return { demoMode, toggleDemoMode };
}
