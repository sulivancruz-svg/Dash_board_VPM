/**
 * Form Components Library
 *
 * Organized modular form components following the design system.
 * All components support:
 * - Dark mode (dark:* classes)
 * - Accessibility (WCAG 2.1 AA)
 * - Custom styling via className prop
 * - Error states and validation
 * - Consistent spacing and typography
 *
 * Usage:
 * ```tsx
 * import { FormInput, FormSection, FormMessage } from '@/components/form';
 *
 * <FormSection title="Dados Pessoais">
 *   <FormInput
 *     label="Nome"
 *     value={name}
 *     onChange={e => setName(e.target.value)}
 *     error={errors.name}
 *     required
 *   />
 *   {message && <FormMessage type={message.type} message={message.text} />}
 * </FormSection>
 * ```
 */

export { FormInput } from './form-input';
export { FormLabel } from './form-label';
export { FormSection } from './form-section';
export { FormTextarea } from './form-textarea';
export { FormSelect } from './form-select';
export { FormCheckbox } from './form-checkbox';
export { FormRadio } from './form-radio';
export { FormMessage } from './form-message';
export { FileUpload } from './file-upload';

export type { FormSelectOption } from './form-select';
