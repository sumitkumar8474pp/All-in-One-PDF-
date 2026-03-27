import React, { useState, useRef } from 'react';
import { PDFDocument as PDFLibDoc } from 'pdf-lib';
import { auth, storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { ArrowLeft, Upload, FileText, X, Download, Loader2, Plus, Merge } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { toast } from 'sonner';

interface MergePDFProps {
  onBack: () => void;
}

interface SelectedPDF {
  id: string;
  file: File;
}

export function MergePDF({ onBack }: MergePDFProps) {
  const [pdfs, setPdfs] = useState<SelectedPDF[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPdfs = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file
    }));
    setPdfs(prev => [...prev, ...newPdfs]);
  };

  const removePdf = (id: string) => {
    setPdfs(prev => prev.filter(p => p.id !== id));
  };

  const mergePDFs = async () => {
    if (pdfs.length < 2) {
      toast.error('Please select at least 2 PDF files');
      return;
    }
    setIsMerging(true);

    try {
      const formData = new FormData();
      pdfs.forEach(pdf => {
        formData.append('files', pdf.file);
      });

      const response = await fetch('/api/pdf/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to merge PDFs via API');
      }

      const blob = await response.blob();
      const fileName = `merged-pdf-${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (auth.currentUser) {
        const storageRef = ref(storage, `users/${auth.currentUser.uid}/pdfs/${fileName}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        const docData = {
          id: Math.random().toString(36).substr(2, 9),
          ownerId: auth.currentUser.uid,
          name: fileName,
          url: downloadUrl,
          type: 'merge',
          createdAt: new Date().toISOString(),
          size: blob.size
        };

        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), docData);
        setMergedUrl(downloadUrl);
        toast.success('PDFs merged successfully!');
      }
    } catch (error) {
      console.error('Error merging PDFs:', error);
      toast.error('Failed to merge PDFs');
    } finally {
      setIsMerging(false);
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
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Merge PDF</h2>
      </div>

      {!mergedUrl ? (
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group active:scale-[0.98]"
          >
            <input 
              type="file" 
              multiple 
              accept="application/pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:scale-110 transition-all shadow-sm">
              <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add PDF Files</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Tap to select multiple PDFs</p>
          </div>

          {pdfs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Selected ({pdfs.length})</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Hold & Drag to sort</p>
              </div>
              
              <Reorder.Group axis="y" values={pdfs} onReorder={setPdfs} className="space-y-3">
                {pdfs.map((pdf) => (
                  <Reorder.Item 
                    key={pdf.id} 
                    value={pdf}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm active:shadow-lg active:scale-[1.02] transition-all"
                  >
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{pdf.file.name}</span>
                    <button 
                      onClick={() => removePdf(pdf.id)}
                      className="p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors active:scale-90"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              <div className="pt-4 sticky bottom-24 sm:static">
                <button
                  onClick={mergePDFs}
                  disabled={isMerging || pdfs.length < 2}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
                >
                  {isMerging ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Merging Files...
                    </>
                  ) : (
                    <>
                      <Merge className="w-6 h-6" />
                      Merge PDFs
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
            <Merge className="w-12 h-12 text-emerald-600 dark:text-emerald-400 -rotate-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Merge Complete!</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Your files have been combined and saved to your cloud storage.</p>
          </div>
          <div className="flex flex-col gap-4">
            <a 
              href={mergedUrl} 
              download
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download Merged PDF
            </a>
            <button 
              onClick={() => {
                setMergedUrl(null);
                setPdfs([]);
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Merge More
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
