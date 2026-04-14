"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Page/view transition wrapper
export function PageTransition({ children, id }: { children: React.ReactNode; id: string }) {
  return <AnimatePresence mode="wait">
    <motion.div key={id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      {children}
    </motion.div>
  </AnimatePresence>;
}

// Staggered card grid — children animate in with delay
export function StaggerGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}>
    {children}
  </motion.div>;
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } }}>
    {children}
  </motion.div>;
}

// Scroll-triggered reveal
export function ScrollReveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay, ease: "easeOut" }}>
    {children}
  </motion.div>;
}

// Animated number counter
export function AnimatedNumber({ value, duration = 900, prefix = "", suffix = "", decimals = 0 }: { value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  useEffect(() => {
    const startVal = prevValue.current;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (value - startVal) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else prevValue.current = value;
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <span>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}{suffix}</span>;
}

// Animated progress bar
export function AnimatedBar({ value, color = "var(--accent-primary)", height = 8, className, delay = 0 }: { value: number; color?: string; height?: number; className?: string; delay?: number }) {
  return <div className={`bg-[var(--surface-2)] rounded-full overflow-hidden ${className || ""}`} style={{ height }}>
    <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: "0%" }} animate={{ width: `${Math.min(value, 100)}%` }} transition={{ duration: 0.7, delay, ease: "easeOut" }} />
  </div>;
}

// Modal wrapper with animations
export function AnimatedModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <motion.div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
    <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
    <motion.div className="relative" initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 5 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()}>
      {children}
    </motion.div>
  </motion.div>;
}

// Interactive button with press feedback
export function PressButton({ children, onClick, className, style, disabled, title }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; className?: string; style?: React.CSSProperties; disabled?: boolean; title?: string }) {
  return <motion.button onClick={onClick} className={className} style={style} disabled={disabled} title={title} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
    {children}
  </motion.button>;
}

// Hover card with lift effect
export function HoverCard({ children, className, style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <motion.div className={className} style={style} onClick={onClick} whileHover={{ y: -3, boxShadow: "var(--shadow-3)" }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
    {children}
  </motion.div>;
}
