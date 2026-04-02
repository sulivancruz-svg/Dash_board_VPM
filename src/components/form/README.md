# Form Components Library

Componentes de formulário modulares seguindo o design system do dashboard. Todos os componentes suportam dark mode, acessibilidade WCAG 2.1 AA e estados de validação.

## 📦 Componentes Disponíveis

### FormInput
Input de texto com label, descrição e validação.

```tsx
import { FormInput } from '@/components/form';

<FormInput
  label="Nome Completo"
  description="Seu nome legal"
  value={name}
  onChange={e => setName(e.target.value)}
  placeholder="ex: João Silva"
  error={errors.name}
  required
/>
```

**Props:**
- `label?: string` - Label do campo
- `description?: string` - Texto descritivo abaixo do label
- `error?: string` - Mensagem de erro
- `icon?: React.ReactNode` - Ícone antes do input
- `required?: boolean` - Marca como obrigatório
- Herda props de `HTMLInputElement`

### FormTextarea
Textarea para textos longos.

```tsx
import { FormTextarea } from '@/components/form';

<FormTextarea
  label="Descrição do Projeto"
  value={description}
  onChange={e => setDescription(e.target.value)}
  rows={5}
  error={errors.description}
  required
/>
```

**Props:** Mesmas que `FormInput` + `rows`, `cols`, etc.

### FormSelect
Dropdown de seleção.

```tsx
import { FormSelect } from '@/components/form';

<FormSelect
  label="País"
  options={[
    { value: 'br', label: 'Brasil' },
    { value: 'pt', label: 'Portugal' },
    { value: 'ao', label: 'Angola' },
  ]}
  value={country}
  onChange={e => setCountry(e.target.value)}
  error={errors.country}
  required
/>
```

**Props:**
- `label?: string`
- `description?: string`
- `error?: string`
- `options: FormSelectOption[]` - Array com value e label
- Herda props de `HTMLSelectElement`

### FormCheckbox
Checkbox com label customizável.

```tsx
import { FormCheckbox } from '@/components/form';

<FormCheckbox
  label="Concordo com os termos"
  description="Você deve aceitar antes de continuar"
  checked={accepted}
  onChange={e => setAccepted(e.target.checked)}
  error={errors.accepted}
  required
/>
```

### FormRadio
Radio button com label customizável.

```tsx
import { FormRadio } from '@/components/form';

<div className="space-y-3">
  <FormRadio
    label="Sim"
    name="confirm"
    value="yes"
    checked={answer === 'yes'}
    onChange={e => setAnswer(e.target.value)}
  />
  <FormRadio
    label="Não"
    name="confirm"
    value="no"
    checked={answer === 'no'}
    onChange={e => setAnswer(e.target.value)}
  />
</div>
```

### FormLabel
Label simples com descrição (raramente usado, pois inputs já incluem).

```tsx
import { FormLabel } from '@/components/form';

<FormLabel htmlFor="email" required description="Seu email principal">
  Email
</FormLabel>
```

### FormSection
Container para agrupar campos relacionados com header e ícone.

```tsx
import { FormSection } from '@/components/form';
import { Palette } from 'lucide-react';

<FormSection
  title="Identidade da Empresa"
  description="Logo e nome exibidos no canto superior esquerdo"
  icon={<Palette className="w-5 h-5" />}
>
  {/* Campos aqui */}
</FormSection>
```

### FileUpload
Upload de arquivo com drag-and-drop.

```tsx
import { FileUpload } from '@/components/form';

<FileUpload
  label="Logomarca"
  description="PNG, JPG, WEBP ou SVG (máx 5MB)"
  accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
  onFileSelect={file => setLogoFile(file)}
  selectedFile={logoFile}
  error={errors.logo}
/>
```

### FormMessage
Mensagem de sucesso/erro/warning/info.

```tsx
import { FormMessage } from '@/components/form';

{message && (
  <FormMessage
    type={message.type}
    message={message.text}
    onDismiss={() => setMessage(null)}
  />
)}
```

**Types:** `'success' | 'error' | 'warning' | 'info'`

## 🎨 Design System Features

Todos os componentes seguem o design system:

- ✅ **Dark Mode**: Classes `dark:*` automáticas
- ✅ **Focus Ring**: Acessibilidade com foco visível
- ✅ **Error States**: Validação integrada com mensagens
- ✅ **Typography**: Consistent font sizes e weights
- ✅ **Spacing**: 8px baseline rhythm
- ✅ **Icons**: Lucide React icons
- ✅ **Colors**: Semantic color tokens

## 🔄 Padrão de Refatoração

Quando refatorar uma página para usar os componentes form/:

### Antes (Old Styling)
```tsx
<div>
  <label className="block text-sm font-semibold text-slate-600 mb-2">
    Nome <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
    value={name}
    onChange={e => setName(e.target.value)}
  />
  {errors.name && <span className="text-red-500 text-xs">{errors.name}</span>}
</div>
```

### Depois (New Components)
```tsx
import { FormInput } from '@/components/form';

<FormInput
  label="Nome"
  value={name}
  onChange={e => setName(e.target.value)}
  error={errors.name}
  required
/>
```

## 📋 Checklist de Refatoração

Para refatorar uma página:

- [ ] Importar componentes: `import { FormInput, FormSection, ... } from '@/components/form'`
- [ ] Agrupar campos relacionados em `<FormSection>`
- [ ] Substituir inputs manuais por `<FormInput>`, `<FormSelect>`, etc
- [ ] Substituir labels manuais - labels já estão nos inputs
- [ ] Adicionar `error` prop para mostrar erros
- [ ] Usar `<FormMessage>` para avisos/sucessos
- [ ] Substituir file uploads por `<FileUpload>`
- [ ] Atualizar buttons para usar `<Button>` component
- [ ] Remover classes CSS manuais (usar design tokens)
- [ ] Testar dark mode

## 🔗 Import Otimizado

Importe apenas o necessário:

```tsx
// ✅ Bom
import { FormInput, FormSection } from '@/components/form';

// ❌ Evitar
import { FormInput } from '@/components/form/form-input';
```

## 📱 Responsive

Todos os componentes são responsivos por padrão. Para layouts customizados, use grid/flexbox:

```tsx
<div className="grid grid-cols-2 gap-3">
  <FormInput label="Nome" />
  <FormInput label="Email" />
</div>

<div className="space-y-4">
  <FormSection>
    {/* Seção em tela cheia */}
  </FormSection>
</div>
```

## 🎯 Exemplo Completo de Página Refatorada

Veja `/src/app/settings/page.tsx` para exemplo completo de como usar todos os componentes em uma página real.

## 🚀 Próximos Passos

Páginas a refatorar em ordem de prioridade:
1. ✅ Settings (piloto - já refatorada)
2. Paid Media
3. Pipedrive Direto
4. Funnel
5. Channels
6. Growth
7. KPIs

---

**Created:** 2025-04-02
**Last Updated:** 2025-04-02
**Status:** Production Ready
