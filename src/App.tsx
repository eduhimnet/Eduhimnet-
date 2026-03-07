import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  BookOpen, 
  PenTool, 
  Copy, 
  Trash2, 
  Plus, 
  Bot, 
  Sparkles, 
  FileText, 
  Send, 
  Loader2,
  Check,
  GraduationCap,
  MessageSquare,
  AlignLeft,
  HelpCircle
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { format } from 'date-fns';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('eduhimnet-notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: uuidv4(),
        title: 'Welcome to Eduhimnet',
        content: 'Your personal AI-powered educational assistant.\n\nStart writing your notes here, or ask the AI for help with explaining concepts, summarizing text, or generating study questions.',
        updatedAt: Date.now(),
      }
    ];
  });
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [messages, setMessages] = useState<Message[]>([
    { id: uuidv4(), role: 'model', content: 'Hello! I am your Eduhimnet AI assistant. How can I help you study today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileView, setMobileView] = useState<'notes' | 'editor' | 'ai'>('editor');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('eduhimnet-notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  const createNote = () => {
    const newNote: Note = {
      id: uuidv4(),
      title: 'Untitled Note',
      content: '',
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  };

  const deleteNote = (id: string) => {
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    if (activeNoteId === id) {
      setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
    }
  };

  const handleCopy = () => {
    if (activeNote) {
      navigator.clipboard.writeText(`${activeNote.title}\n\n${activeNote.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendMessage = async (text: string = inputMessage) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: uuidv4(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Build context from active note if available
      let context = '';
      if (activeNote && activeNote.content.trim()) {
        context = `\n\nContext from current note "${activeNote.title}":\n${activeNote.content.substring(0, 2000)}`;
      }

      const prompt = `${text}${context}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are Eduhimnet, an expert educational AI assistant. You help students learn, write notes, summarize texts, and understand complex concepts. Be encouraging, clear, and educational. Format your responses using markdown.",
        }
      });

      const modelMsg: Message = { 
        id: uuidv4(), 
        role: 'model', 
        content: response.text || "I'm sorry, I couldn't generate a response." 
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { id: uuidv4(), role: 'model', content: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (!activeNote || !activeNote.content.trim()) {
      setMessages(prev => [...prev, { 
        id: uuidv4(), 
        role: 'model', 
        content: "Please write some content in your note first so I can help you with it!" 
      }]);
      return;
    }

    let prompt = '';
    switch (action) {
      case 'summarize':
        prompt = "Please summarize the content of my current note.";
        break;
      case 'explain':
        prompt = "Explain the key concepts in my current note as if I'm a beginner.";
        break;
      case 'questions':
        prompt = "Generate 3-5 study questions based on my current note to test my knowledge.";
        break;
      case 'improve':
        prompt = "Review my current note and suggest improvements for clarity and flow.";
        break;
    }
    
    handleSendMessage(prompt);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Notes List */}
        <div className={`${mobileView === 'notes' ? 'flex' : 'hidden'} lg:flex w-full lg:w-64 bg-white border-r border-slate-200 flex-col shrink-0`}>
          <div className="p-4 border-b border-slate-200 flex items-center gap-2 text-indigo-600">
            <GraduationCap className="w-8 h-8" />
            <h1 className="font-bold text-xl tracking-tight">Eduhimnet</h1>
          </div>
        
        <div className="p-4">
          <button 
            onClick={createNote}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.map(note => (
            <div 
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                activeNoteId === note.id ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{note.title || 'Untitled Note'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{format(note.updatedAt, 'MMM d, yyyy')}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center p-4 text-slate-500 text-sm">
              No notes yet. Create one to start studying!
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className={`${mobileView === 'editor' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 bg-white shadow-[0_0_40px_rgba(0,0,0,0.02)] z-10`}>
        {activeNote ? (
          <>
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white">
              <div className="flex items-center gap-2 text-slate-500">
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 flex flex-col">
              <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Note Title"
                  className="block w-full text-4xl font-bold text-slate-900 placeholder-slate-300 border-none focus:outline-none focus:ring-0 bg-transparent mb-6 shrink-0"
                />
                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                  placeholder="Start writing your notes here... The AI can help you summarize, explain, or improve your writing."
                  className="block w-full flex-1 text-lg text-slate-700 placeholder-slate-400 border-none focus:outline-none focus:ring-0 bg-transparent resize-none leading-relaxed"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-16 h-16 mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-500">Select or create a note to start</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - AI Assistant */}
      <div className={`${mobileView === 'ai' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 bg-slate-50 border-l border-slate-200 flex-col shrink-0`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 text-indigo-600 mb-4">
            <Bot className="w-6 h-6" />
            <h2 className="font-semibold text-lg">AI Tutor</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleQuickAction('summarize')}
              className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors border border-slate-200 hover:border-indigo-200"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              Summarize
            </button>
            <button 
              onClick={() => handleQuickAction('explain')}
              className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors border border-slate-200 hover:border-indigo-200"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Explain
            </button>
            <button 
              onClick={() => handleQuickAction('questions')}
              className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors border border-slate-200 hover:border-indigo-200"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Quiz Me
            </button>
            <button 
              onClick={() => handleQuickAction('improve')}
              className="flex items-center gap-2 p-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors border border-slate-200 hover:border-indigo-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Improve
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {msg.role === 'user' ? <PenTool className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm break-words ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 prose-pre:text-slate-800 prose-pre:border prose-pre:border-slate-200">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="text-sm text-slate-500">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask AI anything..."
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400"
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden bg-white border-t border-slate-200 flex justify-around p-2 shrink-0 z-50">
        <button 
          onClick={() => setMobileView('notes')} 
          className={`flex flex-col items-center p-2 w-20 rounded-lg transition-colors ${mobileView === 'notes' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Notes</span>
        </button>
        <button 
          onClick={() => setMobileView('editor')} 
          className={`flex flex-col items-center p-2 w-20 rounded-lg transition-colors ${mobileView === 'editor' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">Editor</span>
        </button>
        <button 
          onClick={() => setMobileView('ai')} 
          className={`flex flex-col items-center p-2 w-20 rounded-lg transition-colors ${mobileView === 'ai' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">AI Tutor</span>
        </button>
      </div>
    </div>
  );
}
