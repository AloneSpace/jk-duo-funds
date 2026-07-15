<script setup lang="ts">
import guestMiddleware from "~/middleware/guest";
import { useFirebaseAuth } from "~/composables/useFirebaseAuth";

definePageMeta({
  middleware: [guestMiddleware],
});

const router = useRouter();
const { hasFirebaseConfig, pending, error, signInWithEmail } =
  useFirebaseAuth();

const form = reactive({
  email: "",
  password: "",
});

const loading = ref(false);

const submit = async () => {
  loading.value = true;

  try {
    await signInWithEmail({
      email: form.email,
      password: form.password,
    });

    await router.push("/");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col justify-center py-4"
  >
    <UCard class="shadow-xl shadow-emerald-900/5">
      <div class="space-y-6">
        <!-- Logo + heading -->
        <div class="space-y-3 text-center">
          <img src="/logo.svg" alt="Duo Funds" class="mx-auto h-28 w-auto" />

          <div>
            <h1
              class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              Welcome back
            </h1>
            <p
              class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400"
            >
              Sign in to manage your shared expenses.
            </p>
          </div>
        </div>

        <!-- Form -->
        <div class="space-y-3">
          <UInput
            v-model="form.email"
            type="email"
            placeholder="Email"
            icon="i-lucide-mail"
            size="lg"
            class="w-full"
            autocomplete="email"
          />

          <UInput
            v-model="form.password"
            type="password"
            placeholder="Password"
            icon="i-lucide-lock"
            size="lg"
            class="w-full"
            autocomplete="current-password"
            @keydown.enter="submit"
          />
        </div>

        <!-- Error -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :description="error"
        />

        <!-- Actions -->
        <div class="space-y-2">
          <UButton
            color="primary"
            size="lg"
            block
            :loading="loading || pending"
            :disabled="!form.email || !form.password"
            @click="submit"
          >
            Sign in
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
