import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, storage, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { PDFDocument } from '../types';
import { 
  ArrowLeft, FileText, Download, Eye, Loader2, Trash2, 
  Search, ArrowUpDown, Edit2, X, Check, ExternalLink,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  onBack: () => void;
}

export function PDFViewer({ onBack }: PDFViewerProps) {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState<PDFDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  
  // PDF Search state
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [pdfSearchResults, setPdfSearchResults] = useState<{ page: number, text: string }[]>([]);
  const [isSearchingPdf, setIsSearchingPdf] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'documents'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as PDFDocument[];
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/documents`);
    });

    return () => unsubscribe();
  }, []);

  const filteredAndSortedDocs = useMemo(() => {
    let result = documents.filter(doc => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortBy === 'size') {
        return sortOrder === 'desc' ? (b.size || 0) - (a.size || 0) : (a.size || 0) - (b.size || 0);
      } else {
        return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [documents, searchQuery, sortBy, sortOrder]);

  const handleDelete = async (docObj: PDFDocument) => {
    if (!auth.currentUser || !docObj.id) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete "${docObj.name}"?`);
    if (!confirmDelete) return;

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'documents', docObj.id));
      
      // Delete from Storage
      const storageRef = ref(storage, docObj.url);
      await deleteObject(storageRef).catch(err => console.error("Storage delete error:", err));
      
      toast.success('File deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete file');
    }
  };

  const handleRename = async (docId: string) => {
    if (!auth.currentUser || !newName.trim()) return;

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'documents', docId), {
        name: newName.endsWith('.pdf') ? newName : `${newName}.pdf`
      });
      setEditingId(null);
      setNewName('');
      toast.success('File renamed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to rename file');
    }
  };

  const searchInPdf = async () => {
    if (!selectedPdf || !pdfSearchQuery.trim()) return;
    
    setIsSearchingPdf(true);
    setPdfSearchResults([]);
    
    try {
      const loadingTask = pdfjsLib.getDocument(selectedPdf.url);
      const pdf = await loadingTask.promise;
      const results: { page: number, text: string }[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strings = textContent.items.map((item: any) => item.str).join(' ');
        
        if (strings.toLowerCase().includes(pdfSearchQuery.toLowerCase())) {
          results.push({ page: i, text: strings });
        }
      }
      
      setPdfSearchResults(results);
      if (results.length === 0) toast.info('No matches found in PDF');
    } catch (error) {
      console.error(error);
      toast.error('Error searching in PDF');
    } finally {
      setIsSearchingPdf(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (selectedPdf) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setSelectedPdf(null);
                setPdfSearchQuery('');
                setPdfSearchResults([]);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{selectedPdf.name}</h3>
              <p className="text-xs text-slate-500">{formatSize(selectedPdf.size)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <input 
                type="text"
                placeholder="Search in PDF..."
                value={pdfSearchQuery}
                onChange={(e) => setPdfSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchInPdf()}
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-48"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {isSearchingPdf && <Loader2 className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />}
            </div>
            <a 
              href={selectedPdf.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Main Viewer */}
          <div className="flex-1 bg-slate-200 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner">
            <iframe 
              src={selectedPdf.url} 
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          </div>

          {/* Search Results Sidebar (Desktop) */}
          {pdfSearchResults.length > 0 && (
            <div className="w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto hidden lg:block p-4 space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4" />
                Results ({pdfSearchResults.length})
              </h4>
              <div className="space-y-2">
                {pdfSearchResults.map((res, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Page {res.page}</span>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-2 italic">"...{res.text.substring(0, 100)}..."</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors active:scale-90"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">File Manager</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowUpDown className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </button>
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          >
            <option value="date">Date</option>
            <option value="size">Size</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading your documents...</p>
        </div>
      ) : filteredAndSortedDocs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed space-y-6 shadow-sm">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">No documents found</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Try a different search or upload some files.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedDocs.map((doc, index) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl transition-all group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditingId(doc.id!);
                        setNewName(doc.name);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingId === doc.id ? (
                  <div className="space-y-3">
                    <input 
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-indigo-500 rounded-xl text-sm font-bold"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRename(doc.id!)}
                        className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 dark:text-slate-100 truncate text-lg tracking-tight">{doc.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{formatSize(doc.size)}</span>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedPdf(doc)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <a 
                    href={doc.url} 
                    download={doc.name}
                    className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-2xl transition-all active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
