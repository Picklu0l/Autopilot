export const money = (n: number | string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
export const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const waLink = (phone: string, text: string) => { const digits=phone.replace(/\D/g, ""); const intl=digits.length===10?`91${digits}`:digits; return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`; };
