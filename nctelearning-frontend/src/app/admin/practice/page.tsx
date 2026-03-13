'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { AcademicCapIcon, PencilIcon, TrashIcon, Cog6ToothIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { apiUrl, withAuthHeaders } from '@/lib/api';

type Quiz = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  gradeLevel?: '10' | '11' | '12' | null;
  practiceType?: 'doc_hieu' | 'viet';
  topic?: string;
  lesson?: { course?: { title?: string; gradeLevel?: '10' | '11' | '12' } };
};

type EssayExercise = {
  id: string;
  title: string;
  prompt: string;
  description?: string;
  createdAt: string;
  gradeLevel?: '10' | '11' | '12' | null;
  practiceType: 'doc_hieu' | 'viet';
  topic: string;
  timeLimitMinutes?: number;
};

type Exercise = (Quiz | EssayExercise) & {
  type: 'quiz' | 'essay';
};

const TOPIC_LABELS: Record<string, string> = {
  // Đọc hiểu
  'tho': 'Thơ',
  'truyen': 'Truyện',
  'ki': 'Kí',
  'nghi_luan': 'Văn bản nghị luận',
  'thong_tin': 'Văn bản thông tin',
  // Viết
  'nghi_luan_xa_hoi': 'Nghị luận xã hội',
  'nghi_luan_van_hoc': 'Nghị luận văn học',
};

