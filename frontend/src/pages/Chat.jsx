import React, { useRef, useEffect, useState } from 'react';
import { Textarea } from '../components/ui/textarea';
import AnimationIcon from '@mui/icons-material/Animation';
import axios from 'axios';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useLocation, useNavigate } from 'react-router-dom';

// Helper function to parse text and render LaTeX
const renderWithLatex = (text) => {
  if (!text) return null;
  
  // Regular expression to match inline LaTeX: $...$
  const inlineRegex = /\$([^$]+)\$/g;
  
  // Regular expression to match block LaTeX: $$...$$
  const blockRegex = /\$\$([^$]+)\$\$/g;
  
  // Split by block math first
  const blockParts = text.split(blockRegex);
  
  return blockParts.map((part, index) => {
    // Even indices are text (possibly with inline math)
    if (index % 2 === 0) {
      // For text parts, process inline math
      const inlineParts = part.split(inlineRegex);
      
      return (
        <span key={`block-${index}`}>
          {inlineParts.map((inlinePart, inlineIndex) => {
            // Even indices are plain text, odd indices are inline math
            return inlineIndex % 2 === 0 ? (
              <span key={`inline-${inlineIndex}`}>{inlinePart}</span>
            ) : (
              <InlineMath key={`inline-${inlineIndex}`} math={inlinePart} />
            );
          })}
        </span>
      );
    } else {
      // Odd indices are block math
      return <BlockMath key={`block-${index}`} math={part} />;
    }
  });
};

// Custom scrollbar and animation styles
const ScrollbarStyles = () => (
   <style jsx="true">{`
    .styled-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .styled-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }
    .styled-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(100, 100, 255, 0.4);
      border-radius: 4px;
    }
    .styled-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(100, 100, 255, 0.6);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.5s ease-out;
    }
  `}</style>
);

