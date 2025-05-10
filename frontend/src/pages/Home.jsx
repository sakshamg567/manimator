import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom'
import { Textarea } from '../components/ui/textarea'
import AnimationIcon from '@mui/icons-material/Animation';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const textareaRef = useRef(null)

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate the new height
    textarea.style.height = 'auto';
    // Set the height to scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleKeyDown = (e) => {
    // Submit on Enter key (but not with Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!inputText.trim() || isSubmitting) return;
    setIsSubmitting(true);

    // Create a timestamp-based chatId for this new conversation
    const chatId = Date.now().toString();
    
    // Encode the prompt for URL safety
    sessionStorage.setItem('pendingPrompt', inputText.trim());
    
    // Navigate to the chat page with the initial prompt and chatId
    navigate(`/chat?chatId=${chatId}`);
  }

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

  return (
    <div className="h-screen min-h-screen w-full bg-[#0F0F10] text-white flex flex-col items-center px-4 pt-72 font-geist">
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 ">
        What can I help you visualize?
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-3xl">
        <div className="relative justify-center">
          <Textarea
            ref={textareaRef}
            className="resize-none max-w-3xl w-full pr-16 overflow-auto max-h-72"
            placeholder="Ask Manimator to visualize..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !inputText.trim()}
            className="absolute right-3 bottom-3 p-2 rounded-md disabled:bg-[#1F1F22] bg-white hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Submit"
          >
            <AnimationIcon className={`${isSubmitting || !inputText.trim()
                ? 'text-white opacity-45'
                : 'text-black'
              }`} />
          </button>
        </div>
      </form>
    </div>
  )
}