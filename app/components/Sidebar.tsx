"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Overview", path: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { name: "DEX", path: "/dex", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { name: "REV", path: "/rev", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "Stablecoins", path: "/stablecoins", icon: "M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "Protocol Revenue", path: "/protocol-revenue", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
];

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <div className="h-screen w-48 bg-black text-gray-200 flex flex-col fixed border-r border-gray-900 shadow-xl">
      <div className="px-4 pt-4 pb-3">
        <div className="relative w-32 h-7 grayscale brightness-300 opacity-100">
          <Image
            src="https://topledger.xyz/assets/images/logo/topledger-full.svg?imwidth=384"
            alt="TopLedger Logo"
            fill
            style={{ objectFit: 'contain', objectPosition: 'left' }}
            priority
          />
        </div>
      </div>
      
      <div className="px-3 py-1">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
      </div>
      
      <nav className="flex-1 px-2 py-3">
        <ul className="space-y-2.5">
          {menuItems.map((item) => {
            const isActive = 
              (item.path === '/' && (pathname === '/' || pathname?.startsWith('/market-dynamics') || pathname?.startsWith('/protocol-rev') || pathname?.startsWith('/network-usage') || pathname?.startsWith('/dashboard'))) || 
              (item.path !== '/' && pathname?.startsWith(item.path));
              
            return (
              <li key={item.name}>
                <Link 
                  href={item.path} 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'text-white bg-gray-900/70' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/40'
                  }`}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 min-w-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-3 text-[10px] text-gray-500 flex items-center justify-center border-t border-gray-900/50">
        <span>State of Solana © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
} 