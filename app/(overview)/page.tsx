"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OverviewIndexPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen bg-black text-gray-400">
      Redirecting to Dashboard...
    </div>
  );
} 