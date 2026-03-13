'use client';

import { AcademicCapIcon, PencilIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function PracticeLandingPage() {
  return (
    <div className="bg-nc-cream min-h-screen py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-nc-dark-orange mb-5">Luyện tập</h1>
        <p className="text-xl text-gray-700 mb-12">Vui lòng chọn loại luyện tập bạn muốn thực hành:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 justify-center">
          {/* Đọc hiểu card */}
          <Link href="/practice/doc-hieu" className="
            card flex flex-col items-center justify-center p-8 shadow-md transition hover:shadow-xl hover:-translate-y-1 
            border-2 rounded-xl border-nc-gold bg-white hover:bg-nc-gold/10
          ">
            <AcademicCapIcon className="h-12 w-12 text-nc-gold mb-2" />
            <span className="mt-3 text-2xl font-bold text-nc-dark-orange">Đọc hiểu</span>
            <span className="mt-2 text-gray-500 text-base">Bài tập kiểm tra khả năng đọc hiểu theo các chủ đề như Thơ, Truyện...</span>
          </Link>
          {/* Viết card */}
          <Link href="/practice/viet" className="
            card flex flex-col items-center justify-center p-8 shadow-md transition hover:shadow-xl hover:-translate-y-1 
            border-2 rounded-xl border-nc-orange bg-white hover:bg-nc-orange/10"
          >
            <PencilIcon className="h-12 w-12 text-nc-orange mb-2" />
            <span className="mt-3 text-2xl font-bold text-nc-dark-orange">Viết</span>
            <span className="mt-2 text-gray-500 text-base">Bài tập rèn luyện kỹ năng nghị luận xã hội và văn học</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
