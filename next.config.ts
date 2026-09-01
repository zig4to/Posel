import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js privzeto blokira cross-origin zahteve do dev sredstev (_next/*),
  // zato brez tega telefon prek LAN IP-ja dobi HTML, JS pa se ne naloži in
  // gumbi/kliki ne delujejo. Dovolimo lokalno omrežje za `npm run dev`.
  allowedDevOrigins: ["192.168.1.9", "192.168.*.*"],
};

export default nextConfig;
