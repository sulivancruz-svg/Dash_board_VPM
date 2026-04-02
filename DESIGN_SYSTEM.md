# 🎨 Design System — Marketing Dashboard

## Overview

Este documento define o design system semântico, componentes acessíveis e padrões de interação para o Marketing Dashboard.

**Princípios**:
- ✅ Acessibilidade WCAG 2.1 AA
- ✅ Respeito a `prefers-reduced-motion`
- ✅ SVG icons (nunca emojis)
- ✅ Design tokens semânticos
- ✅ Feedback visual claro em todas as interações

---

## 🎯 Design Tokens

### Semantic Colors

```ts
import { semanticColors } from '@/lib/design-tokens';

// Uso
<div className={semanticColors.status.critical.bg}>
  <Icon className={semanticColors.status.critical.icon} />
  <p className={semanticColors.status.critical.text}>Crítico</p>
</div>
```

**Status disponíveis**: `success`, `warning`, `critical`, `info`

Cada status inclui:
- `bg` / `bgDark` — Background para light/dark mode
- `text` / `textDark` — Text color
- `border` / `borderDark` — Border color
- `icon` — Icon color

---

## 🧩 Componentes

### Button

Botão com feedback visual, acessibilidade e loading state.

```tsx
import { Button } from '@/components/button';

<Button variant="primary" size="md" onClick={handleClick}>
  Enviar
</Button>

<Button variant="danger" isLoading={isSubmitting} disabled={isSubmitting}>
  Deletar
</Button>
```

**Props**:
- `variant`: `'primary'` | `'secondary'` | `'danger'`
- `size`: `'sm'` | `'md'` | `'lg'`
- `isLoading`: Mostra spinner e desabilita
- `disabled`: Estado desabilitado

**Features**:
- ✅ Focus ring visível (keyboard nav)
- ✅ Touch target 44×44px mínimo
- ✅ Press feedback (scale-98)
- ✅ Cursor-not-allowed em disabled
- ✅ aria-busy para loading state

---

### KpiCard

Card para exibir KPIs com ícone, valor e delta.

```tsx
import { KpiCard } from '@/components/kpi-card';
import { TrendingUp, BarChart3 } from 'lucide-react';

<KpiCard
  label="Receita"
  value={45000}
  format="currency"
  Icon={BarChart3}
  accentColor="info"
  delta={{ value: 12.5, direction: 'up' }}
/>
```

**Props**:
- `label`: Rótulo do KPI
- `value`: Valor numérico ou string
- `format`: `'currency'` | `'percentage'` | `'number'`
- `Icon`: Componente de ícone Lucide
- `accentColor`: `'success'` | `'warning'` | `'critical'` | `'info'` | `'neutral'`
- `delta`: `{ value: number, direction: 'up' | 'down' }`

**Features**:
- ✅ Sem emojis (usa SVG icons)
- ✅ Feedback visual no hover
- ✅ Dark mode support
- ✅ Números em `tabular-nums`
- ✅ Delta com ícone direcional

---

### AlertPanel

Painel para exibir alertas críticos, avisos e insights.

```tsx
import { AlertPanel } from '@/components/alert-panel';

const alerts = [
  {
    id: '1',
    severity: 'CRITICAL',
    message: '65% dos deals sem faturamento',
    action: 'Verificar no Monde',
  },
];

<AlertPanel alerts={alerts} />
```

**Severidades**:
- `CRITICAL` — Vermelho
- `WARNING` — Amarelo
- `INSIGHT` — Azul
- `SUCCESS` — Verde (vazio state)

**Features**:
- ✅ Ícones semânticos por severity
- ✅ `role="alert"` para screen readers
- ✅ `aria-live` automático
- ✅ Dark mode support
- ✅ Sem emojis

---

## 🌈 Color Palette

### Light Mode
- **Primary**: Blue-500 (`#3b82f6`)
- **Success**: Emerald-500 (`#10b981`)
- **Warning**: Amber-500 (`#f59e0b`)
- **Critical**: Red-500 (`#ef4444`)
- **Text Primary**: Slate-900 (`#0f172a`)
- **Text Secondary**: Slate-600 (`#475569`)

