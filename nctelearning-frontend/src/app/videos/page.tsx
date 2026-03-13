'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import { 
  PlayIcon, 
  ClockIcon, 
  UserIcon, 
  BookOpenIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  gradeLevel: '10' | '11' | '12';
  lesson?: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
      gradeLevel: '10' | '11' | '12';
    };
  };
  createdAt: string;
}

export default function VideosPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'10' | '11' | '12' | 'all'>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return; // wait until auth ready
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchVideos();
  }, [authLoading, isAuthenticated, user, router]);

  const fetchVideos = async () => {
    try {
      setDataLoading(true);
      setError('');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Không có token xác thực');
      }

      const response = await fetch(apiUrl('/api/videos'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        throw new Error('Không thể tải danh sách video');
      }

      const data = await response.json();
      const videosArray = Array.isArray(data) ? data : [];
      setVideos(videosArray);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải video');
    } finally {
      setDataLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredVideos = (Array.isArray(videos) ? videos : []).filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // For admins, allow filtering by grade
    // For students, they only see videos for their grade level (already filtered by backend)
    const matchesGrade = user?.role === 'admin' 
      ? (selectedGrade === 'all' || video.gradeLevel === selectedGrade)
      : true; // Students already get filtered results from backend
    
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="bg-nc-cream min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-nc-dark-orange mb-4">
            Video Bài Giảng
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Học văn học qua các video bài giảng chất lượng cao từ giáo viên giàu kinh nghiệm
          </p>
          {user?.role === 'admin' ? (
            <div className="inline-flex items-center bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium">
              <UserIcon className="h-4 w-4 mr-2" />
              Admin - {user.firstName} {user.lastName}
            </div>
          ) : (
            user?.gradeLevel && (
              <div className="inline-flex items-center bg-nc-gold text-white px-4 py-2 rounded-full text-sm font-medium">
                <UserIcon className="h-4 w-4 mr-2" />
                Lớp {user.gradeLevel} - {user.firstName} {user.lastName}
              </div>
            )
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm video..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-14"
                style={{ paddingLeft: '3.25rem' }}
              />
            </div>

            {/* Grade Filter - Only show for admins */}
            {user?.role === 'admin' && (
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5 text-gray-500" />
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value as '10' | '11' | '12' | 'all')}
                  className="input w-auto"
                >
                  <option value="all">Tất cả lớp</option>
                  <option value="10">Lớp 10</option>
                  <option value="11">Lớp 11</option>
                  <option value="12">Lớp 12</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Videos Grid */}
        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <div key={video.id} className="card hover:shadow-lg transition-shadow">
                {/* Video Thumbnail */}
                <div className="relative mb-4">
                  <div className="h-48 bg-gradient-to-br from-nc-gold via-nc-orange to-nc-dark-orange rounded-lg flex items-center justify-center relative overflow-hidden">
                    {/* Blur background effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20"></div>
                    <PlayIcon className="h-16 w-16 text-white relative z-10 drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-white/20 text-white text-xs px-2 py-1 rounded">
                    {video.durationSeconds ? formatDuration(video.durationSeconds) : '0:00'}
                  </div>
                  <div className="absolute top-2 left-2 bg-nc-gold text-white text-xs px-2 py-1 rounded">
                    Lớp {video.gradeLevel}
                  </div>
                </div>

                {/* Video Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-nc-dark-orange mb-2 line-clamp-2">
                    {video.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {video.description}
                  </p>

                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <BookOpenIcon className="h-4 w-4 mr-1" />
                    <span className="truncate">Video Bài Giảng</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <UserIcon className="h-4 w-4 mr-1" />
                    <span>Giáo viên</span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/videos/${video.id}`}
                  className="btn-primary w-full text-center"
                >
                  Xem video
                </Link>
              </div>
            ))}
          </div>
        )}

        {!dataLoading && filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <PlayIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              {error ? 'Không thể tải video' : 'Không tìm thấy video nào'}
            </h3>
            <p className="text-gray-400 mb-4">
              {error 
                ? 'Vui lòng kiểm tra kết nối mạng và thử lại'
                : searchTerm 
                  ? `Không có video nào phù hợp với từ khóa "${searchTerm}"`
                  : user?.role === 'admin' && selectedGrade !== 'all'
                    ? `Hiện tại chưa có video nào cho lớp ${selectedGrade}`
                    : user?.gradeLevel
                      ? `Hiện tại chưa có video nào cho lớp ${user.gradeLevel}`
                      : 'Hiện tại chưa có video nào'
              }
            </p>
            {error && (
              <button
                onClick={fetchVideos}
                className="btn-primary"
              >
                Thử lại
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
