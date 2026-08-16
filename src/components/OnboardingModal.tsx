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
        'Instead of opening browser tabs, local project folders, docs, and code editors manually, InFlow orchestrates your complete work setup instantly.',
      icon: Zap,
      highlights: [
        'Instant multi-target launch sequence',
        'Built for developers, researchers & power users',
        'Works seamlessly on Windows desktop & web',
      ],
      previewGraphic: (
        <div className="relative w-full h-32 rounded-lg bg-black/40 border border-white/5 p-4 flex flex-col justify-center items-center overflow-hidden">
          <div className="w-9 h-9 rounded-md bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-2 text-red-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-white tracking-tight">One Click → Complete Flow</span>
          <span className="text-[10px] font-mono text-neutral-400 mt-0.5">Zero setup latency</span>
        </div>
      ),
    },
    {
      title: 'Configure Your Workspaces',
      badge: 'Step 2 of 3 • Custom Pipelines',
      subtitle: 'Chain web links, local project folders, files, and apps.',
      description:
        'Create tailor-made workspaces for your daily routines: DSA Daily Prep, Full-Stack Development, Career Planning, or Deep Research.',
      icon: Layers,
      highlights: [
        'Chain multiple URLs, local folders, files & executable apps',
        'Pick from ready-made curated templates or build from scratch',
        'Drag & reorder actions to prioritize launch sequence',
      ],
      previewGraphic: (
        <div className="relative w-full h-32 rounded-lg bg-black/40 border border-white/5 p-2.5 flex flex-col justify-center space-y-1 overflow-hidden">
          <div className="flex items-center space-x-2 p-1.5 rounded-md bg-white/5 border border-white/5">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">URL</span>
            <span className="text-[10px] text-neutral-300 font-mono truncate">https://leetcode.com/problems</span>
          </div>
          <div className="flex items-center space-x-2 p-1.5 rounded-md bg-white/5 border border-white/5">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">FOLDER</span>
            <span className="text-[10px] text-neutral-300 font-mono truncate">~/Projects/FullStack-App</span>
          </div>
          <div className="flex items-center space-x-2 p-1.5 rounded-md bg-white/5 border border-white/5">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">APP</span>
            <span className="text-[10px] text-neutral-300 font-mono truncate">code . (Visual Studio Code)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Instant Execution & Focus',
      badge: 'Step 3 of 3 • Ready to Flow',
      subtitle: 'Launch, track progress live, and stay in the zone.',
      description:
        'Trigger "Launch Mode" on any workspace. InFlow handles execution with live telemetry so you can jump straight into high-leverage work.',
      icon: Sparkles,
      highlights: [
        'Live execution progress overlay with diagnostic feedback',
        'Export & Import JSON configurations to backup your setup',
        'Fast & lightweight with minimal memory footprint',
      ],
      previewGraphic: (
        <div className="relative w-full h-32 rounded-lg bg-black/40 border border-white/5 p-4 flex flex-col justify-center items-center overflow-hidden text-center">
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ready for Action</span>
          </div>
          <p className="text-[11px] text-neutral-400 max-w-xs leading-normal">
            You're all set. Start with a clean workspace or select a preset pipeline template.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#1e1e20]/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col text-neutral-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
            {slide.badge}
          </span>
          <button
            onClick={onClose}
            type="button"
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            title="Close Guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 flex-1">
          {/* Interactive Preview Graphics */}
          {slide.previewGraphic}

          {/* Heading and Description */}
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              {slide.title}
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {slide.subtitle}
            </p>
            <p className="text-[11px] text-neutral-300 leading-normal mt-1.5">
              {slide.description}
            </p>
          </div>

          {/* Highlights Checklist */}
          <div className="space-y-1 bg-black/40 p-2.5 rounded-lg border border-white/5">
            {slide.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs text-neutral-300">
                <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[10px]">{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 border-t border-white/[0.06]">
          {/* Step Dots */}
          <div className="flex items-center space-x-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-1 rounded-full transition-all ${
                  currentStep === idx
                    ? 'w-3.5 bg-red-500'
                    : 'w-1 bg-white/20 hover:bg-white/40'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center space-x-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-all flex items-center space-x-1 shadow-sm active:scale-[0.98]"
            >
              <span>{isLastStep ? 'Get Started' : 'Next'}</span>
              {isLastStep ? <Play className="w-3 h-3 fill-current" /> : <ArrowRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};