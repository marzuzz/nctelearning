'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  PlayIcon, 
  ClockIcon, 
  UserIcon, 
  BookOpenIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiUrl } from '@/lib/api';

// Force dynamic rendering - this page uses dynamic route params
export const dynamic = 'force-dynamic';

interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  fileSizeMb?: number;
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

export default function VideoDetailPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;
  
  const [video, setVideo] = useState<Video | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [isTheater, setIsTheater] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Build video source once data is available (no hooks inside JSX)
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  const videoSrc = video?.videoUrl ? `${apiBase}${video.videoUrl}` : undefined;

  useEffect(() => {
    if (authLoading) return; // Wait until auth state is resolved
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    fetchVideo();
  }, [authLoading, isAuthenticated, user, router, videoId]);

  const fetchVideo = async () => {
    try {
      setDataLoading(true);
      setError('');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Không có token xác thực');
      }

      const response = await fetch(apiUrl(`/api/videos/${videoId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        if (response.status === 403) {
          throw new Error('Bạn không có quyền truy cập video này');
        }
        if (response.status === 404) {
          throw new Error('Không tìm thấy video');
        }
        throw new Error('Không thể tải video');
      }

      const data = await response.json();
      setVideo(data);
    } catch (error) {
      console.error('Error fetching video:', error);
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

  const formatFileSize = (mb: number) => {
    if (mb < 1) {
      return `${(mb * 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-nc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nc-gold mx-auto"></div>
          <p className="mt-4 text-nc-dark-orange">Đang tải video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-nc-cream py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              {error}
            </h1>
            <p className="text-gray-600 mb-6">
              {error.includes('quyền truy cập') 
                ? 'Video này chỉ dành cho học sinh lớp cụ thể hoặc giáo viên.'
                : 'Vui lòng kiểm tra lại và thử lại sau.'
              }
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.back()}
                className="btn-secondary flex items-center"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Quay lại
              </button>
              <button
                onClick={fetchVideo}
                className="btn-primary"
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-nc-cream py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <PlayIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-500 mb-4">
              Không tìm thấy video
            </h1>
            <button
              onClick={() => router.push('/videos')}
              className="btn-primary"
            >
              Quay lại danh sách video
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nc-cream py-8">
      <div className={isTheater ? 'max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 btn-secondary flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Quay lại
        </button>

        <div className={isTheater ? 'grid grid-cols-1 lg:grid-cols-4 gap-8' : 'grid grid-cols-1 lg:grid-cols-3 gap-8'}>
          {/* Video Player */}
          <div className={isTheater ? 'lg:col-span-3' : 'lg:col-span-2'}>
            <div className="card">
              <div ref={playerContainerRef} className="rounded-lg mb-4 relative overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-auto aspect-video bg-black"
                  src={videoSrc}
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  onError={() => {
                    // Helpful debug in console if file path is wrong or 404
                    console.error('Video failed to load:', videoSrc);
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                  <button
                    onClick={() => setIsTheater((v) => !v)}
                    className="px-3 py-1 rounded-md bg-white/90 hover:bg-white text-sm text-gray-800 shadow"
                    title={isTheater ? 'Thoát chế độ rạp' : 'Chế độ rạp'}
                  >
                    {isTheater ? 'Thoát rạp' : 'Rạp'}
                  </button>
                  <button
                    onClick={() => {
                      const el = playerContainerRef.current;
                      if (!el) return;
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        el.requestFullscreen?.();
                      }
                    }}
                    className="px-3 py-1 rounded-md bg-white/90 hover:bg-white text-sm text-gray-800 shadow"
                    title="Toàn màn hình"
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {video.durationSeconds && (
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatDuration(video.durationSeconds)}
                    </div>
                  )}
                  {video.fileSizeMb && (
                    <div>
                      {formatFileSize(video.fileSizeMb)}
                    </div>
                  )}
                </div>
                
                <div className="bg-nc-gold text-white text-xs px-2 py-1 rounded-full">
                  Lớp {video.gradeLevel}
                </div>
              </div>

              <h1 className="text-2xl font-bold text-nc-dark-orange mb-4">
                {video.title}
              </h1>
              
              <p className="text-gray-600 mb-6">
                {video.description}
              </p>
            </div>
          </div>

          {/* Video Info Sidebar */}
          <div className="space-y-6">
            {/* Video Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-nc-dark-orange mb-4">
                Thông tin video
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <BookOpenIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Loại:</span>
                </div>
                <p className="text-gray-600 ml-6">
                  Video Bài Giảng
                </p>
                
                <div className="flex items-center text-sm">
                  <span className="font-medium">Lớp:</span>
                </div>
                <div className="ml-6">
                  <span className="bg-nc-gold text-white text-xs px-2 py-1 rounded-full">
                    Lớp {video.gradeLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Access Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-nc-dark-orange mb-4">
                Thông tin truy cập
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium">Bạn:</span>
                </div>
                <p className="text-gray-600 ml-6">
                  {user?.firstName} {user?.lastName} ({user?.role === 'admin' ? 'Giáo viên' : 'Học sinh'})
                </p>
                
                {user?.role !== 'admin' && user?.gradeLevel && (
                  <>
                    <div className="flex items-center text-sm">
                      <span className="font-medium">Lớp của bạn:</span>
                    </div>
                    <div className="ml-6">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Lớp {user.gradeLevel}
                      </span>
                    </div>
                  </>
                )}
                
                <div className="text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
                  {user?.role === 'admin' 
                    ? 'Bạn có thể xem tất cả video với tư cách giáo viên.'
                    : `Bạn chỉ có thể xem video dành cho lớp ${user?.gradeLevel || 'của bạn'}.`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
