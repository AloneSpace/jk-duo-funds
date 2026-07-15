<script setup>
const route = useRoute();
const router = useRouter();

useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: "favicon/apple-touch-icon.png",
    },
    { rel: "icon", href: "favicon/favicon.ico" },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "favicon/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "favicon/favicon-16x16.png",
    },
    {
      rel: "manifest",
      href: "favicon/site.webmanifest",
    },
  ],
  htmlAttrs: {
    lang: "en",
  },
});

const authStore = useAuthStore();

// Set up Firebase auth state listener here instead of in a plugin.
// This runs client-side only and avoids the Pinia-hydration race condition
// that caused transactions not to load after a page refresh.
const { watchAuthState } = useFirebaseAuth();
onMounted(() => {
  watchAuthState();
});

const title = "Duo Funds - A shared money app for two people";
const description =
  "A mobile-first shared money app for two people, with slip analysis, transaction history, and pair-based summaries.";

const showShell = computed(() => route.path !== "/login");

const userInitials = computed(() => {
  const displayName = authStore.user?.displayName?.trim() || "Guest";
  return displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
});

const handleSignOut = async () => {
  await authStore.signOut();
  await router.push("/login");
};

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: "/duo-funds-og.png",
  twitterCard: "summary_large_image",
});
</script>

<template>
  <UApp>
    <div
      class="min-h-screen bg-linear-to-b from-emerald-50 via-white to-white text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-50"
    >
      <UMain>
        <div class="mx-auto w-full max-w-md px-4 py-4 pb-8">
          <NuxtPage />
        </div>
      </UMain>
    </div>
  </UApp>
</template>
