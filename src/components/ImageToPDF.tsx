import React, { useState, useRef } from 'react';
import { PDFDocument as PDFLibDoc } from 'pdf-lib';
import { auth, storage, db, handleFirestoreError, OperationType } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { ArrowLeft, Upload, FileText, X, Download, Loader2, Plus } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { toast } from 'sonner';

interface ImageToPDFProps {
  onBack: () => void;
}

interface SelectedImage {
  id: string;
  file: File;
  preview: string;
}

export function ImageToPDF({ onBack }: ImageToPDFProps) {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const generatePDF = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    try {
      const pdfDoc = await PDFLibDoc.create();
      
      for (const img of images) {
        const imageBytes = await img.file.arrayBuffer();
        let pdfImage;
        
        if (img.file.type === 'image/jpeg' || img.file.type === 'image/jpg') {
          pdfImage = await pdfDoc.embedJpg(imageBytes);
        } else if (img.file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(imageBytes);
        } else {
          continue;
        }

        const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
        page.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width: pdfImage.width,
          height: pdfImage.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const fileName = `images-to-pdf-${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Upload to Firebase Storage
      if (auth.currentUser) {
        const storageRef = ref(storage, `users/${auth.currentUser.uid}/pdfs/${fileName}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        // Save metadata to Firestore
        const docData = {
          id: Math.random().toString(36).substr(2, 9),
          ownerId: auth.currentUser.uid,
          name: fileName,
          url: downloadUrl,
          type: 'image-to-pdf',
          createdAt: new Date().toISOString(),
          size: blob.size
        };

        await addDoc(collection(db, 'users', auth.currentUser.uid, 'documents'), docData);
        setGeneratedUrl(downloadUrl);
        toast.success('PDF generated and saved successfully!');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
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
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Image to PDF</h2>
      </div>

      {!generatedUrl ? (
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group active:scale-[0.98]"
          >
            <input 
              type="file" 
              multiple 
              accept="image/jpeg,image/png" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:scale-110 transition-all shadow-sm">
              <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Photos</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Tap to select JPG or PNG</p>
          </div>

          {images.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Selected ({images.length})</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Hold & Drag to sort</p>
              </div>
              
              <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-3">
                {images.map((img) => (
                  <Reorder.Item 
                    key={img.id} 
                    value={img}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm active:shadow-lg active:scale-[1.02] transition-all"
                  >
                    <img src={img.preview} alt="" className="w-14 h-14 object-cover rounded-xl shadow-sm" />
                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{img.file.name}</span>
                    <button 
                      onClick={() => removeImage(img.id)}
                      className="p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors active:scale-90"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              <div className="pt-4 sticky bottom-24 sm:static">
                <button
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Creating PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="w-6 h-6" />
                      Generate PDF
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
            <FileText className="w-12 h-12 text-emerald-600 dark:text-emerald-400 -rotate-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">PDF Ready!</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Your document has been generated and saved to your cloud storage.</p>
          </div>
          <div className="flex flex-col gap-4">
            <a 
              href={generatedUrl} 
              download
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download Now
            </a>
            <button 
              onClick={() => {
                setGeneratedUrl(null);
                setImages([]);
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Create Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
