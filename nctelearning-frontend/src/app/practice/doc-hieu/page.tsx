"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect } from "react";
import { apiUrl, withAuthHeaders } from '@/lib/api';

const DOC_HIEU_TOPICS = [
  { value: "tho", label: "Thơ" },
  { value: "truyen", label: "Truyện" },
  { value: "ki", label: "Kí" },
  { value: "nghi_luan", label: "Văn bản nghị luận" },
  { value: "thong_tin", label: "Văn bản thông tin" },
];

type Quiz = {
  id: string;
  title: string;
  gradeLevel?: '10' | '11' | '12' | null;
  topic?: string | null;
  practiceType?: 'doc_hieu' | 'viet' | null;
  lesson?: { course?: { gradeLevel?: '10' | '11' | '12' } };
};

type EssayExercise = {
  id: string;
  title: string;
  prompt: string;
  gradeLevel?: '10' | '11' | '12' | null;
  topic: string;
  practiceType: 'doc_hieu' | 'viet';
};

type Exercise = (Quiz | EssayExercise) & {
  type: 'quiz' | 'essay';
};

export default function DocHieuSelectionPage() {
  const { user } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<'10' | '11' | '12' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExercises = async () => {
      setLoading(true);
      try {
        const quizRes = await fetch(apiUrl('/quizzes'), { 
          headers: withAuthHeaders(), 
        });
        const quizzes: Quiz[] = quizRes.ok ? await quizRes.json() : [];
        
        const essayRes = await fetch(apiUrl('/essay-exercises?practiceType=doc_hieu'), { 
          headers: withAuthHeaders(), 
        });
        const essayExercises: EssayExercise[] = essayRes.ok ? await essayRes.json() : [];

        const docHieuQuizzes = quizzes.filter(q => 
          !q.practiceType || q.practiceType === 'doc_hieu'
        );

        const allExercises: Exercise[] = [
          ...docHieuQuizzes.map(q => ({ ...q, type: 'quiz' as const })),
          ...essayExercises.map(e => ({ ...e, type: 'essay' as const })),
        ];

        setExercises(allExercises);
      } catch (error) {
        console.error('Error loading exercises:', error);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  const filtered = exercises.filter(e => {
    if (selectedTopic && e.topic !== selectedTopic) return false;
    const exerciseGrade = e.gradeLevel || (e.type === 'quiz' ? (e as Quiz).lesson?.course?.gradeLevel : null);
    
    if (
      selectedGrade !== 'all' &&
      exerciseGrade &&
      exerciseGrade !== selectedGrade
    ) return false;
    
    if (searchTerm) {
      const titleMatch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
      const contentMatch = e.type === 'essay' 
        ? (e as EssayExercise).prompt.toLowerCase().includes(searchTerm.toLowerCase())
        : false;
      if (!titleMatch && !contentMatch) return false;
    }
    if (user?.role === 'user' && exerciseGrade && exerciseGrade !== user.gradeLevel) return false;
    return true;
  });

  return (
    <div className="bg-nc-cream min-h-screen py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-nc-dark-orange mb-2">
            Đọc Hiểu
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Chọn chủ đề Đọc hiểu mà bạn muốn luyện tập
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-3 text-nc-dark-orange">
              1. Chọn chủ đề Đọc hiểu
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-center">
              {DOC_HIEU_TOPICS.map((topic) => (
                <button
                  key={topic.value}
                  onClick={() => setSelectedTopic(topic.value)}
                  className={`flex flex-col items-center justify-center px-4 py-3 border-2 rounded-lg transition-all cursor-pointer shadow-md focus:outline-none
                    ${selectedTopic === topic.value
                      ? "border-nc-gold bg-nc-gold/10"
                      : "border-gray-200 hover:border-nc-gold"}
                  `}
                >
                  <span className="text-sm font-medium text-gray-800 text-center">
                    {topic.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {selectedTopic && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-3 text-nc-dark-orange">
                2. Lọc bài tập đọc hiểu: 
                <span className="font-normal text-nc-gold ml-2">{DOC_HIEU_TOPICS.find(t => t.value === selectedTopic)?.label}</span>
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tiêu đề hoặc từ khoá..."
                    className="w-full py-2 pl-10 pr-10 rounded-lg shadow-sm border border-gray-300 focus:border-nc-dark-orange focus:ring-2 focus:ring-nc-gold/20 transition placeholder-gray-400 text-gray-900 bg-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-nc-gold" />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-nc-dark-orange text-lg"
                      style={{ background: 'none', border: 'none' }}
                      aria-label="Xóa"
                    >×</button>
                  )}
                </div>
                <div className="flex-1 w-full">
                  <select
                    className="input w-full"
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(e.target.value as '10' | '11' | '12' | 'all')}
                  >
                    <option value="all">Tất cả lớp</option>
                    <option value="10">Lớp 10</option>
                    <option value="11">Lớp 11</option>
                    <option value="12">Lớp 12</option>
                  </select>
                </div>
              </div>
              <div className="py-6">
                {loading ? (
                  <div className="text-center text-gray-400">
                    <AcademicCapIcon className="w-12 h-12 mx-auto mb-4 text-nc-gold animate-pulse" />
                    <p>Đang tải bài tập...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center text-gray-400">
                    <AcademicCapIcon className="w-12 h-12 mx-auto mb-4 text-nc-gold" />
                    <p>Không có bài tập Đọc hiểu phù hợp.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map(e => {
                      const displayGrade = e.gradeLevel || (e.type === 'quiz' ? (e as Quiz).lesson?.course?.gradeLevel : null);
                      const exerciseLink = e.type === 'quiz' 
                        ? `/practice/quiz/${e.id}`
                        : `/practice/doc-hieu/${e.id}`;
                      
                      return (
                        <div key={e.id} className="bg-white rounded-lg shadow p-4 mb-4 border border-nc-gold">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs bg-nc-gold text-white px-2 py-0.5 rounded-full">
                              Lớp {displayGrade || 'N/A'}
                            </span>
                          </div>
                          <div className="font-semibold text-nc-dark-orange mb-1">{e.title}</div>
                          <div className="text-sm text-gray-600 mb-2">
                            Hãy thực hiện bài tập này
                          </div>
                          <Link href={exerciseLink} className="text-nc-gold hover:underline text-sm">
                            Làm bài tập này →
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="text-center">
          <Link href="/practice">
            <span className="text-nc-dark-orange hover:underline text-sm">← Quay lại trang Luyện tập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
