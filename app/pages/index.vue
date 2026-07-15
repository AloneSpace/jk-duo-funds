<script setup lang="ts">
import authMiddleware from "~/middleware/auth";
import { useAuthStore } from "~/stores/auth";
import { useTransactionStore } from "~/stores/transactions";
import { useSlipUploadStore } from "~/stores/slip-upload";
import { useFirebaseAuth } from "~/composables/useFirebaseAuth";
import { formatCurrency } from "~/utils/duo-funds";
import type { TransactionDraft } from "~/types/duo-funds";
import type { CreateTransactionPayload } from "~/components/dashboard/CreateTransactionModal.vue";

definePageMeta({
  middleware: [authMiddleware],
});

const authStore = useAuthStore();
const transactionStore = useTransactionStore();
const slipUploadStore = useSlipUploadStore();
const { signOut } = useFirebaseAuth();
const toast = useToast();
const createModalOpen = ref(false);
const saving = ref(false);

const handleSignOut = async () => {
  await signOut();
  await navigateTo("/login");
};

const currentBalance = computed(() =>
  formatCurrency(transactionStore.summary.total),
);

const selectedPreset = computed({
  get: () => transactionStore.datePreset,
  set: (value) =>
    transactionStore.setDatePreset(value as "all" | "7d" | "30d" | "month"),
});

const customFrom = computed({
  get: () => transactionStore.customRange.from ?? "",
  set: (value) =>
    transactionStore.setCustomDateRange({
      from: value || null,
      to: transactionStore.customRange.to,
    }),
});

const customTo = computed({
  get: () => transactionStore.customRange.to ?? "",
  set: (value) =>
    transactionStore.setCustomDateRange({
      from: transactionStore.customRange.from,
      to: value || null,
    }),
});

const filterOpen = ref(false);

const userInitials = computed(() => {
  const name = authStore.user?.displayName?.trim() || "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
});

const filterOptions = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" },
  { label: "All records", value: "all" },
];

const setPreset = (value: "all" | "7d" | "30d" | "month") => {
  if (value === "all") {
    transactionStore.setCustomDateRange({ from: null, to: null });
  }

  selectedPreset.value = value;
};

const openTransaction = async (transactionId: string) => {
  transactionStore.selectTransaction(transactionId);
  await navigateTo(`/transactions/${transactionId}`);
};

const handleCreateTransaction = async (payload: CreateTransactionPayload) => {
  if (!authStore.user) {
    toast.add({
      title: "Not signed in",
      description: "Please sign in and try again.",
      color: "error",
    });
    return;
  }

  saving.value = true;

  try {
    let slipImageUrl = payload.slipImageUrl || "/slip-placeholder.svg";

    // Upload slip to Firebase Storage
    if (payload.file) {
      slipImageUrl = await slipUploadStore.uploadToStorage(
        payload.file,
        authStore.pairId,
        authStore.user.uid,
      );
    }

    const draft: TransactionDraft = {
      amount: payload.amount,
      transactionDate: payload.transactionDate,
      transactionTime: payload.transactionTime,
      bankName: payload.bankName,
      note: payload.note,
      confidence: slipUploadStore.analysisResult?.confidence ?? "high",
      rawTextDetected: slipUploadStore.analysisResult?.raw_text_detected ?? "",
      status: "confirmed",
    };

    await transactionStore.addTransaction({
      draft,
      slipImageUrl,
      aiRawResponse: slipUploadStore.analysisResult
        ? { ...slipUploadStore.analysisResult }
        : { source: "manual", confidence: "high" },
      uploaderId: authStore.user.uid,
      uploaderName: authStore.user.displayName,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save transaction.";
    toast.add({ title: "Save failed", description: message, color: "error" });
    createModalOpen.value = true; // re-open modal so user doesn't lose their data
  } finally {
    saving.value = false;
  }
};

const deleteTargetId = ref<string | null>(null);
const confirmDeleteOpen = ref(false);

const handleDeleteTransaction = (transactionId: string) => {
  deleteTargetId.value = transactionId;
  confirmDeleteOpen.value = true;
};

const handleConfirmDelete = async () => {
  if (deleteTargetId.value) {
    await transactionStore.removeTransaction(deleteTargetId.value);
    deleteTargetId.value = null;
  }
  confirmDeleteOpen.value = false;
};

const deleteTarget = computed(
  () =>
    transactionStore.transactions.find((t) => t.id === deleteTargetId.value) ??
    null,
);

const openCreateModal = () => {
  createModalOpen.value = true;
};
</script>

<template>
  <div class="space-y-3">
    <DashboardBalanceHero
      :pair-name="transactionStore.pair.name"
      :current-balance="currentBalance"
      :transaction-count="transactionStore.summary.count"
      :my-total="formatCurrency(transactionStore.summary.myTotal)"
      :partner-total="formatCurrency(transactionStore.summary.partnerTotal)"
      :user-initials="userInitials"
      @filter-click="filterOpen = true"
      @sign-out="handleSignOut"
    />

    <div class="grid grid-cols-2 gap-2">
      <UButton
        color="primary"
        icon="i-lucide-upload"
        label="Upload slip"
        block
        class="h-11 rounded-2xl bg-emerald-600 font-semibold shadow-sm shadow-emerald-600/25 text-white"
        @click="openCreateModal"
      />

      <UPopover v-model:open="filterOpen">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-filter"
          label="Filter by date"
          block
          class="h-11 rounded-2xl"
        />

        <template #content>
          <div class="w-72 space-y-3 p-3">
            <p
              class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
            >
              {{ transactionStore.dateRangeLabel }}
            </p>

            <div class="grid grid-cols-2 gap-2">
              <UButton
                v-for="option in filterOptions"
                :key="option.value"
                size="xs"
                :color="selectedPreset === option.value ? 'primary' : 'neutral'"
                :variant="selectedPreset === option.value ? 'solid' : 'soft'"
                :label="option.label"
                class="justify-center"
                @click="
                  setPreset(option.value as 'all' | '7d' | '30d' | 'month')
                "
              />
            </div>

            <div v-if="selectedPreset === 'all'" class="grid grid-cols-2 gap-2">
              <UInput v-model="customFrom" type="date" label="From" />
              <UInput v-model="customTo" type="date" label="To" />
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">
            Transactions
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Tap a transaction amount to open full detail.
          </p>
        </div>

        <UBadge color="neutral" variant="soft" class="rounded-full">
          {{ transactionStore.filteredTransactions.length }} items
        </UBadge>
      </div>

      <div class="space-y-3">
        <DashboardTransactionItem
          v-for="transaction in transactionStore.filteredTransactions"
          :key="transaction.id"
          :transaction="transaction"
          :amount-label="formatCurrency(transaction.amount)"
          @open="openTransaction"
          @delete="handleDeleteTransaction"
        />

        <UCard v-if="!transactionStore.filteredTransactions.length">
          <div class="py-8 text-center">
            <UIcon
              name="i-lucide-receipt"
              class="mx-auto size-8 text-slate-400"
            />
            <p class="mt-3 font-medium text-slate-900 dark:text-white">
              No slips in this range
            </p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try another date range or upload a new slip.
            </p>
          </div>
        </UCard>
      </div>
    </section>

    <DashboardCreateTransactionModal
      v-model:open="createModalOpen"
      @submit="handleCreateTransaction"
    />

    <DashboardConfirmDeleteModal
      v-model:open="confirmDeleteOpen"
      :transaction="deleteTarget"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>
