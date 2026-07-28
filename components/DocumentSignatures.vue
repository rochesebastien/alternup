<script setup lang="ts">
import {
  canSignDocument,
  isFullySigned,
  signatoryRoleLabel,
  signatureIneligibleReason,
  signatureStatusText,
  type SignatureBlock,
  type SignatureParty
} from '~/shared/utils/signatures'

const props = withDefaults(
  defineProps<{
    block: SignatureBlock
    /** Utilisateur courant : détermine l'affichage du bouton « Signer ». */
    currentUserId?: string | null
    /** Requête de signature en cours. */
    pending?: boolean
    /** Message d'erreur de la dernière tentative. */
    errorMessage?: string | null
    /** Rendu purement documentaire (livret imprimé) : aucun bouton. */
    readonly?: boolean
  }>(),
  {
    currentUserId: null,
    pending: false,
    errorMessage: null,
    readonly: false
  }
)

const emit = defineEmits<{ sign: [] }>()

const canSign = computed<boolean>(
  () => !props.readonly && canSignDocument(props.block, props.currentUserId)
)

const complete = computed<boolean>(() => isFullySigned(props.block.parties))

const confirmOpen = ref<boolean>(false)

function partyLabel(party: SignatureParty): string {
  return `${signatoryRoleLabel(party.role)} · ${party.name}`
}

function onConfirm(): void {
  confirmOpen.value = false
  emit('sign')
}
</script>

<template>
  <section
    class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 print-avoid-break"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-sm font-semibold text-[var(--ui-text)]">Signatures</h2>
        <p class="text-xs text-[var(--ui-text-muted)] mt-0.5">
          Signature électronique horodatée des deux parties.
        </p>
      </div>
      <UBadge
        v-if="complete"
        color="success"
        variant="subtle"
        icon="i-lucide-badge-check"
        class="font-normal shrink-0"
      >
        Document signé
      </UBadge>
    </div>

    <ul class="mt-4 space-y-3">
      <li
        v-for="party in block.parties"
        :key="party.userId"
        class="flex items-start gap-3"
      >
        <UIcon
          :name="party.signedAt ? 'i-lucide-check-circle-2' : 'i-lucide-clock'"
          class="size-4 mt-0.5 shrink-0"
          :class="
            party.signedAt ? 'text-[var(--ui-success)]' : 'text-[var(--ui-text-dimmed)]'
          "
        />
        <div class="min-w-0">
          <p class="text-sm font-medium text-[var(--ui-text)]">
            {{ partyLabel(party) }}
          </p>
          <p class="text-xs text-[var(--ui-text-muted)] mt-0.5">
            {{ signatureStatusText(party) }}
          </p>
        </div>
      </li>
    </ul>

    <p
      v-if="!block.eligible && !readonly"
      class="mt-4 text-xs text-[var(--ui-text-muted)]"
    >
      {{ signatureIneligibleReason(block.documentType) }}
    </p>

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      class="mt-4 print:hidden"
      :title="errorMessage"
    />

    <div v-if="canSign" class="mt-5 flex justify-end print:hidden">
      <UButton
        color="neutral"
        icon="i-lucide-pen-line"
        :loading="pending"
        @click="confirmOpen = true"
      >
        Signer
      </UButton>
    </div>

    <UModal v-model:open="confirmOpen" title="Confirmer la signature">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-[var(--ui-text-toned)]">
            En signant, vous attestez avoir pris connaissance de ce document et
            en approuver le contenu. Votre nom et la date sont enregistrés de
            manière définitive : une signature ne peut pas être retirée.
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="confirmOpen = false">
              Annuler
            </UButton>
            <UButton
              color="neutral"
              icon="i-lucide-pen-line"
              :loading="pending"
              @click="onConfirm"
            >
              Je signe
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>
