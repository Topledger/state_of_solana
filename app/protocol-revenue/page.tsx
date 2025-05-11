"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "../components/shared/Loader";

export default function ProtocolRevenueRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/protocol-revenue/summary");
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-[70vh]">
      <Loader size="md" />
    </div>
  );
} 