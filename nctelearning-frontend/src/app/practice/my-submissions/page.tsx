'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { 
  ClockIcon, 
  AcademicCapIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  XMarkIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { apiUrl, withAuthHeaders } from '@/lib/api';
import Link from 'next/link';

type QuizAttempt = {
  id: string;
  score: number;
  totalPoints: number;
  startedAt: string;
  completedAt: string | null;
  timeSpentMinutes: number | null;
  isFullyGraded?: boolean;
  quiz: {
    id: string;
    title: string;
    practiceType?: 'doc_hieu' | 'viet' | null;
  };
  answers?: Array<{
    id: string;
    questionId: string;
    pointsEarned: number | null;
  }>;
};

type EssaySubmission = {
  id: string;
  content: string;
  wordCount: number | null;
  timeSpentMinutes: number | null;
  submittedAt: string;
  gradedAt: string | null;
  grade: number | null;
  feedback: string | null;
  exercise: {
    id: string;
    title: string;
    practiceType?: 'doc_hieu' | 'viet' | null;
  };
};

type DetailedQuizAttempt = {
  id: string;
  score: number;
  totalPoints: number;
  startedAt: string;
  completedAt: string | null;
  timeSpentMinutes: number | null;
  quiz: {
    id: string;
    title: string;
    description?: string | null;
      questions: Array<{
        id: string;
        questionText: string;
        questionType: string;
        points: number;
        orderIndex?: number;
        options: Array<{
          id: string;
          optionText: string;
          isCorrect: boolean;
        }>;
      }>;
  };
  answers: Array<{
    id: string;
    questionId: string;
    selectedOptionId: string | null;
    answerText: string | null;
    isCorrect: boolean | null;
    pointsEarned: number;
    feedback?: string | null;
    selectedOption?: {
      id: string;
      optionText: string;
    };
  }>;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}ph`;
  }
  return `${mins}ph`;
}

export default function MySubmissionsPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [essaySubmissions, setEssaySubmissions] = useState<EssaySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<DetailedQuizAttempt | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showDescription, setShowDescription] = useState(true);

  // Handle redirect separately
  useEffect(() => {
    if (shouldRedirect) {
      console.log('Redirecting to login due to authentication failure');
      logout();
      // Use replace instead of push to avoid back button issues
      router.replace('/auth/login');
    }
  }, [shouldRedirect, logout, router]);

  useEffect(() => {
    // Wait for auth to finish loading completely
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }
    
    // Check if token exists in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    console.log('Auth check:', { 
      hasToken: !!token, 
      isAuthenticated, 
      authLoading,
      user: user ? `${user.firstName} ${user.lastName}` : 'null'
    });
    
    // If no token and not authenticated, redirect to login
    if (!token && !isAuthenticated) {
      console.log('No token and not authenticated, will redirect');
      setShouldRedirect(true);
      return;
    }

    // If we have a token (regardless of isAuthenticated state), try to load data
    // The API will handle authentication and return 401/403 if token is invalid
    // This handles cases where checkAuth is still running or failed silently
    if (token && !hasLoaded) {
      console.log('Token exists, loading data...');
      setHasLoaded(true);
      loadData();
      return;
    }

    // If authenticated but no token (shouldn't happen, but handle it)
    if (isAuthenticated && !hasLoaded) {
      console.log('Authenticated but no token, loading data anyway...');
      setHasLoaded(true);
      loadData();
    }
  }, [isAuthenticated, authLoading, user, hasLoaded]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get token to verify it exists
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        // No token at all - trigger redirect (don't logout here, let useEffect handle it)
        setShouldRedirect(true);
        return;
      }

      const headers = withAuthHeaders({
        'Content-Type': 'application/json',
      });

      console.log('Loading submissions data with token:', token ? 'Token exists' : 'No token');

      const [quizRes, essayRes] = await Promise.all([
        fetch(apiUrl('/quizzes/my/attempts'), {
          headers,
        }),
        fetch(apiUrl('/essay-exercises/my/submissions'), {
          headers,
        }),
      ]);
      
      console.log('Quiz API response status:', quizRes.status);
      console.log('Essay API response status:', essayRes.status);
      
      // Check both responses for auth errors
      const quizAuthError = !quizRes.ok && (quizRes.status === 401 || quizRes.status === 403);
      const essayAuthError = !essayRes.ok && (essayRes.status === 401 || essayRes.status === 403);
      
      // Only logout if BOTH APIs return auth errors (meaning token is definitely invalid)
      // If only one fails, it might be a backend issue, not an auth issue
      if (quizAuthError && essayAuthError) {
        console.log('Both APIs returned auth errors, token is invalid, will redirect');
        setShouldRedirect(true);
        return;
      }
      
      // If only quiz API fails with auth error but essay succeeds, it's likely a backend issue
      // Don't logout, just show error for quiz data
      if (quizAuthError && !essayAuthError) {
        console.log('Quiz API returned auth error but essay API succeeded - likely backend issue, not logging out');
        setError('Không thể tải danh sách bài trắc nghiệm. Vui lòng thử lại sau.');
        // Still try to load essay data
      }
      
      // Handle quiz API errors (non-auth)
      if (!quizRes.ok && !quizAuthError) {
        const errorText = await quizRes.text();
        let errorMessage = 'Không thể tải danh sách bài làm';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        setError(errorMessage);
      }

      // Load quiz data if successful
      if (quizRes.ok) {
        const quizData: QuizAttempt[] = await quizRes.json();
        
        // Debug: Log raw response structure
        console.log('=== RAW API RESPONSE ===');
        console.log('Response type:', Array.isArray(quizData) ? 'Array' : typeof quizData);
        if (quizData.length > 0) {
          console.log('First attempt keys:', Object.keys(quizData[0]));
          console.log('First attempt has answers?', 'answers' in quizData[0]);
          console.log('First attempt answers value:', quizData[0].answers);
          console.log('First attempt answers type:', typeof quizData[0].answers);
        }
        console.log('========================');
        
        setAttempts(Array.isArray(quizData) ? quizData : []);
        
        // Console log dữ liệu điểm nhận được từ backend
        console.log('=== DỮ LIỆU ĐIỂM TỪ BACKEND ===');
        console.log('Tổng số bài làm:', quizData.length);
        quizData.forEach((attempt, index) => {
          if (attempt.completedAt) {
            console.log(`\n[Bài ${index + 1}]`);
            console.log('  - Tên bài:', attempt.quiz.title);
            console.log('  - ID:', attempt.id);
            console.log('  - Điểm số:', attempt.score);
            console.log('  - Tổng điểm:', attempt.totalPoints);
            console.log('  - isFullyGraded:', attempt.isFullyGraded);
            console.log('  - completedAt:', attempt.completedAt);
            console.log('  - answers property exists?', 'answers' in attempt);
            console.log('  - answers value:', attempt.answers);
            console.log('  - Số câu trả lời:', attempt.answers?.length || 0);
            if (attempt.answers && attempt.answers.length > 0) {
              console.log('  - Chi tiết điểm từng câu:');
              attempt.answers.forEach((answer: { id: string; questionId: string; pointsEarned: number | null }, idx: number) => {
                console.log(`    Câu ${idx + 1}: pointsEarned = ${answer.pointsEarned ?? 'null/undefined'}`);
              });
              // Kiểm tra xem có answer nào đã được chấm chưa
              const hasGradedAnswers = attempt.answers.some(
                (a: { pointsEarned: number | null }) => a.pointsEarned !== null && a.pointsEarned !== undefined
              );
              console.log('  - Có answer đã được chấm?', hasGradedAnswers);
            } else {
              console.log('  - ⚠️ KHÔNG CÓ CÂU TRẢ LỜI (answers is', attempt.answers === undefined ? 'undefined' : attempt.answers === null ? 'null' : 'empty array', ')');
            }
            // Debug logic hiển thị điểm
            const isGraded = attempt.isFullyGraded !== false;
            const hasGradedAnswers = attempt.answers?.some(
              (a: { pointsEarned: number | null }) => a.pointsEarned !== null && a.pointsEarned !== undefined
            ) || false;
            const hasScore = attempt.score > 0 || isGraded || hasGradedAnswers;
            console.log('  - Logic hiển thị:');
            console.log('    * score > 0?', attempt.score > 0);
            console.log('    * isGraded?', isGraded);
            console.log('    * hasGradedAnswers?', hasGradedAnswers);
            console.log('    * => hasScore?', hasScore);
          }
        });
        console.log('\n================================');
      } else {
        // If quiz API failed but not due to auth, set empty array
        setAttempts([]);
      }

      // Load essay data if successful
      if (essayRes.ok) {
        const essayData: EssaySubmission[] = await essayRes.json();
        setEssaySubmissions(Array.isArray(essayData) ? essayData : []);
      } else if (!essayAuthError) {
        // If essay API failed but not due to auth, set empty array
        setEssaySubmissions([]);
      }
    } catch (err) {
      // Don't set error if we're redirecting due to auth failure
      if (err instanceof Error && err.message.includes('login')) {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách bài làm';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadAttemptDetail = async (attemptId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(apiUrl(`/quizzes/my/attempts/${attemptId}`), {
        headers: withAuthHeaders(),
      });
      
      if (res.ok) {
        const data: DetailedQuizAttempt = await res.json();
        // Debug: Log dữ liệu nhận được
        console.log('=== CHI TIẾT BÀI LÀM ===');
        console.log('Questions:', data.quiz.questions.map((q, i) => ({ index: i + 1, id: q.id, text: q.questionText.substring(0, 50) })));
        console.log('Answers:', data.answers.map((a, i) => ({ index: i + 1, id: a.id, questionId: a.questionId, feedback: a.feedback || 'null' })));
        console.log('========================');
        setSelectedAttempt(data);
        setShowDescription(true); // Reset về hiển thị khi mở modal mới
      } else {
        setError('Không thể tải chi tiết bài làm');
      }
    } catch (err) {
      setError('Không thể tải chi tiết bài làm');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedAttempt(null);
    setShowDescription(true); // Reset về hiển thị khi đóng modal
  };

  if (loading || authLoading) {
    return (
      <div className="bg-nc-cream min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Đang tải...</div>
        </div>
      </div>
    );
  }

  const completedAttempts = attempts.filter(a => a.completedAt !== null);
  const gradedEssays = essaySubmissions.filter(e => e.gradedAt !== null);
  const ungradedEssays = essaySubmissions.filter(e => e.gradedAt === null);

  const getPercentage = (score: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-nc-cream min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-nc-dark-orange mb-4">
              Kiểm tra điểm
            </h1>
            <p className="text-lg text-gray-600">
              Xem kết quả các bài luyện tập bạn đã hoàn thành
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Làm mới danh sách"
          >
            <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm text-gray-700">Làm mới</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {completedAttempts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <CheckCircleIcon className="h-6 w-6 mr-2 text-green-600" />
              Bài đọc hiểu đã hoàn thành ({completedAttempts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedAttempts.map((attempt) => {
                const percentage = getPercentage(attempt.score, attempt.totalPoints);
                const isGraded = attempt.isFullyGraded !== false;
                // Kiểm tra xem có answer nào đã được chấm chưa (pointsEarned đã được set)
                const hasGradedAnswers = attempt.answers?.some(
                  (answer) => answer.pointsEarned !== null && answer.pointsEarned !== undefined
                ) || false;
                // Luôn hiển thị điểm nếu bài đã hoàn thành (completedAt !== null)
                // Kể cả khi điểm = 0, vì đây là bài đã hoàn thành
                const hasScore = attempt.completedAt !== null;
                
                return (
                  <div
                    key={attempt.id}
                    className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all hover:shadow-lg cursor-pointer ${
                      isGraded 
                        ? 'border-gray-200' 
                        : 'border-gray-300 bg-gray-50'
                    }`}
                    onClick={() => isGraded && loadAttemptDetail(attempt.id)}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-800 flex-1">
                          {attempt.quiz.title}
                        </h3>
                        {isGraded && (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-nc-gold transition-colors" />
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        <div>Hoàn thành: {formatDate(attempt.completedAt!)}</div>
                        {attempt.timeSpentMinutes && (
                          <div className="flex items-center mt-1">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatDuration(attempt.timeSpentMinutes)}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        {hasScore ? (
                          <div className={`inline-flex items-center justify-center px-4 py-3 rounded-lg border-2 ${
                            percentage >= 80 
                              ? 'border-green-500 bg-green-50' 
                              : percentage >= 60 
                              ? 'border-yellow-500 bg-yellow-50' 
                              : 'border-red-500 bg-red-50'
                          }`}>
                            <AcademicCapIcon className={`h-5 w-5 mr-2 ${
                              percentage >= 80 
                                ? 'text-green-600' 
                                : percentage >= 60 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                            }`} />
                            <div>
                              <div className={`text-xl font-bold ${
                                percentage >= 80 
                                  ? 'text-green-700' 
                                  : percentage >= 60 
                                  ? 'text-yellow-700' 
                                  : 'text-red-700'
                              }`}>
                                {attempt.score}
                              </div>
                              <div className={`text-xs font-medium ${
                                percentage >= 80 
                                  ? 'text-green-600' 
                                  : percentage >= 60 
                                  ? 'text-yellow-600' 
                                  : 'text-red-600'
                              }`}>
                                {percentage}%
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center px-4 py-3 rounded-lg border-2 border-gray-400 bg-gray-100 w-full">
                            <div className="text-center">
                              <div className="text-gray-600 font-semibold text-sm">
                                Chưa có điểm
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                Đang chờ giáo viên chấm
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {essaySubmissions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
              Bài tập viết ({essaySubmissions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {essaySubmissions.map((submission) => {
                const isGraded = submission.gradedAt !== null;
                const grade = submission.grade ?? 0;
                
                return (
                  <div
                    key={submission.id}
                    className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all hover:shadow-lg ${
                      isGraded 
                        ? 'border-gray-200' 
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex-1">
                        {submission.exercise.title}
                      </h3>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        <div>Nộp bài: {formatDate(submission.submittedAt)}</div>
                        {submission.timeSpentMinutes && (
                          <div className="flex items-center mt-1">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatDuration(submission.timeSpentMinutes)}
                          </div>
                        )}
                        {submission.wordCount && (
                          <div className="mt-1">
                            Số từ: {submission.wordCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        {isGraded ? (
                          <div className={`inline-flex items-center justify-center px-4 py-3 rounded-lg border-2 ${
                            grade >= 80 
                              ? 'border-green-500 bg-green-50' 
                              : grade >= 60 
                              ? 'border-yellow-500 bg-yellow-50' 
                              : 'border-red-500 bg-red-50'
                          }`}>
                            <AcademicCapIcon className={`h-5 w-5 mr-2 ${
                              grade >= 80 
                                ? 'text-green-600' 
                                : grade >= 60 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                            }`} />
                            <div>
                              <div className={`text-xl font-bold ${
                                grade >= 80 
                                  ? 'text-green-700' 
                                  : grade >= 60 
                                  ? 'text-yellow-700' 
                                  : 'text-red-700'
                              }`}>
                                {grade}/100
                              </div>
                              <div className={`text-xs font-medium ${
                                grade >= 80 
                                  ? 'text-green-600' 
                                  : grade >= 60 
                                  ? 'text-yellow-600' 
                                  : 'text-red-600'
                              }`}>
                                {grade}%
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center px-4 py-3 rounded-lg border-2 border-gray-400 bg-gray-100 w-full">
                            <div className="text-center">
                              <div className="text-gray-600 font-semibold text-sm">
                                Chưa có điểm
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                Đang chờ giáo viên chấm
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && completedAttempts.length === 0 && essaySubmissions.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">Chưa có bài làm nào</p>
            <p className="text-gray-500 mb-6">Hãy bắt đầu luyện tập để xem điểm số của bạn!</p>
            <Link href="/practice" className="btn-primary inline-block">
              Đi đến Luyện tập
            </Link>
          </div>
        )}

        {/* Detail Modal */}
        {selectedAttempt && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-nc-dark-orange">
                  Chi tiết bài làm: {selectedAttempt.quiz.title}
                </h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                {loadingDetail ? (
                  <div className="text-center py-8">Đang tải...</div>
                ) : (
                  <>
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Tổng điểm</div>
                        <div className="text-2xl font-bold text-nc-dark-orange">
                          {selectedAttempt.score}/{selectedAttempt.totalPoints}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {getPercentage(selectedAttempt.score, selectedAttempt.totalPoints)}%
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Thời gian làm bài</div>
                        <div className="text-lg font-semibold">
                          {formatDuration(selectedAttempt.timeSpentMinutes)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Hoàn thành: {formatDate(selectedAttempt.completedAt!)}
                        </div>
                      </div>
                    </div>

                    {/* Hiển thị đề bài */}
                    {selectedAttempt.quiz.description && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-semibold text-gray-700">
                            Đề bài:
                          </div>
                          <button
                            onClick={() => setShowDescription(!showDescription)}
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-nc-dark-orange transition-colors"
                          >
                            <span>{showDescription ? 'Ẩn' : 'Hiện'}</span>
                            {showDescription ? (
                              <ChevronUpIcon className="h-4 w-4" />
                            ) : (
                              <ChevronDownIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {showDescription && (
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {selectedAttempt.quiz.description}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-6">
                      {selectedAttempt.quiz.questions
                        .slice()
                        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                        .map((question, index) => {
                        const answer = selectedAttempt.answers.find(a => a.questionId === question.id);
                        const isCorrect = answer?.isCorrect ?? false;
                        const pointsEarned = answer?.pointsEarned ?? 0;
                        
                        // Debug: Log mapping để kiểm tra
                        console.log(`[Câu ${index + 1}] Question ID: ${question.id}, Answer ID: ${answer?.id}, Answer QuestionID: ${answer?.questionId}, Feedback: ${answer?.feedback || 'null'}`);
                        
                        return (
                          <div
                            key={question.id}
                            className={`border-2 rounded-lg p-4 ${
                              isCorrect 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="font-semibold text-gray-700 mr-2">
                                    Câu {index + 1}:
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ({question.points} điểm)
                                  </span>
                                  {isCorrect ? (
                                    <CheckCircleIcon className="h-5 w-5 text-green-600 ml-2" />
                                  ) : (
                                    <XCircleIcon className="h-5 w-5 text-red-600 ml-2" />
                                  )}
                                </div>
                                <p className="text-gray-800 mb-3">{question.questionText}</p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                isCorrect 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {pointsEarned}/{question.points}
                              </div>
                            </div>

                            {question.questionType === 'MULTIPLE_CHOICE' && question.options && (
                              <div className="space-y-2">
                                {question.options.map((option) => {
                                  const isSelected = answer?.selectedOptionId === option.id;
                                  const isCorrectOption = option.isCorrect;
                                  
                                  return (
                                    <div
                                      key={option.id}
                                      className={`p-3 rounded-lg border-2 ${
                                        isCorrectOption
                                          ? 'border-green-500 bg-green-100'
                                          : isSelected
                                          ? 'border-red-500 bg-red-100'
                                          : 'border-gray-200 bg-white'
                                      }`}
                                    >
                                      <div className="flex items-center">
                                        {isCorrectOption && (
                                          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                                        )}
                                        {isSelected && !isCorrectOption && (
                                          <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                                        )}
                                        <span className={isCorrectOption ? 'font-semibold text-green-800' : isSelected ? 'font-semibold text-red-800' : 'text-gray-700'}>
                                          {option.optionText}
                                        </span>
                                        {isCorrectOption && (
                                          <span className="ml-auto text-sm text-green-600 font-semibold">
                                            (Đáp án đúng)
                                          </span>
                                        )}
                                        {isSelected && !isCorrectOption && (
                                          <span className="ml-auto text-sm text-red-600 font-semibold">
                                            (Bạn đã chọn)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Hiển thị câu trả lời của học sinh */}
                            {answer && (
                              <div className="mt-4 space-y-3">
                                <div className="text-sm font-semibold text-gray-700 mb-2">
                                  Câu trả lời của bạn:
                                </div>
                                {question.questionType === 'ESSAY' && answer.answerText ? (
                                  <div className="bg-white border border-gray-300 rounded-lg p-3 text-gray-800 whitespace-pre-wrap">
                                    {answer.answerText}
                                  </div>
                                ) : question.questionType === 'MULTIPLE_CHOICE' && answer.selectedOption ? (
                                  <div className="bg-white border border-gray-300 rounded-lg p-3 text-gray-800">
                                    {answer.selectedOption.optionText}
                                  </div>
                                ) : answer.answerText ? (
                                  <div className="bg-white border border-gray-300 rounded-lg p-3 text-gray-800 whitespace-pre-wrap">
                                    {answer.answerText}
                                  </div>
                                ) : (
                                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-gray-500 italic">
                                    (Chưa trả lời)
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Hiển thị góp ý của giáo viên */}
                            {answer?.feedback && (
                              <div className="mt-4">
                                <div className="text-sm font-semibold text-nc-dark-orange mb-2 flex items-center">
                                  <AcademicCapIcon className="h-4 w-4 mr-1" />
                                  Góp ý của giáo viên:
                                </div>
                                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-gray-800 whitespace-pre-wrap">
                                  {answer.feedback}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
