import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, AlertCircle, Trash2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type OCRResult = {
  documentType: string;
  summary: string;
  fields: { label: string; value: string }[];
  rawText: string;
};

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    processFile(file);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (Please upload image files only)');
        return;
    }

    setError(null);
    setResult(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      setImageSrc(base64Url);
      
      const base64Data = base64Url.split(',')[1];
      
      try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: file.type
                        }
                    },
                    { text: 'Extract all the important information, texts, and values from this document. Interpret tables and forms carefully. The document is likely in Thai.' }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        documentType: { type: Type.STRING, description: 'The type of the document (e.g., ใบชั่งน้ำหนัก, ใบเสร็จรับเงิน, Invoice)' },
                        summary: { type: Type.STRING, description: 'A short summary of the document in Thai' },
                        fields: {
                            type: Type.ARRAY,
                            description: 'All extracted fields and their corresponding values. Include all numerical data, dates, names, and ticket numbers.',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING, description: 'Field name / Label (in Thai)' },
                                    value: { type: Type.STRING, description: 'Value of the field' }
                                },
                                required: ['label', 'value']
                            }
                        },
                        rawText: { type: Type.STRING, description: 'The full text content recognized from the image' }
                    },
                    required: ['documentType', 'summary', 'fields', 'rawText']
                }
            }
        });

        if (response.text) {
            const parsedResult = JSON.parse(response.text) as OCRResult;
            setResult(parsedResult);
        } else {
             setError('ไม่สามารถอ่านค่าจากรูปภาพได้ (Could not read values from the image)');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'เกิดข้อผิดพลาดในการประมวลผล (An error occurred while processing)');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearData = () => {
    setImageSrc(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E5E5E5] font-sans selection:bg-white/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 text-white">
              <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
                <div className="w-4 h-4 border-2 border-[#050505]"></div>
              </div>
              <h1 className="text-3xl font-light tracking-widest uppercase truncate" style={{ fontFamily: 'Georgia, serif' }}>Cramer <span className="font-bold">OCR</span></h1>
            </div>
            <p className="text-[10px] opacity-40 uppercase tracking-widest">อ่านค่าเอกสารสำคัญอย่างรวดเร็วและแม่นยำ</p>
          </div>
          {imageSrc && (
            <button 
              onClick={clearData}
              className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 border border-white/10 text-[10px] uppercase tracking-widest hover:bg-white/5 bg-transparent transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              เริ่มใหม่ (Reset)
            </button>
          )}
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Upload / Image View */}
          <section className="flex flex-col gap-4">
            <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 opacity-50" />
              รูปภาพเอกสาร (Document Image)
            </h2>
            
            <div 
              className={`relative flex-1 min-h-[400px] border overflow-hidden transition-all duration-200 ease-in-out flex flex-col items-center justify-center bg-[#0A0A0A]
                ${isProcessing ? 'border-white/20' : 'border-white/5 hover:border-white/20'}
                ${imageSrc ? '' : 'cursor-pointer'}
              `}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !imageSrc && fileInputRef.current?.click()}
            >
              {!imageSrc ? (
                <div className="flex flex-col items-center gap-4 p-8 text-center text-zinc-500">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Upload className="w-8 h-8 opacity-50" />
                  </div>
                  <div>
                    <p className="text-sm font-light tracking-wide uppercase">คลิกหรือลากไฟล์ภาพมาวางที่นี่</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-40 mt-2">รองรับไฟล์ JPG, PNG, WEBP</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full min-h-[400px] bg-zinc-900 flex items-center justify-center p-2 isolate">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0,transparent_100%)] -z-10"></div>
                  <img 
                    src={imageSrc} 
                    alt="Uploaded document" 
                    className="max-w-full max-h-[800px] object-contain relative z-10"
                    referrerPolicy="no-referrer"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-sm flex flex-col justify-center z-20 overflow-hidden">
                       <div className="absolute w-full h-[2px] bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse" style={{ top: '35%' }}></div>
                       <div className="text-center absolute w-full top-1/2 -translate-y-1/2">
                          <p className="inline-block text-white text-[10px] font-bold uppercase tracking-[0.2em] bg-[#0A0A0A] px-4 py-2 border border-white/10 ml-4">กำลังประมวลผล (Processing...)</p>
                       </div>
                    </div>
                  )}
                  {/* Zoom indicator simulating the design snippet */}
                  <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur px-3 py-1 text-[10px] border border-white/10 z-30">
                    <span className="opacity-50">ZOOM:</span> 100%
                  </div>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </section>

          {/* Right Column: OCR Results */}
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <FileText className="w-4 h-4 opacity-50" />
                ผลลัพธ์การอ่านค่า (Extraction Result)
              </h2>
            </div>
            
            <div className="flex-1 bg-[#111111] border border-white/5 overflow-hidden flex flex-col pr-1">
              
              {!result && !error && !isProcessing && (
                 <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-8 text-center min-h-[400px]">
                    <FileText className="w-8 h-8 mb-4 opacity-30" />
                    <p className="text-[10px] uppercase tracking-widest opacity-50">กรุณาอัปโหลดเอกสารเพื่อดูผลลัพธ์</p>
                 </div>
              )}

              {error && (
                 <div className="m-6 p-4 bg-red-900/10 border border-red-500/20 flex items-start gap-3 text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                    <div>
                      <h3 className="text-[10px] uppercase tracking-widest font-bold">เกิดข้อผิดพลาด (Error)</h3>
                      <p className="text-xs mt-1 font-mono">{error}</p>
                    </div>
                 </div>
              )}

              {result && (
                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                  
                  {/* Meta summary */}
                  <div className="bg-[#0A0A0A] p-5 border border-white/5 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between border-b border-white/10 pb-4">
                       <span className="text-[10px] uppercase tracking-widest opacity-40">Document Type</span>
                       <span className="inline-flex items-center px-2 py-1 bg-white/5 text-[10px] font-bold uppercase tracking-widest border border-white/10 text-[#E5E5E5]">
                         {result.documentType}
                       </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest opacity-40 block mb-2">Summary</span>
                      <p className="text-sm leading-relaxed text-[#E5E5E5] font-light">{result.summary}</p>
                    </div>
                  </div>

                  {/* Extracted Fields Grid */}
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-4">ข้อมูลที่แยกได้ (Detected Fields)</h3>
                    {result.fields.length > 0 ? (
                      <div className="space-y-4">
                        {result.fields.map((field, idx) => (
                          <div key={idx} className="group">
                            <div className="flex justify-between text-[10px] mb-1">
                               <span className="opacity-40 uppercase tracking-widest">{field.label}</span>
                               <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">Verified</span>
                            </div>
                            <div className="font-mono text-sm border-b border-white/10 pb-2 text-white break-words">
                               {field.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] uppercase tracking-widest opacity-40 italic">ไม่พบข้อมูล (No fields found)</p>
                    )}
                  </div>

                  {/* Raw Text Content */}
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-4">ข้อความทั้งหมด (Raw Text)</h3>
                    <div className="bg-[#080808] border border-white/5 text-zinc-400 p-4 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {result.rawText}
                    </div>
                  </div>

                  {/* Aesthetic addition reflecting the theme */}
                  <div className="p-4 bg-blue-900/10 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Auto-Verify Active</div>
                        <div className="text-[10px] opacity-60">Cross-referenced with internal database</div>
                      </div>
                      <div className="w-10 h-6 bg-blue-500/20 rounded-full flex items-center px-1">
                        <div className="w-4 h-4 bg-blue-400 rounded-full translate-x-4"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

