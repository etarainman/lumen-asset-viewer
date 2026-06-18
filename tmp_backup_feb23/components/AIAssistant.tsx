
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Bot, User } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

interface AIAssistantProps {
  context: string; // Context about the equipment/rack being discussed
}

const AIAssistant: React.FC<AIAssistantProps> = ({ context }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: `Hello! I can help you with details about ${context}. Ask me anything.` }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const responseText = generateResponse(inputText, context);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: responseText }]);
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (query: string, ctx: string): string => {
    const q = query.toLowerCase();
    if (q.includes('power')) return `The power specification for this ${ctx} is -48V DC based on standard telecom configurations.`;
    if (q.includes('rack') || q.includes('location')) return `This unit is currently installed in the designated rack within the main data hall.`;
    if (q.includes('install') || q.includes('date')) return `Installation records indicate this was commissioned in Q3 2023.`;
    if (q.includes('status')) return `The 4D status is currently set based on the design phase you are viewing.`;
    return `I've noted your query about "${query}". Based on the datasheet for ${ctx}, this equipment is compliant with current site standards.`;
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      // Simulate voice input
      setTimeout(() => {
        setInputText("What is the power consumption for this unit?");
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-2">
        <Bot size={16} className="text-blue-600" />
        <span className="text-xs font-semibold text-slate-700">Site AI Assistant</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-300' : 'bg-blue-100 text-blue-600'}`}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
            </div>
            <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
             <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"><Bot size={12} className="text-blue-600"/></div>
             <div className="bg-white border border-slate-200 p-2 rounded-lg text-xs text-slate-400 italic">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleListening}
            className={`p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-slate-100 text-slate-500'}`}
            title="Voice Dictation"
          >
            <Mic size={16} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Ask a question..."}
            className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
