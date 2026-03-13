'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { 
  VideoCameraIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { apiUrl } from '@/lib/api';

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

interface Course {
  id: string;
  title: string;
  gradeLevel: '10' | '11' | '12';
  lessons: Array<{
    id: string;
    title: string;
  }>;
}

export default function AdminVideosPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('');

  useEffect(() => {
    if (loading) return; // wait for auth resolution
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchVideos();
  }, [loading, isAuthenticated, user, router]);

  const fetchVideos = async () => {
    try {
      const response = await fetch(apiUrl('/api/videos'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  useEffect(() => { setDataLoading(false); }, []);

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

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa video này?')) return;

    try {
      const response = await fetch(apiUrl(`/api/videos/${videoId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        setVideos(videos.filter(video => video.id !== videoId));
      }
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-nc-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nc-gold mx-auto"></div>
          <p className="mt-4 text-nc-dark-orange">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nc-cream py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-nc-dark-orange flex items-center">
                <VideoCameraIcon className="h-8 w-8 mr-3" />
                Quản lý Video
              </h1>
              <p className="mt-2 text-gray-600">
                Tải lên và quản lý các video bài giảng theo từng lớp
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Tải lên Video
            </button>
          </div>
        </div>

        {/* Grade Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Lọc theo lớp:
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="input w-32"
            >
              <option value="">Tất cả</option>
              <option value="10">Lớp 10</option>
              <option value="11">Lớp 11</option>
              <option value="12">Lớp 12</option>
            </select>
            {gradeFilter && (
              <button
                onClick={() => setGradeFilter('')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos
            .filter(video => !gradeFilter || video.gradeLevel === gradeFilter)
            .map((video) => (
            <div key={video.id} className="card hover:shadow-lg transition-shadow">
              {/* Video Thumbnail */}
              <div className="h-48 bg-gradient-to-br from-nc-gold via-nc-orange to-nc-dark-orange rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                {/* Blur background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-black/30 backdrop-blur-sm"></div>
                <VideoCameraIcon className="h-16 w-16 text-white relative z-10 drop-shadow-lg" />
                {video.durationSeconds && (
                  <div className="absolute bottom-2 right-2 bg-white/20 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.durationSeconds)}
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-nc-gold text-white text-xs px-2 py-1 rounded-full">
                    Lớp {video.gradeLevel}
                  </span>
                  {video.fileSizeMb && (
                    <span className="text-sm text-gray-500">
                      {formatFileSize(video.fileSizeMb)}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-nc-dark-orange mb-2 line-clamp-2">
                  {video.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {video.description}
                </p>

                <div className="text-sm text-gray-500 mb-3">
                  <p className="flex items-center mb-1">
                    <UserIcon className="h-4 w-4 mr-1" />
                    Video Bài Giảng
                  </p>
                  <p className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Lớp {video.gradeLevel}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button className="flex-1 btn-secondary flex items-center justify-center">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Xem
                </button>
                <button className="btn-secondary">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDeleteVideo(video.id)}
                  className="btn-secondary text-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {videos.filter(video => !gradeFilter || video.gradeLevel === gradeFilter).length === 0 && (
          <div className="text-center py-12">
            <VideoCameraIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              {gradeFilter ? `Chưa có video nào cho lớp ${gradeFilter}` : 'Chưa có video nào'}
            </h3>
            <p className="text-gray-400 mb-4">
              {gradeFilter ? `Hãy tải lên video đầu tiên cho lớp ${gradeFilter}` : 'Bắt đầu bằng cách tải lên video đầu tiên của bạn'}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary"
            >
              Tải lên Video
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <VideoUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            fetchVideos();
          }}
        />
      )}
    </div>
  );
}

// Video Upload Modal Component
interface VideoUploadModalProps {
  onClose: () => void;
  onUploadSuccess: () => void;
}

function VideoUploadModal({ onClose, onUploadSuccess }: VideoUploadModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gradeLevel: '',
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError('File quá lớn. Kích thước tối đa là 100MB.');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('video/')) {
        setError('Vui lòng chọn file video.');
        return;
      }

      setFormData(prev => ({ ...prev, file }));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file || !formData.title || !formData.gradeLevel) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadData = new FormData();
      uploadData.append('file', formData.file);
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('gradeLevel', formData.gradeLevel);

      console.log('Uploading video with data:', {
        title: formData.title,
        description: formData.description,
        gradeLevel: formData.gradeLevel,
        file: formData.file?.name
      });

      const response = await fetch(apiUrl('/api/videos'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: uploadData
      });

      if (response.ok) {
        onUploadSuccess();
      } else {
        let errorMessage = 'Có lỗi xảy ra khi tải lên video.';
        try {
          const errorData = await response.json();
          console.error('Upload error:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          console.error('Response status:', response.status);
          console.error('Response statusText:', response.statusText);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Có lỗi xảy ra khi tải lên video.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-nc-dark-orange">
              Tải lên Video
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grade Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lớp học
              </label>
              <select
                value={formData.gradeLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, gradeLevel: e.target.value }))}
                className="input"
                required
              >
                <option value="">Chọn lớp học</option>
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Video sẽ chỉ hiển thị cho học sinh lớp {formData.gradeLevel || 'đã chọn'}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề video
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input"
                placeholder="Nhập tiêu đề video"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input"
                rows={3}
                placeholder="Nhập mô tả video"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File video
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="input"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Hỗ trợ các định dạng video (.mp4, .mov, .avi, .mkv, .webm, v.v.). Kích thước tối đa: 100MB
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={uploading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary"
                disabled={uploading}
              >
                {uploading ? 'Đang tải lên...' : 'Tải lên Video'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
