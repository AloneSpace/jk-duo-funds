<script setup lang="ts">
import type { DuoTransaction } from "~/types/duo-funds";
import { formatCurrency, formatDate } from "~/utils/duo-funds";

const props = defineProps<{
  open: boolean;
  transaction: DuoTransaction | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();

const localOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});
</script>

<template>
  <UModal
    v-model:open="localOpen"
    :dismissible="true"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="flex flex-col items-center gap-5 pb-1 pt-2 text-center">
        <!-- Danger icon ring -->
        <div class="relative flex items-center justify-center">
          <div
            class="absolute size-20 rounded-full bg-red-100/60 dark:bg-red-500/10"
          />
          <div
            class="absolute size-14 rounded-full bg-red-100 dark:bg-red-500/15"
          />
          <div
            class="relative flex size-14 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-50 dark:bg-red-500/20 dark:ring-red-500/10"
          >
            <UIcon
              name="i-lucide-trash-2"
              class="size-6 text-red-600 dark:text-red-400"
            />
          </div>
        </div>

        <!-- Title + description -->
        <div class="space-y-1.5">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
            Delete Transaction?
          </h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            This action is permanent and cannot be undone.
          </p>
        </div>

        <!-- Transaction summary card -->
        <div
          v-if="transaction"
          class="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/50"
        >
          <!-- Amount row -->
          <div
            class="bg-linear-to-r from-red-50 to-rose-50/60 px-4 py-4 dark:from-red-500/10 dark:to-rose-500/5"
          >
            <p
              class="text-[10px] font-medium uppercase tracking-widest text-red-500/80 dark:text-red-400/70"
            >
              Amount
            </p>
            <p
              class="mt-0.5 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400"
            >
              {{ formatCurrency(transaction.amount) }}
            </p>
          </div>

          <!-- Details row -->
          <div
            class="grid grid-cols-2 gap-px bg-slate-200/60 dark:bg-slate-700/40"
          >
            <div class="bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <p
                class="text-[10px] font-medium uppercase tracking-widest text-slate-400"
              >
                From
              </p>
              <p
                class="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {{ transaction.uploaderName }}
              </p>
            </div>
            <div class="bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <p
                class="text-[10px] font-medium uppercase tracking-widest text-slate-400"
              >
                Bank
              </p>
              <p
                class="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {{ transaction.bankName }}
              </p>
            </div>
            <div class="col-span-2 bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <p
                class="text-[10px] font-medium uppercase tracking-widest text-slate-400"
              >
                Date
              </p>
              <p
                class="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {{ formatDate(transaction.transactionDate) }}
                ·
                {{ transaction.transactionTime }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="ghost" label="Cancel" @click="close" />
      <UButton
        color="error"
        icon="i-lucide-trash-2"
        label="Yes, delete"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>
