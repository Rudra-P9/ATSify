import { useState, useCallback } from 'react';

export function useResume() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const clearResume = useCallback(() => {
    setFile(null);
    setResumeText('');
    setJobDescription('');
  }, []);

  return {
    file,
    setFile,
    resumeText,
    setResumeText,
    jobDescription,
    setJobDescription,
    clearResume
  };
}