// File: components/dashboard/DashboardLayout.tsx
import React, { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import Head from 'next/head';

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  category: 'content' | 'management' | 'tools';
}

// Consolidated navigation items with categories
const navItems: NavItem[] = [
  { href: '/dashboard/articles/feed', label: 'Article Feed', icon: '📰', category: 'management' },
  { href: '/dashboard/articles/sources', label: 'Manage Sources', icon: '🌐', category: 'management' },
  { href: '/dashboard/articles/fetcher-logs', label: 'Fetch Logs', icon: '📊', category: 'management' },
  { href: '/dashboard/tools', label: 'Tools', icon: '🛠️', category: 'tools' },
  { href: '/dashboard/tools/create', label: 'Create Tool', icon: '➕', category: 'tools' },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, pageTitle = "News Aggregator Dashboard" }) => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-800 text-slate-100 p-5 space-y-6 shadow-lg md:sticky md:top-0 md:h-screen">
          <div className="text-center md:text-left">
            <Link href="/dashboard/dash-test" legacyBehavior>
              <a className="text-2xl font-bold hover:text-indigo-300 transition-colors">Built With AI</a>
            </Link>
            <p className="text-xs text-slate-400 mt-1">Personal News Feed</p>
          </div>
          <nav className="mt-8">
            {/* Group nav items by category */}
            {Object.entries(
              navItems.reduce((groups, item) => {
                if (!groups[item.category]) {
                  groups[item.category] = [];
                }
                groups[item.category].push(item);
                return groups;
              }, {} as Record<string, typeof navItems>)
            ).map(([category, items], groupIndex) => (
              <div key={category} className={groupIndex > 0 ? 'pt-6 border-t border-slate-700' : ''}>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} legacyBehavior>
                        <a
                          className={`flex items-center py-2.5 px-4 rounded-md transition duration-200 ease-in-out
                            ${router.pathname === item.href
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
              </div>
            ))}
          </nav>

          {/* User Info and Sign Out */}
          <div className="mt-auto pt-6 border-t border-slate-700 space-y-3">
            {session?.user && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {session.user.image ? (
                    <div className="w-8 h-8 rounded-full mr-2 overflow-hidden bg-slate-600 flex-shrink-0">
                      <Image
                        src={session.user.image}
                        alt="User avatar"
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full mr-2 bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-300 text-sm font-medium">
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500 text-center">&copy; {new Date().getFullYear()} Your Aggregator</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </>
  );
};

export default DashboardLayout;