// Темп "вау"-анімації появи дашборду («C. Кінематографічний, повільний»
// з /design-preview) — єдине джерело правди для затримок між секціями.
// Звичайний (не "use client") модуль, щоб серверний DashboardPage міг
// рахувати затримки як прості числа, а не отримувати клієнтський proxy.
export const DASHBOARD_ANIM_PACE = {
  skeletonMs: 650,
  kpiRevealAt: 650,
  kpiStagger: 140,
  heroAt: 1250,
  heroDuration: 1100,
  comboAt: 2500,
  comboStagger: 160,
};
