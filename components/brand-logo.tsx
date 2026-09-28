import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return <Image
    src="/frimps-logo.jpeg"
    alt="Frimps MB Autoboss"
    width={1500}
    height={1500}
    unoptimized
    className={`brand-logo ${className}`.trim()}
  />;
}
