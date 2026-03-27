import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, AppView } from './types';
import { Home } from './components/Home';
import { ImageToPDF } from './components/ImageToPDF';
import { MergePDF } from './components/MergePDF';
import { SplitPDF } from './components/SplitPDF';
import { PDFViewer } from './components/PDFViewer';
import { PDFToImage } from './components/PDFToImage';
import { PDFEditor } from './components/PDFEditor';
import { TextToPDF } from './components/TextToPDF';
import { Settings as SettingsView } from './components/Settings';
import { FileText, LogOut, User as UserIcon, Loader2, Home as HomeIcon, LayoutGrid, FolderOpen, Settings, Zap, Lock, Unlock, Stamp, RotateCw, Trash2, FileText as FileIcon, ArrowUpDown, FileOutput } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { PDFTool } from './components/PDFTool';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<AppView>('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('pdf_maker_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date().toISOString(),
              role: 'user'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in successfully!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to login');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('home');
      toast.success('Logged out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 text-center border border-slate-100 dark:border-slate-800">
          <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
            <FileText className="w-12 h-12 text-indigo-600 dark:text-indigo-400 -rotate-3" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">PDF Maker</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg leading-relaxed">The all-in-one tool for your PDF needs. Convert, merge, and split with ease.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <UserIcon className="w-6 h-6" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pb-20 sm:pb-0 transition-colors">
      <Toaster position="top-center" richColors />
      
      {/* Header - Desktop only or small on mobile */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('home')}
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">PDF Maker</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              )}
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                {profile?.displayName || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-90"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {view === 'home' && <Home setView={setView} />}
          {view === 'image-to-pdf' && <ImageToPDF onBack={() => setView('home')} />}
          {view === 'merge' && <MergePDF onBack={() => setView('home')} />}
          {view === 'split' && <SplitPDF onBack={() => setView('home')} />}
          {view === 'viewer' && <PDFViewer onBack={() => setView('home')} />}
          
          {/* Advanced Tools */}
          {view === 'compress' && (
            <PDFTool 
              title="Compress PDF" 
              icon={Zap} 
              apiEndpoint="/api/pdf/compress" 
              onBack={() => setView('home')}
              description="Reduce file size while maintaining quality"
            />
          )}
          {view === 'password' && (
            <PDFTool 
              title="Protect PDF" 
              icon={Lock} 
              apiEndpoint="/api/pdf/password/add" 
              onBack={() => setView('home')}
              description="Add a password to secure your PDF"
              fields={[{ name: 'password', label: 'Password', type: 'password', placeholder: 'Enter password' }]}
            />
          )}
          {view === 'watermark' && (
            <PDFTool 
              title="Add Watermark" 
              icon={Stamp} 
              apiEndpoint="/api/pdf/watermark" 
              onBack={() => setView('home')}
              description="Add text watermark to all pages"
              fields={[{ name: 'text', label: 'Watermark Text', type: 'text', placeholder: 'e.g. CONFIDENTIAL', defaultValue: 'CONFIDENTIAL' }]}
            />
          )}
          {view === 'rotate' && (
            <PDFTool 
              title="Rotate PDF" 
              icon={RotateCw} 
              apiEndpoint="/api/pdf/rotate" 
              onBack={() => setView('home')}
              description="Rotate all pages in the PDF"
              fields={[{ name: 'angle', label: 'Rotation Angle', type: 'number', placeholder: '90, 180, or 270', defaultValue: '90' }]}
            />
          )}
          {view === 'delete-pages' && (
            <PDFTool 
              title="Delete Pages" 
              icon={Trash2} 
              apiEndpoint="/api/pdf/split" 
              onBack={() => setView('home')}
              description="Enter pages to KEEP (others will be deleted)"
              fields={[{ name: 'range', label: 'Pages to Keep', type: 'text', placeholder: 'e.g. 1-5, 8' }]}
            />
          )}
          {view === 'extract-pages' && (
            <PDFTool 
              title="Extract Pages" 
              icon={FileIcon} 
              apiEndpoint="/api/pdf/split" 
              onBack={() => setView('home')}
              description="Extract specific pages into a new PDF"
              fields={[{ name: 'range', label: 'Pages to Extract', type: 'text', placeholder: 'e.g. 2, 4-6' }]}
            />
          )}
          {view === 'reorder-pages' && (
            <PDFTool 
              title="Reorder Pages" 
              icon={ArrowUpDown} 
              apiEndpoint="/api/pdf/split" 
              onBack={() => setView('home')}
              description="Enter pages in the new desired order"
              fields={[{ name: 'range', label: 'New Page Order', type: 'text', placeholder: 'e.g. 3, 1, 2, 4' }]}
            />
          )}
          {view === 'remove-password' && (
            <PDFTool 
              title="Unlock PDF" 
              icon={Unlock} 
              apiEndpoint="/api/pdf/password/remove" 
              onBack={() => setView('home')}
              description="Remove password protection from your PDF"
              fields={[{ name: 'password', label: 'Current Password', type: 'password', placeholder: 'Enter current password' }]}
            />
          )}
          {view === 'pdf-to-image' && <PDFToImage onBack={() => setView('home')} />}
          {view === 'edit' && <PDFEditor onBack={() => setView('home')} />}
          {view === 'text-to-pdf' && <TextToPDF onBack={() => setView('home')} />}
          {view === 'settings' && <SettingsView onBack={() => setView('home')} />}
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setView('home')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <HomeIcon className={`w-6 h-6 ${view === 'home' ? 'fill-indigo-50 dark:fill-indigo-900/20' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button 
          onClick={() => setView('viewer')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'viewer' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <FolderOpen className={`w-6 h-6 ${view === 'viewer' ? 'fill-indigo-50 dark:fill-indigo-900/20' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Files</span>
        </button>
        <div className="relative -top-6">
          <button 
            onClick={() => setView('home')}
            className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-300 dark:shadow-none border-4 border-slate-50 dark:border-slate-950 active:scale-90 transition-transform"
          >
            <LayoutGrid className="w-7 h-7 text-white" />
          </button>
        </div>
        <button 
          onClick={() => setView('settings')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <Settings className={`w-6 h-6 ${view === 'settings' ? 'fill-indigo-50 dark:fill-indigo-900/20' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
        </button>
        <button 
          className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"
          onClick={() => {
            if (profile?.photoURL) {
              toast.info(`Logged in as ${profile.displayName}`);
            }
          }}
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="" className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700" />
          ) : (
            <UserIcon className="w-6 h-6" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </button>
      </nav>

      {/* Footer - Desktop Only */}
      <footer className="hidden sm:block bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
            &copy; {new Date().getFullYear()} All In One PDF Maker. A Professional PWA Utility.
          </p>
        </div>
      </footer>
    </div>
  );
}
