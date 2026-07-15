<script setup lang="ts">
import type { DuoTransaction } from "~/types/duo-funds";
import { formatDateTime } from "~/utils/duo-funds";

const props = defineProps<{
  transaction: DuoTransaction;
  amountLabel: string;
}>();

const emit = defineEmits<{
  open: [transactionId: string];
  delete: [transactionId: string];
}>();
</script>

<template>
  <UCard
    class="border-slate-200/80 bg-white/85 backdrop-blur-sm transition hover:border-emerald-300/60 hover:shadow-sm dark:border-slate-800/80 dark:bg-slate-900/65"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-start gap-3">
        <UAvatar
          :alt="transaction.uploaderName"
          :text="transaction.uploaderName.slice(0, 1)"
          size="sm"
          class="shrink-0"
        />

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p
              class="truncate text-sm font-semibold text-slate-900 dark:text-white"
            >
              {{ transaction.uploaderName }}
            </p>
          </div>

          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{
              formatDateTime(
                `${transaction.transactionDate}T${transaction.transactionTime}:00`,
              )
            }}
          </p>

          <p class="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            {{ transaction.bankName }} • {{ transaction.note || "No note" }}
          </p>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          size="xs"
          color="primary"
          variant="soft"
          :label="amountLabel"
          @click="emit('open', transaction.id)"
        />
        <UButton
          size="xs"
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          aria-label="Delete transaction"
          @click="emit('delete', transaction.id)"
        />
      </div>
    </div>
  </UCard>
</template>
