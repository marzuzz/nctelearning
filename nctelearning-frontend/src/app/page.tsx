import Link from 'next/link';
import { 
  BookOpenIcon, 
  VideoCameraIcon, 
  AcademicCapIcon,
  PlayIcon,
  CheckCircleIcon,
  UsersIcon,
  StarIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const features = [
    {
      icon: VideoCameraIcon,
      title: 'Video Bài Giảng Chất Lượng Cao',
      description: 'Hàng trăm video bài giảng được quay chuyên nghiệp với giáo viên giàu kinh nghiệm',
    },
    {
      icon: AcademicCapIcon,
      title: 'Bài Tập Đa Dạng',
      description: 'Trắc nghiệm và bài tập viết luận phong phú giúp củng cố kiến thức',
    },
    {
      icon: UsersIcon,
      title: 'Cộng Đồng Học Tập',
      description: 'Kết nối với bạn bè và giáo viên trong môi trường học tập tích cực',
    },
    {
      icon: CheckCircleIcon,
      title: 'Theo Dõi Tiến Độ',
      description: 'Hệ thống theo dõi tiến độ học tập chi tiết và đánh giá kết quả',
    },
  ];

  const stats = [
    { label: 'Học sinh đã tham gia', value: '10,000+' },
    { label: 'Video bài giảng', value: '500+' },
    { label: 'Khóa học', value: '50+' },
    { label: 'Giáo viên', value: '100+' },
  ];

  return (
    <div className="bg-nc-cream">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-nc-cream via-nc-gold to-nc-orange py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Học Văn Học
              <span className="block text-nc-dark-orange">Thông Minh</span>
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Nền tảng học văn học trực tuyến hàng đầu Việt Nam, 
              mang đến trải nghiệm học tập tốt nhất cho học sinh lớp 10, 11, 12
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/videos"
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-nc-dark-orange font-semibold py-3 px-8 rounded-lg text-lg transition-colors inline-flex items-center justify-center"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Xem Video Bài Giảng
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-nc-dark-orange mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-nc-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-nc-dark-orange mb-4">
              Tại sao chọn NCTElearning?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Chúng tôi mang đến phương pháp học văn học hiện đại, 
              hiệu quả và phù hợp với học sinh Việt Nam
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <feature.icon className="h-12 w-12 text-nc-gold mb-4" />
                <h3 className="text-xl font-semibold text-nc-dark-orange mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-nc-gold to-nc-orange">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Sẵn sàng bắt đầu hành trình học văn học?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Tham gia cùng hàng nghìn học sinh đã tin tưởng và lựa chọn NCTElearning
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-white text-nc-dark-orange hover:bg-gray-50 font-semibold py-3 px-8 rounded-lg text-lg transition-colors inline-flex items-center justify-center"
            >
              <StarIcon className="h-5 w-5 mr-2" />
              Đăng ký miễn phí
            </Link>
            <Link
              href="/videos"
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-nc-dark-orange font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Xem danh sách video
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
