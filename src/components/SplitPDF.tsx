import React, { useState, useRef } from 'react';
import { PDFDocument as PDFLibDoc } from 'pdf-lib';
import { auth, storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { ArrowLeft, Upload, FileText, X, Download, Loader2, Plus, Scissors } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface SplitPDFProps {
  onBack: () => void;
}

export function SplitPDF({ onBack }: SplitPDFProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitUrl, setSplitUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const splitPDF = async () => {
    if (!file || !pageRange) {
      toast.error('Please select a file and enter page range');
      return;
    }
    setIsSplitting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('range', pageRange);

      const response = await fetch('/api/pdf/split', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to split PDF via API');
      }

      const blob = await response.blob();
      const fileName = `split-pdf-${Date.now()}.pdf`;
      const splitFile = new File([blob], fileName, { type: 'application/pdf' });

      if (auth.currentUser) {
        const storageRef = ref(storage, `users/${auth.currentUser.uid}/pdfs/${fileName}`);
        await uploadBytes(storageRef, splitFile);
        const downloadUrl = await getDownloadURL(storageRef);

        const docData = {
          id: Math.random().toString(36).substr(2, 9),
          ownerId: auth.currentUser.uid,
          name: fileName,
          url: downloadUrl,
          type: 'split',
          createdAt: new Date().toISOString(),
          size: blob.size
        };

        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), docData);
        setSplitUrl(downloadUrl);
        toast.success('PDF split successfully!');
      }
    } catch (error) {
      console.error('Error splitting PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to split PDF');
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors active:scale-90"
        >
          <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Split PDF</h2>
      </div>

      {!splitUrl ? (
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
              <p className="text-slate-500 dark:text-slate-400 text-sm">Tap to upload a file to split</p>
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

              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Page Range</label>
                <input 
                  type="text" 
                  placeholder="e.g. 1-3, 5" 
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all text-lg font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">Use commas for separate pages and hyphens for ranges.</p>
              </div>

              <div className="pt-4 sticky bottom-24 sm:static">
                <button
                  onClick={splitPDF}
                  disabled={isSplitting || !pageRange}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
                >
                  {isSplitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Splitting...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-6 h-6" />
                      Split PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-8 shadow-2xl dark:shadow-none"
        >
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto rotate-6">
            <Scissors className="w-12 h-12 text-emerald-600 dark:text-emerald-400 -rotate-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Split Complete!</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Your PDF has been split and saved to your cloud storage.</p>
          </div>
          <div className="flex flex-col gap-4">
            <a 
              href={splitUrl} 
              download
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download Split PDF
            </a>
            <button 
              onClick={() => {
                setSplitUrl(null);
                setFile(null);
                setPageRange('');
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Split Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
