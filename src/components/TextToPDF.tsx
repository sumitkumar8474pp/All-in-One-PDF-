import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, FileText, Download, Plus, 
  Loader2, Save, Type, AlignLeft, Bold, Italic, Heading1, Heading2
} from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { storage, auth, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';

interface TextToPDFProps {
  onBack: () => void;
}

export const TextToPDF: React.FC<TextToPDFProps> = ({ onBack }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!content.trim()) {
      toast.error('Please enter some text');
      return;
    }

    setIsProcessing(true);
    try {
      // For simplicity in this prototype, we'll strip HTML tags for the basic server-side text drawing
      // In a full version, we'd use a more advanced HTML-to-PDF library on the server
      const plainText = content.replace(/<[^>]*>/g, '\n').replace(/\n\n+/g, '\n');

      const response = await fetch('/api/pdf/text-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Untitled Document',
          content: plainText,
        }),
      });

      if (!response.ok) throw new Error('Failed to convert');

      const blob = await response.blob();
      const fileName = `${title || 'document'}-${Date.now()}.pdf`;
      
      // Upload to Firebase
      const storageRef = ref(storage, `processed/${auth.currentUser?.uid}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // Save to Firestore
      await addDoc(collection(db, 'files'), {
        uid: auth.currentUser?.uid,
        name: fileName,
        url: downloadUrl,
        type: 'pdf',
        tool: 'Text to PDF',
        createdAt: new Date().toISOString(),
        size: blob.size
      });

      setResultUrl(downloadUrl);
      toast.success('PDF created successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors active:scale-90"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Text to PDF</h2>
        </div>
        {!resultUrl && (
          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 disabled:bg-slate-300"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Convert
          </button>
        )}
      </div>

      {resultUrl ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-8 shadow-2xl dark:shadow-none"
        >
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto rotate-6">
            <FileText className="w-12 h-12 text-emerald-600 dark:text-emerald-400 -rotate-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">PDF Ready!</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Your text has been converted to a PDF document.</p>
          </div>
          <div className="flex flex-col gap-4">
            <a 
              href={resultUrl} 
              download
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download PDF
            </a>
            <button 
              onClick={() => {
                setResultUrl(null);
                setTitle('');
                setContent('');
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Create New
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <input 
              type="text"
              placeholder="Document Title (Optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-2xl font-black text-slate-900 dark:text-white border-none focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-700"
            />
            
            <div className="min-h-[400px] border-t border-slate-100 dark:border-slate-800 pt-4">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent}
                modules={modules}
                placeholder="Start writing your content here..."
                className="h-full dark:text-white"
              />
            </div>
          </div>
          
          <p className="text-center text-xs text-slate-400 dark:text-slate-600">
            Your text will be formatted into a standard A4 PDF document.
          </p>
        </div>
      )}

      <style>{`
        .ql-container {
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          border: none !important;
        }
        .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 8px 0 !important;
        }
        .dark .ql-toolbar {
          border-bottom-color: #1e293b !important;
        }
        .dark .ql-editor.ql-blank::before {
          color: #475569 !important;
        }
        .dark .ql-snow .ql-stroke {
          stroke: #94a3b8 !important;
        }
        .dark .ql-snow .ql-fill {
          fill: #94a3b8 !important;
        }
        .dark .ql-snow .ql-picker {
          color: #94a3b8 !important;
        }
      `}</style>
    </div>
  );
};
