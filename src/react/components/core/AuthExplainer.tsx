/**
 * AuthExplainer - Configurable explanation component for authentication
 * Can display either a single paragraph with icon or a list of features with icons,
 * driven by `ExplainerConfig` from the auth store.
 *
 * Ported from `src/svelte/components/core/AuthExplainer.svelte`. Not in Phase C's
 * explicit component list, but required for parity: `SignInCore.svelte` renders it
 * directly (features/paragraph explainer + API error display), so leaving it out would
 * silently drop functionality from the ported `SignInCore`. Renders `@phosphor-icons/react`
 * icons directly rather than porting the thin `../icons/Icon.svelte` wrapper (which just
 * maps a `variant` prop to a CSS custom property and isn't otherwise reused by name here).
 *
 * Icons are imported via deep per-icon paths, not the package barrel -- see
 * `AuthButton.tsx`'s header comment for why (barrel re-exports don't resolve under this
 * project's `moduleResolution: "nodenext"`).
 */
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { Certificate as BadgeCheck } from '@phosphor-icons/react/dist/csr/Certificate';
import { DeviceMobile } from '@phosphor-icons/react/dist/csr/DeviceMobile';
import { Fingerprint } from '@phosphor-icons/react/dist/csr/Fingerprint';
import { Globe } from '@phosphor-icons/react/dist/csr/Globe';
import { Key } from '@phosphor-icons/react/dist/csr/Key';
import { Lock } from '@phosphor-icons/react/dist/csr/Lock';
import { Pulse } from '@phosphor-icons/react/dist/csr/Pulse';
import { Shield } from '@phosphor-icons/react/dist/csr/Shield';
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { UserCheck } from '@phosphor-icons/react/dist/csr/UserCheck';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ApiError, ExplainerConfig } from '../../../core/types/index.js';
import { m } from '../../../core/utils/i18n.js';
import './AuthExplainer.css';

export interface AuthExplainerProps {
  config?: ExplainerConfig | null;
  apiError?: ApiError | null;
}

const messages = m as unknown as Record<string, (params?: Record<string, unknown>) => string>;

const iconMap: Record<string, PhosphorIcon> = {
  Lock,
  Shield,
  BadgeCheck,
  Key,
  UserCheck,
  ShieldCheck,
  Fingerprint,
  DeviceMobile,
  Globe,
  CheckCircle
};

function getIconComponent(iconName: string): PhosphorIcon {
  return iconMap[iconName] || Lock;
}

function getIconWeight(
  weight?: string
): 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' {
  return (weight as 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone') || 'duotone';
}

export function AuthExplainer({ config = null, apiError = null }: AuthExplainerProps) {
  if (!config && !apiError) return null;

  return (
    <div className={`auth-explainer mt-4 ${config?.className || ''}`}>
      {config?.type === 'paragraph' && (
        <div className="explainer-paragraph">
          {config.iconName &&
            (() => {
              const IconComponent = getIconComponent(config.iconName as string);
              return (
                <div className="flex items-center justify-center shrink-0 mt-px">
                  <IconComponent size={16} weight={getIconWeight(config.iconWeight)} color="currentColor" />
                </div>
              );
            })()}
          <span
            className="flex-1 text-left"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: translation strings may contain markup, same as the Svelte version's {@html}.
            dangerouslySetInnerHTML={{
              __html: config.textKey
                ? config.useCompanyName && config.companyName
                  ? messages[config.textKey]({ companyName: config.companyName })
                  : messages[config.textKey]()
                : ''
            }}
          />
        </div>
      )}

      {config?.type === 'features' && config.features && (
        <div className="explainer-features">
          {config.features.map((feature) => {
            const FeatureIcon = getIconComponent(feature.iconName);
            return (
              <div className="flex items-center gap-2" key={feature.iconName + feature.textKey}>
                <div className="feature-icon">
                  <FeatureIcon size={20} weight={getIconWeight(feature.iconWeight)} color="currentColor" />
                </div>
                <span
                  className="feature-text"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: translation strings may contain markup, same as the Svelte version's {@html}.
                  dangerouslySetInnerHTML={{ __html: messages[feature.textKey](config.params) }}
                />
              </div>
            );
          })}
        </div>
      )}

      {apiError && (
        <div className="flex items-center gap-2">
          <Pulse size={20} weight="duotone" color="var(--icon-color-error, var(--color-brand-error, #E53E3E))" aria-label="Error icon" />
          <span className="feature-text">{m[apiError.code]()}</span>
        </div>
      )}
    </div>
  );
}