### Dark Mode
- **Primary**: Blue-400 (`#60a5fa`)
- **Success**: Emerald-400 (`#34d399`)
- **Warning**: Amber-400 (`#fbbf24`)
- **Critical**: Red-400 (`#f87171`)
- **Text Primary**: White (`#ffffff`)
- **Text Secondary**: Slate-300 (`#cbd5e1`)

---

## ⌨️ Acessibilidade

### Focus Visibility

Todos os elementos interativos têm focus ring visível:

```css
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

**Teste com**: Tab ↔ Shift+Tab

### Keyboard Navigation

- ✅ Todo elemento tabulável tem ordem lógica
- ✅ Skip links para pular conteúdo
- ✅ Escape para fechar modais
- ✅ Enter/Space para ativar buttons

### Motion

Respeita `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Teste com**: System Settings → Accessibility → Motion

### Screen Readers

Todos os componentes têm:
- ✅ `aria-label` em ícone-only buttons
- ✅ `aria-busy` em loading states
- ✅ `role="alert"` em notifications
- ✅ `aria-live="polite"` em updates

### Contrast Ratios

- ✅ Texto normal: **4.5:1** (WCAG AA)
- ✅ Texto grande: **3:1** (WCAG AA)
- ✅ UI components: **3:1** mínimo

---

## 📱 Touch Targets

Todos os elementos interativos têm **44×44px mínimo**:

```tsx
// ✅ Correto
<button className="min-h-11 min-w-11 px-4 py-2">
  Click me
</button>

// ❌ Errado
<button className="px-2 py-1 text-xs">
  Too small
</button>
```

---

## 🎬 Animations

### Timing

- **Micro-interactions**: 150-200ms (button press, hover)
- **Modal/Sheet**: 300ms (enter/exit)
- **Complex transitions**: ≤400ms

### Easing

- **Enter**: `ease-out` (start slow, end fast)
- **Exit**: `ease-in` (start fast, end slow)

### Example

```tsx
className="transition-all duration-200 motion-safe:hover:shadow-md active:scale-98"
```

---

## 🚫 Anti-Patterns

### ❌ DON'Ts

1. **Emojis como ícones**
   - ❌ `<span>📊 Receita</span>`
   - ✅ `<BarChart3 className="w-5 h-5" />`

2. **Hardcoded colors sem tokens**
   - ❌ `className="text-red-500 bg-blue-50"`
   - ✅ `className={semanticColors.status.critical.text}`

3. **Sem feedback visual**
   - ❌ `<button>Click</button>` (sem hover/active)
   - ✅ `<Button>Click</Button>` (built-in feedback)

4. **Dark mode ignorado**
   - ❌ `className="bg-white text-black"`
   - ✅ `className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"`

5. **Touch targets pequenos**
   - ❌ Ícone 16×16px sem padding
   - ✅ Ícone 16×16px com padding (44×44px total)

6. **Sem focus ring em inputs**
   - ❌ `<input />` (sem outline)
   - ✅ `<input className={focusRing} />` (4px outline azul)

7. **Animações que ignoram prefers-reduced-motion**
   - ❌ `transition-all` sem `motion-safe:`
   - ✅ `motion-safe:transition-all motion-safe:duration-200`

---

## 🧪 Checklist antes de Deploy

- [ ] Todos ícones são SVG (Lucide) — nenhum emoji
- [ ] KpiCard usa `Icon` prop, não string emoji
- [ ] AlertPanel nunca tem emoji (CheckCircle2 para success)
- [ ] Buttons têm feedback visual (hover/active)
- [ ] Dark mode testado em cada página
- [ ] Focus ring visível ao usar Tab
- [ ] Touch targets ≥44×44px em mobile
- [ ] Contrast ratio ≥4.5:1 texto/background
- [ ] `prefers-reduced-motion` testado (System Settings)
- [ ] Labels em todos os inputs (form)
- [ ] `aria-label` em ícone-only buttons

---

## 📚 Referências

- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design](https://m3.material.io/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

**Versão**: 1.0
**Última atualização**: 2026-04-02
