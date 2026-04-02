# Dashboard Refactoring Guide

## 📋 Overview

Este guia documenta o processo de refatoração do dashboard para usar componentes de formulário modulares e consistentes.

**Status:**
- ✅ Componentes form/ criados e documentados
- ✅ Settings page refatorada como piloto
- ⏳ Outras páginas aguardando refatoração

## 🎯 Objetivos

1. **Consistência Visual**: Todos os formulários usam o mesmo design system
2. **Manutenibilidade**: Componentes reutilizáveis reduzem duplicação
3. **Acessibilidade**: WCAG 2.1 AA compliance em todos os formulários
4. **Dark Mode**: Suporte total a dark mode em todos os componentes
5. **Developer Experience**: Imports simples e API intuitiva

## 📁 Estrutura de Diretórios

```
src/components/
├── form/                          # ← Novos componentes modulares
│   ├── form-input.tsx            # Text input com label/erro
│   ├── form-textarea.tsx         # Textarea com label/erro
│   ├── form-select.tsx           # Dropdown com label/erro
│   ├── form-checkbox.tsx         # Checkbox com label
│   ├── form-radio.tsx            # Radio button com label
│   ├── form-label.tsx            # Label simples (raro)
│   ├── form-section.tsx          # Container com header/ícone
│   ├── form-message.tsx          # Mensagens success/error/info
│   ├── file-upload.tsx           # Upload com drag-and-drop
│   ├── index.ts                  # Exports centralizados
│   └── README.md                 # Documentação completa
├── button.tsx                     # Button component
├── design/                        # Componentes de design
└── [outros componentes]
```

## 🔄 Processo de Refatoração

### Passo 1: Revisar a Página

```bash
# Identifique:
# 1. Quantas seções de formulário existem?
# 2. Que tipos de inputs (text, textarea, select, checkbox, radio)?
# 3. Como é o layout (uma coluna, duas colunas, etc)?
# 4. Como são os estados de erro/sucesso?
```

### Passo 2: Importar Componentes

```tsx
// ✅ Correto - importe do diretório form/
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormSection,
  FileUpload,
  FormMessage,
} from '@/components/form';
```

### Passo 3: Estruturar Seções

Agrupe campos relacionados em `FormSection`:

```tsx
<FormSection
  title="Dados Pessoais"
  description="Informações do usuário"
  icon={<User className="w-5 h-5" />}
>
  {/* Campos relacionados aqui */}
</FormSection>
```

### Passo 4: Converter Inputs

**Antes:**
```tsx
<div>
  <label className="block text-sm font-semibold mb-2">
    Email <span className="text-red-500">*</span>
  </label>
  <input
    type="email"
    className="w-full px-3 py-2 border rounded-lg"
    value={email}
    onChange={e => setEmail(e.target.value)}
  />
  {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
</div>
```

**Depois:**
```tsx
<FormInput
  type="email"
  label="Email"
  value={email}
  onChange={e => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

### Passo 5: Mensagens de Status

**Antes:**
```tsx
{message && (
  <div className={`p-3 rounded text-sm ${
    message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }`}>
    {message.text}
  </div>
)}
```

**Depois:**
```tsx
{message && (
  <FormMessage
    type={message.type}
    message={message.text}
    onDismiss={() => setMessage(null)}
  />
)}
```

### Passo 6: Layout Responsivo

Use grid para múltiplas colunas:

```tsx
<div className="grid grid-cols-2 gap-4">
  <FormInput label="Primeiro Nome" />
  <FormInput label="Sobrenome" />
</div>

<div className="space-y-4">
  <FormTextarea label="Descrição" rows={4} />
</div>
```

## 📊 Exemplo Completo

Aqui está um exemplo completo de uma página refatorada:

```tsx
'use client';

