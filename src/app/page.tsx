import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white text-black">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">MyFamilyButler</h1>
        <p className="text-gray-600 mb-8">
          The AI-powered assistant for Austrian families. Organize your life via WhatsApp.
        </p>
        
        {/* Verification Requirements */}
        <div className="border-t pt-8 text-sm text-gray-500 text-left">
          <p className="font-bold mb-2">Legal Information (Impressum)</p>
          
          {/* CRITICAL: This Name MUST match your Credit Card / ID */}
          <p>Operator: Nominchuluun Baasankhuu</p> 
          
          {/* CRITICAL: This Address MUST match your Credit Card / ID */}
          <p>Address: Madleinweg 3, 6065 Thaur, Austria</p>
          
          <p>Contact: info@myfamilybutler.com</p>
          
          <div className="mt-4 flex gap-4">
            <Link href="/privacy" className="underline">Privacy Policy</Link>
            <Link href="/terms" className="underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
