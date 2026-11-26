"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bike, LayoutDashboard, MessageSquareText, MoreHorizontal, Plus, Search, Settings, Users, Zap } from "lucide-react";
const links = [{href:"/",label:"Overview",icon:LayoutDashboard},{href:"/customers",label:"Customers",icon:Users},{href:"/messages",label:"Messages",icon:MessageSquareText},{href:"/settings",label:"Settings",icon:Settings}];
export function AppShell({children}:{children:React.ReactNode}) {
 const path=usePathname();
 return <div className="min-h-screen bg-ink text-paper">
  <aside className="sidebar fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-panel lg:flex">
   <Link href="/" className="flex h-[84px] items-center gap-3 px-7"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber text-ink"><Zap size={22} fill="currentColor"/></div><div><div className="font-display text-xl font-bold uppercase tracking-wide">AUTOPILOT</div><div className="text-[10px] uppercase tracking-[.2em] text-muted">Biswajit Power Hub</div></div></Link>
   <div className="px-4 pt-5 text-[10px] font-bold uppercase tracking-[.2em] text-muted">Workspace</div><nav className="mt-2 space-y-1 px-3">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={`nav-link ${path===href||path.startsWith(href+"/")&&href!=="/"?"active":""}`}><Icon size={18}/><span>{label}</span></Link>)}</nav>
   <div className="mt-auto m-4 rounded-xl border border-line bg-raised p-4"><div className="flex items-center gap-2 text-amber"><Activity size={15}/><span className="text-[10px] font-bold uppercase tracking-widest">Daily pulse</span></div><p className="mt-3 font-display text-2xl font-bold uppercase">Keep rolling.</p><p className="mt-1 text-xs leading-5 text-muted">Your reminders are ready when you are.</p></div>
   <div className="border-t border-line p-4 text-[11px] text-muted">BERHAMPORE · WEST BENGAL</div>
  </aside>
  <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-line bg-ink/95 px-4 backdrop-blur md:px-7 lg:ml-60 lg:h-[76px]"><div className="flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-lg bg-amber text-ink"><Zap size={19} fill="currentColor"/></div><div className="font-display text-lg font-bold tracking-wide">AUTOPILOT</div></div><div className="hidden items-center gap-2 text-sm text-muted md:flex"><span>Customer and reminder workspace</span></div><div className="ml-auto flex items-center gap-3"><span className="hidden text-xs text-muted sm:inline">{new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",weekday:"long",day:"numeric",month:"short"}).format(new Date())}</span><Link href="/?add=1" className="button-primary"><Plus size={17}/><span className="hidden sm:inline">Add delivery</span></Link></div></header>
  <main className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 md:px-7 md:pt-8 lg:ml-60 lg:pb-12">{children}</main>
  <nav className="mobile-tabs fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-center justify-around border-t border-line bg-panel px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">{links.slice(0,2).map(({href,label,icon:Icon})=><Link key={href} href={href} className={`mobile-tab ${path===href?"text-amber":""}`}><Icon size={19}/><span>{label}</span></Link>)}<Link href="/?add=1" className="-mt-7 grid h-14 w-14 place-items-center rounded-full border-4 border-ink bg-amber text-ink shadow-lg"><Plus size={26}/></Link>{links.slice(2).map(({href,label,icon:Icon})=><Link key={href} href={href} className={`mobile-tab ${path===href?"text-amber":""}`}><Icon size={19}/><span>{label}</span></Link>)}</nav>
 </div>
}
