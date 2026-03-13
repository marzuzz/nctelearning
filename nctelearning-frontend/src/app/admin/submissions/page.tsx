'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ClockIcon, AcademicCapIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { apiUrl, withAuthHeaders } from '@/lib/api';

type QuizAttempt = {
  id: string;
  score: number;
  totalPoints: number;
  startedAt: string;
  completedAt: string | null;
  timeSpentMinutes: number | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    gradeLevel: '10' | '11' | '12' | null;
    email: string;
  };
  quiz: {
    id: string;
    title: string;
    practiceType?: 'doc_hieu' | 'viet' | null;
  };
};

type AttemptsByGrade = {
  '10': QuizAttempt[];
  '11': QuizAttempt[];
  '12': QuizAttempt[];
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'N/A';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}ph`;
}

export default function AdminSubmissionsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [attemptsByGrade, setAttemptsByGrade] = useState<AttemptsByGrade>({
    '10': [],
    '11': [],
    '12': [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<'all' | '10' | '11' | '12'>('all');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Wait for auth check to complete before redirecting
    if (authLoading) {
      return;
    }
    
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }
    loadAttempts();
  }, [isAuthenticated, user, authLoading, router]);

  const loadAttempts = async () => {
    setLoading(true);
    try {
      const url = apiUrl('/quizzes/admin/attempts/by-grade');
      
      const res = await fetch(url, {
        headers: withAuthHeaders(),
      });
      
      if (!res.ok) {
        throw new Error('Không thể tải danh sách bài làm');
      }
      
      const data: AttemptsByGrade = await res.json();
      setAttemptsByGrade(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (score: number, totalPoints: number): number => {
    if (totalPoints === 0) return 0;
    return Math.round((score / totalPoints) * 100);
  };

  const getGradeColor = (grade: '10' | '11' | '12'): string => {
    switch (grade) {
      case '10':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case '11':
        return 'bg-green-100 text-green-800 border-green-300';
      case '12':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleDeleteAllAttempts = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ bài làm và câu trả lời? Hành động này không thể hoàn tác!')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(apiUrl('/quizzes/admin/attempts/all'), {
        method: 'DELETE',
        headers: withAuthHeaders(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Không thể xóa dữ liệu');
      }

      const result = await res.json();
      alert(`Đã xóa thành công:\n- ${result.deletedAttempts} bài làm\n- ${result.deletedAnswers} câu trả lời`);
      
      // Reload attempts
      await loadAttempts();
    } catch (error) {
      alert('Không thể xóa dữ liệu. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  const renderAttemptCard = (attempt: QuizAttempt) => {
    const practiceTypeLabel = attempt.quiz.practiceType === 'doc_hieu' ? 'Đọc hiểu' : attempt.quiz.practiceType === 'viet' ? 'Viết' : 'N/A';
    const studentName = `${attempt.user.firstName} ${attempt.user.lastName}`;
    const gradeLevel = attempt.user.gradeLevel || 'N/A';

    return (
      <div 
        key={attempt.id} 
        className="card hover:shadow-lg transition-shadow mb-4 cursor-pointer"
        onClick={() => router.push(`/admin/submissions/${attempt.id}`)}
      >
        {/* Header: Tên học sinh, Lớp */}
        <div className="mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-nc-dark-orange">
                {studentName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Lớp {gradeLevel}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getGradeColor(attempt.user.gradeLevel || '10')}`}>
              Lớp {gradeLevel}
            </div>
          </div>
        </div>

        {/* Dạng bài tập */}
        <div className="mb-4 pb-3 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Dạng bài tập:</span> {practiceTypeLabel}
          </p>
        </div>

        {/* Tiêu đề của đề bài */}
        <div className="mb-4 pb-3 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Tiêu đề:</span> {attempt.quiz.title}
          </p>
        </div>

      </div>
    );
  };

  const renderGradeSection = (grade: '10' | '11' | '12', attempts: QuizAttempt[]) => {
    if (selectedGrade !== 'all' && selectedGrade !== grade) {
      return null;
    }

    return (
      <div key={grade} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className={`text-2xl font-bold px-4 py-2 rounded-lg border ${getGradeColor(grade)}`}>
            Lớp {grade}
          </h2>
          <span className="text-gray-500">({attempts.length} bài làm)</span>
        </div>
        {attempts.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">
            Chưa có bài làm nào từ lớp {grade}
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map(renderAttemptCard)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-nc-cream min-h-screen py-12 flex items-center justify-center">
        <div className="text-xl text-nc-dark-orange">Đang tải...</div>
      </div>
    );
  }

  const totalAttempts = attemptsByGrade['10'].length + attemptsByGrade['11'].length + attemptsByGrade['12'].length;

  return (
    <div className="bg-nc-cream min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-nc-dark-orange mb-2">Quản lý bài làm</h1>
              <p className="text-gray-600">Xem và quản lý các bài làm của học sinh theo từng lớp</p>
            </div>
            {totalAttempts > 0 && (
              <button
                onClick={handleDeleteAllAttempts}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Đang xóa...' : 'Xóa tất cả bài làm'}
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Lọc theo lớp:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGrade('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedGrade === 'all'
                    ? 'bg-nc-gold text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả ({totalAttempts})
              </button>
              <button
                onClick={() => setSelectedGrade('10')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedGrade === '10'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lớp 10 ({attemptsByGrade['10'].length})
              </button>
              <button
                onClick={() => setSelectedGrade('11')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedGrade === '11'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lớp 11 ({attemptsByGrade['11'].length})
              </button>
              <button
                onClick={() => setSelectedGrade('12')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedGrade === '12'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Lớp 12 ({attemptsByGrade['12'].length})
              </button>
            </div>
          </div>
        </div>

        {/* Attempts by grade */}
        {totalAttempts === 0 ? (
          <div className="card text-center py-12">
            <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-500">Chưa có bài làm nào</p>
          </div>
        ) : (
          <div>
            {renderGradeSection('10', attemptsByGrade['10'])}
            {renderGradeSection('11', attemptsByGrade['11'])}
            {renderGradeSection('12', attemptsByGrade['12'])}
          </div>
        )}
      </div>
    </div>
  );
}

