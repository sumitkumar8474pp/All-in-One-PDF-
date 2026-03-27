import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, FileText, X, Loader2, Download, Plus, FileOutput, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFToImageProps {
  onBack: () => void;
}

export const PDFToImage: React.FC<PDFToImageProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setImages([]);
    }
  };

  const convertToImages = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const newImages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ 
          canvasContext: context, 
          viewport,
          canvas // Add this to satisfy types if needed, though usually context is enough
        } as any).promise;
        newImages.push(canvas.toDataURL('image/png'));
      }

      setImages(newImages);
      toast.success(`Converted ${pdf.numPages} pages to images!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to convert PDF to images');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors active:scale-90"
        >
          <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">PDF to Image</h2>
      </div>

      {images.length === 0 ? (
        <div className="space-y-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:scale-110 transition-all shadow-sm">
                <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select PDF</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Convert each page into a high-quality image</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm">
              <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={() => setFile(null)}
                  className="p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <button
                onClick={convertToImages}
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <FileOutput className="w-6 h-6" />
                    Convert to Images
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative group aspect-[3/4] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a 
                    href={img} 
                    download={`page-${idx + 1}.png`}
                    className="p-3 bg-white dark:bg-slate-900 rounded-full text-indigo-600 dark:text-indigo-400 shadow-xl active:scale-90 transition-transform"
                  >
                    <Download className="w-6 h-6" />
                  </a>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                  Page {idx + 1}
                </div>
              </motion.div>
            ))}
          </div>
          <button 
            onClick={() => {
              setImages([]);
              setFile(null);
            }}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
            Convert Another
          </button>
        </div>
      )}
    </div>
  );
};