import { useState } from 'react';
import { User, Mail, Lock } from 'lucide-react';
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormSection,
  FormMessage,
} from '@/components/form';
import { Button } from '@/components/button';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    role: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Perfil atualizado com sucesso!',
        });
      } else {
        setErrors(data.errors || {});
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao salvar',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro de conexão',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
          Usuário
        </p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Meu Perfil
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <FormSection
            title="Dados Pessoais"
            description="Informações básicas do seu perfil"
            icon={<User className="w-5 h-5" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Nome Completo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
              />
              <FormInput
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />
            </div>

            <FormSelect
              label="Cargo"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={[
                { value: '', label: 'Selecione um cargo' },
                { value: 'admin', label: 'Administrador' },
                { value: 'user', label: 'Usuário' },
              ]}
              error={errors.role}
              required
            />

            <FormTextarea
              label="Biografia"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Conte um pouco sobre você..."
              rows={4}
            />

            {message && (
              <FormMessage
                type={message.type}
                message={message.text}
                onDismiss={() => setMessage(null)}
              />
            )}

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={saving}
              isLoading={saving}
              className="w-full"
            >
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </FormSection>
        </div>
      </form>
    </div>
  );
}
```

## 📋 Checklist de Refatoração

Use este checklist ao refatorar cada página:

```markdown
- [ ] Identifiquei todas as seções de formulário
- [ ] Importei componentes form/ necessários
- [ ] Removi estilos CSS manuais (h-10, px-3, border, etc)
- [ ] Agrupei campos em FormSection
- [ ] Converti todos os inputs para Form*
- [ ] Atualizei labels - agora estão nos inputs
- [ ] Atualizei validação para usar prop error
- [ ] Adicionei FormMessage para sucesso/erro
- [ ] Testei dark mode (F12 → DevTools → theme toggle)
- [ ] Testei responsividade (redimensionar janela)
- [ ] Removi prop className manual dos inputs
- [ ] Verifico console - sem erros
```

## 🎨 Design System Tokens

Todos os componentes usam tokens do design system:

```tsx
// ✅ Componentes form/ usam automaticamente:
- focusRing: Focus estado acessível
- Cores semânticas: blue-500, red-500, emerald-500
- Espaçamento: 8px baseline (space-2, space-4)
- Tipografia: text-sm, text-xs
- Dark mode: dark:bg-slate-800, etc
```

Não há necessidade de adicionar classes CSS extras.

## 🚀 Ordem de Refatoração (Prioridade)

1. **Settings** ✅ (já refatorada - piloto)
2. **Paid Media** - Muitos inputs e uploads
3. **Pipedrive Direto** - Inputs e toggles
4. **Funnel** - Inputs e selects
5. **Channels** - Simples, poucos inputs
6. **Growth** - Gráficos (menos inputs)
7. **KPIs** - Principalmente visualização

## ⏱️ Tempo Estimado

- Página simples (5-10 campos): 30 minutos
- Página moderada (10-20 campos): 1 hora
- Página complexa (20+ campos): 1.5-2 horas

Tempo reduzido após as primeiras 2-3 páginas, pois você se familiariza com o padrão.

## 🔍 Verificação Final

Após refatorar uma página:

1. **Visual Check**
   ```bash
   npm run dev
   # Abra a página e verifique visualmente
   # Clique em cada input, teste drag-and-drop
   ```

2. **Dark Mode Check**
   ```
   F12 → DevTools → tema (light/dark)
   Verifique se tudo fica legível
   ```

3. **Console Check**
   ```
   F12 → Console
   Deve estar sem errors ou warnings
   ```

4. **Mobile Check**
   ```
   F12 → Responsive Design Mode
   Redimensione para mobile (375px, 768px)
   Verifique responsividade do grid
   ```

## 🎯 Métricas de Sucesso

Após refatoração completa do dashboard:

- ✅ 100% dos formulários usam componentes form/
- ✅ 0 classes CSS manuais em inputs/labels/selects
- ✅ 100% dos inputs têm validação com error prop
- ✅ 100% suporte a dark mode
- ✅ 0 console errors/warnings
- ✅ Responsive em todos os breakpoints
- ✅ WCAG 2.1 AA compliance em todos os inputs

## 📚 Referências

- **Documentação**: `/src/components/form/README.md`
- **Exemplo Piloto**: `/src/app/settings/page.tsx`
- **Design Tokens**: `/src/lib/design-tokens.ts`
- **Button Component**: `/src/components/button.tsx`

## ❓ FAQ

**P: Posso usar FormInput sem FormSection?**
R: Sim! FormSection é apenas para agrupar campos. Use quando fizer sentido logicamente.

**P: Como faço para grid de 3 colunas?**
R: Use `grid-cols-3` em vez de `grid-cols-2`:
```tsx
<div className="grid grid-cols-3 gap-4">
  <FormInput label="Campo 1" />
  <FormInput label="Campo 2" />
  <FormInput label="Campo 3" />
</div>
```

**P: E se precisar de estilo customizado?**
R: Use a prop `className`:
```tsx
<FormInput
  label="Email"
  className="text-lg" // Adiciona estilos extras
/>
```

**P: Como fazer textarea obrigatória?**
R: Use a prop `required`:
```tsx
<FormTextarea
  label="Descrição"
  required
/>
```

## 📝 Template para Nova Página

Use este template ao começar a refatorar uma página:

```tsx
'use client';

import { useState } from 'react';
import { [Icon] } from 'lucide-react';
import {
  FormInput,
  FormSection,
  FormMessage,
} from '@/components/form';
import { Button } from '@/components/button';

export default function PageName() {
  const [formData, setFormData] = useState({
    // estado aqui
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // API call aqui
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Page Title</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <FormSection title="Section" icon={<Icon className="w-5 h-5" />}>
            {/* Campos aqui */}
          </FormSection>
        </div>
      </form>
    </div>
  );
}
```

---

**Atualizado:** 2025-04-02
**Versão:** 1.0
**Status:** Production Ready
