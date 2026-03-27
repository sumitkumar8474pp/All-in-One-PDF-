import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { Moon, Sun, Save, FileText, Zap, Trash2, Globe, Info, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsProps {
  onBack: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  darkMode: false,
  saveLocation: 'cloud',
  namingFormat: 'PDF_{date}_{time}',
  pdfQuality: 'medium',
  autoDeleteDays: 30,
  language: 'en'
};

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('pdf_maker_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('pdf_maker_settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success('Setting updated');
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sun className="w-4 h-4" /> Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                {settings.darkMode ? <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Sun className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Dark Mode</p>
                <p className="text-xs text-slate-500">Switch between light and dark themes</p>
              </div>
            </div>
            <button 
              onClick={() => updateSetting('darkMode', !settings.darkMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.darkMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </section>

        {/* File Management */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Save className="w-4 h-4" /> File Management
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <Save className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Default Save Location</p>
                  <p className="text-xs text-slate-500">Where to store your generated PDFs</p>
                </div>
              </div>
              <select 
                value={settings.saveLocation}
                onChange={(e) => updateSetting('saveLocation', e.target.value as 'cloud' | 'local')}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold py-2 px-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="cloud">Cloud Storage</option>
                <option value="local">Local Memory</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">File Naming Format</p>
                  <p className="text-xs text-slate-500">Template for generated file names</p>
                </div>
              </div>
              <input 
                type="text"
                value={settings.namingFormat}
                onChange={(e) => updateSetting('namingFormat', e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold py-3 px-4 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. PDF_{date}_{time}"
              />
            </div>
          </div>
        </section>

        {/* PDF Quality */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> PDF Quality
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button
                key={q}
                onClick={() => updateSetting('pdfQuality', q)}
                className={`py-3 rounded-2xl font-bold text-sm capitalize transition-all ${
                  settings.pdfQuality === q 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* Auto Delete */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Auto Cleanup
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Auto Delete Files</p>
                <p className="text-xs text-slate-500">Delete files after a period</p>
              </div>
            </div>
            <select 
              value={settings.autoDeleteDays}
              onChange={(e) => updateSetting('autoDeleteDays', parseInt(e.target.value))}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold py-2 px-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0}>Never</option>
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
        </section>

        {/* Language */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Language
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">App Language</p>
                <p className="text-xs text-slate-500">Select your preferred language</p>
              </div>
            </div>
            <select 
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold py-2 px-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="hi">हिन्दी</option>
            </select>
          </div>
        </section>

        {/* About */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Info className="w-4 h-4" /> About
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white">PDF Maker Pro</p>
                <p className="text-xs text-slate-500">Version 1.0.0 (Build 20260327)</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              All In One PDF Maker is a professional-grade utility designed for mobile-first productivity. 
              Securely process your documents with cloud backup and advanced editing tools.
            </p>
            <div className="pt-2 flex gap-4">
              <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Privacy Policy</button>
              <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Terms of Service</button>
              <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Support</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
