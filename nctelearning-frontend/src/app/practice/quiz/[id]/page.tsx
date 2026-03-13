'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

type Option = { id: string; optionText: string; orderIndex: number };
type Question = { 
  id: string; 
  questionText: string; 
  orderIndex: number; 
  points: number; 
  questionType?: 'multiple_choice' | 'essay';
  options?: Option[] 
};
type Quiz = { id: string; title: string; description: string; timeLimitMinutes?: number; questions: Question[] };

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function QuizTakePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const quizId = params?.id as string;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showAlreadyCompletedModal, setShowAlreadyCompletedModal] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({}); // questionId -> timeout
  const answerIds = useRef<Record<string, string>>({}); // questionId -> answerId (to track existing answers)
  const [alreadyCompletedMessage, setAlreadyCompletedMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmittedRef = useRef(false);
  const startTimeRef = useRef<Date | null>(null);
  const refreshCheckDoneRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const submitAttempt = useCallback(async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    setSubmitting(true);
    try {
      let currentAttemptId = attemptId;
      
      if (!currentAttemptId) {
        const startRes = await fetch(apiUrl(`/quizzes/${quizId}/start`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ userId: user?.id || '' }),
        });
        if (!startRes.ok) {
          const msg = await startRes.text();
          if (startRes.status === 401) {
            router.push('/auth/login');
            return;
          }
          if (startRes.status === 400 && msg.includes('đã hoàn thành')) {
            setAlreadyCompletedMessage(msg || 'Bạn đã hoàn thành bài tập này rồi. Mỗi học sinh chỉ được làm bài tập một lần.');
            setShowAlreadyCompletedModal(true);
            return;
          }
          alert(msg || 'Không thể bắt đầu bài làm. Vui lòng thử lại.');
          return;
        }
        const started = await startRes.json();
        currentAttemptId = started.id;
        setAttemptId(started.id);
        startTimeRef.current = new Date();
      }

      if (currentAttemptId && quiz) {
        let savedCount = 0;
        let errorCount = 0;
        const savePromises: Promise<void>[] = [];
        
        for (const question of quiz.questions) {
          const answer = answers[question.id];
          
          if (answer) {
            const hasOptions = question.options && question.options.length > 0;
            const isEssay = question.questionType === 'essay' || !hasOptions;
            
            // UUID format: 8-4-4-4-12 hexadecimal characters
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isValidUUID = uuidRegex.test(answer);
            
            const payload = isEssay || !isValidUUID
              ? { questionId: question.id, answerText: answer }
              : { questionId: question.id, selectedOptionId: answer };
            
            const requestBody = JSON.stringify(payload);
            
            const savePromise = fetch(apiUrl(`/quizzes/attempts/${currentAttemptId}/answers`), {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                ...getAuthHeaders() 
              },
              body: requestBody,
            })
            .then(async (answerRes) => {
              if (answerRes.ok) {
                await answerRes.json();
                savedCount++;
              } else {
                const errorMsg = await answerRes.text();
                errorCount++;
                throw new Error(`Failed to save answer: ${errorMsg}`);
              }
            })
            .catch((e) => {
              errorCount++;
              throw e;
            });
            
            savePromises.push(savePromise);
          }
        }
        
        // Wait for all answers to be saved
        try {
          await Promise.all(savePromises);
        } catch (error) {
          // Continue anyway if some answers fail
        }
      }

      // Calculate time spent
      let timeSpentMinutes: number | undefined;
      if (startTimeRef.current) {
        const durationMs = new Date().getTime() - startTimeRef.current.getTime();
        timeSpentMinutes = Math.round(durationMs / 1000 / 60);
      } else if (timeRemaining !== null && quiz?.timeLimitMinutes) {
        // Calculate from remaining time
        timeSpentMinutes = quiz.timeLimitMinutes - Math.ceil(timeRemaining / 60);
      }

      const completeRes = await fetch(apiUrl(`/quizzes/attempts/${currentAttemptId}/complete`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ timeSpentMinutes }),
      });
      
      if (!completeRes.ok) {
        const msg = await completeRes.text();
        if (completeRes.status === 401) {
          router.push('/auth/login');
          return;
        }
        alert(msg || 'Không thể nộp bài.');
        return;
      }

      await completeRes.json();

      setShowSubmittedModal(true);
      // Clear session storage when submitting
      if (typeof window !== 'undefined') {
        const quizSessionKey = `quiz-session-${quizId}`;
        const timeRemainingKey = `quiz-time-${quizId}`;
        const startTimeKey = `quiz-start-time-${quizId}`;
        const answersKey = `quiz-answers-${quizId}`;
        sessionStorage.removeItem(quizSessionKey);
        sessionStorage.removeItem(timeRemainingKey);
        sessionStorage.removeItem(startTimeKey);
        sessionStorage.removeItem(answersKey);
      }
      setTimeout(() => {
        router.push('/practice');
      }, 1500);
    } catch (e) {
      alert('Không thể nộp bài.');
    } finally {
      setSubmitting(false);
    }
  }, [quizId, attemptId, user?.id, router, quiz, answers, timeRemaining]);

  const selectAnswer = async (questionId: string, selectedOptionId: string) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: selectedOptionId };
      // Save answers to sessionStorage
      if (typeof window !== 'undefined' && quizId) {
        const answersKey = `quiz-answers-${quizId}`;
        sessionStorage.setItem(answersKey, JSON.stringify(newAnswers));
      }
      return newAnswers;
    });
    if (!attemptId) {
      return;
    }
    try {
      const url = apiUrl(`/quizzes/attempts/${attemptId}/answers`);
      const payload = { questionId, selectedOptionId };
      
      const ansRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (ansRes.status === 401) {
        router.push('/auth/login');
        return;
      }
    } catch (e) {
      // Silently handle errors
    }
  };

  const updateEssayAnswer = async (questionId: string, answerText: string) => {
    // Update state immediately for UI responsiveness
    setAnswers((prev) => {
      const newAnswers = { ...prev, [questionId]: answerText };
      // Save answers to sessionStorage
      if (typeof window !== 'undefined' && quizId) {
        const answersKey = `quiz-answers-${quizId}`;
        sessionStorage.setItem(answersKey, JSON.stringify(newAnswers));
      }
      return newAnswers;
    });

    if (!attemptId) {
      return;
    }

    // Clear existing debounce timer for this question
    if (debounceTimers.current[questionId]) {
      clearTimeout(debounceTimers.current[questionId]);
    }

    // Set new debounce timer (500ms delay)
    debounceTimers.current[questionId] = setTimeout(async () => {
      try {
        const existingAnswerId = answerIds.current[questionId];
        const url = existingAnswerId 
          ? apiUrl(`/quizzes/attempts/answers/${existingAnswerId}`)
          : apiUrl(`/quizzes/attempts/${attemptId}/answers`);
        
        const method = existingAnswerId ? 'PATCH' : 'POST';
        const payload = existingAnswerId
          ? { answerText }
          : { questionId, answerText };
        
        const ansRes = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        
        if (ansRes.status === 401) {
          router.push('/auth/login');
          return;
        }
        
        if (ansRes.ok) {
          const saved = await ansRes.json();
          // Store answerId for future updates
          if (saved.id && !existingAnswerId) {
            answerIds.current[questionId] = saved.id;
          }
        }
      } catch (e) {
        // Silently handle errors
      }
    }, 500); // 500ms debounce
  };

  // Detect page refresh and show warning popup
  useEffect(() => {
    if (typeof window === 'undefined' || !quizId || refreshCheckDoneRef.current) return;
    
    refreshCheckDoneRef.current = true;
    
    const quizSessionKey = `quiz-session-${quizId}`;
    const existingSession = sessionStorage.getItem(quizSessionKey);
    
    // Check if this is a page refresh using Performance Navigation API
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const navigationType = navigationEntries.length > 0 ? navigationEntries[0].type : null;
    const isRefresh = navigationType === 'reload';
    
    // Only show refresh warning if:
    // 1. This is a refresh (F5, Ctrl+R, or browser refresh button)
    // 2. AND there's an existing session (user was already on this page)
    if (isRefresh && existingSession) {
      setShowRefreshWarning(true);
      setLoading(false); // Stop loading to show the modal
      // Don't proceed with loading quiz until user chooses to continue
      return;
    }
    
    // Mark that we've started a quiz session (first time visit or navigation from another page)
    // Only set if this is NOT a refresh (to allow refresh detection next time)
    if (!existingSession && !isRefresh) {
      sessionStorage.setItem(quizSessionKey, 'active');
    }
  }, [quizId]);

  // Show confirmation modal when quiz is loaded (first time visit, not refresh)
  useEffect(() => {
    if (!quiz || loading || showRefreshWarning) return;
    
    const quizSessionKey = `quiz-session-${quizId}`;
    const existingSession = sessionStorage.getItem(quizSessionKey);
    const confirmationShownKey = `quiz-confirmation-${quizId}`;
    const confirmationShown = sessionStorage.getItem(confirmationShownKey);
    
    // Check if this is a refresh
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const navigationType = navigationEntries.length > 0 ? navigationEntries[0].type : null;
    const isRefresh = navigationType === 'reload';
    
    // Show confirmation modal only if:
    // 1. Not a refresh
    // 2. Has session (first time visit)
    // 3. Confirmation hasn't been shown yet
    // 4. Quiz has time limit
    if (!isRefresh && existingSession && !confirmationShown && quiz.timeLimitMinutes) {
      setShowConfirmationModal(true);
    }
  }, [quiz, loading, showRefreshWarning, quizId]);
  
  // Handle refresh warning actions
  const handleStayOnPage = async () => {
    setShowRefreshWarning(false);
    
    // Keep the session so user can continue
    const quizSessionKey = `quiz-session-${quizId}`;
    const timeRemainingKey = `quiz-time-${quizId}`;
    const startTimeKey = `quiz-start-time-${quizId}`;
    const answersKey = `quiz-answers-${quizId}`;
    
    sessionStorage.setItem(quizSessionKey, 'active');
    
    // Restore time remaining if it was saved (DO NOT reset on refresh)
    const savedTime = sessionStorage.getItem(timeRemainingKey);
    if (savedTime) {
      const time = parseInt(savedTime, 10);
      if (time > 0) {
        setTimeRemaining(time);
      }
    }
    
    // Restore start time if it was saved
    const savedStartTime = sessionStorage.getItem(startTimeKey);
    if (savedStartTime) {
      startTimeRef.current = new Date(savedStartTime);
    }
    
    // Restore answers if they were saved
    const savedAnswers = sessionStorage.getItem(answersKey);
    if (savedAnswers) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
      } catch (e) {
      }
    }
    
    // Load quiz and start attempt if not already loaded
    if (!quiz || !attemptId) {
      try {
        setLoading(true);
        const res = await fetch(apiUrl(`/quizzes/${quizId}`));
        const data = await res.json();
        setQuiz(data);
        
        // Start attempt (will return existing in-progress attempt if exists)
        const startRes = await fetch(apiUrl(`/quizzes/${quizId}/start`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ userId: user?.id || '' }),
        });
        
        if (startRes.ok) {
          const started = await startRes.json();
          setAttemptId(started.id);
          
          const savedStartTime = sessionStorage.getItem(startTimeKey);
          if (!savedStartTime) {
            const startTime = new Date();
            startTimeRef.current = startTime;
            sessionStorage.setItem(startTimeKey, startTime.toISOString());
          }
          
          const savedTime = sessionStorage.getItem(timeRemainingKey);
          if (!savedTime && data.timeLimitMinutes) {
            setTimeRemaining(data.timeLimitMinutes * 60);
          }
        } else if (startRes.status === 401) {
          router.push('/auth/login');
          return;
        } else {
          const errorMsg = await startRes.text();
          setAlreadyCompletedMessage(errorMsg || 'Bạn đã hoàn thành bài tập này rồi. Mỗi học sinh chỉ được làm bài tập một lần.');
          setShowAlreadyCompletedModal(true);
          return;
        }
      } catch (e) {
        console.error('Error loading quiz:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle confirmation modal - Start quiz
  const handleStartQuiz = async () => {
    setShowConfirmationModal(false);
    
    // Mark confirmation as shown
    const confirmationShownKey = `quiz-confirmation-${quizId}`;
    sessionStorage.setItem(confirmationShownKey, 'true');
    
    const startTimeKey = `quiz-start-time-${quizId}`;
    const timeRemainingKey = `quiz-time-${quizId}`;
    
    // Initialize timer and start time
    if (quiz && quiz.timeLimitMinutes) {
      const startTime = new Date();
      startTimeRef.current = startTime;
      sessionStorage.setItem(startTimeKey, startTime.toISOString());
      setTimeRemaining(quiz.timeLimitMinutes * 60);
    }
    
    // Ensure attempt is started
    if (!attemptId && quiz) {
      try {
        const startRes = await fetch(apiUrl(`/quizzes/${quizId}/start`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ userId: user?.id || '' }),
        });
        
        if (startRes.ok) {
          const started = await startRes.json();
          setAttemptId(started.id);
        } else if (startRes.status === 401) {
          router.push('/auth/login');
          return;
        } else {
          const errorMsg = await startRes.text();
          setAlreadyCompletedMessage(errorMsg || 'Bạn đã hoàn thành bài tập này rồi. Mỗi học sinh chỉ được làm bài tập một lần.');
          setShowAlreadyCompletedModal(true);
          return;
        }
      } catch (e) {
        console.error('Error starting quiz:', e);
      }
    }
  };

  // Handle confirmation modal - Go back
  const handleGoBackFromConfirmation = () => {
    setShowConfirmationModal(false);
    const quizSessionKey = `quiz-session-${quizId}`;
    sessionStorage.removeItem(quizSessionKey);
    router.back();
  };
  
  const handleGoBack = () => {
    setShowRefreshWarning(false);
    const quizSessionKey = `quiz-session-${quizId}`;
    const timeRemainingKey = `quiz-time-${quizId}`;
    const startTimeKey = `quiz-start-time-${quizId}`;
    const answersKey = `quiz-answers-${quizId}`;
    sessionStorage.removeItem(quizSessionKey);
    sessionStorage.removeItem(timeRemainingKey);
    sessionStorage.removeItem(startTimeKey);
    sessionStorage.removeItem(answersKey);
    router.replace('/practice');
  };
  
  // Clear session when pathname changes (user navigated away normally)
  useEffect(() => {
    if (typeof window === 'undefined' || !quizId) return;
    
    const quizSessionKey = `quiz-session-${quizId}`;
    const timeRemainingKey = `quiz-time-${quizId}`;
    const startTimeKey = `quiz-start-time-${quizId}`;
    const answersKey = `quiz-answers-${quizId}`;
    
    // If we're no longer on the quiz page, clear all session data
    if (!pathname?.includes(`/practice/quiz/${quizId}`)) {
      sessionStorage.removeItem(quizSessionKey);
      sessionStorage.removeItem(timeRemainingKey);
      sessionStorage.removeItem(startTimeKey);
      sessionStorage.removeItem(answersKey);
    }
  }, [pathname, quizId]);

  useEffect(() => {
    if (!quizId) return;
    
    // Wait for auth check to complete
    if (authLoading) return;
    
    // If not authenticated, send to login
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    // If refresh warning is showing, don't load quiz yet (wait for user to choose)
    if (showRefreshWarning) {
      return;
    }
    
    // Restore answers from sessionStorage if available (only for first load, not refresh)
    if (typeof window !== 'undefined') {
      const quizSessionKey = `quiz-session-${quizId}`;
      const existingSession = sessionStorage.getItem(quizSessionKey);
      if (!existingSession) {
        // Only restore answers if this is first time visit (no session)
        const answersKey = `quiz-answers-${quizId}`;
        const savedAnswers = sessionStorage.getItem(answersKey);
        if (savedAnswers) {
          try {
            const parsedAnswers = JSON.parse(savedAnswers);
            setAnswers(parsedAnswers);
          } catch (e) {
          }
        }
      }
    }
    
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(apiUrl(`/quizzes/${quizId}`));
        const data = await res.json();
        setQuiz(data);
        const startRes = await fetch(apiUrl(`/quizzes/${quizId}/start`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ userId: user?.id || '' }),
        });
        if (startRes.ok) {
          const started = await startRes.json();
          setAttemptId(started.id);
          const startTime = new Date();
          startTimeRef.current = startTime;
          
          // Only reset timer if this is a NEW attempt (first time visit, no session)
          if (typeof window !== 'undefined') {
            const quizSessionKey = `quiz-session-${quizId}`;
            const existingSession = sessionStorage.getItem(quizSessionKey);
            const startTimeKey = `quiz-start-time-${quizId}`;
            
            if (!existingSession) {
              // First time visit - save new start time and initialize timer
              sessionStorage.setItem(startTimeKey, startTime.toISOString());
              
              // Initialize timer with full time limit when starting new attempt
              if (data.timeLimitMinutes) {
                setTimeRemaining(data.timeLimitMinutes * 60);
              }
            } else {
              // Session exists - restore time from sessionStorage (should not happen here, but just in case)
              const timeRemainingKey = `quiz-time-${quizId}`;
              const savedTime = sessionStorage.getItem(timeRemainingKey);
              if (savedTime) {
                const time = parseInt(savedTime, 10);
                if (time > 0) {
                  setTimeRemaining(time);
                } else if (data.timeLimitMinutes) {
                  setTimeRemaining(data.timeLimitMinutes * 60);
                }
              } else if (data.timeLimitMinutes) {
                setTimeRemaining(data.timeLimitMinutes * 60);
              }
            }
          }
        } else if (startRes.status === 401) {
          router.push('/auth/login');
          return;
        } else {
          // Handle other errors (e.g., user already completed the quiz)
          const errorMsg = await startRes.text();
          setAlreadyCompletedMessage(errorMsg || 'Bạn đã hoàn thành bài tập này rồi. Mỗi học sinh chỉ được làm bài tập một lần.');
          setShowAlreadyCompletedModal(true);
          return;
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, isAuthenticated, authLoading, user?.id, router, showRefreshWarning]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || submitting || hasAutoSubmittedRef.current) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        const newTime = prev - 1;
        // Save time remaining to sessionStorage every second
        if (typeof window !== 'undefined' && quizId) {
          const timeRemainingKey = `quiz-time-${quizId}`;
          sessionStorage.setItem(timeRemainingKey, newTime.toString());
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timeRemaining, submitting, quizId]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining === 0 && !submitting && !hasAutoSubmittedRef.current && attemptId) {
      hasAutoSubmittedRef.current = true;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      submitAttempt();
    }
  }, [timeRemaining, submitting, attemptId, submitAttempt]);

  // Show loading only if not showing refresh warning
  if ((loading || !quiz) && !showRefreshWarning) {
    return (
      <div className="bg-nc-cream min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={`bg-nc-cream min-h-screen py-8 ${showSubmittedModal || showRefreshWarning || showConfirmationModal || showAlreadyCompletedModal ? 'overflow-hidden' : ''}`}>
      {/* Timer - Sticky ở góc trên bên trái, dưới navbar khi scroll lên trên cùng */}
      {timeRemaining !== null && (
        <div className="fixed top-24 md:top-36 left-4 z-40 bg-white border-2 border-nc-gold rounded-lg shadow-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-nc-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`text-lg font-bold ${timeRemaining <= 60 ? 'text-red-600' : 'text-nc-dark-orange'}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      )}
      
      {quiz && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="card">
            <h1 className="text-2xl font-bold text-nc-dark-orange mb-2">{quiz.title}</h1>
            <p className="text-gray-700 whitespace-pre-wrap">{quiz.description}</p>
          </div>

          <div className="space-y-4">
            {quiz.questions
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((q, idx) => {
              const isEssay = q.questionType === 'essay' || !q.options || q.options.length === 0;
              return (
                <div key={q.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">Câu {idx + 1}</div>
                      <div className="font-medium mb-3">{q.questionText}</div>
                    </div>
                  </div>
                  {isEssay ? (
                    <div>
                      <textarea
                        className="input min-h-[200px] w-full"
                        value={answers[q.id] || ''}
                        onChange={(e) => updateEssayAnswer(q.id, e.target.value)}
                        placeholder="Nhập câu trả lời của bạn..."
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options
                        ?.slice()
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((opt) => (
                          <label key={opt.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${answers[q.id] === opt.id ? 'border-nc-gold bg-yellow-50' : 'border-gray-200'}`}>
                            <input
                              type="radio"
                              name={q.id}
                              checked={answers[q.id] === opt.id}
                              onChange={() => selectAnswer(q.id, opt.id)}
                            />
                            <span>{opt.optionText}</span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={submitAttempt} disabled={submitting}>
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          </div>
        </div>
      )}

      {showSubmittedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-lg shadow-xl px-8 py-10 w-96 text-center animate-scaleIn">
            {/* Spinning circle with checkmark */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Spinning circle */}
              <svg 
                className="absolute animate-spin" 
                width="80" 
                height="80" 
                viewBox="0 0 80 80"
                style={{ animationDuration: '1.5s' }}
              >
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="220"
                  strokeDashoffset="55"
                  strokeLinecap="round"
                />
              </svg>
              {/* Green checkmark */}
              <svg 
                className="relative z-10 animate-fadeIn" 
                width="50" 
                height="50" 
                viewBox="0 0 24 24" 
                fill="none"
              >
                <circle cx="12" cy="12" r="10" fill="#10b981" />
                <path
                  d="M8 12l2 2 4-4"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {/* Text */}
            <div className="text-xl font-semibold text-gray-800">
              Bài làm đã được gửi
            </div>
          </div>
        </div>
      )}

      {/* Refresh Warning Modal */}
      {showRefreshWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-lg shadow-xl px-8 py-10 w-96 text-center animate-scaleIn">
            <div className="flex items-center justify-center mb-6">
              <svg 
                className="w-16 h-16 text-orange-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800 mb-4">
              Bài làm chưa hoàn thành có thể sẽ không được lưu
            </div>
            <div className="text-gray-600 mb-6">
              Bạn có muốn tiếp tục làm bài không?
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleGoBack}
                className="btn-secondary px-6 py-2"
              >
                Quay lại
              </button>
              <button
                onClick={handleStayOnPage}
                className="btn-primary px-6 py-2"
              >
                Tiếp tục làm bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - First time visit */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-lg shadow-xl px-8 py-10 w-96 text-center animate-scaleIn">
            <div className="flex items-center justify-center mb-6">
              <svg 
                className="w-16 h-16 text-nc-gold" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800 mb-4">
              {quiz?.timeLimitMinutes 
                ? `Bài làm có ${quiz.timeLimitMinutes} phút làm bài`
                : 'Bài làm không giới hạn thời gian'}
            </div>
            <div className="text-gray-600 mb-6">
              Vui lòng hoàn thành và nộp bài đúng giờ
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleGoBackFromConfirmation}
                className="btn-secondary px-6 py-2"
              >
                Quay lại
              </button>
              <button
                onClick={handleStartQuiz}
                className="btn-primary px-6 py-2"
              >
                Bắt đầu làm bài
              </button>
            </div>
          </div>
        </div>
      )}

      {showAlreadyCompletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-lg shadow-xl px-8 py-10 w-96 text-center animate-scaleIn">
            {/* Warning icon */}
            <div className="flex items-center justify-center mb-6">
              <svg 
                className="w-16 h-16 text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            {/* Warning text */}
            <div className="text-xl font-semibold text-gray-800 mb-4">
              Không thể làm lại bài tập
            </div>
            <div className="text-gray-600 mb-6">
              Bạn chỉ có thể làm 1 bài tập 1 lần
            </div>
            {/* Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowAlreadyCompletedModal(false);
                  router.push('/practice');
                }}
                className="btn-primary px-6 py-2"
              >
                Quay về danh sách bài tập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


