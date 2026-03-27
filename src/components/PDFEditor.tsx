import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Upload, FileText, X, Loader2, Download, Plus, 
  Type, PenTool, Highlighter, Signature as SignatureIcon, Save, ChevronLeft, ChevronRight, Eraser, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';
import { Canvas, Textbox, Rect, FabricImage, Line, Polyline } from 'fabric';
import { storage, auth, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { SignaturePad } from './SignaturePad';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFEditorProps {
  onBack: () => void;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'draw' | 'highlight'>('select');
  const [activeColor, setActiveColor] = useState('#4f46e5'); // Indigo 600
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const pdfDocRef = useRef<any>(null);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new Canvas(canvasRef.current, {
        width: 600,
        height: 800,
        backgroundColor: 'transparent',
      });
      fabricCanvasRef.current = canvas;
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  // Handle Tool Changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool === 'draw' || activeTool === 'highlight') {
      canvas.isDrawingMode = true;
      // @ts-ignore - Fabric 6 types might be tricky
      canvas.freeDrawingBrush.color = activeTool === 'highlight' ? 'rgba(255, 255, 0, 0.3)' : activeColor;
      // @ts-ignore
      canvas.freeDrawingBrush.width = activeTool === 'highlight' ? 20 : 3;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [activeTool, activeColor]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsProcessing(true);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        await renderPage(1);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load PDF');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const renderPage = async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    
    try {
      const page = await pdfDocRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.setDimensions({ width: viewport.width, height: viewport.height });
        
        // Render PDF to a temporary canvas to use as background
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        
        await page.render({ canvasContext: context!, viewport }).promise;
        
        // Set as background image
        const bgImage = await FabricImage.fromURL(tempCanvas.toDataURL());
        bgImage.set({
          selectable: false,
          evented: false,
        });
        canvas.backgroundImage = bgImage;
        canvas.renderAll();
      }
    } catch (error) {
      console.error(error);
      toast.error('Error rendering page');
    }
  };

  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new Textbox('Type here...', {
      left: 100,
      top: 100,
      width: 200,
      fontSize: 20,
      fill: activeColor,
      fontFamily: 'Inter',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    setActiveTool('select');
  };

  const addSignature = async (dataUrl: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const img = await FabricImage.fromURL(dataUrl);
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      setShowSignaturePad(false);
      setActiveTool('select');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add signature');
    }
  };

  const saveEditedPDF = async () => {
    if (!file || !fabricCanvasRef.current) return;
    setIsSaving(true);

    try {
      const canvas = fabricCanvasRef.current;
      const objects = canvas.getObjects();
      
      // Map fabric objects to our API format
      const annotations = objects.map(obj => {
        const common = {
          pageIndex: currentPage - 1,
          left: obj.left,
          top: obj.top,
          width: obj.width * obj.scaleX,
          height: obj.height * obj.scaleY,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        };

        if (obj instanceof Textbox) {
          const color = hexToRgb(obj.fill as string);
          return {
            ...common,
            type: 'text',
            text: obj.text,
            fontSize: obj.fontSize * obj.scaleY,
            color: color || { r: 0, g: 0, b: 0 }
          };
        }
        
        if (obj instanceof FabricImage && obj !== canvas.backgroundImage) {
          return {
            ...common,
            type: 'image',
            image: obj.toDataURL(),
            mimeType: 'image/png'
          };
        }
        
        return null;
      }).filter(Boolean);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('annotations', JSON.stringify(annotations));

      const response = await fetch('/api/pdf/edit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to save');

      const blob = await response.blob();
      const fileName = `edited-${file.name}`;
      
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
        tool: 'PDF Editor',
        createdAt: new Date().toISOString(),
        size: blob.size
      });

      setResultUrl(downloadUrl);
      toast.success('PDF edited and saved!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save edited PDF');
    } finally {
      setIsSaving(false);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
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
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">PDF Editor</h2>
        </div>
        {file && !resultUrl && (
          <button
            onClick={saveEditedPDF}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 disabled:bg-slate-300"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save
          </button>
        )}
      </div>

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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Upload PDF to Edit</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Add text, annotations, and signatures</p>
        </div>
      ) : resultUrl ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-8 shadow-2xl dark:shadow-none"
        >
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto rotate-6">
            <Save className="w-12 h-12 text-emerald-600 dark:text-emerald-400 -rotate-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Saved!</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Your edited PDF is ready.</p>
          </div>
          <div className="flex flex-col gap-4">
            <a 
              href={resultUrl} 
              download
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download Edited PDF
            </a>
            <button 
              onClick={() => {
                setResultUrl(null);
                setFile(null);
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <Plus className="w-6 h-6" />
              Edit Another
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm overflow-x-auto">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTool('select')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'select' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Select"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
              <button 
                onClick={addText}
                className={`p-3 rounded-xl transition-all ${activeTool === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Add Text"
              >
                <Type className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setActiveTool('draw')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'draw' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Draw"
              >
                <PenTool className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setActiveTool('highlight')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'highlight' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Highlight"
              >
                <Highlighter className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowSignaturePad(true)}
                className="p-3 rounded-xl transition-all text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Add Signature"
              >
                <SignatureIcon className="w-5 h-5" />
              </button>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1" />
              <div className="flex items-center gap-2 px-2">
                {['#4f46e5', '#ef4444', '#10b981', '#000000'].map(color => (
                  <button 
                    key={color}
                    onClick={() => setActiveColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${activeColor === color ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    renderPage(newPage);
                  }}
                  className="p-1 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{currentPage} / {numPages}</span>
                <button 
                  disabled={currentPage === numPages}
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    renderPage(newPage);
                  }}
                  className="p-1 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="relative bg-slate-200 dark:bg-slate-950 rounded-3xl overflow-auto flex justify-center p-8 min-h-[600px] border border-slate-300 dark:border-slate-800">
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              </div>
            )}
            <div className="shadow-2xl bg-white">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>
      )}

      {showSignaturePad && (
        <SignaturePad 
          onSave={addSignature}
          onClose={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  );
};
