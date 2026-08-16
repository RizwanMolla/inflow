import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Play,
  Layers,
  ShieldCheck,
  X,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: 'Welcome to InFlow',
      badge: 'Step 1 of 3 • Introduction',
      subtitle: 'Your single-click workspace & workflow automation launcher.',
      description:
        'Instead of opening 5 browser tabs, 2 project folders, documentation, and your code editor one by one every morning, InFlow executes your complete work setup in under a second.',
      icon: Zap,
      accentColor: 'indigo',
      highlights: [
        'Instant multi-target launch sequence',
        'Built for developers, researchers & power users',
        'Works seamlessly on Windows desktop & web',
      ],
      previewGraphic: (
        <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 p-4 flex flex-col justify-center items-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 mb-3 animate-bounce">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-wide">One Click → Complete Flow</span>
          <span className="text-xs text-indigo-300/80 mt-1">Zero manual setup time</span>
        </div>
      ),
    },
    {
      title: 'Configure Your Workspaces',
      badge: 'Step 2 of 3 • Custom Pipelines',
      subtitle: 'Chain web links, local project folders, files, and apps.',
      description:
        'Create tailor-made workspaces for your routines: DSA Daily Prep, Full-Stack Development, Career & Job Hunting, Content Creation, or Deep Research.',
      icon: Layers,
      accentColor: 'emerald',
      highlights: [
        'Chain multiple URLs, local folders, files & executable apps',
        'Pick from ready-made curated templates or build from scratch',
        'Drag & reorder actions to prioritize launch sequence',
      ],
      previewGraphic: (
        <div className="relative w-full h-44 rounded-2xl bg-slate-900 border border-emerald-500/30 p-3.5 flex flex-col justify-center space-y-2 overflow-hidden">
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-800/80 border border-emerald-500/20">
            <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono">URL</span>
            <span className="text-xs text-slate-200 truncate">https://leetcode.com/problems</span>
          </div>
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-800/80 border border-emerald-500/20">
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">FOLDER</span>
            <span className="text-xs text-slate-200 truncate">D:\Projects\FullStack-App</span>
          </div>
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-800/80 border border-emerald-500/20">
            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono">APP</span>
            <span className="text-xs text-slate-200 truncate">code . (Visual Studio Code)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Instant Execution & Focus',
      badge: 'Step 3 of 3 • Ready to Flow',
      subtitle: 'Launch, track progress live, and stay in the zone.',
      description:
        'Hit "Launch Mode" on any workspace card. InFlow handles the orchestration with live execution telemetry, so you can dive straight into high-leverage work.',
      icon: Sparkles,
      accentColor: 'cyan',
      highlights: [
        'Live execution progress overlay with instant error diagnostic',
        'Export & Import JSON configurations to backup your setup',
        'Fast & lightweight with minimal memory footprint',
      ],
      previewGraphic: (
        <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 p-4 flex flex-col justify-center items-center overflow-hidden text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>Ready for Action</span>
          </div>
          <p className="text-xs text-slate-300 max-w-xs">
            You're all set! Start with a clean workspace or choose from pre-made templates.
          </p>
        </div>
      ),
    },
  ];

  const slide = slides[currentStep];
  const isLastStep = currentStep === slides.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top subtle bar with close/skip */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/70">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              {slide.badge}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {/* Interactive Preview Graphics */}
          {slide.previewGraphic}

          {/* Heading and Description */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{slide.title}</span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-indigo-400/90 mt-1">
              {slide.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2.5">
              {slide.description}
            </p>
          </div>

          {/* Highlights checklist */}
          <div className="space-y-2 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/60">
            {slide.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-t border-slate-800/80">
          {/* Step dots */}
          <div className="flex items-center space-x-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentStep === idx
                    ? 'w-6 bg-indigo-500 shadow-sm shadow-indigo-500/50'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 transform active:scale-95"
            >
              <span>{isLastStep ? 'Get Started' : 'Next'}</span>
              {isLastStep ? <Play className="w-3.5 h-3.5 fill-current" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
