// File: components/dashboard/DashboardLayout.tsx
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head'; // Allow child pages to set their own specific head content if needed

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string; // Optional: Child page can pass a specific title
}

const navItems = [
  { href: '/dashboard', label: 'Article Feed', icon: '📰' }, // Placeholder icon
  { href: '/dashboard/sources', label: 'Manage Sources', icon: '⚙️' },
  { href: '/dashboard/logs', label: 'Fetch Logs', icon: '📊' },
  // { href: '/dashboard/settings', label: 'Settings', icon: '🔧' }, // Future
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, pageTitle = "News Aggregator Dashboard" }) => {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        {/* You can add other common meta tags here */}
      </Head>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-800 text-slate-100 p-5 space-y-6 shadow-lg md:sticky md:top-0 md:h-screen">
          <div className="text-center md:text-left">
            <Link href="/dashboard" legacyBehavior>
              <a className="text-2xl font-bold hover:text-indigo-300 transition-colors">My Aggregator</a>
            </Link>
            <p className="text-xs text-slate-400 mt-1">Personal News Feed</p>
          </div>
          <nav className="mt-8">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} legacyBehavior>
                    <a
                      className={`flex items-center py-2.5 px-4 rounded-md transition duration-200 ease-in-out
                        ${
                          router.pathname === item.href || (item.href !== '/dashboard' && router.pathname.startsWith(item.href))
                            ? 'bg-slate-900 text-white font-semibold shadow-inner'
                            : 'hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.label}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* Future: Global actions like "Fetch All Sources" button can go here */}
          <div className="mt-auto pt-6 border-t border-slate-700">
            {/* Placeholder for future global actions or user info */}
            <p className="text-xs text-slate-500 text-center">&copy; {new Date().getFullYear()} Your Aggregator</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {/* The children prop will render the content of the current dashboard page */}
          {children}
        </main>
      </div>
    </>
  );
};

export default DashboardLayout;