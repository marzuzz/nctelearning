"use client";
import { useState } from "react";
import Link from "next/link";
import {
  PencilIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect } from "react";
import { apiUrl } from '@/lib/api';

const VIET_TOPICS = [
  { value: "nghi_luan_xa_hoi", label: "Nghị luận xã hội" },
  { value: "nghi_luan_van_hoc", label: "Nghị luận văn học" },
];

export default function VietSelectionPage() {
  const { user } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<'10' | '11' | '12' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [essays, setEssays] = useState<any[]>([]);

  useEffect(() => {
    fetch(apiUrl('/api/essay-exercises?practiceType=viet'))
      .then(res => res.json())
      .then(setEssays)
      .catch(() => setEssays([]));
  }, []);

  // Filtering logic
  const filtered = essays.filter(e => {
    if (selectedTopic && e.topic !== selectedTopic) return false;
    if (
      selectedGrade !== 'all' &&
      e.gradeLevel &&
      e.gradeLevel !== selectedGrade
    ) return false;
    if (searchTerm && !e.prompt.toLowerCase().includes(searchTerm.toLowerCase()) && !e.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    // Role-based: for student, restrict to their grade
    if (user?.role === 'user' && e.gradeLevel && e.gradeLevel !== user.gradeLevel) return false;
    return true;
  });

  return (
    <div className="bg-nc-cream min-h-screen py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-nc-dark-orange mb-2">
            Viết
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Chọn dạng bài viết bạn muốn luyện tập
          </p>
        </div>
        <div className="bg-white shadow-lg rounded-xl p-8 mb-8">
          {/* Step 1: Chọn dạng bài Viết */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-3 text-nc-dark-orange">
              1. Chọn dạng bài Viết
            </h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {VIET_TOPICS.map((topic) => (
                <button
                  key={topic.value}
                  onClick={() => setSelectedTopic(topic.value)}
                  className={`flex flex-col items-center justify-center px-8 py-4 border-2 rounded-lg transition-all cursor-pointer shadow-md focus:outline-none
                    ${selectedTopic === topic.value ? "border-nc-orange bg-nc-orange/10" : "border-gray-200 hover:border-nc-orange"}
                  `}
                >
                  <span className="text-lg font-medium text-gray-800 text-center">
                    {topic.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Lọc và tìm kiếm bài viết */}
          {selectedTopic && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-3 text-nc-dark-orange">
                2. Lọc bài tập Viết: 
                <span className="font-normal text-nc-orange ml-2">{VIET_TOPICS.find(t => t.value === selectedTopic)?.label}</span>
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                {/* Search Bar */}
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tiêu đề hoặc từ khoá..."
                    className="w-full py-2 pl-10 pr-10 rounded-lg shadow-sm border border-gray-300 focus:border-nc-dark-orange focus:ring-2 focus:ring-nc-orange/20 transition placeholder-gray-400 text-gray-900 bg-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-nc-orange" />
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
                {/* Grade Filter */}
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
              {/* TODO: Render essay cards filtered by topic/grade/searchTerm. Reuse card style from main practice page. */}
              <div className="py-6">
                {filtered.length === 0 ? (
                  <div className="text-center text-gray-400">
                    <PencilIcon className="w-12 h-12 mx-auto mb-4 text-nc-orange" />
                    <p>Không có bài tập Viết phù hợp.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map(e => (
                      <div key={e.id} className="bg-white rounded-lg shadow p-4 mb-4 border border-nc-orange">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs bg-nc-orange text-white px-2 py-0.5 rounded-full">Lớp {e.gradeLevel || 'N/A'}</span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{VIET_TOPICS.find(t => t.value === e.topic)?.label}</span>
                        </div>
                        <div className="font-semibold text-nc-dark-orange mb-1">{e.title}</div>
                        <div className="text-sm text-gray-600 mb-2">{e.prompt}</div>
                        {e.description && <div className="text-sm text-gray-500 italic mb-2">{e.description}</div>}
                        <div className="text-xs text-gray-500 mb-2">{e.timeLimitMinutes ? `Thời gian: ${e.timeLimitMinutes} phút` : 'Không giới hạn thời gian'}</div>
                        {/* Optionally add link/button to do this exercise */}
                        <Link href={`/practice/viet/${e.id}`} className="text-nc-orange hover:underline text-sm">Làm bài tập này →</Link>
                      </div>
                    ))}
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
