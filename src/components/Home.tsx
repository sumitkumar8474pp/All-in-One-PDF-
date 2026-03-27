import React from 'react';
import { AppView } from '../types';
import { 
  Image as ImageIcon, Merge, Scissors, Eye, ArrowRight, Sparkles, 
  Zap, Lock, Unlock, Stamp, RotateCw, Trash2, FileText, ArrowUpDown, FileOutput, PenTool 
} from 'lucide-react';
import { motion } from 'motion/react';

interface HomeProps {
  setView: (view: AppView) => void;
}

export function Home({ setView }: HomeProps) {
  const coreTools = [
    {
      id: 'image-to-pdf' as AppView,
      title: 'Image to PDF',
      description: 'Convert photos to PDF',
      icon: <ImageIcon className="w-6 h-6" />,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: 'merge' as AppView,
      title: 'Merge PDF',
      description: 'Combine multiple files',
      icon: <Merge className="w-6 h-6" />,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      id: 'split' as AppView,
      title: 'Split PDF',
      description: 'Extract specific pages',
      icon: <Scissors className="w-6 h-6" />,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      id: 'edit' as AppView,
      title: 'Edit PDF',
      description: 'Add text & annotations',
      icon: <PenTool className="w-6 h-6" />,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      id: 'text-to-pdf' as AppView,
      title: 'Text to PDF',
      description: 'Write & convert to PDF',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      id: 'viewer' as AppView,
      title: 'My Files',
      description: 'View saved documents',
      icon: <Eye className="w-6 h-6" />,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    }
  ];

  const advancedTools = [
    {
      id: 'compress' as AppView,
      title: 'Compress',
      description: 'Reduce file size',
      icon: <Zap className="w-6 h-6" />,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      id: 'password' as AppView,
      title: 'Protect',
      description: 'Add password',
      icon: <Lock className="w-6 h-6" />,
      color: 'bg-slate-500',
      lightColor: 'bg-slate-50',
      textColor: 'text-slate-600'
    },
    {
      id: 'remove-password' as AppView,
      title: 'Unlock',
      description: 'Remove password',
      icon: <Unlock className="w-6 h-6" />,
      color: 'bg-slate-500',
      lightColor: 'bg-slate-50',
      textColor: 'text-slate-600'
    },
    {
      id: 'watermark' as AppView,
      title: 'Watermark',
      description: 'Add text overlay',
      icon: <Stamp className="w-6 h-6" />,
      color: 'bg-cyan-500',
      lightColor: 'bg-cyan-50',
      textColor: 'text-cyan-600'
    },
    {
      id: 'rotate' as AppView,
      title: 'Rotate',
      description: 'Change orientation',
      icon: <RotateCw className="w-6 h-6" />,
      color: 'bg-rose-500',
      lightColor: 'bg-rose-50',
      textColor: 'text-rose-600'
    },
    {
      id: 'delete-pages' as AppView,
      title: 'Delete Pages',
      description: 'Remove pages',
      icon: <Trash2 className="w-6 h-6" />,
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      id: 'extract-pages' as AppView,
      title: 'Extract',
      description: 'Save specific pages',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-teal-500',
      lightColor: 'bg-teal-50',
      textColor: 'text-teal-600'
    },
    {
      id: 'reorder-pages' as AppView,
      title: 'Reorder',
      description: 'Rearrange pages',
      icon: <ArrowUpDown className="w-6 h-6" />,
      color: 'bg-violet-500',
      lightColor: 'bg-violet-50',
      textColor: 'text-violet-600'
    },
    {
      id: 'pdf-to-image' as AppView,
      title: 'To Image',
      description: 'PDF to JPG/PNG',
      icon: <FileOutput className="w-6 h-6" />,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    }
  ];

  return (
    <div className="space-y-10 pb-20">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase tracking-widest">
          <Sparkles className="w-4 h-4" />
          Core Tools
        </div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Essential Utilities</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {coreTools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setView(tool.id)}
            className="group cursor-pointer bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-50 dark:hover:shadow-none transition-all active:scale-95 flex flex-col gap-4"
          >
            <div className={`w-14 h-14 ${tool.lightColor} dark:bg-opacity-20 ${tool.textColor} dark:text-opacity-90 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm`}>
              {tool.icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                {tool.title}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-medium leading-relaxed">
                {tool.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-1 pt-4">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase tracking-widest">
          <Zap className="w-4 h-4" />
          Advanced Tools
        </div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Power Features</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {advancedTools.map((tool, index) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            onClick={() => setView(tool.id)}
            className="group cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-50 dark:hover:shadow-none transition-all active:scale-95 flex flex-col gap-3"
          >
            <div className={`w-12 h-12 ${tool.lightColor} dark:bg-opacity-20 ${tool.textColor} dark:text-opacity-90 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
              {tool.icon}
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                {tool.title}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium leading-relaxed">
                {tool.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
