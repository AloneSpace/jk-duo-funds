<script setup lang="ts">
import authMiddleware from "~/middleware/auth";
import { useTransactionStore } from "~/stores/transactions";
import { formatCurrency, formatDate, formatDateTime } from "~/utils/duo-funds";

definePageMeta({
  middleware: [authMiddleware],
});

const route = useRoute();
const transactionStore = useTransactionStore();

const transactionId = computed(() => String(route.params.id || ""));

const transaction = computed(
  () =>
    transactionStore.transactions.find(
      (item) => item.id === transactionId.value,
    ) ?? null,
);

const confirmDeleteOpen = ref(false);

const deleteAndBack = async () => {
  if (!transaction.value) return;
  await transactionStore.removeTransaction(transaction.value.id);
  await navigateTo("/");
};

watch(
  transactionId,
  (value) => {
    transactionStore.selectTransaction(value || null);
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <UButton
        to="/"
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        size="sm"
        label="Back"
      />

      <p class="text-xs text-slate-500 dark:text-slate-400">
        Transaction detail
      </p>
    </div>

    <UCard v-if="transaction" class="overflow-hidden">
      <div class="space-y-3">
        <div
          class="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
        >
          <img
            :src="transaction.slipImageUrl"
            :alt="`Slip uploaded by ${transaction.uploaderName}`"
            class="aspect-4/5 w-full object-cover"
          />
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p class="text-slate-500 dark:text-slate-400">Amount</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ formatCurrency(transaction.amount) }}
            </p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Uploader</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ transaction.uploaderName }}
            </p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Bank</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ transaction.bankName }}
            </p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Status</p>
            <p
              class="text-sm font-semibold capitalize text-slate-900 dark:text-white"
            >
              {{ transaction.status }}
            </p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Date</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ formatDate(transaction.transactionDate) }}
            </p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Time</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ transaction.transactionTime }}
            </p>
          </div>
        </div>

        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
          <p
            class="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
          >
            Notes
          </p>
          <p class="mt-1 text-xs text-slate-700 dark:text-slate-300">
            {{ transaction.note || "No note for this transaction." }}
          </p>
        </div>

        <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
          <p
            class="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
          >
            Upload info
          </p>
          <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Captured at
            {{ formatDateTime(transaction.createdAt) }}
          </p>
        </div>

        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          label="Delete transaction"
          block
          @click="confirmDeleteOpen = true"
        />
      </div>
    </UCard>

    <UCard v-else>
      <div class="py-8 text-center">
        <UIcon name="i-lucide-search-x" class="mx-auto size-7 text-slate-400" />
        <p class="mt-2 text-sm font-medium text-slate-900 dark:text-white">
          Transaction not found
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          The item may have been removed or this link is invalid.
        </p>
      </div>
    </UCard>
  </div>

  <DashboardConfirmDeleteModal
    v-model:open="confirmDeleteOpen"
    :transaction="transaction"
    @confirm="deleteAndBack"
  />
</template>