export default function AdminPracticePage() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [grade, setGrade] = useState<'all' | '10' | '11' | '12'>('all');
  const [practiceType, setPracticeType] = useState<'all' | 'doc_hieu' | 'viet'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; exercise: Exercise | null }>({
    show: false,
    exercise: null,
  });

  const load = async () => {
    setLoading(true);
    try {``
      // Load quizzes (đọc hiểu với questions)
      const quizUrl = grade === 'all'
        ? apiUrl('/quizzes')
        : apiUrl(`/quizzes?gradeLevel=${grade}`);
      const quizRes = await fetch(quizUrl, { headers: withAuthHeaders() });
      const quizzes: Quiz[] = await quizRes.json();
      
      // Load essay exercises (cả đọc hiểu và viết)
      const essayUrl = grade === 'all'
        ? apiUrl('/essay-exercises')
        : apiUrl(`/essay-exercises?gradeLevel=${grade}`);
      const essayRes = await fetch(essayUrl, { headers: withAuthHeaders(), });
      const essayExercises: EssayExercise[] = await essayRes.json();

      // Combine and mark types
      const allExercises: Exercise[] = [
        ...quizzes.map(q => ({ ...q, type: 'quiz' as const, practiceType: 'doc_hieu' as const })),
        ...essayExercises.map(e => ({ ...e, type: 'essay' as const })),
      ];

      setExercises(allExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (exercise: Exercise) => {
    setDeleteConfirm({ show: true, exercise });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.exercise) return;

    const exercise = deleteConfirm.exercise;
    setDeleteConfirm({ show: false, exercise: null });
    
    try {
      const endpoint = exercise.type === 'quiz' 
        ? `/quizzes/${exercise.id}`
        : `/essay-exercises/${exercise.id}`;
      
      const response = await fetch(apiUrl(endpoint), {
        method: 'DELETE', 
        headers: withAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Lỗi không xác định' }));
        const errorMessage = Array.isArray(errorData?.message) 
          ? errorData.message.join(', ')
          : errorData?.message || 'Không thể xóa bài tập';
        alert(`Lỗi: ${errorMessage}`);
        return;
      }

      setExercises((prev) => prev.filter((e) => e.id !== exercise.id));
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Có lỗi xảy ra khi xóa bài tập. Vui lòng thử lại.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, exercise: null });
  };

  useEffect(() => {
    load();
  }, [grade]);

  // Filter exercises
  const filteredExercises = exercises.filter(ex => {
    if (practiceType !== 'all' && ex.practiceType !== practiceType) return false;
    if (selectedTopic !== 'all' && ex.topic !== selectedTopic) return false;
    return true;
  });

  // Get unique topics for current practice type
  const availableTopics = Array.from(
    new Set(
      exercises
        .filter(ex => practiceType === 'all' || ex.practiceType === practiceType)
        .map(ex => ex.topic)
        .filter(Boolean) as string[]
    )
  );

  if (user?.role !== 'admin') {
    return (
      <div className="bg-nc-cream min-h-screen py-8">
        <div className="max-w-5xl mx-auto px-4">Không có quyền truy cập.</div>
      </div>
    );
  }

  return (
    <div className="bg-nc-cream min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-nc-dark-orange">Quản lý Bài Tập</h1>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Thêm bài tập</button>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Lọc theo lớp</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value as any)} className="input">
                <option value="all">Tất cả lớp</option>
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
            </div>
            <div>
              <label className="label">Loại bài tập</label>
              <select value={practiceType} onChange={(e) => {
                setPracticeType(e.target.value as any);
                setSelectedTopic('all'); // Reset topic when changing practice type
              }} className="input">
                <option value="all">Tất cả</option>
                <option value="doc_hieu">Đọc hiểu</option>
                <option value="viet">Viết</option>
              </select>
            </div>
            <div>
              <label className="label">Chủ đề</label>
              <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="input">
                <option value="all">Tất cả chủ đề</option>
                {availableTopics.map(topic => (
                  <option key={topic} value={topic}>{TOPIC_LABELS[topic] || topic}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-nc-gold">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng bài tập</p>
                <p className="text-2xl font-bold text-nc-dark-orange">{exercises.length}</p>
              </div>
              <AcademicCapIcon className="h-8 w-8 text-nc-gold" />
            </div>
          </div>
          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-nc-gold">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đọc hiểu</p>
                <p className="text-2xl font-bold text-nc-dark-orange">
                  {exercises.filter(e => e.practiceType === 'doc_hieu').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Array.from(new Set(exercises.filter(e => e.practiceType === 'doc_hieu' && e.topic).map(e => e.topic)))
                    .map(t => TOPIC_LABELS[t as string] || t).join(', ') || 'Chưa có thể loại'}
                </p>
              </div>
              <AcademicCapIcon className="h-8 w-8 text-nc-gold" />
            </div>
          </div>
          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-nc-orange">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viết</p>
                <p className="text-2xl font-bold text-nc-dark-orange">
                  {exercises.filter(e => e.practiceType === 'viet').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Array.from(new Set(exercises.filter(e => e.practiceType === 'viet' && e.topic).map(e => e.topic)))
                    .map(t => TOPIC_LABELS[t as string] || t).join(', ') || 'Chưa có thể loại'}
                </p>
              </div>
              <PencilIcon className="h-8 w-8 text-nc-orange" />
            </div>
          </div>
        </div>

        {/* Exercises List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-48" />
            ))}
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="card text-center py-12">
            <AcademicCapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Không có bài tập nào</p>
            <p className="text-gray-400 text-sm mt-2">Hãy tạo bài tập mới để bắt đầu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => {
              const displayGrade = exercise.gradeLevel || 
                ('lesson' in exercise ? (exercise as Quiz).lesson?.course?.gradeLevel: undefined); 
              const topicLabel = exercise.topic ? TOPIC_LABELS[exercise.topic] : null;
              const isDocHieu = exercise.practiceType === 'doc_hieu';
              const isViet = exercise.practiceType === 'viet';

              return (
                <div 
                  key={exercise.id} 
                  className={`card hover:shadow-lg transition-shadow ${
                    isDocHieu ? 'border-l-4 border-l-nc-gold' : 'border-l-4 border-l-nc-orange'
                  }`}
                >
                  {/* Header with badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-wrap gap-2">
                      {displayGrade && (
                        <span className="text-xs bg-nc-gold text-white px-2 py-1 rounded-full font-medium">
                          Lớp {displayGrade}
                        </span>
                      )}
                      {isDocHieu && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                          <AcademicCapIcon className="h-3 w-3" />
                          Đọc hiểu
                        </span>
                      )}
                      {isViet && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                          <PencilIcon className="h-3 w-3" />
                          Viết
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-nc-dark-orange mb-2 line-clamp-2">
                    {exercise.title}
                  </h3>

                  {/* Topic - Highlighted section */}
                  {topicLabel ? (
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-medium text-gray-600">Thể loại:</span>
                        <span className="text-sm font-bold text-blue-700">{topicLabel}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-medium text-gray-500">Thể loại:</span>
                        <span className="text-xs text-gray-400 italic">Chưa có</span>
                      </div>
                    </div>
                  )}

                  {/* Description/Prompt */}
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {exercise.type === 'essay' 
                      ? (exercise as EssayExercise).prompt 
                      : exercise.description || 'Không có mô tả'}
                  </p>

                  {/* Footer with actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      {exercise.type === 'quiz' ? 'Trắc nghiệm' : 'Tự luận'}
                    </div>
                    <div className="flex items-center gap-3">
                      {exercise.type === 'quiz' && (
                        <Link 
                          href={`/admin/practice/exercises/${exercise.id}/manage`}
                          className="text-sm text-nc-dark-orange hover:text-nc-orange flex items-center gap-1"
                        >
                          <Cog6ToothIcon className="h-4 w-4" />
                          Quản lý
                        </Link>
                      )}
                      <button 
                        onClick={() => handleDeleteClick(exercise)}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal overlay for type selection */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-xl font-bold text-nc-dark-orange mb-6 text-center">Chọn loại bài tập</h2>
            <div className="flex flex-col gap-6 items-center">
              <button
                className="w-full border-2 border-nc-gold px-5 py-4 rounded-lg flex items-center gap-4 text-xl font-semibold hover:bg-nc-gold/10 transition mb-2"
                onClick={() => { setShowModal(false); router.push('/admin/practice/exercises/new?type=doc_hieu'); }}
              >
                <AcademicCapIcon className="h-8 w-8 text-nc-gold" /> Đọc hiểu
              </button>
              <button
                className="w-full border-2 border-nc-orange px-5 py-4 rounded-lg flex items-center gap-4 text-xl font-semibold hover:bg-nc-orange/10 transition"
                onClick={() => { setShowModal(false); router.push('/admin/practice/exercises/new?type=viet'); }}
              >
                <PencilIcon className="h-8 w-8 text-nc-orange" /> Viết
              </button>
              <button className="mt-4 text-sm text-gray-500 hover:text-nc-dark-orange underline" onClick={() => setShowModal(false)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.exercise && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-nc-dark-orange mb-2">
                  Xác nhận xóa bài tập
                </h3>
                <p className="text-gray-600 mb-2">
                  Bạn có chắc muốn xóa bài tập này?
                </p>
                <div className="bg-nc-cream rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-nc-dark-orange">
                    {deleteConfirm.exercise.title}
                  </p>
                  {deleteConfirm.exercise.practiceType && (
                    <p className="text-xs text-gray-500 mt-1">
                      {deleteConfirm.exercise.practiceType === 'doc_hieu' ? 'Đọc hiểu' : 'Viết'}
                      {deleteConfirm.exercise.topic && ` • ${TOPIC_LABELS[deleteConfirm.exercise.topic] || deleteConfirm.exercise.topic}`}
                    </p>
                  )}
                </div>
                <p className="text-sm text-red-600 font-medium">
                  Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Xóa bài tập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
