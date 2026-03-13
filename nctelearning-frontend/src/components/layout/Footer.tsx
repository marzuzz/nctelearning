import Link from 'next/link';
import { BookOpenIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-nc-dark-orange text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Image src="NCTelearning02.svg" alt="NCTlearning" width={100} height={100} />
              <span className="text-xl font-bold">NCTElearning</span>
            </div>
            <p className="text-gray-200 mb-4 max-w-md">
              Nền tảng học văn học trực tuyến hàng đầu Việt Nam, mang đến trải nghiệm học tập 
              tốt nhất cho học sinh lớp 10, 11, 12 với video bài giảng chất lượng cao và 
              hệ thống bài tập đa dạng.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-200">
                <EnvelopeIcon className="h-4 w-4" />
                <span>thamphamnv91@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-200">
                <PhoneIcon className="h-4 w-4" />
                <span>+84 828 932 023</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2">
              
              <li>
                <Link href="/videos" className="text-gray-200 hover:text-nc-gold transition-colors">
                  Video bài giảng
                </Link>
              </li>
              <li>
                <Link href="/practice" className="text-gray-200 hover:text-nc-gold transition-colors">
                  Luyện tập
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-200 hover:text-nc-gold transition-colors">
                  Giới thiệu
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Hỗ trợ</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-gray-200 hover:text-nc-gold transition-colors">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-200 hover:text-nc-gold transition-colors">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-200 hover:text-nc-gold transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-200 hover:text-nc-gold transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-nc-orange mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <div className="flex flex-col items-start md:items-start mb-2 md:mb-0">
                <span className="text-gray-100 font-bold text-base mb-0.5">Trường THPT Chuyên Nguyễn Chí Thanh</span>
                <div className="flex items-center space-x-2 text-gray-200 text-sm font-semibold">
                  <MapPinIcon className="h-5 w-5 text-nc-gold" />
                  <span>08 Lê Duẩn, Phường Nam Gia Nghĩa, Lâm Đồng</span>
                </div>
              </div>
              <p className="text-gray-200 text-sm">
                Coppyright © 2025 By Nguyen Cuong.
              </p>
            </div>  
          </div>
        </div>
      </div>
    </footer>
  );
}
