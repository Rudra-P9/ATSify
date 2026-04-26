import { useState, useCallback } from 'react';

export function useResume() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');

  const clearResume = useCallback(() => {
    setFile(null);
    setJobDescription('');
  }, []);

  return {
    file,
    setFile,
    jobDescription,
    setJobDescription,
    clearResume
  };
}
