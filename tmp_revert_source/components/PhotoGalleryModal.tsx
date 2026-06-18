import React, { useState } from 'react';
import { Equipment, Rack } from '../types';
import { X, Camera, ArrowLeft, Maximize2, AlertCircle } from 'lucide-react';
import AIAssistant from './AIAssistant';

interface PhotoGalleryModalProps {
  item: Equipment | Rack;
  onClose: () => void;
  type: 'EQUIPMENT' | 'RACK';
}

// Updated with the specific ImageKit URLs provided by the user.
// These are direct image links ending in .jpeg, so they will render correctly.
const GALLERY_IMAGES = [
  { 
      id: 1,
      url: 'https://ik.imagekit.io/gae3bdoli/001.jpeg', 
      caption: '001.jpeg' 
  },
  { 
      id: 2,
      url: 'https://ik.imagekit.io/gae3bdoli/002.jpeg', 
      caption: '002.jpeg' 
  },
  { 
      id: 3,
      url: 'https://ik.imagekit.io/gae3bdoli/003.jpeg', 
      caption: '003.jpeg' 
  },
  { 
      id: 4,
      url: 'https://ik.imagekit.io/gae3bdoli/004.jpeg', 
      caption: '004.jpeg' 
  }
];

const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ item, onClose, type }) => {
  const title = type === 'EQUIPMENT' ? (item as Equipment).name : (item as Rack).label;
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const currentImage = selectedImageIndex !== null ? GALLERY_IMAGES[selectedImageIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 animate-in fade-in duration-200">
      <div className="bg-white w-[1000px] h-[650px] rounded-lg shadow-2xl flex overflow-hidden ring-1 ring-white/20">
        
        {/* Left Side: Gallery Viewer */}
        <div className="w-3/4 flex flex-col border-r border-slate-200 bg-black relative">
          
          {/* Header Overlay */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start text-white pointer-events-none">
             <div className="flex items-center gap-3 pointer-events-auto">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Camera className="text-white" size={18} />
                </div>
                <div>
                    <h2 className="font-bold text-sm leading-none text-white shadow-black drop-shadow-md">{title}</h2>
                    <span className="text-[11px] text-slate-300 shadow-black drop-shadow-md">
                        Site Inspection Evidence
                    </span>
                </div>
             </div>
             <button onClick={onClose} className="pointer-events-auto text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 backdrop-blur-md transition-all border border-white/10"><X size={20}/></button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-900">
             {selectedImageIndex === null ? (
                 /* Grid View */
                 <div className="w-full h-full p-6 overflow-y-auto pt-20">
                     <div className="grid grid-cols-2 gap-4">
                        {GALLERY_IMAGES.map((img, i) => (
                            <div 
                                key={i} 
                                className="aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative shadow-lg group"
                            >
                                <div 
                                    onClick={() => setSelectedImageIndex(i)}
                                    className="w-full h-full cursor-pointer relative flex items-center justify-center"
                                >
                                    {/* Fallback Text (Visible behind image) */}
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs z-0">
                                        {img.caption}
                                    </div>

                                    <img 
                                        src={img.url} 
                                        alt={img.caption} 
                                        className="w-full h-full object-cover relative z-10 transition-opacity" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-8 text-xs text-white translate-y-2 group-hover:translate-y-0 transition-transform z-20">
                                        <p className="font-medium truncate font-mono">{img.caption}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1.5 rounded-full backdrop-blur-md border border-white/10 z-20">
                                        <Maximize2 size={14} className="text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             ) : (
                 /* Full Screen View */
                 <div className="relative w-full h-full flex items-center justify-center bg-black animate-in fade-in duration-200">
                     {currentImage && (
                        <>
                         <div className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-sm z-0">
                            {currentImage.caption}
                         </div>

                         <img 
                            src={currentImage.url} 
                            alt={currentImage.caption} 
                            className="max-w-full max-h-full object-contain relative z-10"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                         />
                         
                         <button 
                            onClick={() => setSelectedImageIndex(null)}
                            className="absolute top-6 left-6 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 text-sm transition-colors border border-white/10 shadow-lg z-20"
                         >
                            <ArrowLeft size={14} /> Back to Grid
                         </button>

                         <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-20">
                            <div className="bg-black/70 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white/10 shadow-xl text-center max-w-lg">
                                <p className="text-sm font-medium font-mono">{currentImage.caption}</p>
                            </div>
                         </div>
                        </>
                     )}
                 </div>
             )}
          </div>
        </div>

        {/* Right Side: AI Assistant */}
        <div className="w-1/4 bg-slate-50 flex flex-col h-full border-l border-slate-200">
            <div className="flex-1 p-4 h-full flex flex-col">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle size={14} className="text-blue-600 mt-0.5" />
                        <div className="text-[11px] text-blue-800">
                            <span className="font-bold">Image Source:</span> External (ImageKit)
                            <br/>
                            Viewing {selectedImageIndex !== null ? '1' : '4'} of 4 items.
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                     <AIAssistant context={`the photos of ${title}. I am currently looking at ${currentImage ? currentImage.caption : 'the photo gallery overview'}.`} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoGalleryModal;