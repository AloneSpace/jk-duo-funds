<script setup lang="ts">
import { toDateInputValue, toTimeInputValue } from "~/utils/duo-funds";
import { useSlipUploadStore } from "~/stores/slip-upload";
import { THAI_BANKS, matchBankToSwift } from "~/constants/banks";

export interface CreateTransactionPayload {
  amount: number;
  bankName: string;
  transactionDate: string;
  transactionTime: string;
  note: string;
  slipImageUrl: string;
  file: File | null;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [payload: CreateTransactionPayload];
}>();

const localOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const slipUploadStore = useSlipUploadStore();
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const hasSlip = ref(false);
const previewUrl = ref<string>("");
const amountInput = ref<string>("");
const bankName = ref<string>("");
const transactionDate = ref<string>(toDateInputValue());
const transactionTime = ref<string>(toTimeInputValue());
const note = ref<string>("");
const error = ref<string>("");

const resetForm = () => {
  previewUrl.value = "";
  hasSlip.value = false;
  selectedFile.value = null;
  amountInput.value = "";
  bankName.value = "";
  transactionDate.value = toDateInputValue();
  transactionTime.value = toTimeInputValue();
  note.value = "";
  error.value = "";
  slipUploadStore.reset();
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm();
  },
);

const openFilePicker = () => {
  fileInput.value?.click();
};

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = "";

  selectedFile.value = file;
  slipUploadStore.reset();

  // Show preview immediately — AI scan only on explicit button press
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      previewUrl.value = reader.result;
      hasSlip.value = true;
    }
  };
  reader.readAsDataURL(file);
};

const scanWithAI = async () => {
  if (!selectedFile.value) return;

  const result = await slipUploadStore.analyzeSlip(selectedFile.value);

  if (result) {
    if (result.amount !== null && result.confidence !== "low") {
      amountInput.value = String(result.amount);
    }
    if (result.transaction_date && result.confidence !== "low") {
      transactionDate.value = result.transaction_date;
    }
    if (result.transaction_time && result.confidence !== "low") {
      transactionTime.value = result.transaction_time;
    }
    if (result.bank_name && result.confidence !== "low") {
      bankName.value = matchBankToSwift(result.bank_name);
    }
  }
};

const submit = () => {
  const amount = Number(amountInput.value);

  if (!hasSlip.value) {
    error.value = "Please upload a slip image.";
    return;
  }
  if (!amount || amount <= 0) {
    error.value = "Please enter a valid amount.";
    return;
  }
  if (!transactionDate.value || !transactionTime.value) {
    error.value = "Please enter both date and time.";
    return;
  }

  emit("submit", {
    amount,
    bankName: bankName.value.trim() || "Unknown",
    transactionDate: transactionDate.value,
    transactionTime: transactionTime.value,
    note: note.value.trim(),
    slipImageUrl: previewUrl.value,
    file: selectedFile.value,
  });

  localOpen.value = false;
};
</script>

<template>
  <UModal
    v-model:open="localOpen"
    title="Add Transaction"
    description="Upload a slip then confirm the details."
    scrollable
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-5">
        <!-- Slip upload zone -->
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted">
            Transfer slip
          </p>

          <button
            type="button"
            class="group relative w-full overflow-hidden rounded-2xl transition-all focus:outline-none"
            :class="
              hasSlip
                ? 'ring-2 ring-primary/30'
                : 'border-2 border-dashed border-accented bg-elevated hover:border-primary/40 hover:bg-accented'
            "
            @click="openFilePicker"
          >
            <!-- Preview -->
            <img
              v-if="hasSlip"
              :src="previewUrl"
              alt="Slip preview"
              class="aspect-4/3 w-full object-contain"
            />

            <!-- Empty state -->
            <div v-else class="flex flex-col items-center gap-2 py-8">
              <div
                class="flex size-12 items-center justify-center rounded-full bg-primary/10"
              >
                <UIcon name="i-lucide-image-plus" class="size-6 text-primary" />
              </div>
              <p class="text-sm font-medium text-default">Tap to upload slip</p>
              <p class="text-xs text-muted">JPG, PNG, HEIC · max 10 MB</p>
            </div>

            <!-- Re-upload overlay when slip exists -->
            <div
              v-if="hasSlip"
              class="absolute inset-0 flex items-end justify-end p-2 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span
                class="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
              >
                Change
              </span>
            </div>
          </button>

          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            capture="environment"
            class="hidden"
            @change="onFileChange"
          />

          <!-- Scan with AI button (only when slip is selected and not yet scanned) -->
          <div
            v-if="hasSlip && !slipUploadStore.analysisResult"
            class="flex items-center gap-2"
          >
            <UButton
              color="primary"
              variant="soft"
              size="sm"
              icon="i-lucide-sparkles"
              :loading="slipUploadStore.isAnalyzing"
              :label="
                slipUploadStore.isAnalyzing ? 'Scanning…' : 'Scan with AI'
              "
              class="flex-1 justify-center"
              @click="scanWithAI"
            />
            <p class="text-xs text-muted">or fill in manually below</p>
          </div>

          <!-- Analysing spinner -->
          <div
            v-if="slipUploadStore.isAnalyzing"
            class="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary"
          >
            <UIcon name="i-lucide-sparkles" class="size-4 animate-pulse" />
            Reading slip…
          </div>

          <!-- Low-confidence warning -->
          <UAlert
            v-else-if="
              slipUploadStore.analysisResult?.confidence === 'low' && hasSlip
            "
            icon="i-lucide-triangle-alert"
            color="warning"
            variant="soft"
            title="Low confidence"
            description="AI couldn't read the slip clearly. Please fill in the details manually."
          />

          <!-- Scan success -->
          <div
            v-else-if="slipUploadStore.analysisResult && hasSlip"
            class="flex items-center gap-2 rounded-lg bg-success/8 px-3 py-2 text-xs text-success-600 dark:text-success-400"
          >
            <UIcon name="i-lucide-check-circle" class="size-4 shrink-0" />
            AI filled in the form — review and confirm.
          </div>
        </div>

        <!-- Divider -->
        <UDivider />

        <!-- Transaction details -->
        <div class="space-y-4">
          <p class="text-xs font-semibold uppercase tracking-widest text-muted">
            Transaction details
          </p>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Amount (฿)" class="col-span-2">
              <UInput
                v-model="amountInput"
                type="number"
                min="0"
                placeholder="0.00"
                icon="i-lucide-banknote"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="ธนาคาร" class="col-span-2">
              <USelect
                v-model="bankName"
                :items="THAI_BANKS"
                placeholder="เลือกธนาคาร"
                icon="i-lucide-building-2"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Date">
              <UInput v-model="transactionDate" type="date" class="w-full" />
            </UFormField>

            <UFormField label="Time">
              <UInput
                v-model="transactionTime"
                type="time"
                icon="i-lucide-clock"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Note (optional)">
            <UTextarea
              v-model="note"
              placeholder="e.g. July rent, groceries split…"
              :rows="2"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Error -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :description="error"
          icon="i-lucide-circle-alert"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="ghost" label="Cancel" @click="close" />
      <UButton
        color="primary"
        icon="i-lucide-check"
        label="Save transaction"
        :disabled="slipUploadStore.isAnalyzing"
        @click="submit"
      />
    </template>
  </UModal>
</template>
