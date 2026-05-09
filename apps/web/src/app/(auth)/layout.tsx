export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-background">
      {/* Subtle glowing gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cta/10 via-background to-background pointer-events-none" />
      
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cta/5 rounded-full blur-[100px] pointer-events-none" />
      
      {children}
    </div>
  )
}
