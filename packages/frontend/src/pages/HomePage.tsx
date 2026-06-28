import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/shared/Navbar';
import { Hero } from '@/components/landing/Hero';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { TheDifference } from '@/components/landing/TheDifference';

const HomePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('github');
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleRunEngine = () => {
    if (activeTab === 'github') {
      const username = inputValue
        .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
        .split('/')[0]
        .trim();
      if (username) navigate(`/analysis/${username}`);
    } else if (activeTab === 'linkedin' && selectedFile) {
      navigate('/linkedin', { state: { file: selectedFile } });
    } else if (activeTab === 'cv' && selectedFile) {
      navigate('/cv', { state: { file: selectedFile } });
    }
  };

  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    setInputValue(file.name); // Set input value to file name for display
    // Resume / LinkedIn analysis kicks off as soon as a file is chosen — the
    // destination page uploads and analyzes on mount, so no extra click needed.
    if (activeTab === 'linkedin') {
      navigate('/linkedin', { state: { file } });
    } else if (activeTab === 'cv') {
      navigate('/cv', { state: { file } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans selection:bg-violet-200 selection:text-violet-950">
      <Navbar />
      <Hero
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onRunEngine={handleRunEngine}
        onFileUpload={handleFileUpload}
      />
      <DashboardPreview />
      <HowItWorks />
      <TheDifference />
    </div>
  );
};

export default HomePage;
