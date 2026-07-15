import { defineStore } from "pinia";
import type {
  DateRangePreset,
  DateRangeSelection,
  DuoPair,
  DuoTransaction,
  TransactionDraft,
} from "~/types/duo-funds";
import {
  formatDateTime,
  getPresetDateRange,
  isWithinDateRange,
  toDateInputValue,
  toTimeInputValue,
} from "~/utils/duo-funds";
import { useAuthStore } from "~/stores/auth";
import { useFirestoreDB } from "~/composables/useFirestoreDB";

export const useTransactionStore = defineStore("transactions", () => {
  const authStore = useAuthStore();

  const pair = ref<DuoPair>({
    id: "",
    name: "",
    memberIds: [],
    members: [],
  });

  const transactions = ref<DuoTransaction[]>([]);
  const datePreset = ref<DateRangePreset>("all");
  const customRange = ref<DateRangeSelection>({
    from: null,
    to: null,
  });
  const selectedTransactionId = ref<string | null>(null);

  // Firestore listener handle
  const firestoreUnsubscribe = ref<(() => void) | null>(null);

  const filteredTransactions = computed(() =>
    transactions.value.filter((transaction) => {
      return isWithinDateRange(
        transaction.transactionDate,
        datePreset.value,
        customRange.value,
      );
    }),
  );

  const selectedTransaction = computed(() => {
    return (
      transactions.value.find(
        (transaction) => transaction.id === selectedTransactionId.value,
      ) ?? null
    );
  });

  const summary = computed(() => {
    const visibleTransactions = filteredTransactions.value;
    const total = visibleTransactions.reduce(
      (runningTotal, transaction) => runningTotal + transaction.amount,
      0,
    );
    const myId = authStore.user?.uid;
    const myTotal = visibleTransactions.reduce((runningTotal, transaction) => {
      if (transaction.uploaderId === myId) {
        return runningTotal + transaction.amount;
      }

      return runningTotal;
    }, 0);

    return {
      total,
      myTotal,
      partnerTotal: Math.max(total - myTotal, 0),
      count: visibleTransactions.length,
      pendingCount: visibleTransactions.filter(
        (transaction) => transaction.status === "pending",
      ).length,
      average: visibleTransactions.length
        ? total / visibleTransactions.length
        : 0,
    };
  });

  const dateRangeLabel = computed(() => {
    if (datePreset.value === "all") {
      return "All records";
    }

    if (datePreset.value === "month") {
      return "This month";
    }

    if (datePreset.value === "30d") {
      return "Last 30 days";
    }

    return "Last 7 days";
  });

  const setDatePreset = (preset: DateRangePreset) => {
    datePreset.value = preset;

    if (preset !== "all") {
      customRange.value = getPresetDateRange(preset);
    }
  };

  const setCustomDateRange = (range: DateRangeSelection) => {
    datePreset.value = "all";
    customRange.value = range;
  };

  const selectTransaction = (transactionId: string | null) => {
    selectedTransactionId.value = transactionId;
  };

  const addTransaction = async (payload: {
    draft: TransactionDraft;
    slipImageUrl: string;
    aiRawResponse: Record<string, unknown>;
    uploaderId: string;
    uploaderName: string;
  }) => {
    const now = new Date().toISOString();
    const transactionDate = payload.draft.transactionDate || toDateInputValue();
    const transactionTime = payload.draft.transactionTime || toTimeInputValue();

    const createdTransaction: DuoTransaction = {
      id: crypto.randomUUID(),
      uploaderId: payload.uploaderId,
      uploaderName: payload.uploaderName,
      amount: Number(payload.draft.amount || 0),
      transactionDate,
      transactionTime,
      bankName: payload.draft.bankName || "Unknown",
      slipImageUrl: payload.slipImageUrl,
      aiRawResponse: payload.aiRawResponse,
      status: payload.draft.status,
      note: payload.draft.note.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    transactions.value = [createdTransaction, ...transactions.value];
    selectedTransactionId.value = createdTransaction.id;

    try {
      const { persistTransaction } = useFirestoreDB();
      await persistTransaction(authStore.pairId, createdTransaction);
    } catch (error: any) {
      console.log(error);
      // Rollback
      transactions.value = transactions.value.filter(
        (tx) => tx.id !== createdTransaction.id,
      );
      selectedTransactionId.value = transactions.value[0]?.id ?? null;
      throw new Error("Failed to save transaction. Please try again.");
    }

    return createdTransaction;
  };

  const removeTransaction = async (transactionId: string) => {
    const removed = transactions.value.find(
      (transaction) => transaction.id === transactionId,
    );

    if (!removed) {
      return false;
    }

    // Optimistic removal
    transactions.value = transactions.value.filter(
      (transaction) => transaction.id !== transactionId,
    );

    if (selectedTransactionId.value === transactionId) {
      selectedTransactionId.value = transactions.value[0]?.id ?? null;
    }

    try {
      const { deleteTransaction } = useFirestoreDB();
      await deleteTransaction(authStore.pairId, transactionId);
    } catch {
      // Rollback
      transactions.value = [removed, ...transactions.value];
      throw new Error("Failed to delete transaction. Please try again.");
    }

    return true;
  };

  const loadFromFirestore = (
    pairId: string,
    pairData: {
      name: string;
      memberIds: string[];
      memberNames: Record<string, string>;
    } | null,
  ) => {
    stopFirestoreListener();

    transactions.value = [];
    selectedTransactionId.value = null;

    if (pairData && authStore.user) {
      const myId = authStore.user.uid;
      const partnerId = pairData.memberIds.find((id) => id !== myId) ?? "";

      pair.value = {
        id: pairId,
        name: pairData.name,
        memberIds: pairData.memberIds,
        members: [
          {
            id: myId,
            displayName: authStore.user.displayName || "You",
            role: "me",
            accent: "emerald",
          },
          {
            id: partnerId,
            displayName: pairData.memberNames[partnerId] ?? "Partner",
            role: "partner",
            accent: "sky",
          },
        ],
      };
    }

    // Show all records by default in Firebase mode so no data gets hidden by the date filter
    datePreset.value = "all";
    customRange.value = { from: null, to: null };

    const { subscribeToTransactions } = useFirestoreDB();
    firestoreUnsubscribe.value = subscribeToTransactions(
      pairId,
      (txs) => {
        transactions.value = txs;
        if (!selectedTransactionId.value && txs.length > 0) {
          selectedTransactionId.value = txs[0]?.id ?? null;
        }
      },
      (err) => {
        console.error("[Firestore] Transaction listener error:", err.message);
      },
    );
  };

  const stopFirestoreListener = () => {
    if (firestoreUnsubscribe.value) {
      firestoreUnsubscribe.value();
      firestoreUnsubscribe.value = null;
    }
  };

  return {
    pair,
    transactions,
    filteredTransactions,
    selectedTransaction,
    selectedTransactionId,
    datePreset,
    customRange,
    summary,
    dateRangeLabel,
    setDatePreset,
    setCustomDateRange,
    selectTransaction,
    addTransaction,
    removeTransaction,
    loadFromFirestore,
    stopFirestoreListener,
    formatDateTime,
  };
});