const Chat = () => {
   const textareaRef = useRef(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [videoStatus, setVideoStatus] = useState({
      loading: false,
      url: null,
      status: null,
      logs: []
   });
   const [input, setInput] = useState('');
   const [messages, setMessages] = useState([]);
   const [currentJobId, setCurrentJobId] = useState(null);
   const pollingRef = useRef(null);
   const location = useLocation();
   const navigate = useNavigate();

   // Process URL parameters and load chat history when component mounts
   useEffect(() => {
      const queryParams = new URLSearchParams(location.search);
      const chatId = queryParams.get('id');

      // Get the prompt from sessionStorage instead of URL
      const pendingPrompt = sessionStorage.getItem('pendingPrompt');

      if (!chatId) {
         // No chatId provided - create a new one
         const newChatId = Date.now().toString();
         navigate(`/chat?id=${newChatId}`, { replace: true });

         if (pendingPrompt) {
            handleNewChatWithPrompt(pendingPrompt, newChatId);
         }
      } else {
         // Try to load existing chat from localStorage
         const savedChat = localStorage.getItem(`chat_${chatId}`);

         if (savedChat) {
            // Existing chat - load it
            setMessages(JSON.parse(savedChat));

            // Check if there's a saved job in progress
            const savedJobId = localStorage.getItem(`job_${chatId}`);
            if (savedJobId) {
               resumeJobTracking(savedJobId, chatId);
            }
         } else if (pendingPrompt) {
            // New chat with pending prompt
            handleNewChatWithPrompt(pendingPrompt, chatId);
         }
      }

      // Clear the pending prompt from sessionStorage
      if (pendingPrompt) {
         sessionStorage.removeItem('pendingPrompt');
      }
   }, [location, navigate]);

   // Helper function to handle new chat with prompt
   const handleNewChatWithPrompt = (prompt, chatId) => {
      const initialMessage = {
         role: 'user',
         content: prompt
      };
      setMessages([initialMessage]);
      handleInitialPrompt(initialMessage, chatId);
   };

   // Helper function to resume job tracking
   const resumeJobTracking = (jobId, chatId) => {
      setCurrentJobId(jobId);
      startPolling(jobId);
      setVideoStatus(prev => ({
         ...prev,
         loading: true,
         logs: [...prev.logs, "Resuming video generation tracking..."]
      }));
   };

   // Clean up polling on unmount
   useEffect(() => {
      return () => {
         if (pollingRef.current) {
            clearInterval(pollingRef.current);
         }
      };
   }, []);

   // Save messages to localStorage whenever they change
   useEffect(() => {
      if (messages.length > 0) {
         const queryParams = new URLSearchParams(location.search);
         const chatId = queryParams.get('id');
         if (chatId) {
            localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
         }
      }
   }, [messages, location]);

   // Start polling for job status
   const startPolling = (jobId) => {
      // Clear any existing polling interval
      if (pollingRef.current) {
         clearInterval(pollingRef.current);
      }

      // Set the loading status
      setVideoStatus(prev => ({
         ...prev,
         loading: true,
         logs: [...prev.logs, "Starting video generation..."]
      }));

      // Store the job ID with the chat
      const queryParams = new URLSearchParams(location.search);
      const chatId = queryParams.get('id');
      if (chatId) {
         localStorage.setItem(`job_${chatId}`, jobId);
      }

      // Set the current job ID
      setCurrentJobId(jobId);

      // Start polling
      pollingRef.current = setInterval(() => {
         axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/job/${jobId}/status`)
            .then(response => {
               const { status, video_url } = response.data;

               // Update video status and logs
               setVideoStatus(prev => {
                  // Only add new status to logs if it changed
                  if (prev.status !== status) {
                     return {
                        ...prev,
                        status,
                        logs: [...prev.logs, `Status: ${status}`]
                     };
                  }
                  return { ...prev, status };
               });

               // If the video is done, stop polling and update UI
               if (status === "finished" && video_url) {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                  setVideoStatus(prev => ({
                     loading: false,
                     url: video_url,
                     status: "completed",
                     logs: [...prev.logs, "Video generation complete!"]
                  }));

                  // Clear the job ID from storage
                  if (chatId) {
                     localStorage.removeItem(`job_${chatId}`);
                  }

                  setCurrentJobId(null);
                  setIsSubmitting(false);
               }

               // If there's an error, stop polling and show error
               if (status === "error") {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                  setVideoStatus(prev => ({
                     ...prev,
                     loading: false,
                     status: "error",
                     logs: [...prev.logs, "Error generating video"]
                  }));

                  // Clear the job ID from storage
                  if (chatId) {
                     localStorage.removeItem(`job_${chatId}`);
                  }

                  setCurrentJobId(null);
                  setIsSubmitting(false);
               }
            })
            .catch(error => {
               console.error("Error polling job status:", error);
               setVideoStatus(prev => ({
                  ...prev,
                  logs: [...prev.logs, "Error checking video status"]
               }));
            });
      }, 2000); // Poll every 2 seconds
   };

   // Handle the initial prompt
   const handleInitialPrompt = async (initialMessage, chatId) => {
      setIsSubmitting(true);

      try {
         // Send the initial message to generate API
         const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/generate`, {
            messages: [initialMessage]
         });

         // Add the AI response to messages
         const aiMessage = {
            role: 'assistant',
            content: response.data.llmResponse,
            jobId: response.data.jobId // Store jobId with the message
         };

         const updatedMessages = [initialMessage, aiMessage];
         setMessages(updatedMessages);

         // Save to localStorage
         localStorage.setItem(`chat_${chatId}`, JSON.stringify(updatedMessages));

         // If a job was created, start polling
         if (response.data.jobId) {
            startPolling(response.data.jobId);
         } else {
            setIsSubmitting(false);
         }
      } catch (error) {
         console.error('Error processing initial prompt:', error);
         setIsSubmitting(false);
      }
   };

   const autoResize = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to calculate the new height
      textarea.style.height = 'auto';
      // Set the height to scrollHeight
      textarea.style.height = `${textarea.scrollHeight}px`;
   };

   const handleInputChange = (e) => {
      setInput(e.target.value);
   };

   const handleKeyDown = (e) => {
      // Submit on Enter key (but not with Shift+Enter for new line)
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSubmit(e);
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();

      if (!input.trim() || isSubmitting) return;

      const userMessage = {
         role: 'user',
         content: input.trim()
      };

      // Update UI immediately with the user message
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsSubmitting(true);
      setInput('');

      // Auto-resize the textarea after clearing
      setTimeout(autoResize, 0);

      try {
         // Get chatId from URL
         const queryParams = new URLSearchParams(location.search);
         const chatId = queryParams.get('id');

         // Send the accumulated messages to the backend
         const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/generate`, {
            messages: updatedMessages
         });

         // Add the response to messages
         const aiMessage = {
            role: 'assistant',
            content: response.data.llmResponse,
            jobId: response.data.jobId // Store jobId with the message
         };

         const newMessages = [...updatedMessages, aiMessage];
         setMessages(newMessages);

         // Save to localStorage
         if (chatId) {
            localStorage.setItem(`chat_${chatId}`, JSON.stringify(newMessages));
         }

         // Reset video status for new request
         setVideoStatus({
            loading: false,
            url: null,
            status: null,
            logs: []
         });

         // If a job was created, start polling
         if (response.data.jobId) {
            startPolling(response.data.jobId);
         } else {
            setIsSubmitting(false);
         }
      } catch (error) {
         console.error('Error sending message:', error);
         setIsSubmitting(false);
      }
   };

   // Auto-resize textarea effect
   useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const handleInput = () => {
         autoResize();
      };

      textarea.addEventListener('input', handleInput);
      autoResize();

      return () => {
         textarea.removeEventListener('input', handleInput);
      };
   }, []);

   // Scroll to bottom of chat when messages change
   useEffect(() => {
      const chatContainer = document.querySelector('.overflow-y-auto');
      if (chatContainer) {
         chatContainer.scrollTop = chatContainer.scrollHeight;
      }
   }, [messages]);

   // Render a message with breakdown box if applicable
   const renderMessage = (message, index) => {
      if (message.role === 'user') {
         return (
            <div
               key={index}
               className="mb-4 p-3 rounded-lg break-words text-white text-sm"
            >
               <div className="font-bold mb-1">You</div>
               <div className="whitespace-pre-wrap overflow-wrap-anywhere">
                  {renderWithLatex(message.content)}
               </div>
            </div>
         );
      }

      // For assistant messages, check if there's a breakdown section
      const parts = message.content.split(/```([\s\S]*?)```/);

      if (parts.length >= 3) {
         // Extract the explanation and breakdown
         const explanation = parts[0].trim();
         const breakdown = parts[1].trim();

         return (
            <div
               key={index}
               className="mb-4 p-3 rounded-lg break-words text-white text-sm"
            >
               <div className="font-bold mb-2 flex items-center">
                  Manimorph
               </div>

               {/* Main explanation */}
               <div className="mb-4 leading-relaxed">
               {renderWithLatex(explanation)}
               </div>

               {/* Animated Breakdown Box */}
               <div className="bg-[#121214] border border-[#2A2A2C] rounded-lg p-4 shadow-lg animate-fadeIn">
                  <h3 className="text-sm font-bold mb-2 text-white flex items-center">
                     Animation Steps
                  </h3>

                  {/* Scrollable steps area with gradient fade at bottom */}
                  <div className="relative">
                     <div className="max-h-[180px] overflow-y-auto pr-2 styled-scrollbar">
                        <ol className="space-y-2 ml-1">
                           {breakdown.split('\n')
                              .filter(line => line.trim() && !line.trim().startsWith('#'))
                              .map((step, i) => (
                                 <li key={i} className="flex items-start group pb-1">
                                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center mr-2 mt-0.5 group-hover:bg-white transition-colors text-black">
                                       <span className="text-xs font-medium">{i + 1}</span>
                                    </div>
                                    <span className="text-[#E0E0E0] group-hover:text-white transition-colors">
                                       {renderWithLatex(step.replace(/^\d+\.\s*/, ''))}
                                    </span>
                                 </li>
                              ))
                           }
                        </ol>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none"></div>
                  </div>
               </div>
            </div>
         );
      }

      // No breakdown, just render the regular message
      return (
         <div
            key={index}
            className="mb-4 p-3 rounded-lg break-words text-white text-sm"
         >
            <div className="font-bold mb-1">
               Manimorph
            </div>
            <div className="whitespace-pre-wrap overflow-wrap-anywhere">{message.content}</div>
         </div>
      );
   };

   return (
      <>
         <ScrollbarStyles />
         <div className="h-screen w-full bg-[#0F0F10] text-white grid grid-cols-1 md:grid-cols-[30%_70%] font-geist overflow-hidden">
            {/* Left: Chat column */}
            <div className="flex flex-col justify-between px-4 py-6 border-r border-[#1E1E20] max-w-full overflow-x-hidden">
               <div className="flex-1 overflow-y-auto overflow-x-hidden mb-4 styled-scrollbar">
                  {messages.map((message, index) => renderMessage(message, index))}

                  {isSubmitting && !currentJobId && (
                     <div className="mb-4 p-3 rounded-lg text-white">
                        <div className="font-bold mb-1">
                           Manimorph
                        </div>
                        <div className="animate-pulse flex items-center">
                           <span className="ml-2">Generating response...</span>
                        </div>
                     </div>
                  )}
               </div>

               <div className="w-full">
                  <form onSubmit={handleSubmit} className="w-full">
                     <div className="relative">
                        <Textarea
                           ref={textareaRef}
                           className="resize-none w-full pr-16 overflow-auto max-h-72 bg-[#1A1A1C] px-4 py-3 rounded-md"
                           placeholder={currentJobId ? "Please wait until video generation is complete..." : "Ask Manimorph ..."}
                           value={input}
                           onChange={handleInputChange}
                           onKeyDown={handleKeyDown}
                           disabled={isSubmitting || !!currentJobId}
                        />
                        <button
                           type="submit"
                           disabled={isSubmitting || !input.trim() || !!currentJobId}
                           className="absolute right-3 bottom-3 p-2 rounded-md disabled:bg-[#1F1F22] bg-white hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                           aria-label="Submit"
                        >
                           <AnimationIcon className={`${isSubmitting || !input.trim() || !!currentJobId
                              ? 'text-white opacity-45'
                              : 'text-black'
                              }`} />
                        </button>
                     </div>
                     {currentJobId && (
                        <div className="mt-2 text-xs text-[#AAAAAA]">
                           Input is disabled during video generation
                        </div>
                     )}
                  </form>
               </div>
            </div>

            {/* Right: Video/waiting column */}
            <div className="flex flex-col items-center justify-center px-6 h-full">
               {videoStatus.loading ? (
                  <div className="w-full max-w-2xl">
                     <div className="animate-pulse text-xl mb-6">Generating visualization...</div>

                     {/* Status indicator */}
                     <div className="mb-4">
                        <div className="flex items-center mb-2">
                           <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse mr-2"></div>
                           <div className="font-medium">Current status: {videoStatus.status || "initializing"}</div>
                        </div>
                     </div>

                     {/* Log panel */}
                     <div className="bg-[#121214] border border-[#2A2A2C] rounded-lg p-4 h-[300px] overflow-y-auto styled-scrollbar">
                        <h3 className="text-sm font-medium mb-2 text-gray-300">Generation logs:</h3>
                        <div className="space-y-1 text-xs text-gray-400 font-mono">
                           {videoStatus.logs.map((log, i) => (
                              <div key={i} className="border-l-2 border-[#2A2A2C] pl-2">{log}</div>
                           ))}
                        </div>
                     </div>
                  </div>
               ) : videoStatus.url ? (
                  <div className="w-full flex flex-col items-center">
                     <video
                        src={videoStatus.url}
                        className="w-full max-h-[80vh] rounded-lg"
                        controls
                        autoPlay
                     />
                     <div className="mt-2 text-xs text-[#AAAAAA]">
                        Video generation complete!
                     </div>
                  </div>
               ) : (
                  <div className="text-center opacity-70">
                     <p>Your visualization will appear here</p>
                     <p className="text-xs mt-2 text-[#AAAAAA]">
                        Ask Manimorph to create an animation for you
                     </p>
                  </div>
               )}
            </div>
         </div>
      </>
   );
};

export default Chat;