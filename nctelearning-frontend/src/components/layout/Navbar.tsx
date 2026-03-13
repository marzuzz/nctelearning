"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  VideoCameraIcon,
  AcademicCapIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const adminMenuCloseTimeout = useRef<NodeJS.Timeout | null>(null);
  const userMenuCloseTimeout = useRef<NodeJS.Timeout | null>(null);

  const openAdminMenu = () => {
    if (adminMenuCloseTimeout.current) {
      clearTimeout(adminMenuCloseTimeout.current);
      adminMenuCloseTimeout.current = null;
    }
    setAdminMenuOpen(true);
  };

  const scheduleCloseAdminMenu = () => {
    if (adminMenuCloseTimeout.current) {
      clearTimeout(adminMenuCloseTimeout.current);
    }
    adminMenuCloseTimeout.current = setTimeout(
      () => setAdminMenuOpen(false),
      220,
    );
  };

  const openUserMenu = () => {
    if (userMenuCloseTimeout.current) {
      clearTimeout(userMenuCloseTimeout.current);
      userMenuCloseTimeout.current = null;
    }
    setUserMenuOpen(true);
  };

  const scheduleCloseUserMenu = () => {
    if (userMenuCloseTimeout.current) {
      clearTimeout(userMenuCloseTimeout.current);
    }
    userMenuCloseTimeout.current = setTimeout(
      () => setUserMenuOpen(false),
      220,
    );
  };

  const navigation = [
    { name: "Giới thiệu", href: "/about" },
    { name: "Video bài giảng", href: "/videos" },
    { name: "Luyện tập", href: "/practice" },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 md:h-32 lg:h-25">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.svg"
                alt="NCTlearning"
                width={236}
                height={160}
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-nc-gold px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 active:bg-nc-gold/20 active:scale-95"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Admin hover dropdown */}
                {user?.role === "admin" ? (
                  <div
                    className="relative"
                    onMouseEnter={openAdminMenu}
                    onMouseLeave={scheduleCloseAdminMenu}
                  >
                    <div className="flex items-center space-x-2 cursor-pointer select-none">
                      <UserCircleIcon className="h-6 w-6 text-gray-600" />
                      <span className="text-sm text-gray-700">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                        Admin
                      </span>
                    </div>
                    {adminMenuOpen && (
                      <div
                        className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
                        onMouseEnter={openAdminMenu}
                        onMouseLeave={scheduleCloseAdminMenu}
                      >
                        <Link
                          href="/admin/videos"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                        >
                          Quản lý Video
                        </Link>
                        <Link
                          href="/admin/practice"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                        >
                          Quản lý Luyện tập
                        </Link>
                        <Link
                          href="/admin/submissions"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                        >
                          Quản lý bài làm
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="relative"
                    onMouseEnter={openUserMenu}
                    onMouseLeave={scheduleCloseUserMenu}
                  >
                    <div className="flex items-center space-x-2 cursor-pointer select-none">
                      <UserCircleIcon className="h-6 w-6 text-gray-600" />
                      <span className="text-sm text-gray-700">
                        {user?.firstName} {user?.lastName}
                      </span>
                      {user?.gradeLevel ? (
                        <span className="text-xs bg-nc-gold text-white px-2 py-1 rounded-full">
                          Lớp {user.gradeLevel}
                        </span>
                      ) : null}
                    </div>
                    {userMenuOpen && (
                      <div
                        className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
                        onMouseEnter={openUserMenu}
                        onMouseLeave={scheduleCloseUserMenu}
                      >
                        <Link
                          href="/practice/my-submissions"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                        >
                          Kiểm tra điểm
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-gray-600 hover:text-nc-dark-orange transition-all duration-200 active:bg-nc-dark-orange/10 active:scale-95 px-2 py-1 rounded-md"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span className="text-sm">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/login"
                  className="btn-primary flex flex-row space-x-2 transition-all duration-200 active:bg-opacity-80 active:scale-95"
                >
                  <p>Đăng ký ngay</p>
                  <Image
                    src="/Component1.svg"
                    alt="component1"
                    width={12}
                    height={17}
                  />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-nc-gold focus:outline-none focus:text-nc-gold transition-all duration-200 active:bg-nc-gold/20 active:scale-95 p-2 rounded-md"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6 transform transition-all duration-300 rotate-0" />
              ) : (
                <Bars3Icon className="h-6 w-6 transform transition-all duration-300 rotate-0" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div
            className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200 transform transition-transform duration-300 ease-in-out ${
              isMenuOpen ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-nc-gold block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 active:bg-nc-gold/20 active:scale-[0.98]"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="pt-4 border-t border-gray-200">
                {/* Admin Dashboard Link */}
                {user?.role === "admin" && (
                  <div className="space-y-1">
                    <Link
                      href="/admin/videos"
                      className="flex items-center space-x-2 text-gray-600 hover:text-nc-gold px-3 py-2 rounded-md text-base font-medium transition-all duration-200 active:bg-nc-gold/20 active:scale-[0.98]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <CogIcon className="h-5 w-5" />
                      <span>Quản lý Video</span>
                    </Link>
                    <Link
                      href="/admin/practice"
                      className="flex items-center space-x-2 text-gray-600 hover:text-nc-gold px-3 py-2 rounded-md text-base font-medium transition-all duration-200 active:bg-nc-gold/20 active:scale-[0.98]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <CogIcon className="h-5 w-5" />
                      <span>Quản lý Luyện tập</span>
                    </Link>
                    <Link
                      href="/admin/submissions"
                      className="flex items-center space-x-2 text-gray-600 hover:text-nc-gold px-3 py-2 rounded-md text-base font-medium transition-all duration-200 active:bg-nc-gold/20 active:scale-[0.98]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <CogIcon className="h-5 w-5" />
                      <span>Quản lý bài làm</span>
                    </Link>
                  </div>
                )}

                {user?.role !== "admin" && (
                  <Link
                    href="/practice/my-submissions"
                    className="flex items-center space-x-2 text-gray-600 hover:text-nc-gold px-3 py-2 rounded-md text-base font-medium transition-all duration-200 active:bg-nc-gold/20 active:scale-[0.98]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <AcademicCapIcon className="h-5 w-5" />
                    <span>Kiểm tra điểm</span>
                  </Link>
                )}

                <div className="flex items-center space-x-2 px-3 py-2">
                  <UserCircleIcon className="h-6 w-6 text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                  {user?.role === "admin" ? (
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                      Admin
                    </span>
                  ) : user?.gradeLevel ? (
                    <span className="text-xs bg-nc-gold text-white px-2 py-1 rounded-full">
                      Lớp {user.gradeLevel}
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-nc-dark-orange px-3 py-2 rounded-md text-base font-medium transition-all duration-200 active:bg-nc-dark-orange/20 active:scale-[0.98] w-full text-left"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <Link
                  href="/auth/login"
                  className="btn-primary block text-center transition-all duration-200 active:bg-opacity-80 active:scale-95"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Đăng ký ngay
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
