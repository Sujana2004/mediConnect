import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const slides = [
  {
    icon: '🩺',
    titleEn: 'AI-Powered Health Assistant',
    titleTe: 'AI లో రూపొందించబడిన ఆరోగ్య సహాయకుడు',
    descEn: 'Check symptoms, get AI diagnosis, and consult doctors - all from your mobile phone.',
    descTe: 'లక్షణాలను తనిఖీ చేయండి, AI నిర్ధారణ పొందండి',
  },
  {
    icon: '🎤',
    titleEn: 'Voice Support',
    titleTe: 'వాయిస్ సపోర్ట్',
    descEn: 'Speak in Telugu, Hindi, or English. The app will listen and respond.',
    descTe: 'తెలుగు, హిందీ లేదా ఇంగ్లీషులో మాట్లాడండి',
  },
  {
    icon: '🆘',
    titleEn: 'Emergency Support',
    titleTe: 'అత్యవసర సహాయం',
    descEn: 'One-tap SOS alert to notify your family and nearby hospitals instantly.',
    descTe: 'మీ కుటుంబం మరియు ఆసుపత్రులకు వెంటనే హెచ్చరిక',
  },
];

export default function OnboardingScreen({ onComplete, language }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const s = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="flex flex-col py-6">
      <div className="flex justify-end p-4">
        <button type="button" onClick={onComplete} className="text-primary-600 font-medium text-sm">
          {language === 'te' ? 'దాటవేయి' : language === 'hi' ? 'छोड़ें' : 'Skip'}
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-32 h-32 rounded-2xl bg-primary-50 flex items-center justify-center text-6xl mb-6">
          {s.icon}
        </div>
        <h2 className="text-xl font-bold text-gray-900 text-center">{s.titleEn}</h2>
        <p className="text-sm text-gray-500 text-center mt-1">{s.titleTe}</p>
        <p className="text-gray-600 text-center mt-4 max-w-sm">{s.descEn}</p>
        <p className="text-sm text-gray-500 text-center mt-2">{s.descTe}</p>
        <div className="flex gap-2 mt-8">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === index ? 'bg-primary-600' : 'bg-gray-300'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <div className="p-6 flex justify-between gap-4">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 disabled:opacity-50"
        >
          {language === 'te' ? 'వెనుక' : 'Back'}
        </button>
        <button
          type="button"
          onClick={isLast ? onComplete : () => setIndex((i) => i + 1)}
          className="px-6 py-3 rounded-xl bg-primary-600 text-white font-medium min-w-[140px]"
        >
          {isLast ? (language === 'te' ? 'ప్రారంభించండి' : 'Get Started') : 'Next'}
        </button>
      </div>
    </div>
  );
}
