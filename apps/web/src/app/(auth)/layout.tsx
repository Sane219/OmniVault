export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-void crt-scanlines">
      {/* Ambient glow orbs */}
      <div className="orb w-[600px] h-[600px] bg-matrix-green/[0.06] top-[-200px] right-[-100px]" />
      <div className="orb w-[400px] h-[400px] bg-matrix-green/[0.03] bottom-[-100px] left-[-100px]" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,136,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.04)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {children}
    </div>
  )
}
