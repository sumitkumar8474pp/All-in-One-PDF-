import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Upload, FileText, X, Loader2, Download, Plus, 
  LucideIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import { storage, auth, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';

interface PDFToolProps {
  title: string;
  icon: LucideIcon;
  apiEndpoint: string;
  onBack: () => void;
  description: string;
  acceptMultiple?: boolean;
  fields?: {
    name: string;
    label: string;
    type: string;
    placeholder?: string;
    defaultValue?: string;
  }[];
}

export const PDFTool: React.FC<PDFToolProps> = ({ 
  title, icon: Icon, apiEndpoint, onBack, description, acceptMultiple = false, fields = [] 
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    fields.reduce((acc, f) => ({ ...acc, [f.name]: f.defaultValue || '' }), {})
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => acceptMultiple ? [...prev, ...newFiles] : newFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processPDF = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      if (acceptMultiple) {
        files.forEach(f => formData.append('files', f));
      } else {
        formData.append('file', files[0]);
      }

      Object.entries(fieldValues).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Processing failed');

      const blob = await response.blob();
      const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `processed/${auth.currentUser?.uid}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // Save to Firestore
      await addDoc(collection(db, 'files'), {
        uid: auth.currentUser?.uid,
        name: fileName,
        url: downloadUrl,
        type: 'pdf',
        tool: title,
        createdAt: new Date().toISOString(),
        size: blob.size
      });

      setResultUrl(downloadUrl);
      toast.success(`${title} complete!`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${title.toLowerCase()}`);
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
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
      </div>

      {!resultUrl ? (
        <div className="space-y-6">
          {files.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <input 
                type="file" 
                accept="application/pdf" 
                multiple={acceptMultiple}
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:scale-110 transition-all shadow-sm">
                <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Select PDF</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{description}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm">
              <div className="space-y-3">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={() => removeFile(idx)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors active:scale-90"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {acceptMultiple && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 font-bold hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add More
                  </button>
                )}
              </div>

              {fields.length > 0 && (
                <div className="space-y-6">
                  {fields.map((f) => (
                    <div key={f.name} className="space-y-3">
                      <label className="block text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{f.label}</label>
                      <input 
                        type={f.type} 
                        placeholder={f.placeholder} 
                        value={fieldValues[f.name]}
                        onChange={(e) => setFieldValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all text-lg font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={processPDF}
                  disabled={isProcessing || files.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Icon className="w-6 h-6" />
                      {title}
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
            <Icon className="w-12 h-12 text-emerald-600 dark:text-emerald-400 -rotate-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Success!</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Your file has been processed and saved.</p>
          </div>
          <div className="flex flex-col gap-4">
            <a 
              href={resultUrl} 
              download
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download Result
            </a>
            <button 
              onClick={() => {
                setResultUrl(null);
                setFiles([]);
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Process Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
