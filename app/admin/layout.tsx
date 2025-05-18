import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Admin Panel - State of Solana',
  description: 'Admin panel for managing and creating charts',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-indigo-600">Solana Admin</h1>
              </div>
              <nav className="ml-6 flex space-x-8">
                <Link href="/admin" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300">
                  Dashboard
                </Link>
                <Link href="/admin/chart-creator" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:border-gray-300">
                  Chart Creator
                </Link>
                <Link href="/admin/manage-charts" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:border-gray-300">
                  Manage Charts
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                Back to Site
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 text-center">
            Solana Admin Panel &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
} 